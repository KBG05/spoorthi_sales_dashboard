"""
Ticket Size Endpoints

Replicates: server/ticket_size_server.R
UI Reference: ui/ticket_size_ui.R

Provides revenue band analysis for customers or products.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Literal
from datetime import datetime
from ..database import query_all
from ..schemas import TicketSizeBand

router = APIRouter(prefix="/ticket-size", tags=["Ticket Size"])

BASE_DATE = datetime(2021, 1, 1)

# Revenue band definitions
LAKH = 100000
CRORE = 100 * LAKH

BAND_LEVELS = ["0-5L", "5L-20L", "20L-50L", "50L-1CR", "1CR+"]


@router.get("/bands", response_model=List[TicketSizeBand])
async def get_ticket_size_bands(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    dimension: Literal["Products", "Customers"] = Query("Products", description="'Products' or 'Customers'")
):
    """
    Get revenue band distribution for products or customers.
    
    Matches: ticket_size_server.R -> binned_data reactive
    
    SQL Query:
        SELECT
          {group_by_col} AS "ID",
          SUM("Revenue") AS "Total_Revenue"
        FROM public."Aggregated Data"
        WHERE
          "TimeID" BETWEEN {start} AND {end}
        GROUP BY {group_by_col}
    
    Then bins data into revenue ranges and calculates count and total revenue per band.
    
    Returns:
        [
            {"band": "0-5L", "metric": "Count", "value": 150, "plot_label": "150"},
            {"band": "0-5L", "metric": "Revenue", "value": 45000000, "plot_label": "₹4.5 CR"},
            {"band": "5L-20L", "metric": "Count", "value": 80, "plot_label": "80"},
            ...
        ]
    """
    # Parse FY to get TimeID range
    fy_parts = financial_year.replace("FY", "").split("-")
    if len(fy_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    start_year = int(f"20{fy_parts[0]}")
    end_year = int(f"20{fy_parts[1]}")
    
    start_date = datetime(start_year, 4, 1)
    end_date = datetime(end_year, 3, 31)
    
    start_time_id = ((start_date.year - BASE_DATE.year) * 12 + 
                     (start_date.month - BASE_DATE.month) + 1)
    end_time_id = ((end_date.year - BASE_DATE.year) * 12 + 
                   (end_date.month - BASE_DATE.month) + 1)
    
    # Determine grouping column
    group_by_col = '"ProductID"' if dimension == "Products" else '"CustomerID"'
    
    # Query total revenue per entity
    sql = f'''
        SELECT
          {group_by_col} AS "ID",
          SUM("Revenue") AS "Total_Revenue"
        FROM public."Aggregated Data"
        WHERE
          "TimeID" BETWEEN {start_time_id} AND {end_time_id}
        GROUP BY {group_by_col}
    '''
    
    rows = query_all(sql)  # type: ignore
    
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")
    
    # Bin the data
    from collections import defaultdict
    
    band_counts = defaultdict(int)
    band_revenues = defaultdict(float)
    
    for row in rows:
        revenue = float(row["Total_Revenue"] or 0)
        
        # Determine band
        if revenue <= 5 * LAKH:
            band = "0-5L"
        elif revenue <= 20 * LAKH:
            band = "5L-20L"
        elif revenue <= 50 * LAKH:
            band = "20L-50L"
        elif revenue <= 1 * CRORE:
            band = "50L-1CR"
        else:
            band = "1CR+"
        
        band_counts[band] += 1
        band_revenues[band] += revenue
    
    # Build response
    result = []
    
    for band in BAND_LEVELS:
        # Count metric
        count_val = band_counts.get(band, 0)
        result.append(TicketSizeBand(
            band=band,
            metric="Count",
            value=float(count_val),
            plot_label=str(count_val)
        ))
        
        # Revenue metric
        revenue_val = band_revenues.get(band, 0.0)
        revenue_cr = revenue_val / 1e7  # Convert to Crores
        result.append(TicketSizeBand(
            band=band,
            metric="Revenue",
            value=revenue_val,
            plot_label=f"₹{round(revenue_cr, 1)} CR"
        ))
    
    return result
