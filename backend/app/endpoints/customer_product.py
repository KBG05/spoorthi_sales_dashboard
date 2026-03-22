"""
Customer Product List Endpoints

Replicates: server/customer_product_server.R
UI Reference: ui/customer_product_ui.R

Provides customer-article purchase mapping with last purchase dates.
Data source: public.customer_product_list table.
"""

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from ..database import query_all
from ..schemas import (
    CustomerProductRow,
    CustomerProductResponse,
    User,
)
from ..endpoints.auth import get_current_user

router = APIRouter(
    prefix="/customer-product",
    tags=["Customer Product List"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/dates")
async def get_available_dates():
    """Return distinct calculation_date values (descending)."""
    rows = query_all(
        """
        SELECT DISTINCT calculation_date
        FROM public.customer_product_list
        ORDER BY calculation_date DESC
        """
    )
    return {"dates": [str(r["calculation_date"]) for r in rows]}


@router.get("/customers")
async def get_customers(
    calculation_date: str = Query(..., description="Calculation date (YYYY-MM-DD)"),
):
    """Return distinct customers for a given calculation_date."""
    rows = query_all(
        """
        SELECT DISTINCT customer_name
        FROM public.customer_product_list
        WHERE calculation_date = %s
        ORDER BY customer_name
        """,
        (calculation_date,),
    )
    return {"customers": [r["customer_name"] for r in rows if r["customer_name"]]}


@router.get("/articles")
async def get_articles(
    calculation_date: str = Query(..., description="Calculation date (YYYY-MM-DD)"),
    customer_name: Optional[str] = Query(None, description="Optional customer filter"),
):
    """Return distinct articles, optionally filtered by customer."""
    if customer_name:
        rows = query_all(
            """
            SELECT DISTINCT
                cpl.article_no,
                COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), cpl.article_no) AS article_description
            FROM public.customer_product_list cpl
            LEFT JOIN public.sphoorti_product_master pm
                ON pm.article_no = cpl.article_no
            WHERE cpl.calculation_date = %s AND cpl.customer_name = %s
            ORDER BY cpl.article_no
            """,
            (calculation_date, customer_name),
        )
    else:
        rows = query_all(
            """
            SELECT DISTINCT
                cpl.article_no,
                COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), cpl.article_no) AS article_description
            FROM public.customer_product_list cpl
            LEFT JOIN public.sphoorti_product_master pm
                ON pm.article_no = cpl.article_no
            WHERE cpl.calculation_date = %s
            ORDER BY cpl.article_no
            """,
            (calculation_date,),
        )
    return {
        "articles": [
            {
                "article_no": r["article_no"],
                "article_name": r.get("article_description") or r["article_no"],
            }
            for r in rows
            if r["article_no"]
        ]
    }


@router.get("/data", response_model=CustomerProductResponse)
async def get_data(
    calculation_date: str = Query(..., description="Calculation date (YYYY-MM-DD)"),
    customer_name: Optional[str] = Query(None, description="Filter by customer"),
    article_no: Optional[str] = Query(None, description="Filter by article"),
):
    """Return the customer-product list filtered by date, customer, article."""
    conditions = ["cpl.calculation_date = %s"]
    params: list = [calculation_date]

    if customer_name:
        conditions.append("cpl.customer_name = %s")
        params.append(customer_name)

    if article_no:
        conditions.append("cpl.article_no = %s")
        params.append(article_no)

    where = " AND ".join(conditions)

    rows = query_all(
        f"""
        SELECT
            cpl.customer_name,
            cpl.article_no,
            COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), cpl.article_no) AS article_description,
            cpl.last_purchase_date
        FROM public.customer_product_list cpl
        LEFT JOIN public.sphoorti_product_master pm
            ON pm.article_no = cpl.article_no
        WHERE {where}
        ORDER BY cpl.customer_name, cpl.last_purchase_date DESC
        """,
        tuple(params),
    )

    data = [
        CustomerProductRow(
            customer_name=r["customer_name"],
            article_no=r["article_no"],
            article_description=r.get("article_description"),
            last_purchase_date=str(r["last_purchase_date"]),
        )
        for r in rows
    ]

    return CustomerProductResponse(
        data=data,
        total=len(data),
        calculation_date=calculation_date,
    )
