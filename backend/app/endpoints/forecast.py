"""
Forecast Endpoints

Replicates: server/forecast_server.R
UI Reference: ui/forecast_ui.R

Provides demand forecast data from the latest forecast table.
"""

from fastapi import APIRouter, HTTPException, Depends
from ..database import query_one, query_all
from ..schemas import ForecastResponse, ForecastRow, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/forecast", tags=["Forecast"], dependencies=[Depends(get_current_user)])


@router.get("/available-months")
async def get_available_forecast_months():
    """
    Get list of available forecast months from demand_forecast tables.
    Returns list of formatted month strings.
    """
    table_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'demand_forecast_%_%'
        ORDER BY table_name DESC
    """
    
    rows = query_all(table_query)  # type: ignore
    
    if not rows:
        return {"months": []}
    
    import re
    from datetime import datetime
    
    months = []
    for row in rows:
        table_name = row["table_name"]
        match = re.search(r'(\d{4})_(\d{2})$', table_name)
        if match:
            year = match.group(1)
            month = int(match.group(2))
            try:
                month_date = datetime(int(year), month, 1)
                months.append({
                    "table_name": table_name,
                    "display": month_date.strftime("%B %Y"),
                    "year": year,
                    "month": f"{month:02d}"
                })
            except ValueError:
                continue
    
    return {"months": months}


@router.get("/demand", response_model=ForecastResponse)
async def get_demand_forecast():
    """
    Get latest demand forecast data.
    
    Matches: forecast_server.R -> latest_forecast reactive
    
    SQL Queries:
        1. Find latest forecast table:
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'demand_forecast_%_%'
        
        2. Fetch forecast data:
            SELECT "ProductID", "ForecastMonth", "PredictedQuantity" 
            FROM public."{latest_table_name}" 
            ORDER BY "ProductID"
    
    Returns:
        {
            "table_name": "demand_forecast_2025_03",
            "display_month": "Displaying forecast generated for: 2025-03",
            "data": [
                {"product_id": 101, "forecast_month": "2025-04", "predicted_quantity": 1250.5},
                ...
            ]
        }
    """
    # Find latest forecast table
    table_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'demand_forecast_%_%'
        ORDER BY table_name DESC
        LIMIT 1
    """
    
    result = query_one(table_query)  # type: ignore
    
    if not result or not result.get("table_name"):
        raise HTTPException(
            status_code=404,
            detail="No demand forecast table found"
        )
    
    table_name = result["table_name"]
    
    # Extract month from table name (e.g., demand_forecast_2025_07 -> July 2025)
    import re
    from datetime import datetime
    match = re.search(r'(\d{4})_(\d{2})$', table_name)
    if match:
        year = match.group(1)
        month = int(match.group(2))
        try:
            month_date = datetime(int(year), month, 1)
            display_month = f"Forecast Generated: {month_date.strftime('%B %Y')}"
        except ValueError:
            display_month = f"Forecast Generated: {year}-{match.group(2)}"
    else:
        display_month = f"Forecast Table: {table_name}"
    
    # Fetch forecast data with enriched information
    # Get latest 3 TimeIDs that have actual data
    latest_time_query = '''
        SELECT DISTINCT "TimeID"
        FROM public."Aggregated Data"
        WHERE "TimeID" IS NOT NULL
        ORDER BY "TimeID" DESC
        LIMIT 3
    '''
    time_results = query_all(latest_time_query)  # type: ignore
    
    print(f"DEBUG: TimeID query results: {time_results}")
    
    if time_results and len(time_results) >= 3:
        latest_time_id = time_results[0]["TimeID"]
        time_2_months_back = time_results[1]["TimeID"]
        time_3_months_back = time_results[2]["TimeID"]
        print(f"DEBUG: Using latest TimeIDs - Month1: {latest_time_id}, Month2: {time_2_months_back}, Month3: {time_3_months_back}")
    elif time_results and len(time_results) >= 1:
        latest_time_id = time_results[0]["TimeID"]
        time_2_months_back = max(1, latest_time_id - 1)
        time_3_months_back = max(1, latest_time_id - 2)
    else:
        latest_time_id = 1
        time_2_months_back = 1
        time_3_months_back = 1
    
    # Determine financial year from the forecast month
    # If forecast is generated in, say, 2025_07 (July), we're in FY25-26 (Apr 2025 - Mar 2026)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        # FY starts in April. If month >= 4, FY is year to year+1. Otherwise year-1 to year
        if month >= 4:
            fy_start = year
            fy_end = year + 1
        else:
            fy_start = year - 1
            fy_end = year
        # Format: FY24_25
        fy_parts = [str(fy_start)[-2:], str(fy_end)[-2:]]
    else:
        # Default to FY24-25 if we can't parse
        fy_parts = ["24", "25"]
    
    # Build ABC/XYZ table name - use uppercase pattern
    abc_xyz_table = f"product_ABC_XYZ_FY{fy_parts[0]}_{fy_parts[1]}"
    
    data_query = f'''
        WITH product_names_agg AS (
            SELECT 
                CAST(product_code AS TEXT) as product_code,
                ARRAY_AGG(DISTINCT commercial_name) FILTER (WHERE commercial_name IS NOT NULL) as product_names
            FROM priyatextile_product_master
            GROUP BY product_code
        )
        SELECT 
            f."ProductID",
            pn.product_names,
            pabc."ABC_Category",
            pabc."XYZ_Category",
            f."ForecastMonth",
            f."PredictedQuantity",
            COUNT(DISTINCT ad."CustomerID") as unique_customers,
            COALESCE(SUM(ad."Quantity"), 0) as last_3_months_quantity,
            COALESCE(SUM(CASE WHEN ad."TimeID" = {latest_time_id} THEN ad."Quantity" ELSE 0 END), 0) as month_1_quantity,
            COALESCE(SUM(CASE WHEN ad."TimeID" = {time_2_months_back} THEN ad."Quantity" ELSE 0 END), 0) as month_2_quantity,
            COALESCE(SUM(CASE WHEN ad."TimeID" = {time_3_months_back} THEN ad."Quantity" ELSE 0 END), 0) as month_3_quantity
        FROM public."{table_name}" f
        LEFT JOIN product_names_agg pn ON CAST(f."ProductID" AS TEXT) = pn.product_code
        LEFT JOIN (
            SELECT DISTINCT ON ("ProductID") "ProductID", "ABC_Category", "XYZ_Category"
            FROM public."{abc_xyz_table}"
        ) pabc ON f."ProductID" = pabc."ProductID"
        LEFT JOIN public."Aggregated Data" ad ON f."ProductID" = ad."ProductID"
            AND ad."TimeID" IN ({latest_time_id}, {time_2_months_back}, {time_3_months_back})
        GROUP BY f."ProductID", pn.product_names, pabc."ABC_Category", pabc."XYZ_Category", f."ForecastMonth", f."PredictedQuantity"
        ORDER BY f."ProductID"
    '''
    
    rows = query_all(data_query)  # type: ignore
    
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast data found in table {table_name}"
        )
    
    # Debug: Check first few rows
    if rows and len(rows) > 0:
        print(f"DEBUG: First forecast row - ProductID: {rows[0].get('ProductID')}, "
              f"Last3M: {rows[0].get('last_3_months_quantity')}, "
              f"M1: {rows[0].get('month_1_quantity')}, "
              f"M2: {rows[0].get('month_2_quantity')}, "
              f"M3: {rows[0].get('month_3_quantity')}")
        
        # Verify with direct query for this product
        test_product_id = rows[0].get('ProductID')
        verify_query = f'''
            SELECT 
                "TimeID",
                COUNT(*) as row_count,
                SUM("Quantity") as total_quantity
            FROM public."Aggregated Data"
            WHERE "ProductID" = {test_product_id}
            AND "TimeID" IN ({latest_time_id}, {time_2_months_back}, {time_3_months_back})
            GROUP BY "TimeID"
            ORDER BY "TimeID" DESC
        '''
        verify_results = query_all(verify_query)  # type: ignore
        print(f"DEBUG: Verification for ProductID {test_product_id}:")
        for vr in verify_results:
            print(f"  TimeID {vr['TimeID']}: {vr['row_count']} rows, Total Qty: {vr['total_quantity']}")
    
    # Get month names from TimeID
    # TimeID is sequential based on calendar months (not financial year)
    # TimeID 1 = Jan (first year), TimeID 2 = Feb, ..., TimeID 12 = Dec, TimeID 13 = Jan (next year), etc.
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    month_1_index = (latest_time_id - 1) % 12
    month_2_index = (time_2_months_back - 1) % 12
    month_3_index = (time_3_months_back - 1) % 12
    
    month_1_name = month_names[month_1_index]
    month_2_name = month_names[month_2_index]
    month_3_name = month_names[month_3_index]
    
    print(f"DEBUG: Month indices - M1: {month_1_index}, M2: {month_2_index}, M3: {month_3_index}")
    print(f"DEBUG: Month names - Month1: {month_1_name}, Month2: {month_2_name}, Month3: {month_3_name}")
    
    # Build response
    forecast_data = [
        ForecastRow(
            product_id=int(row["ProductID"]),
            product_names=row.get("product_names"),
            category=f"{row.get('ABC_Category', '')}{row.get('XYZ_Category', '')}" if row.get('ABC_Category') and row.get('XYZ_Category') else None,
            forecast_month=str(row["ForecastMonth"]),
            predicted_quantity=float(row["PredictedQuantity"] or 0),
            unique_customers=int(row.get("unique_customers", 0)),
            last_3_months_quantity=float(row.get("last_3_months_quantity", 0)) / 3,  # Average instead of total
            month_1_quantity=float(row.get("month_1_quantity", 0)),
            month_2_quantity=float(row.get("month_2_quantity", 0)),
            month_3_quantity=float(row.get("month_3_quantity", 0))
        )
        for row in rows
    ]
    
    return ForecastResponse(
        table_name=table_name,
        display_month=display_month,
        data=forecast_data,
        month_1_name=month_1_name,
        month_2_name=month_2_name,
        month_3_name=month_3_name
    )
