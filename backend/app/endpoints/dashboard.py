from fastapi import APIRouter, Depends
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from datetime import datetime, timedelta
from ..database import (
    query_one,
    query_all,
    query_scalar,
    get_latest_rolling_table,
    get_latest_time_id,
    get_rolling_table_for_time_id,
    safe_table_name,
)
from ..schemas import (
    KPIResponse,
    CategoryCountResponse,
    CategoryRevenueResponse,
    ComboCountResponse,
    User,
    CategoryBreakupItem,
    ABCXYZMatrixCell,
    ABCXYZMatrixResponse,
    ABCXYZProductItem,
    CategoryHierarchyItem,
)
from ..endpoints.auth import get_current_user
from typing import Any, Dict, List, Optional
import pandas as pd

router = APIRouter(
    prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_user)]
)

# HELPER FUNCTION

BASE_DATE = datetime(2021, 1, 1)


def get_month_string_from_time_id(time_id: int) -> str:
    """
    Convert TimeID to month string in 'YYYY-MM' format.
    TimeID represents months since January 2021 (TimeID=1).

    Example:
        time_id = 1 -> "January 2021"
        time_id = 55 -> "July 2025"
    """
    if not time_id or not isinstance(time_id, int):
        return "Unknown month"

    try:
        # TimeID 1 = January 2021, TimeID 2 = February 2021, etc.
        # Add (time_id - 1) months to the base date
        year = BASE_DATE.year + ((BASE_DATE.month + time_id - 2) // 12)
        month = ((BASE_DATE.month + time_id - 2) % 12) + 1
        month_date = datetime(year, month, 1)
        return month_date.strftime("%B %Y")
    except Exception:
        return "Unknown month"


@router.get("/kpis")
async def get_dashboard_kpis(time_id: Optional[int] = None):
    """
    Get KPIs for a specific month or the LATEST month.

    Args:
        time_id: Optional TimeID. If not provided, uses latest month.

    SQL Queries:
        1. SELECT MAX("TimeID") AS max_id FROM public."Aggregated Data"
        2. SELECT SUM("Revenue"), SUM("Quantity") FROM ... WHERE "TimeID" = {time_id}

    Functions Used:
        - query_scalar() - get max TimeID
        - query_one() - get revenue/quantity sums
        - get_month_string_from_time_id() - convert TimeID to month name

    Returns:
        {
            "total_revenue": 12345678.90,
            "total_quantity": 98765,
            "month_name": "July 2025",
            "time_id": 55
        }
    """
    if time_id is None:
        time_id = get_latest_time_id()

    if not time_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data found for KPIs.",
        )

    sql = """
        SELECT 
            SUM("Revenue") AS total_revenue,
            SUM("Quantity") AS total_quantity
        FROM public."Aggregated Data"
        WHERE "TimeID" = %s
    """
    kpi_data = query_one(sql, (time_id,))

    if not kpi_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KPI data found for the specified month.",
        )
    return KPIResponse(
        total_revenue=float(kpi_data["total_revenue"] or 0),
        total_quantity=int(kpi_data["total_quantity"] or 0),
        month_name=get_month_string_from_time_id(time_id),
        time_id=time_id,
    )


