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
