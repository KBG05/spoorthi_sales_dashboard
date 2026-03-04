"""
Customer Trend Endpoints

Replicates: server/customer_trend_server.R
UI Reference: ui/customer_trend_ui.R

Provides customer trend analysis by ABC category over time.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime, timedelta
from ..database import query_all, parse_fy
from ..schemas import CustomerTrendDataPoint, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/customer-trend", tags=["Customer Trend"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


@router.get("/available-years")
async def get_available_years():
    """
    Get list of available financial years based on spoorthi_abc_xyz_datamart.
    """
    table_query = """
        SELECT DISTINCT fin_year_label 
        FROM public.spoorthi_abc_xyz_datamart 
        WHERE fin_year_label IS NOT NULL
        ORDER BY fin_year_label DESC
    """
    
    rows = query_all(table_query)  # type: ignore
    
    if not rows:
        return {"financial_years": []}
    
    fy_years = [row["fin_year_label"] for row in rows if row["fin_year_label"]]
    
    return {"financial_years": fy_years}

# Month labels for financial year (Apr-Mar)
MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
                "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]


@router.get("/trend", response_model=List[CustomerTrendDataPoint])
def get_customer_trend(
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
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"
    
    # Query data
    sql = f'''
        SELECT 
            TO_CHAR(a.invoice_date, 'YYYY-MM') AS "TimeID",
            c.abc_category AS "Category",
            SUM(a.ass_value) AS "Revenue",
            SUM(a.inv_quantity) AS "Quantity"
        FROM public."spoorthi_dataset_without_spares" a
        INNER JOIN public."customer_abc_xyz_fy_{start_year}_{end_year}" c 
            ON a.customer_name = c.customer_name
        WHERE a.invoice_date BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY TO_CHAR(a.invoice_date, 'YYYY-MM'), c.abc_category
        ORDER BY TO_CHAR(a.invoice_date, 'YYYY-MM'), c.abc_category
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
        time_id = row["TimeID"] # 'YYYY-MM'
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
        # Calculate month number within FY (0-11) based on month string
        y, m = map(int, time_id.split("-"))
        
        # calculate diff in months from start_date
        month_num = (y - start_year) * 12 + (m - 4)
        if 0 <= month_num < 12:
            month_label = MONTH_LABELS[month_num]
        else:
            month_label = f"{y}-{m:02d}" # fallback
        
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