@router.get("/abc-count", response_model=List[CategoryCountResponse])
def get_abc_count(time_id: Optional[int] = None):
    """
    Get article count by ABC category.

    Args:
        time_id: Optional TimeID. If not provided, uses latest month's rolling table.

    Matches: dashboard_server.R -> abc_count_chart renderPlot

    SQL Query:
        SELECT abc_category, COUNT(*) as count
        FROM public."rolling_abc_xyz_summary_YYYY_MM"
        GROUP BY abc_category
        ORDER BY abc_category

    Functions Used:
        - get_latest_rolling_table() - find latest rolling summary table
        - safe_table_name() - safely quote table name
        - query_all() - execute query and get all rows

    Returns:
        [
            {"category": "A", "count": 150},
            {"category": "B", "count": 200},
            {"category": "C", "count": 100}
        ]
    """
    if time_id is None:
        table_name = get_latest_rolling_table()
    else:
        table_name = get_rolling_table_for_time_id(time_id)

    if not table_name:
        raise HTTPException(
            status_code=404, detail="No rolling ABC/XYZ summary table found"
        )

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            abc_category as category,
            COUNT(*) as count
        FROM {table}
        GROUP BY abc_category
        ORDER BY abc_category
    """

    rows = query_all(sql)

    return [
        CategoryCountResponse(category=row["category"], count=int(row["count"]))
        for row in rows
    ]


@router.get("/abc-revenue", response_model=List[CategoryRevenueResponse])
def get_abc_revenue(time_id: Optional[int] = None):
    """
    Get revenue by ABC category (in millions).

    Args:
        time_id: Optional TimeID. If not provided, uses latest month's rolling table.

    Matches: dashboard_server.R -> abc_revenue_chart renderPlot

    SQL Query:
        SELECT abc_category, SUM(total_revenue) / 1e6 as revenue
        FROM public."rolling_abc_xyz_summary_YYYY_MM"
        GROUP BY abc_category
        ORDER BY abc_category

    Functions Used:
        - get_latest_rolling_table()
        - safe_table_name()
        - query_all()

    Returns:
        [
            {"category": "A", "revenue": 123.45},
            {"category": "B", "revenue": 67.89},
            {"category": "C", "revenue": 23.10}
        ]
    """
    if time_id is None:
        table_name = get_latest_rolling_table()
    else:
        table_name = get_rolling_table_for_time_id(time_id)

    if not table_name:
        raise HTTPException(
            status_code=404, detail="No rolling ABC/XYZ summary table found"
        )

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            abc_category as category,
            SUM(total_revenue) / 1000000.0 as revenue
        FROM {table}
        GROUP BY abc_category
        ORDER BY abc_category
    """

    rows = query_all(sql)

    return [
        CategoryRevenueResponse(
            category=row["category"], revenue=round(float(row["revenue"]), 2)
        )
        for row in rows
    ]


@router.get("/xyz-count", response_model=List[CategoryCountResponse])
def get_xyz_count(time_id: Optional[int] = None):
    """
    Get article count by XYZ category.

    Args:
        time_id: Optional TimeID. If not provided, uses latest month's rolling table.

    Matches: dashboard_server.R -> xyz_count_chart renderPlot

    SQL Query:
        SELECT xyz_category, COUNT(*) as count
        FROM public."rolling_abc_xyz_summary_YYYY_MM"
        GROUP BY xyz_category
        ORDER BY xyz_category

    Functions Used:
        - get_latest_rolling_table()
        - safe_table_name()
        - query_all()

    Returns:
        [
            {"category": "X", "count": 120},
            {"category": "Y", "count": 180},
            {"category": "Z", "count": 150}
        ]
    """
    if time_id is None:
        table_name = get_latest_rolling_table()
    else:
        table_name = get_rolling_table_for_time_id(time_id)

    if not table_name:
        raise HTTPException(
            status_code=404, detail="No rolling ABC/XYZ summary table found"
        )

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            xyz_category as category,
            COUNT(*) as count
        FROM {table}
        GROUP BY xyz_category
        ORDER BY xyz_category
    """

    rows = query_all(sql)

    return [
        CategoryCountResponse(category=row["category"], count=int(row["count"]))
        for row in rows
    ]


@router.get("/xyz-revenue", response_model=List[CategoryRevenueResponse])
def get_xyz_revenue(time_id: Optional[int] = None):
    """
    Get revenue by XYZ category (in millions).

    Args:
        time_id: Optional TimeID. If not provided, uses latest month's rolling table.

    Matches: dashboard_server.R -> xyz_revenue_chart renderPlot

    SQL Query:
        SELECT xyz_category, SUM(total_revenue) / 1e6 as revenue
        FROM public."rolling_abc_xyz_summary_YYYY_MM"
        GROUP BY xyz_category
        ORDER BY xyz_category

    Functions Used:
        - get_latest_rolling_table()
        - safe_table_name()
        - query_all()

    Returns:
        [
            {"category": "X", "revenue": 89.50},
            {"category": "Y", "revenue": 72.30},
            {"category": "Z", "revenue": 52.65}
        ]
    """
    if time_id is None:
        table_name = get_latest_rolling_table()
    else:
        table_name = get_rolling_table_for_time_id(time_id)

    if not table_name:
        raise HTTPException(
            status_code=404, detail="No rolling ABC/XYZ summary table found"
        )

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            xyz_category as category,
            SUM(total_revenue) / 1000000.0 as revenue
        FROM {table}
        GROUP BY xyz_category
        ORDER BY xyz_category
    """

    rows = query_all(sql)

    return [
        CategoryRevenueResponse(
            category=row["category"], revenue=round(float(row["revenue"]), 2)
        )
        for row in rows
    ]


