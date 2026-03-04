"""
Customer Class Comparison Endpoints

Provides comparison between customer class (A/B/C) aggregated totals 
and individual customer performance across multiple financial years.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime
from ..database import query_all, query_one, parse_fy
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
        AND table_name LIKE 'customer_abc_xyz_fy_%'
        AND table_name ~ 'customer_abc_xyz_fy_[0-9]{4}_[0-9]{4}'
        ORDER BY table_name
    """
    rows = query_all(sql)  # type: ignore
    
    fy_map = {}
    
    for row in rows:
        table_name = row["table_name"]
        suffix = table_name.replace("customer_abc_xyz_fy_", "")
        
        parts = suffix.split("_")
        if len(parts) == 2:
            y1 = parts[0][2:] # e.g., '2024' -> '24' 
            y2 = parts[1][2:] # e.g., '2025' -> '25'
            fy_key = f"FY{y1}-{y2}"
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
            SELECT DISTINCT customer_name
            FROM public."customer_abc_xyz_fy_{table_suffix}"
            WHERE abc_category = '{abc_class.upper()}'
        ''')
    
    if not union_queries:
        raise HTTPException(status_code=400, detail=f"No valid financial year tables found. Available: {list(fy_map.keys())}")
    
    sql = " UNION ".join(union_queries) + " ORDER BY customer_name"
    
    rows = query_all(sql)  # type: ignore
    
    return [CustomerListItem(customer_id=str(row["customer_name"]), customer_name=str(row["customer_name"])) for row in rows if row["customer_name"]]


@router.get("/trend", response_model=List[ClassComparisonDataPoint])
async def get_class_comparison_trend(
    abc_class: str = Query(..., description="ABC class (A, B, or C)"),
    customer_id: str = Query(..., description="Customer Name to compare"),
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
        
        try:
            start_year, end_year, fy_label = parse_fy(fy)
        except ValueError:
            continue
        
        start_date = f"{start_year}-04-01"
        end_date = f"{end_year}-03-31"
        
        table_suffix = fy_map[fy]
        
        # Get customers in this class for this FY
        class_customers_sql = f'''
            SELECT customer_name
            FROM public."customer_abc_xyz_fy_{table_suffix}"
            WHERE abc_category = '{abc_class.upper()}'
        '''
        
        class_customer_rows = query_all(class_customers_sql)  # type: ignore
        class_customer_ids = [str(row["customer_name"]) for row in class_customer_rows if row.get("customer_name")]
        
        if not class_customer_ids:
            continue
        
        class_customer_ids_str = ",".join([f"'{c.replace(chr(39), chr(39)+chr(39))}'" for c in class_customer_ids])
        cust_id_safe = customer_id.replace(chr(39), chr(39)+chr(39))
        
        # Query month-wise data
        metric_column = 'ass_value' if metric == "Revenue" else 'inv_quantity'
        
        sql = f'''
            SELECT 
                TO_CHAR(invoice_date, 'YYYY-MM') AS "TimeID",
                SUM(CASE WHEN customer_name IN ({class_customer_ids_str}) THEN {metric_column} ELSE 0 END) as class_total,
                SUM(CASE WHEN customer_name = '{cust_id_safe}' THEN {metric_column} ELSE 0 END) as customer_value
            FROM public."spoorthi_dataset_without_spares"
            WHERE invoice_date BETWEEN '{start_date}' AND '{end_date}'
            GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
            ORDER BY TO_CHAR(invoice_date, 'YYYY-MM')
        '''
        
        rows = query_all(sql)  # type: ignore
        
        for row in rows:
            month_str = row["TimeID"] # format is 'YYYY-MM'
            
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
