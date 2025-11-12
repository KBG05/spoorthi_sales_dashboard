"""
Customer Behaviour Endpoints

Replicates: server/customer_behaviour_server.R
UI Reference: ui/customer_behaviour_ui.R

Provides customer purchase behaviour analysis with product-level details.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import datetime, timedelta
from ..database import query_all
from ..schemas import CustomerListItem, ProductListItem, CustomerBehaviourDataPoint

router = APIRouter(prefix="/customer-behaviour", tags=["Customer Behaviour"])

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
    customer_ids: str = Query(..., description="Comma-separated customer IDs"),
    product_ids: str = Query("", description="Comma-separated product IDs (optional)"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'")
):
    """
    Get customer behaviour trend data.
    
    Matches: customer_behaviour_server.R -> plot_data_final reactive
    
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
            {"month": "2024-04-01", "value": 12.5, "type": "Selected Customers Overall", "product_id": null},
            {"month": "2024-04-01", "value": 3.2, "type": "Product 201", "product_id": 201},
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
    
    # Overall summary
    overall = defaultdict(float)
    
    # Product summaries
    product_data = defaultdict(lambda: defaultdict(float))
    
    for row in rows:
        time_id = row["TimeID"]
        product_id = row["ProductID"]
        value = float(row[metric_col] or 0)
        
        overall[time_id] += value
        product_data[product_id][time_id] += value
    
    # Build response
    result = []
    
    # Parse product filter
    selected_products = []
    if product_ids:
        selected_products = [int(pid.strip()) for pid in product_ids.split(",") if pid.strip()]
    
    # Add overall line
    for time_id in sorted(overall.keys()):
        month_date = BASE_DATE + timedelta(days=30 * (time_id - 1))
        result.append(CustomerBehaviourDataPoint(
            month=month_date.strftime("%Y-%m-%d"),
            value=round(overall[time_id], 2),
            type="Selected Customers Overall",
            product_id=None
        ))
    
    # Add individual product lines (if products selected)
    if selected_products:
        for prod_id in selected_products:
            if prod_id in product_data:
                for time_id in sorted(product_data[prod_id].keys()):
                    month_date = BASE_DATE + timedelta(days=30 * (time_id - 1))
                    result.append(CustomerBehaviourDataPoint(
                        month=month_date.strftime("%Y-%m-%d"),
                        value=round(product_data[prod_id][time_id], 2),
                        type=f"Product {prod_id}",
                        product_id=prod_id
                    ))
    
    return result