@router.get("/abc-xyz-count", response_model=List[ComboCountResponse])
def get_abc_xyz_count():
    """
    Get article count by ABC-XYZ combination.

    Matches: dashboard_server.R -> abc_xyz_count_chart renderPlot

    SQL Query:
        SELECT
            abc_category,
            xyz_category,
            abc_category || xyz_category as abc_xyz,
            COUNT(*) as count
        FROM public."rolling_abc_xyz_summary_YYYY_MM"
        GROUP BY abc_category, xyz_category
        ORDER BY abc_category, xyz_category

    Functions Used:
        - get_latest_rolling_table()
        - safe_table_name()
        - query_all()

    Returns:
        [
            {"abc_category": "A", "xyz_category": "X", "abc_xyz": "AX", "count": 50},
            {"abc_category": "A", "xyz_category": "Y", "abc_xyz": "AY", "count": 60},
            {"abc_category": "A", "xyz_category": "Z", "abc_xyz": "AZ", "count": 40},
            {"abc_category": "B", "xyz_category": "X", "abc_xyz": "BX", "count": 70},
            ...
        ]
    """
    table_name = get_latest_rolling_table()

    if not table_name:
        raise HTTPException(
            status_code=404, detail="No rolling ABC/XYZ summary table found"
        )

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            abc_category,
            xyz_category,
            abc_category || xyz_category as abc_xyz,
            COUNT(*) as count
        FROM {table}
        GROUP BY abc_category, xyz_category
        ORDER BY abc_category, xyz_category
    """

    rows = query_all(sql)

    return [
        ComboCountResponse(
            abc_category=row["abc_category"],
            xyz_category=row["xyz_category"],
            abc_xyz=row["abc_xyz"],
            count=int(row["count"]),
        )
        for row in rows
    ]


# ========== EXPORT ENDPOINTS ==========

from fastapi.responses import StreamingResponse
import io
import csv


@router.get("/export/rolling-abc-xyz")
async def export_rolling_abc_xyz():
    """
    Export the latest Rolling ABC/XYZ Analysis results as CSV.
    Downloads the full results from the latest monthly rolling ABC/XYZ summary table.
    """
    table_name = get_latest_rolling_table()
    if not table_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No rolling ABC/XYZ summary table found.",
        )

    table = safe_table_name(table_name)

    # Get all available data from the rolling summary table with product names
    sql = f"""
        SELECT 
            r.article_no,
            COALESCE(
                (SELECT STRING_AGG(DISTINCT pm.commercial_name, ', ')
                 FROM priyatextile_product_master pm
                 WHERE CAST(pm.product_code AS TEXT) = CAST(r.article_no AS TEXT)
                   AND pm.commercial_name IS NOT NULL),
                '-'
            ) AS product_name,
            r.abc_category,
            r.xyz_category,
            r.total_revenue,
            r.total_quantity
        FROM {table} r
        ORDER BY r.abc_category, r.xyz_category, r.total_revenue DESC
    """

    rows = query_all(sql)

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data available for export.",
        )

    # Convert to pandas DataFrame and then to CSV
    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=rolling_abc_xyz_analysis.csv"
        },
    )


@router.get("/export/forecast")
async def export_forecast():
    """
    Export Demand Forecast results as CSV.
    Downloads Product ID, Forecast Month, and Predicted Quantity from the latest forecast table.
    """
    # Find latest forecast table
    table_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'demand_forecast_%_%'
        ORDER BY table_name DESC
        LIMIT 1
    """

    result = query_one(table_query)

    if not result or not result.get("table_name"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No forecast table found."
        )

    table_name = result["table_name"]

    # Use exact same query as forecast.py with product names
    sql = f"""
        SELECT 
            f."ProductID",
            COALESCE(
                (SELECT STRING_AGG(DISTINCT pm.commercial_name, ', ')
                 FROM priyatextile_product_master pm
                 WHERE CAST(pm.product_code AS TEXT) = CAST(f."ProductID" AS TEXT)
                   AND pm.commercial_name IS NOT NULL),
                '-'
            ) AS "ProductName",
            f."ForecastMonth",
            f."PredictedQuantity" 
        FROM public."{table_name}" f
        ORDER BY f."ProductID"
    """

    rows = query_all(sql)

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No forecast data available for export.",
        )

    # Convert to pandas DataFrame and then to CSV
    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=demand_forecast.csv"},
    )


