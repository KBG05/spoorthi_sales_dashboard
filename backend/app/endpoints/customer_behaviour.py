"""
Customer Behaviour Endpoints

Replicates: server/customer_behaviour_server.R
UI Reference: ui/customer_behaviour_ui.R

Provides customer purchase behaviour analysis with product-level details.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime, timedelta
from ..database import query_all
from ..schemas import CustomerListItem, ProductListItem, CustomerBehaviourDataPoint, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/customer-behaviour", tags=["Customer Behaviour"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


@router.get("/customers", response_model=List[CustomerListItem])
async def get_customers_by_class(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes")
):
    """
    Get list of customers for selected ABC classes in a financial year.
    
    Matches: customer_behaviour_server.R -> customers_in_class reactive
    
    SQL Query:
        SELECT DISTINCT "CustomerID"
        FROM public."customer_ABC_{table_suffix}"
        WHERE "Category" IN (...)
        ORDER BY "CustomerID"
    
    Returns:
        [{"customer_id": 101}, {"customer_id": 102}, ...]
    """
    # Parse FY to get table suffix
    fy_parts = financial_year.replace("FY", "").split("-")
    if len(fy_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid financial year format")
    
    table_suffix = f"FY{fy_parts[0]}_{fy_parts[1]}"
    
    # Parse classes
    class_list = [cls.strip().upper() for cls in abc_classes.split(",")]
    class_in = ",".join([f"'{cls}'" for cls in class_list])
    
    sql = f'''
        SELECT DISTINCT "CustomerID"
        FROM public."customer_ABC_{table_suffix}"
        WHERE "Category" IN ({class_in})
        ORDER BY "CustomerID"
    '''
    
    rows = query_all(sql)  # type: ignore
    
    return [CustomerListItem(customer_id=int(row["CustomerID"])) for row in rows]


@router.get("/products", response_model=List[ProductListItem])
async def get_products_for_customers(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    customer_ids: str = Query(..., description="Comma-separated customer IDs")
):
    """
    Get list of products purchased by selected customers in a financial year.
    
    Matches: customer_behaviour_server.R -> products_for_customers reactive
    
    SQL Query:
        SELECT DISTINCT "ProductID"
        FROM public."Aggregated Data"
        WHERE
            "TimeID" BETWEEN {start} AND {end}
            AND "CustomerID" IN (...)
        ORDER BY "ProductID"
    
    Returns:
        [{"product_id": 201}, {"product_id": 202}, ...]
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
    
    # Parse customer IDs
    cust_list = [cid.strip() for cid in customer_ids.split(",")]
    cust_in = ",".join(cust_list)
    
    sql = f'''
        SELECT DISTINCT "ProductID"
        FROM public."Aggregated Data"
        WHERE
            "TimeID" BETWEEN {start_time_id} AND {end_time_id}
            AND "CustomerID" IN ({cust_in})
        ORDER BY "ProductID"
    '''
    
    rows = query_all(sql)  # type: ignore
    
    return [ProductListItem(product_id=int(row["ProductID"])) for row in rows]


@router.get("/trend", response_model=List[CustomerBehaviourDataPoint])
async def get_customer_behaviour_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes"),
    customer_ids: str = Query(..., description="Comma-separated customer IDs (max 2)"),
    product_ids: str = Query("", description="Single product ID for comparison"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'")
):
    """
    Get customer behaviour trend data with dual-axis support.
    
    Returns both:
    1. Overall customer revenue/qty (all products) - for left axis
    2. Selected product revenue/qty (specific product) - for right axis
    
    For each customer, returns separate series:
    - "Customer {id} Overall"
    - "Customer {id} Product {product_id}"
    
    SQL Query:
        SELECT
            t1."TimeID",
            t1."CustomerID",
            t1."ProductID", 
            t2."Category" AS "ABC_Category",
            t1."Quantity",
            t1."Revenue"
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."customer_ABC_{table_suffix}" AS t2 
            ON t1."CustomerID" = t2."CustomerID"
        WHERE
            t1."TimeID" BETWEEN {start} AND {end}
            AND t2."Category" IN (...)
            AND t1."CustomerID" IN (...)
        ORDER BY t1."TimeID"
    
    Returns:
        [
            {"month": "2024-04-01", "value": 12.5, "type": "Customer 101 Overall", "product_id": null, "customer_id": 101},
            {"month": "2024-04-01", "value": 3.2, "type": "Customer 101 Product 201", "product_id": 201, "customer_id": 101},
            {"month": "2024-04-01", "value": 15.8, "type": "Customer 102 Overall", "product_id": null, "customer_id": 102},
            {"month": "2024-04-01", "value": 4.1, "type": "Customer 102 Product 201", "product_id": 201, "customer_id": 102},
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
    
    # Parse inputs
    class_list = [cls.strip().upper() for cls in abc_classes.split(",")]
    class_in = ",".join([f"'{cls}'" for cls in class_list])
    
    cust_list = [cid.strip() for cid in customer_ids.split(",")]
    cust_in = ",".join(cust_list)
    
    # Validate customer limit
    if len(cust_list) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 customers allowed")
    
    # Parse product ID (single product only)
    selected_product_id = None
    if product_ids.strip():
        try:
            selected_product_id = int(product_ids.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid product ID format")
    
    # Query data
    sql = f'''
        SELECT
            t1."TimeID",
            t1."CustomerID",
            t1."ProductID", 
            t2."Category" AS "ABC_Category",
            t1."Quantity",
            t1."Revenue"
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."customer_ABC_{table_suffix}" AS t2 
            ON t1."CustomerID" = t2."CustomerID"
        WHERE
            t1."TimeID" BETWEEN {start_time_id} AND {end_time_id}
            AND t2."Category" IN ({class_in})
            AND t1."CustomerID" IN ({cust_in})
        ORDER BY t1."TimeID"
    '''
    
    rows = query_all(sql)  # type: ignore
    
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")
    
    # Process data
    from collections import defaultdict
    
    metric_col = "Revenue" if metric == "Revenue" else "Quantity"
    
    # Separate data structures for each customer
    # customer_overall[customer_id][time_id] = value (all products)
    # customer_product[customer_id][time_id] = value (specific product only)
    customer_overall = defaultdict(lambda: defaultdict(float))
    customer_product = defaultdict(lambda: defaultdict(float))
    
    for row in rows:
        time_id = row["TimeID"]
        customer_id = row["CustomerID"]
        product_id = row["ProductID"]
        value = float(row[metric_col] or 0)
        
        # Add to overall (all products)
        customer_overall[customer_id][time_id] += value
        
        # Add to product-specific if it matches selected product
        if selected_product_id and product_id == selected_product_id:
            customer_product[customer_id][time_id] += value
    
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
        
        # Add data for each customer
        for customer_id in cust_list:
            cust_id_int = int(customer_id)
            
            # Overall line for this customer
            result.append(CustomerBehaviourDataPoint(
                month=month_str,
                value=round(customer_overall[cust_id_int].get(time_id, 0.0), 2),
                type=f"Customer {cust_id_int} Overall",
                product_id=None
            ))
            
            # Product-specific line for this customer (if product selected)
            if selected_product_id:
                result.append(CustomerBehaviourDataPoint(
                    month=month_str,
                    value=round(customer_product[cust_id_int].get(time_id, 0.0), 2),
                    type=f"Customer {cust_id_int} Product {selected_product_id}",
                    product_id=selected_product_id
                ))
    
    return result
