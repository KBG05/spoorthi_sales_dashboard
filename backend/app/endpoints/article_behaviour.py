"""
Article Behaviour Endpoints

Replicates: server/article_trend_server.R
UI Reference: ui/article_trend_ui.R

Provides article purchase behaviour analysis with dual-axis plotting support.
Uses spoorthi_abc_xyz_datamart and spoorthi_dataset_without_spares tables.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from collections import defaultdict
from ..database import query_all, query_one, parse_fy
from ..schemas import (
    ArticleListItem,
    ArticleBehaviourDataPoint,
    User,
    CustomerListItem,
    ProductBehaviourDataPoint,
)
from ..endpoints.auth import get_current_user

router = APIRouter(
    prefix="/article-behaviour",
    tags=["Article Behaviour"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/available-years")
async def get_available_years():
    """
    Get list of available financial years from the datamart.
    """
    sql = """
        SELECT DISTINCT fin_year_label
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year_label IS NOT NULL
        ORDER BY fin_year_label DESC
    """
    rows = query_all(sql)

    if not rows:
        return {"financial_years": []}

    fy_years = [row["fin_year_label"] for row in rows if row["fin_year_label"]]

    return {"financial_years": fy_years}


@router.get("/articles", response_model=List[ArticleListItem])
async def get_articles_by_class(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_class: str = Query("A", description="ABC class (A, B, or C)"),
):
    """
    Get list of articles for selected ABC class in a financial year.
    Uses spoorthi_abc_xyz_datamart to find articles with matching ABC category.
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    sql = """
                SELECT DISTINCT
                        dm.article_no,
                        COALESCE(NULLIF(pm.description, ''), NULLIF(pm.article_name, ''), dm.article_no) AS article_description
                FROM public."spoorthi_abc_xyz_datamart" dm
                LEFT JOIN public.sphoorti_product_master pm
                        ON pm.article_no = dm.article_no
                WHERE dm.fin_year = %s
                    AND dm.abc = %s
                ORDER BY dm.article_no
    """

    rows = query_all(sql, (start_year, abc_class.upper()))

    return [
        ArticleListItem(
            article_no=str(row["article_no"]),
            article_name=str(row.get("article_description") or row["article_no"]),
        )
        for row in rows
    ]


