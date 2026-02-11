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
from ..schemas import ProductListItem, ProductBehaviourDataPoint, User, CustomerListItem
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
        SELECT DISTINCT p."ProductID" AS product_code, pm.commercial_name
        FROM public."product_ABC_XYZ_{table_suffix}" p
        LEFT JOIN priyatextile_product_master pm ON CAST(p."ProductID" AS TEXT) = CAST(pm.product_code AS TEXT)
        WHERE p."ABC_Category" = '{abc_class.upper()}' 
        ORDER BY product_code
    '''
    
    rows = query_all(sql)  # type: ignore
    
    return [
        ProductListItem(
            product_id=int(row["product_code"]),
            product_name=row.get("commercial_name")
        ) 
        for row in rows
    ]


@router.get("/customers", response_model=List[CustomerListItem])
async def get_customers_for_product(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    product_id: int = Query(..., description="Product ID"),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes")
):
    """
    Get list of customers who purchased a specific product in a financial year.
    Filters by customer ABC class.
    
    Returns:
        [{"customer_id": 101, "customer_name": "ABC Corp", "abc_category": "A"}, ...]
    """
    # Parse FY to get table suffix and TimeID range
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
    
    # Parse classes
    class_list = [cls.strip().upper() for cls in abc_classes.split(",")]
    class_in = ",".join([f"'{cls}'" for cls in class_list])
    
    sql = f'''
        SELECT DISTINCT ad."CustomerID", cm.customer, c."Category" as abc_category
        FROM public."Aggregated Data" ad
        INNER JOIN (
            SELECT DISTINCT ON ("CustomerID") "CustomerID", "Category"
            FROM public."customer_ABC_{table_suffix}"
        ) c ON CAST(ad."CustomerID" AS TEXT) = CAST(c."CustomerID" AS TEXT)
        LEFT JOIN priyatextile_customer_master cm ON CAST(ad."CustomerID" AS TEXT) = CAST(cm.customer_code AS TEXT)
        WHERE
            ad."TimeID" BETWEEN {start_time_id} AND {end_time_id}
            AND ad."ProductID" = {product_id}
            AND c."Category" IN ({class_in})
        ORDER BY ad."CustomerID"
    '''
    
    rows = query_all(sql)  # type: ignore
    
    return [
        CustomerListItem(
            customer_id=int(row["CustomerID"]),
            customer_name=row.get("customer"),
            abc_category=row.get("abc_category")
        )
        for row in rows
    ]


@router.get("/trend", response_model=List[ProductBehaviourDataPoint])
async def get_product_behaviour_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_class: str = Query("A", description="ABC class (A, B, or C)"),
    product_id: int = Query(..., description="Selected product ID"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'"),
    customer_ids: str = Query("", description="Optional comma-separated customer IDs")
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
    
    # Parse customer IDs if provided
    customer_list = []
    customer_data = {}
    if customer_ids:
        customer_list = [int(cid.strip()) for cid in customer_ids.split(",") if cid.strip()]
        
        # Query customer-specific data
        if customer_list:
            cust_in = ",".join(str(cid) for cid in customer_list)
            customer_sql = f'''
                SELECT
                    t1."TimeID",
                    t1."CustomerID",
                    t1."Quantity" AS quantity,
                    t1."Revenue" AS value
                FROM public."Aggregated Data" AS t1
                WHERE
                    t1."TimeID" BETWEEN {start_time_id} AND {end_time_id}
                    AND t1."ProductID" = {product_id}
                    AND t1."CustomerID" IN ({cust_in})
                ORDER BY t1."TimeID", t1."CustomerID"
            '''
            
            customer_rows = query_all(customer_sql)  # type: ignore
            
            # Organize by customer
            for row in customer_rows:
                cust_id = int(row["CustomerID"])
                time_id = row["TimeID"]
                value = float(row[metric_col] or 0)
                
                if cust_id not in customer_data:
                    customer_data[cust_id] = defaultdict(float)
                customer_data[cust_id][time_id] += value
    
    # Calculate scaling factor for dual axis
    max_class = max(class_total.values()) if class_total else 1
    max_product = max(product_total.values()) if product_total else 1
    scale_factor = max_class / max_product if max_product > 0 else 1
    
    # Build response
    result = []
    
    # Generate all months in the financial year range
    for time_id in range(start_time_id, end_time_id + 1):
        # Calculate proper month/year from TimeID
        months_offset = time_id - 1
        year = BASE_DATE.year + (BASE_DATE.month + months_offset - 1) // 12
        month = (BASE_DATE.month + months_offset - 1) % 12 + 1
        month_date = datetime(year, month, 1)
        month_str = month_date.strftime("%Y-%m-%d")
        
        # Class total (not scaled, always include even if zero)
        class_value = class_total.get(time_id, 0.0)
        result.append(ProductBehaviourDataPoint(
            month=month_str,
            value=round(class_value, 2),
            scaled_value=round(class_value, 2),
            type=f"Class {abc_class} Total",
            product_id=None
        ))
        
        # Individual product (scaled, always include even if zero)
        product_value = product_total.get(time_id, 0.0)
        result.append(ProductBehaviourDataPoint(
            month=month_str,
            value=round(product_value, 2),
            scaled_value=round(product_value * scale_factor, 2),
            type=f"Product {product_id}",
            product_id=product_id
        ))
        
        # Customer-specific data (always include for each customer, even if zero)
        for cust_id in customer_list:
            cust_value = 0.0
            if cust_id in customer_data:
                cust_value = customer_data[cust_id].get(time_id, 0.0)
            result.append(ProductBehaviourDataPoint(
                month=month_str,
                value=round(cust_value, 2),
                scaled_value=round(cust_value, 2),  # Not scaled for customers
                type=f"Customer {cust_id}",
                product_id=product_id
            ))
    
    return result
