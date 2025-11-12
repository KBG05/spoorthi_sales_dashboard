from fastapi import APIRouter
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from datetime import datetime, timedelta
from ..database import (
    query_one, query_all, query_scalar,
    get_latest_rolling_table, get_latest_time_id,
    safe_table_name
)
from ..schemas import KPIResponse, CategoryCountResponse, CategoryRevenueResponse, ComboCountResponse
from typing import Any, Dict, List, Optional
import pandas as pd

router=APIRouter(prefix="/dashboard", tags=["Dashboard"])

#HELPER FUNCTION

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
async def get_dashboard_kpis():
    """
    Get KPIs for the single LATEST month.
    
    SQL Queries:
        1. SELECT MAX("TimeID") AS max_id FROM public."Aggregated Data"
        2. SELECT SUM("Revenue"), SUM("Quantity") FROM ... WHERE "TimeID" = {latest_id}
    
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
    max_id=get_latest_time_id()
    if not max_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data found for KPIs.",
        )
    
    sql='''
        SELECT 
            SUM("Revenue") AS total_revenue,
            SUM("Quantity") AS total_quantity
        FROM public."Aggregated Data"
        WHERE "TimeID" = %s
    '''
    kpi_data=query_one(sql, (max_id,))

    if not kpi_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KPI data found for the latest month.",
        )
    return KPIResponse(
        total_revenue=float(kpi_data['total_revenue'] or 0),
        total_quantity=int(kpi_data['total_quantity'] or 0),
        month_name=get_month_string_from_time_id(max_id),
        time_id=max_id
    )

@router.get("/abc-count", response_model=List[CategoryCountResponse])
def get_abc_count():
    """
    Get article count by ABC category.
    
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
    table_name = get_latest_rolling_table()
    
    if not table_name:
        raise HTTPException(
            status_code=404,
            detail="No rolling ABC/XYZ summary table found"
        )
    
    table = safe_table_name(table_name)
    
    sql = f'''
        SELECT 
            abc_category as category,
            COUNT(*) as count
        FROM {table}
        GROUP BY abc_category
        ORDER BY abc_category
    '''
    
    rows = query_all(sql)
    
    return [
        CategoryCountResponse(
            category=row["category"],
            count=int(row["count"])
        )
        for row in rows
    ]


@router.get("/abc-revenue", response_model=List[CategoryRevenueResponse])
def get_abc_revenue():
    """
    Get revenue by ABC category (in millions).
    
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
    table_name = get_latest_rolling_table()
    
    if not table_name:
        raise HTTPException(
            status_code=404,
            detail="No rolling ABC/XYZ summary table found"
        )
    
    table = safe_table_name(table_name)
    
    sql = f'''
        SELECT 
            abc_category as category,
            SUM(total_revenue) / 1000000.0 as revenue
        FROM {table}
        GROUP BY abc_category
        ORDER BY abc_category
    '''
    
    rows = query_all(sql)
    
    return [
        CategoryRevenueResponse(
            category=row["category"],
            revenue=round(float(row["revenue"]), 2)
        )
        for row in rows
    ]


@router.get("/xyz-count", response_model=List[CategoryCountResponse])
def get_xyz_count():
    """
    Get article count by XYZ category.
    
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
    table_name = get_latest_rolling_table()
    
    if not table_name:
        raise HTTPException(
            status_code=404,
            detail="No rolling ABC/XYZ summary table found"
        )
    
    table = safe_table_name(table_name)
    
    sql = f'''
        SELECT 
            xyz_category as category,
            COUNT(*) as count
        FROM {table}
        GROUP BY xyz_category
        ORDER BY xyz_category
    '''
    
    rows = query_all(sql)
    
    return [
        CategoryCountResponse(
            category=row["category"],
            count=int(row["count"])
        )
        for row in rows
    ]


@router.get("/xyz-revenue", response_model=List[CategoryRevenueResponse])
def get_xyz_revenue():
    """
    Get revenue by XYZ category (in millions).
    
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
    table_name = get_latest_rolling_table()
    
    if not table_name:
        raise HTTPException(
            status_code=404,
            detail="No rolling ABC/XYZ summary table found"
        )
    
    table = safe_table_name(table_name)
    
    sql = f'''
        SELECT 
            xyz_category as category,
            SUM(total_revenue) / 1000000.0 as revenue
        FROM {table}
        GROUP BY xyz_category
        ORDER BY xyz_category
    '''
    
    rows = query_all(sql)
    
    return [
        CategoryRevenueResponse(
            category=row["category"],
            revenue=round(float(row["revenue"]), 2)
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
            status_code=404,
            detail="No rolling ABC/XYZ summary table found"
        )
    
    table = safe_table_name(table_name)
    
    sql = f'''
        SELECT 
            abc_category,
            xyz_category,
            abc_category || xyz_category as abc_xyz,
            COUNT(*) as count
        FROM {table}
        GROUP BY abc_category, xyz_category
        ORDER BY abc_category, xyz_category
    '''
    
    rows = query_all(sql)
    
    return [
        ComboCountResponse(
            abc_category=row["abc_category"],
            xyz_category=row["xyz_category"],
            abc_xyz=row["abc_xyz"],
            count=int(row["count"])
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
            detail="No rolling ABC/XYZ summary table found."
        )
    
    table = safe_table_name(table_name)
    
    # Get all available data from the rolling summary table
    sql = f'''
        SELECT 
            article_no,
            abc_category,
            xyz_category,
            total_revenue,
            total_quantity
        FROM {table}
        ORDER BY abc_category, xyz_category, total_revenue DESC
    '''
    
    rows = query_all(sql)
    
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data available for export."
        )
    
    # Convert to pandas DataFrame and then to CSV
    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rolling_abc_xyz_analysis.csv"}
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No forecast table found."
        )
    
    table_name = result["table_name"]
    
    # Use exact same query as forecast.py
    sql = f'''
        SELECT "ProductID", "ForecastMonth", "PredictedQuantity" 
        FROM public."{table_name}" 
        ORDER BY "ProductID"
    '''
    
    rows = query_all(sql)
    
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No forecast data available for export."
        )
    
    # Convert to pandas DataFrame and then to CSV
    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=demand_forecast.csv"}
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
            detail="No cross-sell recommendations table found."
        )
    
    table_name = result["tablename"]
    
    # Use exact same query as cross_sell.py
    data_query = f'''
        SELECT 
            "Distributor_Code",
            "Products_Bought_Together",
            "Suggested_Product"
        FROM public."{table_name}"
        ORDER BY "Distributor_Code"
    '''
    
    rows = query_all(data_query)
    
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cross-sell data available for export."
        )
    
    # Convert to pandas DataFrame and then to CSV
    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cross_sell_recommendations.csv"}
    )
