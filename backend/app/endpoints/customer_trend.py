"""
Customer Trend Endpoints

Replicates: server/customer_trend_server.R
UI Reference: ui/customer_trend_ui.R

Provides customer trend analysis by ABC category over time.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import datetime, timedelta
from ..database import query_all
from ..schemas import CustomerTrendDataPoint

router = APIRouter(prefix="/customer-trend", tags=["Customer Trend"])

BASE_DATE = datetime(2021, 1, 1)

# Month labels for financial year (Apr-Mar)
MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
                "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]


@router.get("/trend", response_model=List[CustomerTrendDataPoint])
async def get_customer_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_categories: str = Query("Overall,A,B,C", description="Comma-separated categories"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'")
):
    """
    Get customer trend data by ABC category for a financial year.
    
    Matches: customer_trend_server.R -> plot_data reactive
    
    SQL Query:
        SELECT 
            a."TimeID",
            c."Category" as Category,
            SUM(a."Revenue") as Revenue,
            SUM(a."Quantity") as Quantity
        FROM public."Aggregated Data" a
        INNER JOIN public."customer_ABC_{table_suffix}" c 
            ON a."CustomerID" = c."CustomerID"
        WHERE a."TimeID" >= {start}
            AND a."TimeID" <= {end}
        GROUP BY a."TimeID", c."Category"
        ORDER BY a."TimeID", c."Category"
    
    Returns:
        [
            {"month_label": "Apr", "category": "A", "value": 12.5},
            {"month_label": "Apr", "category": "Overall", "value": 45.8},
            ...
        ]
    """
    # Parse FY
    fy_parts = financial_year.replace("FY", "").split("-")
    if len(fy_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    table_suffix = f"FY{fy_parts[0]}_{fy_parts[1]}"
    
    start_year = int(f"20{fy_parts[0]}")
    end_year = int(f"20{fy_parts[1]}")
    
    start_date = datetime(start_year, 4, 1)
    end_date = datetime(end_year, 3, 31)
    
    start_time_id = ((start_date.year - BASE_DATE.year) * 12 + 
                     (start_date.month - BASE_DATE.month) + 1)
    end_time_id = ((end_date.year - BASE_DATE.year) * 12 + 
                   (end_date.month - BASE_DATE.month) + 1)
    
    # Query data
    sql = f'''
        SELECT 
            a."TimeID",
            c."Category" AS "Category",
            SUM(a."Revenue") AS "Revenue",
            SUM(a."Quantity") AS "Quantity"
        FROM public."Aggregated Data" a
        INNER JOIN public."customer_ABC_{table_suffix}" c 
            ON a."CustomerID" = c."CustomerID"
        WHERE a."TimeID" >= {start_time_id}
            AND a."TimeID" <= {end_time_id}
        GROUP BY a."TimeID", c."Category"
        ORDER BY a."TimeID", c."Category"
    '''
    
    rows = query_all(sql)  # type: ignore
    
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")
    
    # Parse categories filter
    selected_categories = [cat.strip() for cat in abc_categories.split(",")]
    
    # Process data
    from collections import defaultdict
    
    metric_col = "Revenue" if metric == "Revenue" else "Quantity"
    
    # Group by TimeID and Category
    category_data = defaultdict(lambda: defaultdict(float))
    overall_data = defaultdict(float)
    
    for row in rows:
        time_id = row["TimeID"]
        category = row["Category"] or "Unknown"
        value = float(row[metric_col] or 0)
        
        category_data[category][time_id] += value
        overall_data[time_id] += value
    
    # Build response
    result = []
    
    # Get all unique TimeIDs
    all_time_ids = sorted(set(
        list(overall_data.keys()) + 
        [tid for cat_data in category_data.values() for tid in cat_data.keys()]
    ))
    
    for time_id in all_time_ids:
        # Calculate month number within FY (0-11)
        month_num = (time_id - start_time_id) % 12
        month_label = MONTH_LABELS[month_num]
        
        # Add Overall if selected
        if "Overall" in selected_categories:
            result.append(CustomerTrendDataPoint(
                month_label=month_label,
                category="Overall",
                value=round(overall_data[time_id], 2)
            ))
        
        # Add individual categories
        for cat in ["A", "B", "C"]:
            if cat in selected_categories and cat in category_data:
                result.append(CustomerTrendDataPoint(
                    month_label=month_label,
                    category=cat,
                    value=round(category_data[cat].get(time_id, 0.0), 2)
                ))
    
    return result
