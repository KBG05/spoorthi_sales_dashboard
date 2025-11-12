"""
Forecast Endpoints

Replicates: server/forecast_server.R
UI Reference: ui/forecast_ui.R

Provides demand forecast data from the latest forecast table.
"""

from fastapi import APIRouter, HTTPException
from ..database import query_one, query_all
from ..schemas import ForecastResponse, ForecastRow

router = APIRouter(prefix="/forecast", tags=["Forecast"])


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
    
    # Extract month from table name (e.g., demand_forecast_2025_03)
    import re
    match = re.search(r'(\d{4})_(\d{2})$', table_name)
    if match:
        year_month = f"{match.group(1)}-{match.group(2)}"
        display_month = f"Displaying forecast generated for: {year_month}"
    else:
        display_month = f"Displaying forecast from table: {table_name}"
    
    # Fetch forecast data
    data_query = f'''
        SELECT "ProductID", "ForecastMonth", "PredictedQuantity" 
        FROM public."{table_name}" 
        ORDER BY "ProductID"
    '''
    
    rows = query_all(data_query)  # type: ignore
    
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast data found in table {table_name}"
        )
    
    # Build response
    forecast_data = [
        ForecastRow(
            product_id=int(row["ProductID"]),
            forecast_month=str(row["ForecastMonth"]),
            predicted_quantity=float(row["PredictedQuantity"] or 0)
        )
        for row in rows
    ]
    
    return ForecastResponse(
        table_name=table_name,
        display_month=display_month,
        data=forecast_data
    )
