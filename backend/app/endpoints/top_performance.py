"""
Top Performance Endpoints

Replicates: server/top_performance_server.R
UI Reference: ui/top_performance_ui.R

Provides top performers (customers and products) analysis.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Literal
from ..database import query_all, query_one, get_latest_time_id
from ..schemas import TopPerformersResponse, TopPerformerItem, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/top-performance", tags=["Top Performance"], dependencies=[Depends(get_current_user)])


@router.get("/top-performers", response_model=TopPerformersResponse)
async def get_top_performers(
    entity_type: Literal["Customers", "Products"] = Query(..., description="'Customers' or 'Products'"),
    financial_year: str = Query("FY24-25", description="Financial year for FY data")
):
    """
    Get top 10 performers (customers or products) for FY and latest month.
    
    Matches: top_performance_server.R -> top_cust_fy, top_cust_latest, top_prod_fy, top_prod_latest
    
    SQL Queries:
        For Customers FY:
            SELECT "CustomerID", "Revenue" 
            FROM public."customer_ABC_{table_suffix}" 
            ORDER BY "Revenue" DESC LIMIT 10
        
        For Customers Latest:
            SELECT "CustomerID", SUM("Revenue") AS "TotalRevenue" 
            FROM public."Aggregated Data" 
            WHERE "TimeID" = {latest_id} 
            GROUP BY "CustomerID" 
            ORDER BY "TotalRevenue" DESC LIMIT 10
        
        For Products FY:
            SELECT "ProductID", "Revenue" 
            FROM public."product_ABC_XYZ_{table_suffix}" 
            ORDER BY "Revenue" DESC LIMIT 10
        
        For Products Latest:
            SELECT "ProductID", SUM("Revenue") AS "TotalRevenue" 
            FROM public."Aggregated Data" 
            WHERE "TimeID" = {latest_id} 
            GROUP BY "ProductID" 
            ORDER BY "TotalRevenue" DESC LIMIT 10
    
    Returns:
        {
            "top_fy": [{"id": 101, "revenue": 1234567.89}, ...],
            "top_latest": [{"id": 102, "revenue": 98765.43}, ...],
            "entity_type": "Customers"
        }
    """
    # Parse FY to get table suffix
    fy_parts = financial_year.replace("FY", "").split("-")
    if len(fy_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    # Get latest TimeID
    latest_time_id = get_latest_time_id()
    if not latest_time_id:
        raise HTTPException(status_code=404, detail="No data found")
    
    if entity_type == "Customers":
        # Customers FY
        table_suffix = f"FY{fy_parts[0]}_{fy_parts[1]}"
        fy_sql = f'''
            SELECT c."CustomerID", c."Revenue", cm.customer
            FROM public."customer_ABC_{table_suffix}" c
            LEFT JOIN priyatextile_customer_master cm ON CAST(c."CustomerID" AS TEXT) = CAST(cm.customer_code AS TEXT)
            ORDER BY c."Revenue" DESC LIMIT 10
        '''
        
        # Customers Latest
        latest_sql = f'''
            SELECT ad."CustomerID", SUM(ad."Revenue") AS "TotalRevenue", cm.customer
            FROM public."Aggregated Data" ad
            LEFT JOIN priyatextile_customer_master cm ON CAST(ad."CustomerID" AS TEXT) = CAST(cm.customer_code AS TEXT)
            WHERE ad."TimeID" = {latest_time_id} 
            GROUP BY ad."CustomerID", cm.customer
            ORDER BY "TotalRevenue" DESC LIMIT 10
        '''
        
        fy_rows = query_all(fy_sql)  # type: ignore
        latest_rows = query_all(latest_sql)  # type: ignore
        
        top_fy = [
            TopPerformerItem(
                id=int(row["CustomerID"]), 
                revenue=float(row["Revenue"] or 0),
                name=row.get("customer")
            )
            for row in fy_rows
        ]
        
        top_latest = [
            TopPerformerItem(
                id=int(row["CustomerID"]), 
                revenue=float(row["TotalRevenue"] or 0),
                name=row.get("customer")
            )
            for row in latest_rows
        ]
        
    else:  # Products
        # Products FY
        table_suffix = f"FY{fy_parts[0]}_{fy_parts[1]}"
        fy_sql = f'''
            SELECT p."ProductID", p."Revenue", pm.commercial_name
            FROM public."product_ABC_XYZ_{table_suffix}" p
            LEFT JOIN priyatextile_product_master pm ON p."ProductID" = pm.product_code
            ORDER BY p."Revenue" DESC LIMIT 10
        '''
        
        # Products Latest
        latest_sql = f'''
            SELECT ad."ProductID", SUM(ad."Revenue") AS "TotalRevenue", pm.commercial_name
            FROM public."Aggregated Data" ad
            LEFT JOIN priyatextile_product_master pm ON ad."ProductID" = pm.product_code
            WHERE ad."TimeID" = {latest_time_id} 
            GROUP BY ad."ProductID", pm.commercial_name
            ORDER BY "TotalRevenue" DESC LIMIT 10
        '''
        
        fy_rows = query_all(fy_sql)  # type: ignore
        latest_rows = query_all(latest_sql)  # type: ignore
        
        top_fy = [
            TopPerformerItem(
                id=int(row["ProductID"]), 
                revenue=float(row["Revenue"] or 0),
                name=row.get("commercial_name")
            )
            for row in fy_rows
        ]
        
        top_latest = [
            TopPerformerItem(
                id=int(row["ProductID"]), 
                revenue=float(row["TotalRevenue"] or 0),
                name=row.get("commercial_name")
            )
            for row in latest_rows
        ]
    
    return TopPerformersResponse(
        top_fy=top_fy,
        top_latest=top_latest,
        entity_type=entity_type
    )
