"""
Customer Behaviour Endpoints

Replicates: server/customer_behaviour_server.R
UI Reference: ui/customer_behaviour_ui.R

Provides customer purchase behaviour analysis with product-level details.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime, timedelta
from ..database import query_all, parse_fy
from ..schemas import (
    CustomerListItem,
    ArticleListItem,
    CustomerBehaviourDataPoint,
    User,
)
from ..endpoints.auth import get_current_user

router = APIRouter(
    prefix="/customer-behaviour",
    tags=["Customer Behaviour"],
    dependencies=[Depends(get_current_user)],
)

BASE_DATE = datetime(2021, 1, 1)


@router.get("/available-years")
async def get_available_years():
    """
    Get list of available financial years based on spoorthi_abc_xyz_datamart.
    """
    table_query = """
        SELECT DISTINCT fin_year_label 
        FROM public.spoorthi_abc_xyz_datamart 
        WHERE fin_year_label IS NOT NULL
        ORDER BY fin_year_label DESC
    """

    rows = query_all(table_query)  # type: ignore

    if not rows:
        return {"financial_years": []}

    fy_years = [row["fin_year_label"] for row in rows if row["fin_year_label"]]

    return {"financial_years": fy_years}


@router.get("/customers", response_model=List[CustomerListItem])
async def get_customers_by_class(
    financial_year: str = Query(
        ..., description="Financial year label (e.g., '2024-25')"
    ),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes"),
):
    """
    Get list of customers for selected ABC classes in a financial year.
    Uses customer_abc_xyz_fy_YYYY_YYYY table for customer-ABC mapping,
    falling back to spoorthi_dataset_without_spares if the table doesn't exist.
    """
    fy_label = financial_year.replace("FY", "")

    # Parse classes
    class_list = [cls.strip().upper() for cls in abc_classes.split(",")]
    class_in = ",".join([f"'{cls}'" for cls in class_list])

    # Build the customer ABC table name: customer_abc_xyz_fy_YYYY_YYYY
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
        customer_table = f"customer_abc_xyz_fy_{start_year}_{end_year}"
    except ValueError:
        customer_table = None

    # Try the customer ABC table first
    if customer_table:
        try:
            sql = f"""
                SELECT DISTINCT customer_name
                FROM public."{customer_table}"
                WHERE abc_category IN ({class_in})
                ORDER BY customer_name
            """
            rows = query_all(sql)
            if rows:
                return [
                    CustomerListItem(
                        customer_id=str(row["customer_name"]),
                        customer_name=str(row["customer_name"]),
                    )
                    for row in rows
                    if row["customer_name"]
                ]
        except Exception:
            pass  # Fall through to alternative query

    # Fallback: get customers from dataset, join with datamart for ABC
    # Filter by FY date range so only customers with actual purchases appear
    sql = f"""
        SELECT DISTINCT d.customer_name
        FROM public."spoorthi_dataset_without_spares" d
        INNER JOIN public."spoorthi_abc_xyz_datamart" m
            ON d.article_no = m.article_no
            AND m.fin_year_label = '{fy_label}'
        WHERE m.abc IN ({class_in})
            AND d.invoice_date BETWEEN '{start_year}-04-01' AND '{end_year}-03-31'
        ORDER BY d.customer_name
    """

    rows = query_all(sql)

    return [
        CustomerListItem(
            customer_id=str(row["customer_name"]),
            customer_name=str(row["customer_name"]),
        )
        for row in rows
        if row["customer_name"]
    ]


@router.get("/articles", response_model=List[ArticleListItem])
async def get_articles_for_customers(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    customer_ids: str = Query(..., description="Comma-separated customer names"),
):
    """
    Get list of articles purchased by selected customers in a financial year.
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    # Parse customer IDs
    cust_list = [cid.strip().replace("'", "''") for cid in customer_ids.split(",")]
    cust_in = ",".join([f"'{c}'" for c in cust_list])

    sql = f"""
        SELECT DISTINCT
            d.article_no,
            COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), d.article_no) AS article_description
        FROM public."spoorthi_dataset_without_spares" d
        LEFT JOIN public.sphoorti_product_master pm
            ON pm.article_no = d.article_no
        WHERE
            d.invoice_date BETWEEN '{start_date}' AND '{end_date}'
            AND d.customer_name IN ({cust_in})
        ORDER BY d.article_no
    """

    rows = query_all(sql)  # type: ignore

    return [
        ArticleListItem(
            article_no=str(row["article_no"]),
            article_name=str(row.get("article_description") or row["article_no"]),
        )
        for row in rows
        if row["article_no"]
    ]


@router.get("/trend", response_model=List[CustomerBehaviourDataPoint])
async def get_customer_behaviour_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes"),
    customer_ids: str = Query(
        ..., description="Comma-separated customer names (max 2)"
    ),
    article_ids: str = Query("", description="Single article ID for comparison"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'"),
):
    """
    Get customer behaviour trend data with dual-axis support.
    """
    # Parse FY
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    # Parse inputs
    class_list = [cls.strip().upper() for cls in abc_classes.split(",")]

    cust_list = [cid.strip() for cid in customer_ids.split(",")]
    cust_in = ",".join([f"'{c.replace(chr(39), chr(39)+chr(39))}'" for c in cust_list])

    # Validate customer limit
    if len(cust_list) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 customers allowed")

    # Parse article ID (single article only)
    selected_article_id = article_ids.strip() if article_ids.strip() else None

    # Query data
    sql = f"""
        SELECT
            TO_CHAR(invoice_date, 'YYYY-MM') AS "TimeID",
            customer_name AS "CustomerID",
            article_no AS "ProductID", 
            inv_quantity AS "Quantity",
            ass_value AS "Revenue"
        FROM public."spoorthi_dataset_without_spares"
        WHERE
            invoice_date BETWEEN '{start_date}' AND '{end_date}'
            AND customer_name IN ({cust_in})
        ORDER BY TO_CHAR(invoice_date, 'YYYY-MM')
    """

    rows = query_all(sql)  # type: ignore

    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    # Process data
    from collections import defaultdict

    metric_col = "Revenue" if metric == "Revenue" else "Quantity"

    # Separate data structures for each customer
    customer_overall = defaultdict(lambda: defaultdict(float))
    customer_product = defaultdict(lambda: defaultdict(float))

    all_time_ids = set()

    for row in rows:
        time_id = row["TimeID"]  # 'YYYY-MM' format
        customer_id = row["CustomerID"]
        product_id = row["ProductID"]
        value = float(row[metric_col] or 0)

        all_time_ids.add(time_id)

        # Add to overall (all products)
        customer_overall[customer_id][time_id] += value

        # Add to product-specific if it matches selected product
        if selected_article_id and product_id == selected_article_id:
            customer_product[customer_id][time_id] += value

    # Build response
    result = []

    for time_id in sorted(list(all_time_ids)):
        month_str = f"{time_id}-01"

        # Add data for each customer
        for customer_id in cust_list:
            # Overall line for this customer
            overall_value = customer_overall[customer_id].get(time_id, 0.0)
            result.append(
                CustomerBehaviourDataPoint(
                    month=month_str,
                    value=round(overall_value, 2),
                    type=f"Customer {customer_id} Overall",
                    article_no=None,
                )
            )

            # Product-specific line for this customer
            if selected_article_id:
                product_value = customer_product[customer_id].get(time_id, 0.0)
                result.append(
                    CustomerBehaviourDataPoint(
                        month=month_str,
                        value=round(product_value, 2),
                        type=f"Customer {customer_id} Article {selected_article_id}",
                        article_no=selected_article_id,
                    )
                )

    return result
