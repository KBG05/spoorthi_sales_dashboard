"""
Forecast Endpoints

Replicates: server/forecast_server.R
UI Reference: ui/forecast_ui.R

Provides demand forecast data from the final_sales_forecasts table,
enriched with ABC class, unique customers, and
last-3-month individual quantities from raw data.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import datetime
from ..database import query_one, query_all
from ..schemas import ForecastResponse, ForecastRow, User
from ..endpoints.auth import get_current_user

router = APIRouter(
    prefix="/forecast", tags=["Forecast"], dependencies=[Depends(get_current_user)]
)


@router.get("/demand", response_model=ForecastResponse)
async def get_demand_forecast(
    granularity: Optional[str] = Query(
        "monthly", description="Granularity: monthly, bimonthly, or quarterly"
    ),
):
    """
    Get demand forecast data enriched with ABC category, unique customers,
    and last 3-month individual + average quantities.
    """
    # Check table exists
    table_check = query_one(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'final_sales_forecasts'
        LIMIT 1
    """
    )
    if not table_check:
        raise HTTPException(status_code=404, detail="No forecast table found")

    # Validate granularity
    valid_granularities = ("monthly", "bimonthly", "quarterly")
    if granularity not in valid_granularities:
        granularity = "monthly"

    # Get available granularities
    gran_rows = query_all(
        """
        SELECT DISTINCT granularity FROM public."final_sales_forecasts" ORDER BY granularity
    """
    )
    available_granularities = [r["granularity"] for r in gran_rows] if gran_rows else []

    # Find the last 3 months in raw data (for enrichment)
    last3_sql = """
        SELECT DISTINCT TO_CHAR(invoice_date, 'YYYY-MM') AS ym
        FROM spoorthi_dataset_without_spares
        ORDER BY ym DESC LIMIT 3
    """
    last3_rows = query_all(last3_sql)
    last3_months = sorted([r["ym"] for r in last3_rows]) if last3_rows else []

    # Derive month labels (e.g. "Nov 2025")
    month_labels = []
    for ym in last3_months:
        parts = ym.split("-")
        dt = datetime(int(parts[0]), int(parts[1]), 1)
        month_labels.append(dt.strftime("%b %Y"))

    month_1_name = month_labels[0] if len(month_labels) > 0 else "Month 1"
    month_2_name = month_labels[1] if len(month_labels) > 1 else "Month 2"
    month_3_name = month_labels[2] if len(month_labels) > 2 else "Month 3"

    # Build the enriched query:
    # - ABC category from forecast table
    # - Unique customers from raw data (last 3 months)
    # - Individual month quantities from raw data
    month_clauses = []
    for i, ym in enumerate(last3_months, 1):
        month_clauses.append(
            f"COALESCE(SUM(CASE WHEN TO_CHAR(r.invoice_date,'YYYY-MM')='{ym}' THEN r.inv_quantity END),0) AS month_{i}_quantity"
        )
    # Pad if fewer than 3 months
    while len(month_clauses) < 3:
        month_clauses.append(f"0 AS month_{len(month_clauses)+1}_quantity")

    month_cols = ", ".join(month_clauses)

    three_months_ago = last3_months[0] + "-01" if last3_months else "2000-01-01"

    data_query = f"""
        WITH forecast AS (
            SELECT
                f.forecast_period,
                f.article_no,
                f.granularity,
                f.final_forecast AS predicted_quantity,
                f.abc_category,
                CASE
                    WHEN f.granularity = 'monthly' THEN TO_DATE(f.forecast_period, 'DD-MM-YYYY')
                    WHEN f.granularity IN ('bimonthly', 'quarterly') THEN TO_DATE(SPLIT_PART(f.forecast_period, ' - ', 1), 'MM-YYYY')
                    ELSE NULL
                END AS sort_period
            FROM public."final_sales_forecasts" f
            WHERE f.granularity = %s
        ),
        enrichment AS (
            SELECT
                r.article_no,
                COUNT(DISTINCT r.customer_name) AS unique_customers,
                {month_cols}
            FROM public."spoorthi_dataset_without_spares" r
            WHERE r.invoice_date >= '{three_months_ago}'
            GROUP BY r.article_no
        )
        SELECT
            fc.forecast_period,
            fc.article_no,
            COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), fc.article_no) AS article_description,
            fc.granularity,
            fc.predicted_quantity,
            COALESCE(fc.abc_category, '') AS abc_category,
            COALESCE(en.unique_customers, 0) AS unique_customers,
            COALESCE(en.month_1_quantity, 0) AS month_1_quantity,
            COALESCE(en.month_2_quantity, 0) AS month_2_quantity,
            COALESCE(en.month_3_quantity, 0) AS month_3_quantity
        FROM forecast fc
        LEFT JOIN public.sphoorti_product_master pm ON pm.article_no = fc.article_no
        LEFT JOIN enrichment en ON en.article_no = fc.article_no
        ORDER BY fc.sort_period DESC NULLS LAST, fc.article_no
    """

    rows = query_all(data_query, (granularity,))

    if not rows:
        raise HTTPException(
            status_code=404, detail="No forecast data found for this granularity"
        )

    forecast_data = []
    for row in rows:
        fp = row["forecast_period"] or ""

        m1 = float(row["month_1_quantity"] or 0)
        m2 = float(row["month_2_quantity"] or 0)
        m3 = float(row["month_3_quantity"] or 0)
        avg_3m = round((m1 + m2 + m3) / 3, 1) if (m1 + m2 + m3) > 0 else 0.0

        forecast_data.append(
            ForecastRow(
                article_no=str(row["article_no"]),
                article_description=row.get("article_description"),
                forecast_period=str(fp),
                granularity=row["granularity"],
                predicted_quantity=float(row["predicted_quantity"] or 0),
                abc_category=row["abc_category"] or "",
                unique_customers=int(row["unique_customers"] or 0),
                last_3_months_quantity=avg_3m,
                month_1_quantity=m1,
                month_2_quantity=m2,
                month_3_quantity=m3,
            )
        )

    display_month = f"Sales Forecast — {granularity.title()}"

    return ForecastResponse(
        table_name="final_sales_forecasts",
        display_month=display_month,
        data=forecast_data,
        available_granularities=available_granularities,
        month_1_name=month_1_name,
        month_2_name=month_2_name,
        month_3_name=month_3_name,
    )