@router.get("/export/cross-sell")
async def export_cross_sell():
    """
    Export Cross-Sell Recommendations as CSV.
    Downloads Distributor Code, Products Bought Together, and Suggested Product from the latest cross-sell table.
    """
    # Find latest cross_sell_recommendations table
    table_query = """
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename ~ '^cross_sell_recommendations_[0-9]{4}_[0-9]{2}$'
        ORDER BY tablename DESC
        LIMIT 1
    """

    result = query_one(table_query)

    if not result or not result.get("tablename"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cross-sell recommendations table found.",
        )

    table_name = result["tablename"]

    # Use exact same query as cross_sell.py with customer names
    data_query = f"""
        SELECT 
            cr."Distributor_Code",
            COALESCE(cm.customer, '-') AS "Customer_Name",
            cr."Products_Bought_Together",
            cr."Suggested_Product"
        FROM public."{table_name}" cr
        LEFT JOIN priyatextile_customer_master cm 
            ON CAST(cr."Distributor_Code" AS TEXT) = CAST(cm.customer_code AS TEXT)
        ORDER BY cr."Distributor_Code"
    """

    rows = query_all(data_query)

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cross-sell data available for export.",
        )

    # Convert to pandas DataFrame and then to CSV
    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=cross_sell_recommendations.csv"
        },
    )


@router.get("/category-breakup", response_model=List[CategoryBreakupItem])
async def get_category_breakup(time_id: Optional[int] = None):
    """
    Get revenue and quantity breakdown by product category (Monofilaments, Trading, MISC).

    Args:
        time_id: Optional TimeID. If not provided, uses latest month.

    Returns:
        [
            {"category": "Monofilaments", "revenue": 12345678.90, "quantity": 5000},
            {"category": "Trading", "revenue": 9876543.21, "quantity": 3000},
            {"category": "MISC", "revenue": 1234567.89, "quantity": 1000}
        ]
    """
    if time_id is None:
        time_id = get_latest_time_id()

    if not time_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No data found."
        )

    sql = """
        SELECT 
            CASE 
                WHEN pm.clean_cat IN ('MCF', 'WMF', 'INSECT NET', 'INSECT NET BAG', 'HAPPA', 'YARN') THEN 'Monofilaments'
                WHEN pm.clean_cat IN ('MSN', 'TSN', 'PP WOVEN SACK', 'WMT', 'BIRD NET', 'KNITTED FABRIC', 'KNOTTED NETTING', 'MULCH FILM', 'OTHERS') THEN 'Trading'
                WHEN pm.clean_cat IN ('HDPE', 'CP', 'MB') THEN 'RM'
                WHEN pm.clean_cat IN ('WASTE', 'SUNDRY', 'ROPE') THEN 'MISC'
            END as category,
            SUM(ad."Revenue") as revenue,
            SUM(ad."Quantity") as quantity
        FROM public."Aggregated Data" ad
        LEFT JOIN (
            SELECT product_code, MAX(category) as clean_cat
            FROM priyatextile_product_master
            GROUP BY product_code
        ) pm ON ad."ProductID" = pm.product_code
        WHERE ad."TimeID" = %s
          AND pm.clean_cat IN (
              'MCF', 'WMF', 'INSECT NET', 'INSECT NET BAG', 'HAPPA', 'YARN',
              'MSN', 'TSN', 'PP WOVEN SACK', 'WMT', 'BIRD NET', 'KNITTED FABRIC', 'KNOTTED NETTING', 'MULCH FILM', 'OTHERS',
              'HDPE', 'CP', 'MB',
              'WASTE', 'SUNDRY', 'ROPE'
          )
        GROUP BY category
        ORDER BY revenue DESC
    """

    rows = query_all(sql, (time_id,))

    if not rows:
        return []

    return [
        CategoryBreakupItem(
            category=row["category"] or "MISC",
            revenue=float(row["revenue"] or 0),
            quantity=int(row["quantity"] or 0),
        )
        for row in rows
    ]


