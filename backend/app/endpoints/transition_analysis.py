"""
Transition Analysis Endpoints

Replicates: server/transition_analysis_server.R
UI Reference: ui/transition_analysis_ui.R

Provides ABC category transition analysis for products and customers.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Literal
from datetime import datetime
from ..database import query_all, parse_fy
from ..schemas import TransitionAnalysisResponse, User
from ..endpoints.auth import get_current_user

router = APIRouter(
    prefix="/transition-analysis",
    tags=["Transition Analysis"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/transitions", response_model=TransitionAnalysisResponse)
async def get_transitions(
    analysis_type: Literal["Products", "Customers"] = Query(
        ..., description="'Products' or 'Customers'"
    ),
    financial_year: str = Query("FY24-25", description="Financial year"),
):
    """
    Get ABC category transition data for products or customers.
    Shows how entities moved between ABC categories across the last 3 months
    of the selected financial year.
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    fin_year = start_year  # bigint key in datamart

    # Get last 3 available months from the datamart for this FY
    months_sql = """
        SELECT DISTINCT year_month
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year = %s
        ORDER BY year_month DESC
        LIMIT 3
    """
    month_rows = query_all(months_sql, (fin_year,))
    if not month_rows:
        raise HTTPException(
            status_code=404, detail="No data found for this financial year"
        )

    months = sorted([r["year_month"] for r in month_rows])  # chronological
    fy_months = [
        f"{year}-{month:02d}"
        for year, month in (
            [(start_year, m) for m in range(4, 13)]
            + [(end_year, m) for m in range(1, 4)]
        )
    ]
    fy_start_date = f"{start_year}-04-01"
    fy_end_date = f"{end_year}-04-01"

    if analysis_type == "Products":
        # For each month, get article ABC category from datamart
        all_articles = set()
        month_data = {}
        month_col_order = []
        article_desc_map = {}

        for ym in months:
            parts = ym.split("-")
            month_obj = datetime(int(parts[0]), int(parts[1]), 1)
            col_name = f"ABC_{month_obj.strftime('%b_%Y')}"
            month_col_order.append(col_name)

            sql = """
                SELECT article_no, abc, xyz
                FROM public."spoorthi_abc_xyz_datamart"
                WHERE fin_year = %s AND year_month = %s
            """
            rows = query_all(sql, (fin_year, ym))

            month_data[col_name] = {}
            for row in rows:
                article = str(row["article_no"])
                all_articles.add(article)
                abc_val = (row["abc"] or "").strip()
                xyz_val = (row["xyz"] or "").strip()
                combined = (
                    f"{abc_val}{xyz_val}" if abc_val and xyz_val else (abc_val or "N/A")
                )
                month_data[col_name][article] = combined if combined != "N/A" else "-"

        desc_rows = query_all(
            """
            SELECT
                article_no,
                COALESCE(NULLIF(description, ''), NULLIF(article_name, ''), article_no) AS article_description
            FROM public.sphoorti_product_master
            """
        )
        for row in desc_rows:
            article_desc_map[str(row["article_no"])] = str(row["article_description"])

        trend_sql = """
            SELECT
                article_no,
                TO_CHAR(invoice_date, 'YYYY-MM') AS year_month,
                SUM(ass_value) AS sales
            FROM public."spoorthi_dataset_without_spares"
            WHERE invoice_date >= %s::date
              AND invoice_date < %s::date
            GROUP BY article_no, TO_CHAR(invoice_date, 'YYYY-MM')
        """
        trend_rows = query_all(trend_sql, (fy_start_date, fy_end_date))
        trend_map = {}
        for row in trend_rows:
            article_key = str(row["article_no"])
            if article_key not in trend_map:
                trend_map[article_key] = {}
            trend_map[article_key][row["year_month"]] = float(row["sales"] or 0)

        # Build response
        data = []
        for article in sorted(all_articles):
            row_data = {
                "article_no": article,
                "article_description": article_desc_map.get(article, article),
            }
            for col_name in month_col_order:
                row_data[col_name] = month_data[col_name].get(article, "-")
            row_data["trend_values"] = [
                trend_map.get(article, {}).get(month, 0.0) for month in fy_months
            ]
            data.append(row_data)

        column_headers = ["article_no", "article_description"] + month_col_order

    else:  # Customers
        # For each month, compute customer ABC from raw invoice data
        # ABC = Pareto: A = top 80% revenue, B = next 15%, C = remaining 5%
        all_customers = set()
        month_data = {}
        month_col_order = []

        for ym in months:
            parts = ym.split("-")
            month_obj = datetime(int(parts[0]), int(parts[1]), 1)
            col_name = f"ABC_{month_obj.strftime('%b_%Y')}"
            month_col_order.append(col_name)

            # Get customer revenue for this month
            sql = """
                SELECT customer_name, SUM(ass_value) as revenue
                FROM public."spoorthi_dataset_without_spares"
                WHERE TO_CHAR(invoice_date, 'YYYY-MM') = %s
                GROUP BY customer_name
                ORDER BY revenue DESC
            """
            rows = query_all(sql, (ym,))

            # Calculate ABC using cumulative revenue percentages
            total_revenue = sum(float(r["revenue"] or 0) for r in rows)
            cumulative = 0.0
            month_data[col_name] = {}

            for row in rows:
                customer = str(row["customer_name"])
                all_customers.add(customer)
                revenue = float(row["revenue"] or 0)
                cumulative += revenue
                pct = (cumulative / total_revenue * 100) if total_revenue > 0 else 0

                if pct <= 80:
                    category = "A"
                elif pct <= 95:
                    category = "B"
                else:
                    category = "C"

                month_data[col_name][customer] = category

        trend_sql = """
            SELECT
                customer_name,
                TO_CHAR(invoice_date, 'YYYY-MM') AS year_month,
                SUM(ass_value) AS sales
            FROM public."spoorthi_dataset_without_spares"
            WHERE invoice_date >= %s::date
              AND invoice_date < %s::date
            GROUP BY customer_name, TO_CHAR(invoice_date, 'YYYY-MM')
        """
        trend_rows = query_all(trend_sql, (fy_start_date, fy_end_date))
        trend_map = {}
        for row in trend_rows:
            customer_key = str(row["customer_name"])
            if customer_key not in trend_map:
                trend_map[customer_key] = {}
            trend_map[customer_key][row["year_month"]] = float(row["sales"] or 0)

        # Build response
        data = []
        for customer in sorted(all_customers):
            row_data = {"customer_name": customer}
            for col_name in month_col_order:
                row_data[col_name] = month_data[col_name].get(customer, "-")
            row_data["trend_values"] = [
                trend_map.get(customer, {}).get(month, 0.0) for month in fy_months
            ]
            data.append(row_data)

        column_headers = ["customer_name"] + month_col_order

    return TransitionAnalysisResponse(
        data=data, analysis_type=analysis_type, column_headers=column_headers
    )
