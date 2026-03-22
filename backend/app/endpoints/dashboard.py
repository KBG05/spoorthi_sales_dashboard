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
    ABCXYZMatrixCell,
    ABCXYZMatrixResponse,
    ABCXYZArticleItem,
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


def time_id_to_yyyy_mm(time_id: int) -> str:
    """
    Convert numeric TimeID to 'YYYY-MM' string.
    TimeID 1 = January 2021, TimeID 60 = December 2025, etc.
    """
    year = BASE_DATE.year + ((BASE_DATE.month + time_id - 2) // 12)
    month = ((BASE_DATE.month + time_id - 2) % 12) + 1
    return f"{year}-{month:02d}"


def get_month_string_from_time_id(time_id: int) -> str:
    """
    Convert TimeID to month string in 'Month YYYY' format.
    TimeID represents months since January 2021 (TimeID=1).
    """
    if not time_id or not isinstance(time_id, int):
        return "Unknown month"

    try:
        year = BASE_DATE.year + ((BASE_DATE.month + time_id - 2) // 12)
        month = ((BASE_DATE.month + time_id - 2) % 12) + 1
        month_date = datetime(year, month, 1)
        return month_date.strftime("%B %Y")
    except Exception:
        return "Unknown month"


@router.get("/kpis")
async def get_dashboard_kpis(time_id: Optional[str] = None):
    """
    Get KPIs for a specific month or the LATEST month.
    """
    if time_id is None:
        # find the max month
        max_date_sql = """
            SELECT MAX(invoice_date) as max_date
            FROM public."spoorthi_dataset_without_spares"
        """
        row = query_one(max_date_sql)
        if not row or not row["max_date"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No data found for KPIs.",
            )
        max_date = row["max_date"]
        # Format as YYYY-MM
        time_id = f"{max_date.year}-{max_date.month:02d}"
    else:
        # If numeric time_id sent by frontend, convert to YYYY-MM
        if time_id.isdigit():
            time_id = time_id_to_yyyy_mm(int(time_id))

    start_date = f"{time_id}-01"

    # Needs to be end of month, but a simple prefix match on TO_CHAR works too
    sql = """
        SELECT 
            SUM(ass_value) AS total_revenue,
            SUM(inv_quantity) AS total_quantity
        FROM public."spoorthi_dataset_without_spares"
        WHERE TO_CHAR(invoice_date, 'YYYY-MM') = %s
    """
    kpi_data = query_one(sql, (time_id,))

    if not kpi_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KPI data found for the specified month.",
        )

    y, m = map(int, time_id.split("-"))
    month_val = datetime(y, m, 1)

    return KPIResponse(
        total_revenue=float(kpi_data["total_revenue"] or 0),
        total_quantity=int(kpi_data["total_quantity"] or 0),
        month_name=month_val.strftime("%B %Y"),
        time_id=0,  # Deprecated
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

    # Get all available data from the rolling summary table
    sql = f"""
        SELECT 
            r.article_no,
            COALESCE(dm.category, 'Unknown') AS category,
            r.abc_category,
            r.xyz_category,
            r.total_revenue,
            r.total_quantity
        FROM {table} r
        LEFT JOIN public."spoorthi_abc_xyz_datamart" dm 
            ON r.article_no = dm.article_no
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
        AND table_name = 'final_sales_forecasts'
        LIMIT 1
    """

    result = query_one(table_query)

    if not result or not result.get("table_name"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No forecast table found."
        )

    table_name = result["table_name"]

    # Fetch forecast data from final_sales_forecasts
    sql = f"""
        SELECT 
            f.article_no,
            f.article_no AS "ProductName",
            REPLACE(f.forecast_period::text, ' - ', ', ') AS "ForecastPeriod",
            f.final_forecast AS "PredictedQuantity"
        FROM public."{table_name}" f
        ORDER BY f.article_no
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
    # Find latest cross_sell table
    table_query = """
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename ~ '^cross_sell_[0-9]{4}_[0-9]{2}$'
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

    # Use new Spoorthi cross-sell table structure
    data_query = f"""
        SELECT 
            cr."Customer" AS "Customer_Name",
            cr."Trigger_Items_Antecedents" AS "Products_Bought_Together",
            cr."Recommended_Items_Consequents" AS "Suggested_Product"
        FROM public."{table_name}" cr
        ORDER BY cr."Customer"
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


def _find_latest_table(pattern: str):
    """Find the latest table matching a regex pattern (e.g. '^customer_abc_xyz_fy_')."""
    sql = """
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename ~ %s
        ORDER BY tablename DESC
        LIMIT 1
    """
    row = query_one(sql, (pattern,))
    return row["tablename"] if row else None


@router.get("/export/customer-abc-xyz-fy")
async def export_customer_abc_xyz_fy():
    """Export the latest Customer ABC/XYZ FY results as CSV."""
    table_name = _find_latest_table(r"^customer_abc_xyz_fy_")
    if not table_name:
        raise HTTPException(
            status_code=404, detail="No Customer ABC/XYZ FY table found."
        )

    rows = query_all(f'SELECT * FROM public."{table_name}" ORDER BY total_revenue DESC')
    if not rows:
        raise HTTPException(status_code=404, detail="No data available for export.")

    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table_name}.csv"},
    )


@router.get("/export/rfm-monthly")
async def export_rfm_monthly():
    """Export the latest RFM Monthly Scores as CSV."""
    table_name = _find_latest_table(r"^rfm_results_prediction_")
    if not table_name:
        raise HTTPException(status_code=404, detail="No RFM Monthly table found.")

    rows = query_all(f'SELECT * FROM public."{table_name}"')
    if not rows:
        raise HTTPException(status_code=404, detail="No data available for export.")

    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table_name}.csv"},
    )


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


@router.get("/abc-xyz-products", response_model=List[ABCXYZArticleItem])
async def get_abc_xyz_products(abc: str, xyz: str, time_id: Optional[int] = None):
    """
    Get product IDs and names for a specific ABC×XYZ cell.
    Used for the popup when clicking a matrix cell or bar chart bar.
    Fetches from rolling_abc_xyz_summary table to match matrix counts.
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

    table = safe_table_name(table_name)

    sql = f"""
        SELECT 
            DISTINCT r.article_no,
            COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), r.article_no) as product_name
        FROM {table} r
        LEFT JOIN public.sphoorti_product_master pm
            ON pm.article_no = r.article_no
        WHERE r.abc_category = %s
          AND r.xyz_category = %s
        ORDER BY r.article_no
    """

    rows = query_all(sql, (abc.upper(), xyz.upper()))

    return (
        [
            ABCXYZArticleItem(
                article_no=str(row["article_no"]),
                article_name=row.get("product_name") or "-",
            )
            for row in rows
        ]
        if rows
        else []
    )


@router.get("/category-hierarchy", response_model=Dict[str, Any])
async def get_category_hierarchy(
    time_id: Optional[str] = None, metric: str = "revenue"
):
    """
    Get hierarchical category data for dual-circle pie chart.
    """
    if time_id is None:
        # find the max month
        max_date_sql = """
            SELECT MAX(invoice_date) as max_date
            FROM public."spoorthi_dataset_without_spares"
        """
        row = query_one(max_date_sql)
        if not row or not row["max_date"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="No data found."
            )
        max_date = row["max_date"]
        time_id = f"{max_date.year}-{max_date.month:02d}"

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
    value_column = "ass_value" if metric.lower() == "revenue" else "inv_quantity"

    # Spoorthi DB has no product category master table.
    # Return a single "All Products" aggregation for the selected month.
    main_sql = f"""
        SELECT 
            'All Products' as category,
            SUM({value_column}) as value
        FROM public."spoorthi_dataset_without_spares"
        WHERE TO_CHAR(invoice_date, 'YYYY-MM') = '{time_id}'
    """

    main_rows = query_all(main_sql)

    # No subcategories available without product master
    sub_rows = []

    # Build main categories response
    main_categories = [
        CategoryHierarchyItem(
            id=row["category"] or "All Products",
            label=row["category"] or "All Products",
            value=float(row["value"] or 0),
            color="#4caf50",
        )
        for row in main_rows
    ]

    # No subcategories
    subcategories = []

    return {
        "main_categories": [item.dict() for item in main_categories],
        "subcategories": [item.dict() for item in subcategories],
    }