@router.get("/abc-xyz-matrix", response_model=ABCXYZMatrixResponse)
async def get_abc_xyz_matrix(time_id: Optional[int] = None):
    """
    Get 3×3 ABC×XYZ matrix with counts and revenue for each combination.
    Returns a wrapper with cells + period_label (FY info).
    Automatically falls back to the latest available table when the requested
    month's rolling table doesn't exist (e.g., future months Feb/Mar).
    """
    # Get the appropriate rolling table based on time_id
    table_name = None
    if time_id is None:
        table_name = get_latest_rolling_table()
    else:
        table_name = get_rolling_table_for_time_id(time_id)
        # Fallback to latest if future month doesn't have a table yet
        if not table_name:
            table_name = get_latest_rolling_table()

    if not table_name:
        raise HTTPException(
            status_code=404,
            detail="No rolling ABC/XYZ summary table found for the specified month",
        )

    # Parse period_label from table name (e.g., rolling_abc_xyz_summary_2025_12)
    parts = table_name.replace("rolling_abc_xyz_summary_", "").split("_")
    if len(parts) == 2:
        year, month = int(parts[0]), int(parts[1])
        # Determine FY: if month >= April, FY is year–(year+1), else (year-1)–year
        if month >= 4:
            fy_start = year
            fy_end = year + 1
        else:
            fy_start = year - 1
            fy_end = year
        period_label = f"FY {fy_start}-{str(fy_end)[-2:]}"
    else:
        period_label = "N/A"

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            abc_category,
            xyz_category,
            COUNT(*) as count,
            SUM(total_revenue) as revenue
        FROM {table}
        WHERE abc_category IS NOT NULL AND xyz_category IS NOT NULL
        GROUP BY abc_category, xyz_category
        ORDER BY abc_category, xyz_category
    """

    rows = query_all(sql)

    cells = (
        [
            ABCXYZMatrixCell(
                abc=row["abc_category"],
                xyz=row["xyz_category"],
                count=int(row["count"]),
                revenue=float(row["revenue"] or 0),
            )
            for row in rows
        ]
        if rows
        else []
    )

    return ABCXYZMatrixResponse(cells=cells, period_label=period_label)


@router.get("/abc-xyz-products", response_model=List[ABCXYZProductItem])
async def get_abc_xyz_products(abc: str, xyz: str, time_id: Optional[int] = None):
    """
    Get product IDs and names for a specific ABC×XYZ cell.
    Used for the popup when clicking a matrix cell or bar chart bar.
    """
    table_name = None
    if time_id is None:
        table_name = get_latest_rolling_table()
    else:
        table_name = get_rolling_table_for_time_id(time_id)
        if not table_name:
            table_name = get_latest_rolling_table()

    if not table_name:
        raise HTTPException(status_code=404, detail="No rolling table found")

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            r.article_no as product_id,
            pm.commercial_name as product_name
        FROM {table} r
        LEFT JOIN (
            SELECT product_code, MAX(commercial_name) as commercial_name
            FROM priyatextile_product_master
            GROUP BY product_code
        ) pm ON r.article_no = pm.product_code
        WHERE r.abc_category = %s AND r.xyz_category = %s
        ORDER BY r.total_revenue DESC
    """

    rows = query_all(sql, (abc.upper(), xyz.upper()))

    return (
        [
            ABCXYZProductItem(
                product_id=int(row["product_id"]),
                product_name=row.get("product_name") or "-",
            )
            for row in rows
        ]
        if rows
        else []
    )


