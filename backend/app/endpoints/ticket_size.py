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
from ..schemas import TicketSizeBand, TicketSizeBandDetail, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/ticket-size", tags=["Ticket Size"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)

# Revenue band definitions
LAKH = 100000
CRORE = 100 * LAKH

BAND_LEVELS = ["0-5L", "5L-20L", "20L-50L", "50L-1CR", "1CR+"]


@router.get("/available-years")
async def get_available_years():
    """
    Get list of available financial years based on invoice data.
    """
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

    fy_years = []
    for row in rows:
        start_year = int(row["start_year"])
        fy_years.append(
            f"FY{str(start_year)[-2:]}-{str(start_year + 1)[-2:]}"
        )

    return {"financial_years": fy_years}


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


@router.get("/band-details", response_model=List[TicketSizeBandDetail])
async def get_ticket_size_band_details(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    dimension: Literal["Products", "Customers"] = Query("Products", description="'Products' or 'Customers'"),
    band: str = Query(..., description="Revenue band, e.g. '0-5L'"),
):
    """
    Get the individual customers/products that fall within a given revenue band,
    for drill-down when a ticket size bar is clicked.
    """
    if band not in BAND_LEVELS:
        raise HTTPException(status_code=400, detail="Invalid band")

    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    if dimension == "Products":
        sql = '''
            SELECT
              d.article_no AS "ID",
              COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), d.article_no) AS "Name",
              SUM(d.ass_value) AS "Total_Revenue",
              COUNT(*) AS "Invoice_Count",
              COUNT(DISTINCT d.customer_name) AS "Customer_Count"
            FROM public."spoorthi_dataset_without_spares" d
            LEFT JOIN public.sphoorti_product_master pm
              ON pm.article_no = d.article_no
            WHERE d.invoice_date BETWEEN %s AND %s
            GROUP BY d.article_no, "Name"
        '''
    else:
        sql = '''
            SELECT
              d.customer_name AS "ID",
              d.customer_name AS "Name",
              SUM(d.ass_value) AS "Total_Revenue",
              COUNT(*) AS "Invoice_Count",
              COUNT(DISTINCT d.article_no) AS "Product_Count"
            FROM public."spoorthi_dataset_without_spares" d
            WHERE d.invoice_date BETWEEN %s AND %s
            GROUP BY d.customer_name
        '''

    rows = query_all(sql, (start_date, end_date))  # type: ignore

    results = []
    for row in rows:
        revenue = float(row["Total_Revenue"] or 0)

        if revenue <= 5 * LAKH:
            row_band = "0-5L"
        elif revenue <= 20 * LAKH:
            row_band = "5L-20L"
        elif revenue <= 50 * LAKH:
            row_band = "20L-50L"
        elif revenue <= 1 * CRORE:
            row_band = "50L-1CR"
        else:
            row_band = "1CR+"

        if row_band != band:
            continue

        results.append(TicketSizeBandDetail(
            id=str(row["ID"]),
            name=str(row.get("Name") or row["ID"]),
            revenue=revenue,
            invoice_count=int(row["Invoice_Count"] or 0),
            related_count=int(row.get("Customer_Count") or row.get("Product_Count") or 0),
        ))

    results.sort(key=lambda r: r.revenue, reverse=True)

    return results
