"""
Transition Analysis Endpoints

Replicates: server/transition_analysis_server.R
UI Reference: ui/transition_analysis_ui.R

Provides ABC category transition analysis for products and customers.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Literal
from datetime import datetime
from ..database import query_one, query_all
from ..schemas import TransitionAnalysisResponse, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/transition-analysis", tags=["Transition Analysis"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


@router.get("/transitions", response_model=TransitionAnalysisResponse)
async def get_transitions(
    analysis_type: Literal["Products", "Customers"] = Query(..., description="'Products' or 'Customers'"),
    financial_year: str = Query("FY24-25", description="Financial year (for customers only)")
):
    """
    Get ABC category transition data for products or customers.
    
    Matches: transition_analysis_server.R -> transition_data reactive
    
    For Products:
        - Uses latest 3 monthly rolling_abc_xyz_summary tables
        - Shows how products moved between ABC categories
    
    For Customers:
        - Uses rolling 12-month revenue for last 3 months of FY
        - Shows how customers moved between ABC categories
    
    SQL Queries vary by analysis type.
    
    Returns:
        {
            "data": [
                {"ProductID": 101, "Category_Jan_2025": "A", "Category_Feb_2025": "A", "Category_Mar_2025": "B"},
                ...
            ],
            "analysis_type": "Products",
            "column_headers": ["ProductID", "Category_Jan_2025", "Category_Feb_2025", "Category_Mar_2025"]
        }
    """
    if analysis_type == "Products":
        # Find latest 3 rolling ABC summary tables
        table_query = """
            SELECT tablename
            FROM pg_catalog.pg_tables
            WHERE schemaname = 'public'
              AND tablename ~ '^rolling_abc_xyz_summary_[0-9]{4}_[0-9]{2}$'
            ORDER BY tablename DESC
            LIMIT 3
        """
        
        table_rows = query_all(table_query)  # type: ignore
        
        if not table_rows or len(table_rows) < 1:
            raise HTTPException(
                status_code=404,
                detail="Could not find sufficient rolling ABC summary tables"
            )
        
        table_names = [row["tablename"] for row in table_rows]
        table_names.sort()  # Chronological order
        
        # Fetch ABC data from each table
        all_products = set()
        month_data = {}
        
        for i, table_name in enumerate(table_names):
            # Extract month from table name (e.g., rolling_abc_xyz_summary_2025_03)
            month_label = table_name.replace("rolling_abc_xyz_summary_", "")
            
            # Format month label
            try:
                month_obj = datetime.strptime(f"{month_label}_01", "%Y_%m_%d")
                formatted_month = month_obj.strftime("%b %Y")
            except:
                formatted_month = f"M{i+1}"
            
            col_name = f"Category_{formatted_month.replace(' ', '_')}"
            
            # Query data - get both ABC and XYZ categories
            sql = f'''
                SELECT 
                    CAST("article_no" AS VARCHAR) AS "ProductID", 
                    "abc_category" AS abc_category,
                    "xyz_category" AS xyz_category
                FROM public."{table_name}"
            '''
            
            rows = query_all(sql)  # type: ignore
            
            # Combine ABC and XYZ into single column
            abc_xyz_col_name = f"ABC_XYZ_{formatted_month.replace(' ', '_')}"
            
            month_data[abc_xyz_col_name] = {}
            
            for row in rows:
                product_id = str(row["ProductID"])
                all_products.add(product_id)
                abc_cat = row.get("abc_category") or "N/A"
                xyz_cat = row.get("xyz_category") or "N/A"
                # Combine ABC and XYZ (e.g., "A" + "X" = "AX")
                if abc_cat != "N/A" and xyz_cat != "N/A":
                    combined = f"{abc_cat}{xyz_cat}"
                else:
                    combined = "N/A"
                month_data[abc_xyz_col_name][product_id] = combined
        
        # Build response data
        # First, get all product names grouped by product_code
        product_names_query = '''
            SELECT 
                CAST(product_code AS TEXT) as product_code,
                ARRAY_AGG(DISTINCT commercial_name) FILTER (WHERE commercial_name IS NOT NULL) as product_names
            FROM priyatextile_product_master
            GROUP BY product_code
        '''
        product_names_rows = query_all(product_names_query)  # type: ignore
        product_names_map = {row["product_code"]: row.get("product_names", []) for row in product_names_rows}
        
        data = []
        for product_id in sorted(all_products, key=lambda x: int(x) if x.isdigit() else 0):
            product_names_list = product_names_map.get(product_id, [])
            product_names_str = ', '.join(product_names_list) if product_names_list else '-'
            
            row_data = {
                "ProductID": int(product_id) if product_id.isdigit() else product_id,
                "Product Names": product_names_str
            }
            
            for col_name in sorted(month_data.keys()):
                row_data[col_name] = month_data[col_name].get(product_id, "N/A")
            
            data.append(row_data)
        
        column_headers = ["ProductID", "Product Names"] + sorted(month_data.keys())
        
    else:  # Customers
        # Parse FY to get last 3 months
        fy_parts = financial_year.replace("FY", "").split("-")
        if len(fy_parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid financial year format")
        
        end_year = int(f"20{fy_parts[1]}")
        
        # Last 3 months of FY are Jan, Feb, Mar
        last_3_months = [
            datetime(end_year, 1, 1),
            datetime(end_year, 2, 1),
            datetime(end_year, 3, 1)
        ]
        
        # For each month, calculate rolling 12-month ABC categories
        all_customers = set()
        month_data = {}
        
        for month_date in last_3_months:
            col_name = f"Category_{month_date.strftime('%b_%Y')}"
            
            # Calculate TimeID for this month
            month_time_id = ((month_date.year - BASE_DATE.year) * 12 + 
                           (month_date.month - BASE_DATE.month) + 1)
            
            # Rolling 12 months ending in this month
            start_time_id = month_time_id - 11
            end_time_id = month_time_id
            
            # Query rolling revenue
            sql = f'''
                SELECT 
                    "CustomerID",
                    SUM("Revenue") AS "TotalRevenue"
                FROM public."Aggregated Data"
                WHERE "TimeID" BETWEEN {start_time_id} AND {end_time_id}
                GROUP BY "CustomerID"
                ORDER BY "TotalRevenue" DESC
            '''
            
            rows = query_all(sql)  # type: ignore
            
            # Calculate ABC categories using Pareto rule
            # A: Top 20% of revenue, B: Next 30%, C: Remaining 50%
            total_revenue = sum(float(row["TotalRevenue"] or 0) for row in rows)
            
            cumulative = 0
            month_data[col_name] = {}
            
            for row in rows:
                customer_id = str(row["CustomerID"])
                all_customers.add(customer_id)
                revenue = float(row["TotalRevenue"] or 0)
                cumulative += revenue
                cumulative_pct = (cumulative / total_revenue * 100) if total_revenue > 0 else 0
                
                if cumulative_pct <= 20:
                    category = "A"
                elif cumulative_pct <= 50:
                    category = "B"
                else:
                    category = "C"
                
                month_data[col_name][customer_id] = category
        
        # Build response data
        data = []
        for customer_id in sorted(all_customers, key=lambda x: int(x) if x.isdigit() else 0):
            row_data = {"CustomerID": int(customer_id) if customer_id.isdigit() else customer_id}
            
            for col_name in sorted(month_data.keys()):
                row_data[col_name] = month_data[col_name].get(customer_id, "N/A")
            
            data.append(row_data)
        
        column_headers = ["CustomerID"] + sorted(month_data.keys())
    
    return TransitionAnalysisResponse(
        data=data,
        analysis_type=analysis_type,
        column_headers=column_headers
    )