@router.get("/customers", response_model=List[CustomerListItem])
async def get_customers_for_article(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    article_no: str = Query(..., description="Article number"),
    abc_classes: str = Query("A,B,C", description="Comma-separated ABC classes"),
):
    """
    Get list of customers who purchased a specific article in a financial year.
    Filters by customer ABC class from customer_abc_xyz_fy table.
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    # Customer ABC table for this FY
    fy_table = f"customer_abc_xyz_fy_{start_year}_{end_year}"

    class_list = [cls.strip().upper() for cls in abc_classes.split(",")]
    class_in = ",".join([f"'{cls}'" for cls in class_list])

    # Check if customer FY table exists
    table_check = query_one(
        "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = %s",
        (fy_table,),
    )

    if table_check:
        sql = f"""
            SELECT DISTINCT
                ad.customer_name,
                COALESCE(c.abc_category, 'N/A') as abc_category
            FROM public."spoorthi_dataset_without_spares" ad
            LEFT JOIN public."{fy_table}" c
                ON ad.customer_name = c.customer_name
            WHERE ad.invoice_date BETWEEN '{start_date}' AND '{end_date}'
              AND ad.article_no = %s
              AND COALESCE(c.abc_category, 'C') IN ({class_in})
            ORDER BY ad.customer_name
        """
    else:
        sql = f"""
            SELECT DISTINCT
                ad.customer_name,
                'N/A' as abc_category
            FROM public."spoorthi_dataset_without_spares" ad
            WHERE ad.invoice_date BETWEEN '{start_date}' AND '{end_date}'
              AND ad.article_no = %s
            ORDER BY ad.customer_name
        """

    rows = query_all(sql, (article_no,))

    return [
        CustomerListItem(
            customer_id=str(row["customer_name"]),
            customer_name=row["customer_name"],
            abc_category=row.get("abc_category"),
        )
        for row in rows
    ]


@router.get("/trend", response_model=List[ArticleBehaviourDataPoint])
async def get_article_behaviour_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_class: str = Query("A", description="ABC class (A, B, or C)"),
    article_no: str = Query(..., description="Selected article number"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'"),
    customer_ids: str = Query(
        "", description="Optional comma-separated customer names"
    ),
):
    """
    Get article behaviour trend data with dual-axis support.
    Shows class total vs selected article monthly trend.
    """
    try:
        start_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format")

    fin_year = start_year  # bigint in DB
    start_date = f"{start_year}-04-01"
    end_date = f"{end_year}-03-31"

    value_col = "ass_value" if metric == "Revenue" else "inv_quantity"
    dm_value_col = value_col  # same column names in datamart

    # Use the DATAMART for class totals — it has per-month ABC classification
    # so articles that switch class between months are counted correctly
    class_total_sql = (
        """
        SELECT
            year_month as month_key,
            SUM(%s) as class_total
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year = %%s AND abc = %%s
        GROUP BY year_month
        ORDER BY year_month
    """
        % dm_value_col
    )
    class_rows = query_all(class_total_sql, (fin_year, abc_class.upper()))

    if not class_rows:
        raise HTTPException(status_code=404, detail="No data found for this class/year")

    # Selected article monthly values from raw data
    article_sql = f"""
        SELECT
            TO_CHAR(invoice_date, 'YYYY-MM') as month_key,
            SUM({value_col}) as article_total
        FROM public."spoorthi_dataset_without_spares"
        WHERE invoice_date BETWEEN %s AND %s
          AND article_no = %s
        GROUP BY month_key
        ORDER BY month_key
    """
    article_rows = query_all(article_sql, (start_date, end_date, article_no))
    article_by_month = {
        r["month_key"]: float(r["article_total"] or 0) for r in article_rows
    }

    # Calculate scaling factor for dual axis
    max_class = max(float(r["class_total"] or 0) for r in class_rows)
    max_article = max(article_by_month.values()) if article_by_month else 0
    scale_factor = max_class / max_article if max_article > 0 else 1

    result = []

    for row in class_rows:
        month_date = f"{row['month_key']}-01"
        class_value = float(row["class_total"] or 0)
        article_value = article_by_month.get(row["month_key"], 0.0)

        result.append(
            ArticleBehaviourDataPoint(
                month=month_date,
                value=round(class_value, 2),
                scaled_value=round(class_value, 2),
                type=f"Class {abc_class} Total",
                article_no=None,
            )
        )

        result.append(
            ArticleBehaviourDataPoint(
                month=month_date,
                value=round(article_value, 2),
                scaled_value=round(article_value * scale_factor, 2),
                type=f"Article {article_no}",
                article_no=article_no,
            )
        )

    # Customer-specific data
    if customer_ids:
        customer_list = [c.strip() for c in customer_ids.split(",") if c.strip()]

        if customer_list:
            cust_placeholders = ",".join(["%s"] * len(customer_list))

            customer_sql = f"""
                SELECT
                    TO_CHAR(invoice_date, 'YYYY-MM') as month_key,
                    customer_name,
                    SUM({value_col}) as value
                FROM public."spoorthi_dataset_without_spares"
                WHERE invoice_date BETWEEN %s AND %s
                  AND article_no = %s
                  AND customer_name IN ({cust_placeholders})
                GROUP BY month_key, customer_name
                ORDER BY month_key, customer_name
            """

            customer_rows = query_all(
                customer_sql, (start_date, end_date, article_no, *customer_list)
            )

            customer_data = defaultdict(dict)
            for r in customer_rows:
                customer_data[r["customer_name"]][r["month_key"]] = float(
                    r["value"] or 0
                )

            for row in class_rows:
                month_date = f"{row['month_key']}-01"
                for cust_name in customer_list:
                    cust_value = customer_data.get(cust_name, {}).get(
                        row["month_key"], 0.0
                    )
                    result.append(
                        ArticleBehaviourDataPoint(
                            month=month_date,
                            value=round(cust_value, 2),
                            scaled_value=round(cust_value, 2),
                            type=f"Customer {cust_name}",
                            article_no=article_no,
                        )
                    )

    return result
