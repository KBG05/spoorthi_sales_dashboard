"""
Customer Comparison Endpoints

Select one article, compare up to 2 customers side by side.
Similar to customer_behaviour but with article as the primary filter.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from collections import defaultdict
from ..database import query_all, parse_fy
from ..schemas import (
    ArticleListItem,
    CustomerListItem,
    CustomerBehaviourDataPoint,
    User,
)
from ..endpoints.auth import get_current_user

router = APIRouter(
    prefix="/customer-comparison",
    tags=["Customer Comparison"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/available-years")
async def get_available_years():
    """Get list of available financial years from spoorthi_abc_xyz_datamart."""
    rows = query_all(
        """
        SELECT DISTINCT fin_year_label
        FROM public.spoorthi_abc_xyz_datamart
        WHERE fin_year_label IS NOT NULL
        ORDER BY fin_year_label DESC
        """
    )
    return {"financial_years": [r["fin_year_label"] for r in rows if r["fin_year_label"]]}


@router.get("/articles", response_model=List[ArticleListItem])
async def get_articles_by_class(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY25-26')"),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes"),
):
    """
    Get articles belonging to selected ABC classes in a financial year.
    Uses the datamart for ABC classification.
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    class_list = [c.strip().upper() for c in abc_classes.split(",")]
    class_in = ",".join(f"'{c}'" for c in class_list)

    sql = f"""
        SELECT DISTINCT article_no
        FROM public.spoorthi_abc_xyz_datamart
        WHERE fin_year_label = '{fy_label}'
          AND abc IN ({class_in})
        ORDER BY article_no
    """
    rows = query_all(sql)

    return [
        ArticleListItem(article_no=r["article_no"], article_name=r["article_no"])
        for r in rows
        if r["article_no"]
    ]


@router.get("/customers", response_model=List[CustomerListItem])
async def get_customers_for_article(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY25-26')"),
    article_no: str = Query(..., description="Article number to find customers for"),
):
    """
    Get customers who purchased a specific article in a financial year.
    """
    try:
        start_year, end_year, _ = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    sql = f"""
        SELECT DISTINCT customer_name
        FROM public.spoorthi_dataset_without_spares
        WHERE article_no = %s
          AND invoice_date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY customer_name
    """
    rows = query_all(sql, (article_no,))

    return [
        CustomerListItem(
            customer_id=str(r["customer_name"]),
            customer_name=str(r["customer_name"]),
        )
        for r in rows
        if r["customer_name"]
    ]


@router.get("/trend", response_model=List[CustomerBehaviourDataPoint])
async def get_comparison_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY25-26')"),
    article_no: str = Query(..., description="Article number to compare"),
    customer_ids: str = Query(..., description="Comma-separated customer names (max 2)"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'"),
):
    """
    Get monthly trend for a specific article across up to 2 customers.
    Returns both Overall (all articles) and Article-specific data for each customer.
    """
    try:
        start_year, end_year, _ = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    cust_list = [c.strip() for c in customer_ids.split(",")]
    if len(cust_list) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 customers allowed")

    cust_in = ",".join(f"'{c.replace(chr(39), chr(39)+chr(39))}'" for c in cust_list)
    metric_col = "Revenue" if metric == "Revenue" else "Quantity"

    sql = f"""
        SELECT
            TO_CHAR(invoice_date, 'YYYY-MM') AS time_id,
            customer_name,
            article_no,
            inv_quantity AS "Quantity",
            ass_value AS "Revenue"
        FROM public.spoorthi_dataset_without_spares
        WHERE invoice_date BETWEEN '{start_date}' AND '{end_date}'
          AND customer_name IN ({cust_in})
        ORDER BY time_id
    """
    rows = query_all(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    # Aggregate per customer: overall (all articles) and article-specific
    customer_overall = defaultdict(lambda: defaultdict(float))
    customer_article = defaultdict(lambda: defaultdict(float))
    all_months = set()

    for row in rows:
        tid = row["time_id"]
        cname = row["customer_name"]
        val = float(row[metric_col] or 0)

        all_months.add(tid)
        customer_overall[cname][tid] += val

        if row["article_no"] == article_no:
            customer_article[cname][tid] += val

    result = []
    for tid in sorted(all_months):
        month_str = f"{tid}-01"
        for cname in cust_list:
            # Overall (all articles for this customer)
            result.append(
                CustomerBehaviourDataPoint(
                    month=month_str,
                    value=round(customer_overall[cname].get(tid, 0.0), 2),
                    type=f"Customer {cname} Overall",
                    article_no=None,
                )
            )
            # Article-specific
            result.append(
                CustomerBehaviourDataPoint(
                    month=month_str,
                    value=round(customer_article[cname].get(tid, 0.0), 2),
                    type=f"Customer {cname} Article {article_no}",
                    article_no=article_no,
                )
            )

    return result
