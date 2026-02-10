"""
Master Data Endpoints

Provides lookup endpoints for product and customer master tables.
Returns code → name mappings for resolving IDs across the application.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from ..database import query_all
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/masters", tags=["Masters"], dependencies=[Depends(get_current_user)])


@router.get("/products")
async def get_products() -> Dict[str, str]:
    """
    Get product code → name mapping from priyatextile_product_master.
    
    Returns:
        Dict mapping product_code (as string) to commercial_name
    """
    query = """
        SELECT product_code, commercial_name 
        FROM priyatextile_product_master
        WHERE commercial_name IS NOT NULL
        ORDER BY product_code
    """
    
    try:
        rows = query_all(query)  # type: ignore
        
        # Convert to dict: product_code → commercial_name
        product_map = {}
        for row in rows:
            code = str(row.get("product_code", ""))
            name = row.get("commercial_name", "")
            if code and name:
                product_map[code] = name
        
        return product_map
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")


@router.get("/customers")
async def get_customers() -> Dict[str, str]:
    """
    Get customer code → name mapping from priyatextile_customer_master.
    
    Returns:
        Dict mapping customer_code (as string) to customer
    """
    query = """
        SELECT customer_code, customer 
        FROM priyatextile_customer_master
        WHERE customer IS NOT NULL
        ORDER BY customer_code
    """
    
    try:
        rows = query_all(query)  # type: ignore
        
        # Convert to dict: customer_code → customer
        customer_map = {}
        for row in rows:
            code = str(row.get("customer_code", ""))
            name = row.get("customer", "")
            if code and name:
                customer_map[code] = name
        
        return customer_map
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")
