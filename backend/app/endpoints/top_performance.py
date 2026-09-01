"""
Top Performance Endpoints

Replicates: server/top_performance_server.R
UI Reference: ui/top_performance_ui.R

Provides top performers (customers and products) analysis.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Literal, List
from ..database import query_all, query_one, parse_fy
from ..schemas import TopPerformersResponse, TopPerformerItem, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/top-performance", tags=["Top Performance"], dependencies=[Depends(get_current_user)])


def _get_latest_month_start():
    """Get the first day of the latest month in raw data."""
    row = query_one(
        "SELECT DATE_TRUNC('month', MAX(invoice_date)) AS latest "
        "FROM spoorthi_dataset_without_spares"
    )
    if not row or not row["latest"]:
        return None
    return row["latest"]


def _fy_labels_from_raw_data() -> List[str]:
    sql = """
        SELECT DISTINCT
            CASE
                WHEN EXTRACT(MONTH FROM invoice_date) >= 4
                    THEN EXTRACT(YEAR FROM invoice_date)::int
                ELSE (EXTRACT(YEAR FROM invoice_date)::int - 1)
            END AS start_year
        FROM public."spoorthi_dataset_without_spares"
        WHERE invoice_date IS NOT NULL
        ORDER BY start_year DESC
    """
    rows = query_all(sql)
    return [
        f"FY{str(int(r['start_year']))[-2:]}-{str(int(r['start_year']) + 1)[-2:]}"
        for r in rows
    ]


def _fy_labels_from_customer_tables() -> List[str]:
    sql = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'customer_abc_xyz_fy_%'
          AND table_name ~ 'customer_abc_xyz_fy_[0-9]{4}_[0-9]{4}'
        ORDER BY table_name DESC
    """
    rows = query_all(sql)
    fy_years = []

    for row in rows:
        table_name = row["table_name"]
        suffix = table_name.replace("customer_abc_xyz_fy_", "")
        parts = suffix.split("_")
        if len(parts) == 2:
            y1 = parts[0][2:]
            y2 = parts[1][2:]
            fy_years.append(f"FY{y1}-{y2}")

    return fy_years


def _fy_labels_from_product_tables() -> List[str]:
    sql = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'abc_categorization_spoorthi_%'
          AND table_name ~ 'abc_categorization_spoorthi_[0-9]{4}_[0-9]{4}'
        ORDER BY table_name DESC
    """
    rows = query_all(sql)
    fy_years = []

    for row in rows:
        table_name = row["table_name"]
        suffix = table_name.replace("abc_categorization_spoorthi_", "")
        parts = suffix.split("_")
        if len(parts) == 2:
            y1 = parts[0][2:]
            y2 = parts[1][2:]
            fy_years.append(f"FY{y1}-{y2}")

    return fy_years


@router.get("/available-years")
async def get_available_years(
    entity_type: Literal["Customers", "Products"] = Query(
        ..., description="'Customers' or 'Products'"
    )
):
    """
    Get list of available financial years based on tables used for top performers.
    """
    fy_years = _fy_labels_from_raw_data()

    if not fy_years:
        if entity_type == "Customers":
            fy_years = _fy_labels_from_customer_tables()
        else:
            fy_years = _fy_labels_from_product_tables()

    return {"financial_years": fy_years}


@router.get("/top-performers", response_model=TopPerformersResponse)
async def get_top_performers(
    entity_type: Literal["Customers", "Products"] = Query(..., description="'Customers' or 'Products'"),
    financial_year: str = Query("FY24-25", description="Financial year for FY data")
):
    """
    Get top 10 performers (customers or products) for FY and latest month.
    Matches: top_performance_server.R
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    latest_month_start = _get_latest_month_start()
    if not latest_month_start:
        raise HTTPException(status_code=404, detail="No data found")

    # Helper to check if a table exists
    def _table_exists(table_name: str) -> bool:
        row = query_one(
            "SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename=%s",
            (table_name,)
        )
        return row is not None

    # FY date range for fallback raw-data queries
    fy_start_date = f"{start_year}-04-01"
    fy_end_date = f"{end_year}-03-31"

    if entity_type == "Customers":
        fy_table = f"customer_abc_xyz_fy_{start_year}_{end_year}"
        if _table_exists(fy_table):
            fy_sql = f'''SELECT customer_name, total_revenue
                FROM public."{fy_table}" ORDER BY total_revenue DESC LIMIT 10'''
            fy_rows = query_all(fy_sql)
        else:
            fy_sql = f'''SELECT customer_name, SUM(ass_value) AS total_revenue
                FROM public."spoorthi_dataset_without_spares"
                WHERE invoice_date >= '{fy_start_date}' AND invoice_date <= '{fy_end_date}'
                GROUP BY customer_name ORDER BY total_revenue DESC LIMIT 10'''
            fy_rows = query_all(fy_sql)

        latest_sql = f'''SELECT customer_name, SUM(ass_value) AS total_revenue
            FROM public."spoorthi_dataset_without_spares"
            WHERE invoice_date >= '{latest_month_start}'
            GROUP BY customer_name ORDER BY total_revenue DESC LIMIT 10'''
        latest_rows = query_all(latest_sql)

        top_fy = [
            TopPerformerItem(id=str(r["customer_name"]), revenue=float(r["total_revenue"] or 0), name=r["customer_name"])
            for r in fy_rows
        ]
        top_latest = [
            TopPerformerItem(id=str(r["customer_name"]), revenue=float(r["total_revenue"] or 0), name=r["customer_name"])
            for r in latest_rows
        ]

    else:  # Products
        fy_table = f"abc_categorization_spoorthi_{start_year}_{end_year}"
        if _table_exists(fy_table):
            fy_sql = f'''SELECT article_no, ass__value
                FROM public."{fy_table}" ORDER BY ass__value DESC LIMIT 10'''
            fy_rows = query_all(fy_sql)
            top_fy = [
                TopPerformerItem(id=str(r["article_no"]), revenue=float(r["ass__value"] or 0), name=str(r["article_no"]))
                for r in fy_rows
            ]
        else:
            fy_sql = f'''SELECT article_no, SUM(ass_value) AS total_revenue
                FROM public."spoorthi_dataset_without_spares"
                WHERE invoice_date >= '{fy_start_date}' AND invoice_date <= '{fy_end_date}'
                GROUP BY article_no ORDER BY total_revenue DESC LIMIT 10'''
            fy_rows = query_all(fy_sql)
            top_fy = [
                TopPerformerItem(id=str(r["article_no"]), revenue=float(r["total_revenue"] or 0), name=str(r["article_no"]))
                for r in fy_rows
            ]

        latest_sql = f'''SELECT article_no, SUM(ass_value) AS total_revenue
            FROM public."spoorthi_dataset_without_spares"
            WHERE invoice_date >= '{latest_month_start}'
            GROUP BY article_no ORDER BY total_revenue DESC LIMIT 10'''
        latest_rows = query_all(latest_sql)
        top_latest = [
            TopPerformerItem(id=str(r["article_no"]), revenue=float(r["total_revenue"] or 0), name=str(r["article_no"]))
            for r in latest_rows
        ]

    return TopPerformersResponse(
        top_fy=top_fy,
        top_latest=top_latest,
        entity_type=entity_type
    )
