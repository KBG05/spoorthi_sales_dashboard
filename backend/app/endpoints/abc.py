"""
ABC Analysis Endpoints

Replicates: server/abc_server.R
UI Reference: ui/abc_ui.R

Provides product trend data grouped by ABC and XYZ categories.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime, timedelta
from ..database import query_all
from ..schemas import ABCTrendDataPoint, ABCTrendResponse, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/abc", tags=["ABC Analysis"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


@router.get("/trend", response_model=ABCTrendResponse)
async def get_abc_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_categories: str = Query("A,B,C", description="Comma-separated ABC categories"),
    xyz_categories: str = Query("X,Y,Z", description="Comma-separated XYZ categories"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'")
):
    """
    Get product trend data by ABC/XYZ categories for a financial year.
    
    Matches: abc_server.R -> trendPlot renderPlot
    
    SQL Query:
        SELECT
            t1."TimeID",
            t2."ABC_Category",
            t2."XYZ_Category",
            SUM(t1."Quantity") AS "TotalQuantity",
            SUM(t1."Revenue") AS "TotalValue"
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."product_ABC_XYZ_{table_suffix}" AS t2 
            ON t1."ProductID" = t2."ProductID"
        WHERE
            t1."TimeID" BETWEEN {start} AND {end}
            AND t2."ABC_Category" IN (...)
            AND t2."XYZ_Category" IN (...)
        GROUP BY t1."TimeID", t2."ABC_Category", t2."XYZ_Category"
        ORDER BY t1."TimeID"
    
    Functions Used:
        - query_all() - execute query and get all rows
    
    Returns:
        {
            "data": [
                {"month_date": "2024-04-01", "abc_category": "A", "value": 12.5},
                {"month_date": "2024-04-01", "abc_category": "Overall", "value": 45.8},
                ...
            ],
            "metric": "Revenue",
            "financial_year": "FY24-25"
        }
    """
    # Parse FY to get TimeID range
    # FY24-25 means Apr 2024 to Mar 2025
    # Assuming TimeID 1 = Apr 2021, we need to calculate offset
    fy_parts = financial_year.replace("FY", "").split("-")
    if len(fy_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    start_year = int(f"20{fy_parts[0]}")
    end_year = int(f"20{fy_parts[1]}")
    
    # Calculate TimeID: months since BASE_DATE (Apr 2021 = TimeID 1)
    start_date = datetime(start_year, 4, 1)  # April of start year
    end_date = datetime(end_year, 3, 31)  # March of end year
    
    start_time_id = ((start_date.year - BASE_DATE.year) * 12 + 
                     (start_date.month - BASE_DATE.month) + 1)
    end_time_id = ((end_date.year - BASE_DATE.year) * 12 + 
                   (end_date.month - BASE_DATE.month) + 1)
    
    # Build table name
    table_suffix = f"FY{fy_parts[0]}_{fy_parts[1]}"
    
    # Parse categories
    abc_list = [cat.strip().upper() for cat in abc_categories.split(",")]
    xyz_list = [cat.strip().upper() for cat in xyz_categories.split(",")]
    
    abc_in = ",".join([f"'{cat}'" for cat in abc_list])
    xyz_in = ",".join([f"'{cat}'" for cat in xyz_list])
    
    # Build query - two queries: one for filtered data, one for overall
    # Filtered query for ABC/XYZ combinations
    sql_filtered = f'''
        SELECT
            t1."TimeID",
            t2."ABC_Category",
            t2."XYZ_Category",
            SUM(t1."Quantity") AS "TotalQuantity",
            SUM(t1."Revenue") AS "TotalValue"
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."product_ABC_XYZ_{table_suffix}" AS t2 
            ON t1."ProductID" = t2."ProductID"
        WHERE
            t1."TimeID" BETWEEN {start_time_id} AND {end_time_id}
            AND t2."ABC_Category" IN ({abc_in})
            AND t2."XYZ_Category" IN ({xyz_in})
        GROUP BY t1."TimeID", t2."ABC_Category", t2."XYZ_Category"
        ORDER BY t1."TimeID"
    '''
    
    # Overall query - no filters on ABC/XYZ
    sql_overall = f'''
        SELECT
            t1."TimeID",
            SUM(t1."Quantity") AS "TotalQuantity",
            SUM(t1."Revenue") AS "TotalValue"
        FROM public."Aggregated Data" AS t1
        WHERE t1."TimeID" BETWEEN {start_time_id} AND {end_time_id}
        GROUP BY t1."TimeID"
        ORDER BY t1."TimeID"
    '''
    
    rows = query_all(sql_filtered)  # type: ignore
    overall_rows = query_all(sql_overall)  # type: ignore
    
    # Process overall data first
    overall = {}
    metric_col = "TotalValue" if metric == "Revenue" else "TotalQuantity"
    
    for row in overall_rows:
        time_id = row["TimeID"]
        value = float(row[metric_col] or 0)
        
        # Convert to millions if Revenue
        if metric == "Revenue":
            value = value / 1_000_000
        
        overall[time_id] = value
    
    # If no filtered data but we have overall data, return just overall
    # If no data at all, raise 404
    if not rows and not overall_rows:
        raise HTTPException(
            status_code=404,
            detail="No data found for the selected filters"
        )
    
    # Process filtered data: aggregate by TimeID and ABC_Category
    from collections import defaultdict
    
    # Group by TimeID and ABC_Category
    grouped = defaultdict(lambda: defaultdict(float))
    
    for row in rows:
        time_id = row["TimeID"]
        abc_cat = row["ABC_Category"]
        value = float(row[metric_col] or 0)
        
        # Convert to millions if Revenue
        if metric == "Revenue":
            value = value / 1_000_000
        
        grouped[time_id][abc_cat] += value
    
    # Build response data
    data_points = []
    
    # Get all unique TimeIDs from both queries
    all_time_ids = set(list(grouped.keys()) + list(overall.keys()))
    
    for time_id in sorted(all_time_ids):
        # Calculate proper month/year from TimeID
        # TimeID 1 = Jan 2021, so we add (time_id - 1) months to BASE_DATE
        months_offset = time_id - 1
        year = BASE_DATE.year + (BASE_DATE.month + months_offset - 1) // 12
        month = (BASE_DATE.month + months_offset - 1) % 12 + 1
        month_date = datetime(year, month, 1)
        month_str = month_date.strftime("%Y-%m-%d")
        
        # Add individual ABC categories (only if they have data)
        if time_id in grouped:
            for abc_cat in sorted(grouped[time_id].keys()):
                data_points.append(ABCTrendDataPoint(
                    month_date=month_str,
                    abc_category=abc_cat,
                    value=round(grouped[time_id][abc_cat], 2)
                ))
        
        # Add Overall (always from overall query)
        if time_id in overall:
            data_points.append(ABCTrendDataPoint(
                month_date=month_str,
                abc_category="Overall",
                value=round(overall[time_id], 2)
            ))
    
    return ABCTrendResponse(
        data=data_points,
        metric=metric,
        financial_year=financial_year
    )
