"""
ABC Analysis Endpoints

Replicates: server/abc_server.R
UI Reference: ui/abc_ui.R

Provides product trend data grouped by ABC and XYZ categories.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import datetime, timedelta
from ..database import query_all, parse_fy
from ..schemas import ABCTrendDataPoint, ABCTrendResponse, CategoryTrendResponse, CategoryTrendDataPoint
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/abc", tags=["ABC Analysis"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)


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

    return {
        "financial_years": [row["fin_year_label"] for row in rows if row["fin_year_label"]]
    }


@router.get("/trend", response_model=ABCTrendResponse)
async def get_abc_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25')"),
    abc_categories: str = Query("A,B,C", description="Comma-separated ABC categories"),
    xyz_categories: str = Query("X,Y,Z", description="Comma-separated XYZ categories"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'"),
    product_categories: str = Query("", description="Optional comma-separated product categories to narrow the trend to"),
):
    """
    Get product trend data by ABC/XYZ categories for a financial year.
    
    Matches: abc_server.R -> trendPlot renderPlot
    
    SQL Query:
        SELECT
            t1."TimeID",
            t2."ABC_Category",
            t2."XYZ_Category",
            SUM(t1."Quantity") AS "TotalQuantity",
            SUM(t1."Revenue") AS "TotalValue"
        FROM public."Aggregated Data" AS t1
        INNER JOIN public."product_ABC_XYZ_{table_suffix}" AS t2 
            ON t1."ProductID" = t2."ProductID"
        WHERE
            t1."TimeID" BETWEEN {start} AND {end}
            AND t2."ABC_Category" IN (...)
            AND t2."XYZ_Category" IN (...)
        GROUP BY t1."TimeID", t2."ABC_Category", t2."XYZ_Category"
        ORDER BY t1."TimeID"
    
    Functions Used:
        - query_all() - execute query and get all rows
    
    Returns:
        {
            "data": [
                {"month_date": "2024-04-01", "abc_category": "A", "value": 12.5},
                {"month_date": "2024-04-01", "abc_category": "Overall", "value": 45.8},
                ...
            ],
            "metric": "Revenue",
            "financial_year": "FY24-25"
        }
    """
    # Build year string
    try:
        fy_year, end_year, fy_label = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format. Expected 'FY24-25' or '2024-25'")
    
    # Parse categories
    abc_list = [cat.strip().upper() for cat in abc_categories.split(",")]
    xyz_list = [cat.strip().upper() for cat in xyz_categories.split(",")]
    
    abc_list = [c for c in abc_list if c in ("A", "B", "C")] or ["A", "B", "C"]
    xyz_list = [c for c in xyz_list if c in ("X", "Y", "Z")] or ["X", "Y", "Z"]
    abc_in = ",".join([f"'{cat}'" for cat in abc_list])
    xyz_in = ",".join([f"'{cat}'" for cat in xyz_list])

    category_list = [c.strip() for c in product_categories.split(",") if c.strip()]
    category_filter = "AND COALESCE(NULLIF(TRIM(category), ''), 'Uncategorised') = ANY(%s)" if category_list else ""
    category_params = (category_list,) if category_list else None
    
    # Build query - two queries: one for filtered data, one for overall
    sql_filtered = f'''
        SELECT
            year_month as "TimeID",
            abc as "ABC_Category",
            xyz as "XYZ_Category",
            SUM(inv_quantity) AS "TotalQuantity",
            SUM(ass_value) AS "TotalValue"
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year = {fy_year}
            AND abc IN ({abc_in})
            AND xyz IN ({xyz_in})
            {category_filter}
        GROUP BY year_month, abc, xyz
        ORDER BY year_month
    '''
    
    # Overall query - no filters on ABC/XYZ
    sql_overall = f'''
        SELECT
            year_month as "TimeID",
            SUM(inv_quantity) AS "TotalQuantity",
            SUM(ass_value) AS "TotalValue"
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year = {fy_year}
            {category_filter}
        GROUP BY year_month
        ORDER BY year_month
    '''
    
    rows = query_all(sql_filtered, category_params)  # type: ignore
    overall_rows = query_all(sql_overall, category_params)  # type: ignore
    
    # Process overall data first
    overall = {}
    metric_col = "TotalValue" if metric == "Revenue" else "TotalQuantity"
    
    for row in overall_rows:
        time_id = row["TimeID"]
        value = float(row[metric_col] or 0)
        
        # Convert to millions if Revenue
        if metric == "Revenue":
            value = value / 1_000_000
        
        overall[time_id] = value
    
    # No data at all: return an empty series so the UI shows its empty state
    # (a 404 here used to leave the previous chart on screen).
    if not rows and not overall_rows:
        return ABCTrendResponse(data=[], metric=metric, financial_year=financial_year)
    
    # Process filtered data: aggregate by TimeID and ABC_Category
    from collections import defaultdict
    
    # Group by TimeID and ABC_Category
    grouped = defaultdict(lambda: defaultdict(float))
    
    for row in rows:
        time_id = row["TimeID"]
        abc_cat = row["ABC_Category"]
        value = float(row[metric_col] or 0)
        
        # Convert to millions if Revenue
        if metric == "Revenue":
            value = value / 1_000_000
        
        grouped[time_id][abc_cat] += value
    
    # Build response data
    data_points = []
    
    # Get all unique TimeIDs from both queries
    all_time_ids = set(list(grouped.keys()) + list(overall.keys()))
    
    for time_id in sorted(all_time_ids):
        # time_id here is "year_month" like "2024-04"
        month_str = f"{time_id}-01"
        
        # Add individual ABC categories (only if they have data)
        if time_id in grouped:
            for abc_cat in sorted(grouped[time_id].keys()):
                data_points.append(ABCTrendDataPoint(
                    month_date=month_str,
                    abc_category=abc_cat,
                    value=round(grouped[time_id][abc_cat], 2)
                ))
        
        # Add Overall (always from overall query)
        if time_id in overall:
            data_points.append(ABCTrendDataPoint(
                month_date=month_str,
                abc_category="Overall",
                value=round(overall[time_id], 2)
            ))
    
    return ABCTrendResponse(
        data=data_points,
        metric=metric,
        financial_year=financial_year
    )


_CATEGORY_SQL = "COALESCE(NULLIF(TRIM(category), ''), 'Uncategorised')"


@router.get("/category-trend", response_model=CategoryTrendResponse)
async def get_category_trend(
    financial_year: str = Query(..., description="Financial year (e.g., 'FY24-25' or '2024-25')"),
    categories: str = Query("", description="Comma-separated product categories; empty = top 5 by revenue"),
    metric: str = Query("Revenue", description="'Revenue' or 'Quantity'"),
):
    """
    Monthly revenue/quantity trend per product category for a financial year.

    Also returns every category with sales in the FY (ordered by revenue) so the
    UI can build its filter, and the categories actually plotted.
    Revenue is returned in millions, matching /abc/trend.
    """
    try:
        fy_year, _, _ = parse_fy(financial_year)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid financial year format. Expected 'FY24-25' or '2024-25'")

    available_rows = query_all(
        f"""
        SELECT {_CATEGORY_SQL} AS category, SUM(ass_value) AS total
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year = %s
        GROUP BY 1
        ORDER BY total DESC NULLS LAST
        """,
        (fy_year,),
    )
    available = [r["category"] for r in available_rows]

    requested = [c.strip() for c in categories.split(",") if c.strip()]
    selected = [c for c in requested if c in available] if requested else available[:5]

    if not selected:
        return CategoryTrendResponse(
            data=[], metric=metric, financial_year=financial_year,
            available_categories=available, selected_categories=[],
        )

    value_col = "inv_quantity" if metric == "Quantity" else "ass_value"
    rows = query_all(
        f"""
        SELECT year_month, {_CATEGORY_SQL} AS category, SUM({value_col}) AS value
        FROM public."spoorthi_abc_xyz_datamart"
        WHERE fin_year = %s AND {_CATEGORY_SQL} = ANY(%s)
        GROUP BY 1, 2
        ORDER BY 1, 2
        """,
        (fy_year, selected),
    )

    divisor = 1_000_000 if metric == "Revenue" else 1
    data = [
        CategoryTrendDataPoint(
            month_date=f"{r['year_month']}-01",
            category=r["category"],
            value=round(float(r["value"] or 0) / divisor, 2),
        )
        for r in rows
    ]

    return CategoryTrendResponse(
        data=data, metric=metric, financial_year=financial_year,
        available_categories=available, selected_categories=selected,
    )
