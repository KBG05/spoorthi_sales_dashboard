"""
Cross-Sell Analysis Endpoints

Replicates: server/cross_sell_server.R
UI Reference: ui/cross_sell_ui.R

Provides cross-sell product recommendations for distributors.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..database import query_one, query_all
from ..schemas import CrossSellRecommendation, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/cross-sell", tags=["Cross-Sell Analysis"], dependencies=[Depends(get_current_user)])


@router.get("/recommendations", response_model=List[CrossSellRecommendation])
async def get_cross_sell_recommendations():
    """
    Get cross-sell recommendations for all distributors.
    
    Matches: cross_sell_server.R -> recommendations_table renderDataTable
    
    SQL Query:
        1. Find latest cross_sell_recommendations table
        2. SELECT and aggregate recommendations by distributor
    
    Functions Used:
        - query_one() - find latest table
        - query_all() - get all recommendations
    
    Returns:
        [
            {
                "customer": "DIST001",
                "products_purchased": "P1, P2, P3",
                "recommendations": "P4, P5"
            },
            ...
        ]
    """
    # Find latest cross_sell_recommendations table
    table_query = """
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename ~ '^cross_sell_recommendations_[0-9]{4}_[0-9]{2}$'
        ORDER BY tablename DESC
        LIMIT 1
    """
    
    result = query_one(table_query)  # type: ignore
    
    if not result or not result.get("tablename"):
        raise HTTPException(
            status_code=404,
            detail="No cross-sell recommendation table found"
        )
    
    table_name = result["tablename"]
    
    # Fetch all recommendations
    data_query = f'''
        SELECT 
            "Distributor_Code",
            "Products_Bought_Together",
            "Suggested_Product"
        FROM public."{table_name}"
        ORDER BY "Distributor_Code"
    '''
    
    rows = query_all(data_query)  # type: ignore
    
    if not rows:
        return []
    
    # Group by distributor and aggregate products
    from collections import defaultdict
    
    distributor_data = defaultdict(lambda: {"purchased": set(), "recommendations": set()})
    
    for row in rows:
        dist_code = row["Distributor_Code"]
        products_bought = row.get("Products_Bought_Together", "")
        suggested = row.get("Suggested_Product", "")
        
        # Split comma-separated products
        if products_bought:
            for p in products_bought.split(","):
                p = p.strip()
                if p:
                    distributor_data[dist_code]["purchased"].add(p)
        
        if suggested:
            for p in suggested.split(","):
                p = p.strip()
                if p:
                    distributor_data[dist_code]["recommendations"].add(p)
    
    # Build response
    recommendations = []
    for dist_code in sorted(distributor_data.keys()):
        recommendations.append(CrossSellRecommendation(
            customer=dist_code,
            products_purchased=", ".join(sorted(distributor_data[dist_code]["purchased"])),
            recommendations=", ".join(sorted(distributor_data[dist_code]["recommendations"]))
        ))
    
    return recommendations
