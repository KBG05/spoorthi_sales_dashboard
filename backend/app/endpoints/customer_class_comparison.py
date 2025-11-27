"""
Customer Class Comparison Endpoints

Provides comparison between customer class (A/B/C) aggregated totals 
and individual customer performance across multiple financial years.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime
from ..database import query_all, query_one
from ..schemas import CustomerListItem, ClassComparisonDataPoint, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/customer-class-comparison", tags=["Customer Class Comparison"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


def get_available_fy_tables():
    """
    Get list of available customer_ABC_FY* tables from the database.
    Returns dict mapping FY format (e.g., 'FY24-25') to actual table suffix.
    Only uses underscore format (FY24_25).
    """
    sql = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'customer_ABC_FY%'
        AND table_name ~ 'customer_ABC_FY[0-9]+_[0-9]+'
        ORDER BY table_name
    """
    rows = query_all(sql)  # type: ignore
    
    fy_map = {}
    
    for row in rows:
        table_name = row["table_name"]
        # Extract suffix after "customer_ABC_"
        suffix = table_name.replace("customer_ABC_", "")
        
        # Only process underscore format: FY24_25
        if "_" in suffix:
            parts = suffix.replace("FY", "").split("_")
            if len(parts) == 2:
                fy_key = f"FY{parts[0]}-{parts[1]}"
                fy_map[fy_key] = suffix
    
    return fy_map


@router.get("/available-years")
async def get_available_years():
    """
    Get list of available financial years based on existing database tables.
    """
    fy_map = get_available_fy_tables()
    return {"financial_years": sorted(fy_map.keys(), reverse=True)}


@router.get("/customers", response_model=List[CustomerListItem])
async def get_customers_in_class(
    abc_class: str = Query(..., description="ABC class (A, B, or C)"),
    financial_years: str = Query(..., description="Comma-separated financial years (e.g., 'FY24-25,FY23-24')")
):
    """
    Get list of customers in a specific ABC class across multiple financial years.
    Returns customers that exist in the class in ANY of the specified years.
    """
    # Get available FY tables
    fy_map = get_available_fy_tables()
    
    # Parse financial years
    fy_list = [fy.strip() for fy in financial_years.split(",")]
    
    # Build union query for all years
    union_queries = []
    for fy in fy_list:
        if fy not in fy_map:
            continue
        
        table_suffix = fy_map[fy]
        union_queries.append(f'''
            SELECT DISTINCT "CustomerID"
            FROM public."customer_ABC_{table_suffix}"
            WHERE "Category" = '{abc_class.upper()}'
        ''')
    
    if not union_queries:
        raise HTTPException(status_code=400, detail=f"No valid financial year tables found. Available: {list(fy_map.keys())}")
    
    sql = " UNION ".join(union_queries) + " ORDER BY \"CustomerID\""
    
    rows = query_all(sql)  # type: ignore
    
    return [CustomerListItem(customer_id=int(row["CustomerID"])) for row in rows]


@router.get("/trend", response_model=List[ClassComparisonDataPoint])
async def get_class_comparison_trend(
    abc_class: str = Query(..., description="ABC class (A, B, or C)"),
    customer_id: int = Query(..., description="Customer ID to compare"),
    financial_years: str = Query(..., description="Comma-separated financial years (e.g., 'FY24-25,FY23-24')"),
    metric: str = Query("Revenue", description="Metric to compare (Revenue or Quantity)")
):
    """
    Get month-wise comparison of class total vs individual customer performance
    across multiple financial years.
    
    Returns data points for:
    - Class aggregate (all customers in that ABC class)
    - Individual customer
    
    For each month in each FY.
    """
    if metric not in ["Revenue", "Quantity"]:
        raise HTTPException(status_code=400, detail="Metric must be 'Revenue' or 'Quantity'")
    
    # Get available FY tables
    fy_map = get_available_fy_tables()
    
    # Parse financial years
    fy_list = [fy.strip() for fy in financial_years.split(",")]
    
    all_data_points = []
    
    for fy in fy_list:
        if fy not in fy_map:
            continue
        
        fy_parts = fy.replace("FY", "").split("-")
        if len(fy_parts) != 2:
            continue
        
        start_year = int(f"20{fy_parts[0]}")
        end_year = int(f"20{fy_parts[1]}")
        
        start_date = datetime(start_year, 4, 1)
        end_date = datetime(end_year, 3, 31)
        
        start_time_id = ((start_date.year - BASE_DATE.year) * 12 + 
                         (start_date.month - BASE_DATE.month) + 1)
        end_time_id = ((end_date.year - BASE_DATE.year) * 12 + 
                       (end_date.month - BASE_DATE.month) + 1)
        
        table_suffix = fy_map[fy]
        
        # Get customers in this class for this FY
        class_customers_sql = f'''
            SELECT "CustomerID"
            FROM public."customer_ABC_{table_suffix}"
            WHERE "Category" = '{abc_class.upper()}'
        '''
        
        class_customer_rows = query_all(class_customers_sql)  # type: ignore
        class_customer_ids = [int(row["CustomerID"]) for row in class_customer_rows]
        
        if not class_customer_ids:
            continue
        
        class_customer_ids_str = ",".join(map(str, class_customer_ids))
        
        # Query month-wise data
        metric_column = '"Revenue"' if metric == "Revenue" else '"Quantity"'
        
        sql = f'''
            SELECT 
                "TimeID",
                SUM(CASE WHEN "CustomerID" IN ({class_customer_ids_str}) THEN {metric_column} ELSE 0 END) as class_total,
                SUM(CASE WHEN "CustomerID" = {customer_id} THEN {metric_column} ELSE 0 END) as customer_value
            FROM public."Aggregated Data"
            WHERE "TimeID" BETWEEN {start_time_id} AND {end_time_id}
            GROUP BY "TimeID"
            ORDER BY "TimeID"
        '''
        
        rows = query_all(sql)  # type: ignore
        
        for row in rows:
            time_id = int(row["TimeID"])
            months_since_base = time_id - 1
            year = BASE_DATE.year + (months_since_base // 12)
            month = BASE_DATE.month + (months_since_base % 12)
            
            if month > 12:
                year += 1
                month -= 12
            
            month_str = f"{year:04d}-{month:02d}"
            
            # Convert to millions for revenue
            class_total = float(row["class_total"] or 0)
            customer_value = float(row["customer_value"] or 0)
            
            if metric == "Revenue":
                class_total = class_total / 1_000_000
                customer_value = customer_value / 1_000_000
            
            all_data_points.append(ClassComparisonDataPoint(
                month=month_str,
                financial_year=fy,
                class_total=round(class_total, 2),
                customer_value=round(customer_value, 2),
                metric=metric
            ))
    
    return all_data_points
