"""
Product Behaviour Endpoints

Replicates: server/product_behaviour_server.R
UI Reference: ui/product_behaviour_ui.R

Provides product purchase behaviour analysis with dual-axis plotting support.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime, timedelta
from ..database import query_all
from ..schemas import ProductListItem, ProductBehaviourDataPoint, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/product-behaviour", tags=["Product Behaviour"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


@router.get("/available-years")
async def get_available_years():
    """
    Get list of available financial years based on product_ABC_XYZ_FY* tables.
    """
    import re
    
    table_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'product_ABC_XYZ_FY%'
        AND table_name ~ 'product_ABC_XYZ_FY[0-9]+_[0-9]+'
        ORDER BY table_name DESC
    """
    
    rows = query_all(table_query)  # type: ignore
    
    if not rows:
        return {"financial_years": []}
    
    fy_years = []
    for row in rows:
        table_name = row["table_name"]
        match = re.search(r'FY(\d{2})_(\d{2})$', table_name)
        if match:
            fy_key = f"FY{match.group(1)}-{match.group(2)}"
            fy_years.append(fy_key)
    
    return {"financial_years": sorted(set(fy_years), reverse=True)}


@router.get("/products", response_model=List[ProductListItem])
async def get_products_by_class(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_class: str = Query("A", description="ABC class (A, B, or C)")
):
    """
    Get list of products for selected ABC class in a financial year.
    
    Matches: product_behavior_server.R -> products_in_class reactive
    
    SQL Query:
        SELECT DISTINCT "ProductID" AS product_code 
        FROM public."product_ABC_XYZ_{table_suffix}" 
        WHERE "ABC_Category" = '{abc_class}' 
        ORDER BY product_code
    
    Returns:
        [{"product_id": 301}, {"product_id": 302}, ...]
    """
    # Parse FY to get table suffix
    fy_parts = financial_year.replace("FY", "").split("-")
    if len(fy_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    table_suffix = f"FY{fy_parts[0]}_{fy_parts[1]}"
    
    sql = f'''
        SELECT DISTINCT "ProductID" AS product_code 
        FROM public."product_ABC_XYZ_{table_suffix}" 
        WHERE "ABC_Category" = '{abc_class.upper()}' 
        ORDER BY product_code
    '''
    
    rows = query_all(sql)  # type: ignore
    
    return [ProductListItem(product_id=int(row["product_code"])) for row in rows]


@router.get("/trend", response_model=List[ProductBehaviourDataPoint])
async def get_product_behaviour_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_class: str = Query("A", description="ABC class (A, B, or C)"),
    product_id: int = Query(..., description="Selected product ID"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'")
):
    """
    Get product behaviour trend data with dual-axis support.
    
    Matches: product_behavior_server.R -> plot_data_final reactive
    
    SQL Query:
        SELECT
            t1."TimeID",
            t1."ProductID" AS product_code,
            t2."ABC_Category",
            t1."Quantity" AS quantity,
            t1."Revenue" AS value
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."product_ABC_XYZ_{table_suffix}" AS t2 
            ON t1."ProductID" = t2."ProductID"
        WHERE
            t1."TimeID" BETWEEN {start} AND {end}
            AND t2."ABC_Category" = '{abc_class}'
        ORDER BY t1."TimeID", t1."ProductID"
    
    Returns:
        [
            {"month": "2024-04-01", "value": 12.5, "scaled_value": 12.5, "type": "Class A Total", "product_id": null},
            {"month": "2024-04-01", "value": 3.2, "scaled_value": 9.5, "type": "Product 301", "product_id": 301},
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
    metric_col = "value" if metric == "Revenue" else "quantity"
    
    sql = f'''
        SELECT
            t1."TimeID",
            t1."ProductID" AS product_code,
            t2."ABC_Category",
            t1."Quantity" AS quantity,
            t1."Revenue" AS value
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."product_ABC_XYZ_{table_suffix}" AS t2 
            ON t1."ProductID" = t2."ProductID"
        WHERE
            t1."TimeID" BETWEEN {start_time_id} AND {end_time_id}
            AND t2."ABC_Category" = '{abc_class.upper()}'
        ORDER BY t1."TimeID", t1."ProductID"
    '''
    
    rows = query_all(sql)  # type: ignore
    
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")
    
    # Process data
    from collections import defaultdict
    
    # Class total
    class_total = defaultdict(float)
    
    # Individual product
    product_total = defaultdict(float)
    
    for row in rows:
        time_id = row["TimeID"]
        prod_id = row["product_code"]
        value = float(row[metric_col] or 0)
        
        class_total[time_id] += value
        
        if prod_id == product_id:
            product_total[time_id] += value
    
    # Calculate scaling factor for dual axis
    max_class = max(class_total.values()) if class_total else 1
    max_product = max(product_total.values()) if product_total else 1
    scale_factor = max_class / max_product if max_product > 0 else 1
    
    # Build response
    result = []
    
    all_time_ids = sorted(set(list(class_total.keys()) + list(product_total.keys())))
    
    for time_id in all_time_ids:
        # Calculate proper month/year from TimeID
        months_offset = time_id - 1
        year = BASE_DATE.year + (BASE_DATE.month + months_offset - 1) // 12
        month = (BASE_DATE.month + months_offset - 1) % 12 + 1
        month_date = datetime(year, month, 1)
        month_str = month_date.strftime("%Y-%m-%d")
        
        # Class total (not scaled)
        result.append(ProductBehaviourDataPoint(
            month=month_str,
            value=round(class_total[time_id], 2),
            scaled_value=round(class_total[time_id], 2),
            type=f"Class {abc_class} Total",
            product_id=None
        ))
        
        # Individual product (scaled)
        if time_id in product_total:
            result.append(ProductBehaviourDataPoint(
                month=month_str,
                value=round(product_total[time_id], 2),
                scaled_value=round(product_total[time_id] * scale_factor, 2),
                type=f"Product {product_id}",
                product_id=product_id
            ))
    
    return result
