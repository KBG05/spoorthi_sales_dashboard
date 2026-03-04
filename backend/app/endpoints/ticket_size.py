"""
Ticket Size Endpoints

Replicates: server/ticket_size_server.R
UI Reference: ui/ticket_size_ui.R

Provides revenue band analysis for customers or products.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Literal
from datetime import datetime
from ..database import query_all, parse_fy
from ..schemas import TicketSizeBand, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/ticket-size", tags=["Ticket Size"], dependencies=[Depends(get_current_user)])

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
    Uses spoorthi_dataset_without_spares with date-based filtering.
    """
    # Parse FY to get date range
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"
    
    # Determine grouping column
    group_by_col = "article_no" if dimension == "Products" else "customer_name"
    
    # Query total revenue per entity
    sql = f'''
        SELECT
          {group_by_col} AS "ID",
          SUM(ass_value) AS "Total_Revenue"
        FROM public."spoorthi_dataset_without_spares"
        WHERE invoice_date BETWEEN '{start_date}' AND '{end_date}'
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
