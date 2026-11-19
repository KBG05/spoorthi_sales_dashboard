"""
Top Performance Endpoints

Replicates: server/top_performance_server.R
UI Reference: ui/top_performance_ui.R

Provides top performers (customers, products and product categories) analysis,
ranked by value or quantity.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Literal, List
from ..database import query_all, query_one, parse_fy
from ..schemas import TopPerformersResponse, TopPerformerItem
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


EntityType = Literal["Customers", "Products", "Categories"]
Metric = Literal["Value", "Quantity"]

# Grouping key / display name per entity. Product category comes from the
# product master (same source as the forecast export), falling back to the
# invoice row's own category for articles missing from the master.
# Article codes in the invoice data sometimes carry trailing tabs/newlines, which
# plain TRIM() (spaces only) leaves in place and would split one product in two.
_ARTICLE = "BTRIM(d.article_no, E' \\t\\r\\n')"

_ENTITY_SQL = {
    "Customers": ("d.customer_name", "d.customer_name"),
    "Products": (
        _ARTICLE,
        f"COALESCE(MAX(NULLIF(TRIM(pm.description), '')), MAX(NULLIF(TRIM(pm.article_name), '')), {_ARTICLE})",
    ),
    "Categories": (
        "COALESCE(NULLIF(TRIM(pm.category), ''), NULLIF(TRIM(d.category), ''), 'Uncategorised')",
        None,
    ),
}


def _top_rows(entity_type: str, metric: str, start_date, end_date=None, limit: int = 10):
    key_sql, name_sql = _ENTITY_SQL[entity_type]
    name_sql = name_sql or key_sql
    order_col = "total_quantity" if metric == "Quantity" else "total_revenue"
    date_filter = "d.invoice_date >= %s" + (" AND d.invoice_date <= %s" if end_date else "")
    params = (start_date, end_date) if end_date else (start_date,)
    sql = f"""
        WITH pm AS (
            SELECT DISTINCT ON (BTRIM(article_no, E' \\t\\r\\n'))
                BTRIM(article_no, E' \\t\\r\\n') AS article_no, description, article_name, category
            FROM public.sphoorti_product_master
            WHERE article_no IS NOT NULL AND BTRIM(article_no, E' \\t\\r\\n') <> ''
            ORDER BY BTRIM(article_no, E' \\t\\r\\n')
        )
        SELECT
            {key_sql} AS id,
            {name_sql} AS name,
            SUM(d.ass_value) AS total_revenue,
            SUM(d.inv_quantity) AS total_quantity
        FROM public.spoorthi_dataset_without_spares d
        LEFT JOIN pm ON pm.article_no = {_ARTICLE}
        WHERE {date_filter}
          AND {key_sql} IS NOT NULL
        GROUP BY {key_sql}
        ORDER BY {order_col} DESC NULLS LAST
        LIMIT {int(limit)}
    """
    return [
        TopPerformerItem(
            id=str(r["id"]),
            name=str(r["name"]),
            revenue=float(r["total_revenue"] or 0),
            quantity=float(r["total_quantity"] or 0),
        )
        for r in query_all(sql, params)
    ]


@router.get("/available-years")
async def get_available_years(
    entity_type: EntityType = Query(
        ..., description="'Customers', 'Products' or 'Categories'"
    )
):
    """
    Get list of available financial years for top performers (from raw invoice data).
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
    entity_type: EntityType = Query(..., description="'Customers', 'Products' or 'Categories'"),
    financial_year: str = Query("FY24-25", description="Financial year for FY data"),
    metric: Metric = Query("Value", description="Rank by 'Value' (revenue) or 'Quantity'"),
):
    """
    Get top 10 customers, products or product categories for the FY and the latest month,
    ranked by value or quantity. Each item carries both revenue and quantity.
    """
    try:
        start_year, end_year, _ = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    latest_month_start = _get_latest_month_start()
    if not latest_month_start:
        raise HTTPException(status_code=404, detail="No data found")

    top_fy = _top_rows(entity_type, metric, f"{start_year}-04-01", f"{end_year}-03-31")
    top_latest = _top_rows(entity_type, metric, latest_month_start)

    return TopPerformersResponse(
        top_fy=top_fy,
        top_latest=top_latest,
        entity_type=entity_type,
        metric=metric,
    )
