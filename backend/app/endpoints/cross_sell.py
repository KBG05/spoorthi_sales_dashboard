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

router = APIRouter(
    prefix="/cross-sell",
    tags=["Cross-Sell Analysis"],
    dependencies=[Depends(get_current_user)],
)


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
          AND tablename ~ '^cross_sell_[0-9]{4}_[0-9]{2}$'
        ORDER BY tablename DESC
        LIMIT 1
    """

    result = query_one(table_query)  # type: ignore

    if not result or not result.get("tablename"):
        raise HTTPException(
            status_code=404, detail="No cross-sell recommendation table found"
        )

    table_name = result["tablename"]

    # Fetch all recommendations
    data_query = f"""
        SELECT 
            DISTINCT cr."Customer" AS "Distributor_Code",
            ad.customer_name AS customer,
            cr."Trigger_Items_Antecedents" AS "Products_Bought_Together",
            cr."Recommended_Items_Consequents" AS "Suggested_Product"
        FROM public."{table_name}" cr
        LEFT JOIN public."spoorthi_dataset_without_spares" ad ON CAST(cr."Customer" AS TEXT) = CAST(ad.customer_name AS TEXT)
        ORDER BY cr."Customer"
    """

    rows = query_all(data_query)  # type: ignore

    if not rows:
        return []

    # Fetch product master for name lookups
    product_master_query = (
        "SELECT DISTINCT article_no AS product_code, article_no AS commercial_name FROM spoorthi_dataset_without_spares"
    )
    product_rows = query_all(product_master_query)  # type: ignore
    product_names = {
        str(row["product_code"]): row["commercial_name"]
        for row in product_rows
        if row.get("commercial_name")
    }

    # Group by distributor and aggregate products
    from collections import defaultdict

    distributor_data = defaultdict(
        lambda: {
            "customer_name": None,
            "purchased": set(),
            "recommendations": set(),
            "purchased_names": set(),
            "recommendation_names": set(),
        }
    )

    for row in rows:
        dist_code = row["Distributor_Code"]
        cust_name = row.get("customer")
        products_bought = row.get("Products_Bought_Together", "")
        suggested = row.get("Suggested_Product", "")

        if cust_name and not distributor_data[dist_code]["customer_name"]:
            distributor_data[dist_code]["customer_name"] = cust_name

        # Split comma-separated products
        if products_bought:
            for p in products_bought.split(","):
                p = p.strip()
                if p:
                    distributor_data[dist_code]["purchased"].add(p)
                    if p in product_names:
                        distributor_data[dist_code]["purchased_names"].add(
                            product_names[p]
                        )

        if suggested:
            for p in suggested.split(","):
                p = p.strip()
                if p:
                    distributor_data[dist_code]["recommendations"].add(p)
                    if p in product_names:
                        distributor_data[dist_code]["recommendation_names"].add(
                            product_names[p]
                        )

    # Build response
    recommendations = []
    for dist_code in sorted(distributor_data.keys()):
        data = distributor_data[dist_code]

        # Remove already-purchased products from recommendations
        filtered_recs = data["recommendations"] - data["purchased"]
        filtered_rec_names = set()
        for p in filtered_recs:
            if p in product_names:
                filtered_rec_names.add(product_names[p])

        # Skip distributor if no recommendations remain after filtering
        if not filtered_recs:
            continue

        recommendations.append(
            CrossSellRecommendation(
                customer=dist_code,
                customer_name=data["customer_name"],
                articles_purchased=", ".join(sorted(data["purchased"])),
                article_names_purchased=(
                    ", ".join(sorted(data["purchased_names"]))
                    if data["purchased_names"]
                    else None
                ),
                recommendations=", ".join(sorted(filtered_recs)),
                recommendation_names=(
                    ", ".join(sorted(filtered_rec_names))
                    if filtered_rec_names
                    else None
                ),
            )
        )

    return recommendations