@router.get("/category-hierarchy", response_model=Dict[str, Any])
async def get_category_hierarchy(
    time_id: Optional[int] = None, metric: str = "revenue"
):
    """
    Get hierarchical category data for dual-circle pie chart.

    Args:
        time_id: Optional TimeID. If not provided, uses latest month.
        metric: "revenue" or "quantity"

    Returns:
        {
            "main_categories": [{"id": "Monofilaments", "label": "Monofilaments", "value": 12345678.90, "color": "#..."}],
            "subcategories": [{"id": "MCF", "label": "MCF", "value": 5000000, "parent_category": "Monofilaments", "color": "#..."}]
        }
    """
    if time_id is None:
        time_id = get_latest_time_id()

    if not time_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No data found."
        )

    # Main category colors
    category_colors = {
        "Monofilaments": "#4caf50",  # Green
        "Trading": "#2196f3",  # Blue
        "MISC": "#ff9800",  # Orange
    }

    # Subcategory mapping with lighter/darker shades
    subcategory_info = {
        "MCF": {"parent": "Monofilaments", "opacity": 0.9},
        "WMF": {"parent": "Monofilaments", "opacity": 0.7},
        "INH": {"parent": "Monofilaments", "opacity": 0.5},
        "INB": {"parent": "Monofilaments", "opacity": 0.3},
        "Happa": {"parent": "Monofilaments", "opacity": 0.2},
        "MSN": {"parent": "Trading", "opacity": 0.9},
        "TSN": {"parent": "Trading", "opacity": 0.8},
        "PP Woven Sack": {"parent": "Trading", "opacity": 0.7},
        "WMT": {"parent": "Trading", "opacity": 0.6},
        "Bird Net": {"parent": "Trading", "opacity": 0.5},
        "Knitted Fabric": {"parent": "Trading", "opacity": 0.4},
        "Knotted Netting": {"parent": "Trading", "opacity": 0.3},
        "Mulch Film": {"parent": "Trading", "opacity": 0.2},
        "Others": {"parent": "Trading", "opacity": 0.15},
    }

    # Helper to convert hex to rgba
    def hex_to_rgba(hex_color: str, opacity: float) -> str:
        hex_color = hex_color.lstrip("#")
        r, g, b = (
            int(hex_color[0:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:6], 16),
        )
        return f"rgba({r}, {g}, {b}, {opacity})"

    # Determine the column to aggregate
    value_column = '"Revenue"' if metric.lower() == "revenue" else '"Quantity"'

    # Query for main categories - aggregate subcategories into main groups
    main_sql = f"""
        WITH categorized_data AS (
            SELECT 
                CASE 
                    WHEN pm.category IN ('MCF', 'WMF', 'INH', 'INB', 'Happa') THEN 'Monofilaments'
                    WHEN pm.category IN ('MSN', 'TSN', 'PP Woven Sack', 'WMT', 'Bird Net', 'Knitted Fabric', 'Knotted Netting', 'Mulch Film', 'Others') THEN 'Trading'
                    ELSE 'MISC'
                END as main_category,
                ad.{value_column} as value
            FROM public."Aggregated Data" ad
            LEFT JOIN (
                SELECT DISTINCT ON (product_code) product_code, category
                FROM priyatextile_product_master
            ) pm ON CAST(ad."ProductID" AS TEXT) = CAST(pm.product_code AS TEXT)
            WHERE ad."TimeID" = %s
        )
        SELECT 
            main_category as category,
            SUM(value) as value
        FROM categorized_data
        GROUP BY main_category
        ORDER BY value DESC
    """

    main_rows = query_all(main_sql, (time_id,))

    # Query for subcategories
    sub_sql = f"""
        SELECT 
            pm.category as subcategory,
            SUM(ad.{value_column}) as value
        FROM public."Aggregated Data" ad
        INNER JOIN (
            SELECT DISTINCT ON (product_code) product_code, category
            FROM priyatextile_product_master
        ) pm ON CAST(ad."ProductID" AS TEXT) = CAST(pm.product_code AS TEXT)
        WHERE ad."TimeID" = %s
          AND pm.category IS NOT NULL
        GROUP BY pm.category
        ORDER BY value DESC
    """

    sub_rows = query_all(sub_sql, (time_id,))

    # Build main categories response
    main_categories = [
        CategoryHierarchyItem(
            id=row["category"] or "MISC",
            label=row["category"] or "MISC",
            value=float(row["value"] or 0),
            color=category_colors.get(row["category"] or "MISC", "#9e9e9e"),
        )
        for row in main_rows
    ]

    # Build subcategories response with color based on parent
    subcategories = []
    for row in sub_rows:
        subcat = row["subcategory"]
        if subcat in subcategory_info:
            parent = subcategory_info[subcat]["parent"]
            opacity = subcategory_info[subcat]["opacity"]
            base_color = category_colors.get(parent, "#9e9e9e")
            color = hex_to_rgba(base_color, opacity)
        else:
            # MISC subcategories
            parent = "MISC"
            color = hex_to_rgba(category_colors["MISC"], 0.5)

        subcategories.append(
            CategoryHierarchyItem(
                id=subcat,
                label=subcat,
                value=float(row["value"] or 0),
                color=color,
                parent_category=parent,
            )
        )

    return {
        "main_categories": [item.dict() for item in main_categories],
        "subcategories": [item.dict() for item in subcategories],
    }
