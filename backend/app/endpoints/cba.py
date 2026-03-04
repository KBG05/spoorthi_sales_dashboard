"""
CBA (Customer Behaviour Analysis) Endpoints

Provides RFM (Recency, Frequency, Monetary) analysis and customer segmentation.
Replicates: server/CustomerBehaviour2.R
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any
from datetime import datetime
from ..database import query_all
from ..schemas import RFMMetrics, RFMSummary, SegmentData, User
from ..endpoints.auth import get_current_user

router = APIRouter(prefix="/cba", tags=["CBA Analysis"], dependencies=[Depends(get_current_user)])

BASE_DATE = datetime(2021, 1, 1)

def calculate_score(values: List[float], reverse: bool = False) -> List[int]:
    """
    Calculate RFM scores (1-5) using quintile method.
    
    Args:
        values: List of values to score
        reverse: If True, lower values get higher scores (for Recency)
    
    Returns:
        List of scores (1-5)
    """
    import numpy as np
    
    if len(values) == 0:
        return []
    
    # Remove None/NaN values
    clean_values = [v for v in values if v is not None]
    if len(clean_values) == 0:
        return [3] * len(values)
    
    unique_values = len(set(clean_values))
    
    if unique_values <= 1:
        return [3] * len(values)
    elif unique_values < 5:
        # Simple ranking for small datasets
        sorted_vals = sorted(set(clean_values))
        score_map = {val: idx + 1 for idx, val in enumerate(sorted_vals)}
        if reverse:
            max_score = len(sorted_vals)
            score_map = {val: max_score - score + 1 for val, score in score_map.items()}
        return [score_map.get(v, 3) for v in values]
    else:
        # Use quintiles for larger datasets
        percentiles = np.percentile(clean_values, [20, 40, 60, 80])
        scores = []
        for v in values:
            if v is None:
                scores.append(3)
            elif v <= percentiles[0]:
                scores.append(1 if not reverse else 5)
            elif v <= percentiles[1]:
                scores.append(2 if not reverse else 4)
            elif v <= percentiles[2]:
                scores.append(3)
            elif v <= percentiles[3]:
                scores.append(4 if not reverse else 2)
            else:
                scores.append(5 if not reverse else 1)
        return scores


def assign_segment(r_score: int, f_score: int, m_score: int) -> str:
    """Assign customer segment based on RFM scores."""
    if r_score >= 4 and f_score >= 4 and m_score >= 4:
        return "Champions"
    elif r_score >= 3 and f_score >= 3 and m_score >= 3:
        return "Loyal Customers"
    elif r_score >= 4 and f_score <= 2:
        return "New Customers"
    elif r_score >= 3 and m_score >= 3:
        return "Potential Loyalists"
    elif r_score <= 2 and f_score >= 3:
        return "At Risk"
    elif r_score <= 2 and f_score <= 2:
        return "Lost Customers"
    else:
        return "Regular Customers"


@router.get("/rfm-analysis", response_model=List[RFMMetrics])
async def get_rfm_analysis(
    time_period: int = Query(12, description="Time period in months (3, 6, 12, 24)")
):
    """
    Calculate RFM metrics and customer segmentation.
    
    SQL Logic:
    1. Get all transactions from Aggregated Data
    2. Calculate max TimeID (current period)
    3. Filter data for selected time period
    4. Group by CustomerID and calculate:
       - Recency: months since last purchase
       - Frequency: number of distinct purchase periods
       - Monetary: total revenue
    5. Calculate RFM scores (1-5 quintiles)
    6. Assign customer segments based on scores
    """
    
    try:
        # Query all data from spoorthi_dataset_without_spares
        # Calculate 'TimeID' based on invoice_date matching R logic
        sql = '''
            SELECT 
                Extract(Year from invoice_date) * 12 + Extract(Month from invoice_date) as time_id, 
                customer_name, 
                article_no, 
                inv_quantity, 
                ass_value
            FROM public."spoorthi_dataset_without_spares"
            WHERE invoice_date IS NOT NULL
        '''
        
        rows = query_all(sql)  # type: ignore
        
        if not rows:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Convert to numeric and find max TimeID
        data = []
        max_time_id = 0
        for row in rows:
            time_id = int(row["time_id"])
            customer_name = str(row["customer_name"])
            revenue = float(row["ass_value"] or 0)
            
            data.append({
                "TimeID": time_id,
                "customer_name": customer_name,
                "Revenue": revenue
            })
            
            if time_id > max_time_id:
                max_time_id = time_id
        
        # Filter data for time period
        min_time_id = max_time_id - time_period + 1
        filtered_data = [d for d in data if d["TimeID"] >= min_time_id]
        
        if not filtered_data:
            raise HTTPException(status_code=404, detail="No data in selected time period")
        
        # Group by customer and calculate RFM metrics
        from collections import defaultdict
        from typing import Dict, Set
        
        customer_data: Dict[str, Dict] = defaultdict(lambda: {
            "time_ids": set(),
            "transactions": 0,
            "revenue": 0.0,
            "last_time_id": 0
        })
        
        for d in filtered_data:
            cust_name = d["customer_name"]
            time_ids: Set[int] = customer_data[cust_name]["time_ids"]
            time_ids.add(d["TimeID"])
            customer_data[cust_name]["transactions"] = int(customer_data[cust_name]["transactions"]) + 1
            customer_data[cust_name]["revenue"] = float(customer_data[cust_name]["revenue"]) + d["Revenue"]
            last_time_id = int(customer_data[cust_name]["last_time_id"])
            if d["TimeID"] > last_time_id:
                customer_data[cust_name]["last_time_id"] = d["TimeID"]
        
        # Calculate RFM values for all customers
        rfm_values = []
        for cust_name, cust_data in customer_data.items():
            last_time_id = int(cust_data["last_time_id"])
            recency = max_time_id - last_time_id
            time_ids: Set[int] = cust_data["time_ids"]
            frequency = len(time_ids)
            monetary = float(cust_data["revenue"])
            transactions = int(cust_data["transactions"])
            avg_order_value = monetary / transactions if transactions > 0 else 0
            
            rfm_values.append({
                "customer_name": cust_name,
                "recency": recency,
                "frequency": frequency,
                "monetary": monetary,
                "transactions": transactions,
                "avg_order_value": avg_order_value
            })
        
        # Calculate scores
        recency_values = [r["recency"] for r in rfm_values]
        frequency_values = [r["frequency"] for r in rfm_values]
        monetary_values = [r["monetary"] for r in rfm_values]
        
        r_scores = calculate_score(recency_values, reverse=True)
        f_scores = calculate_score(frequency_values, reverse=False)
        m_scores = calculate_score(monetary_values, reverse=False)
        
        # Build result with scores and segments
        result = []
        for i, rfm in enumerate(rfm_values):
            r_score = r_scores[i]
            f_score = f_scores[i]
            m_score = m_scores[i]
            segment = assign_segment(r_score, f_score, m_score)
            
            result.append(RFMMetrics(
                customer_id=rfm["customer_name"],
                recency=rfm["recency"],
                frequency=rfm["frequency"],
                monetary=round(rfm["monetary"], 2),
                total_transactions=rfm["transactions"],
                avg_order_value=round(rfm["avg_order_value"], 2),
                r_score=r_score,
                f_score=f_score,
                m_score=m_score,
                rfm_score=f"{r_score}{f_score}{m_score}",
                segment=segment
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating RFM: {str(e)}")


@router.get("/summary", response_model=RFMSummary)
async def get_rfm_summary(
    time_period: int = Query(12, description="Time period in months")
):
    """Get summary statistics for RFM analysis."""
    
    rfm_data = await get_rfm_analysis(time_period)
    
    if not rfm_data:
        raise HTTPException(status_code=404, detail="No data available")
    
    total_customers = len(rfm_data)
    avg_recency = sum(r.recency for r in rfm_data) / total_customers
    avg_frequency = sum(r.frequency for r in rfm_data) / total_customers
    avg_monetary = sum(r.monetary for r in rfm_data) / total_customers
    total_revenue = sum(r.monetary for r in rfm_data)
    
    return RFMSummary(
        total_customers=total_customers,
        avg_recency=round(avg_recency, 1),
        avg_frequency=round(avg_frequency, 1),
        avg_monetary=round(avg_monetary, 2),
        total_revenue=round(total_revenue, 2)
    )


@router.get("/segments", response_model=List[SegmentData])
async def get_segment_data(
    time_period: int = Query(12, description="Time period in months")
):
    """Get customer count and revenue by segment."""
    
    rfm_data = await get_rfm_analysis(time_period)
    
    if not rfm_data:
        raise HTTPException(status_code=404, detail="No data available")
    
    # Group by segment
    from collections import defaultdict
    segments = defaultdict(lambda: {"count": 0, "revenue": 0.0})
    
    for customer in rfm_data:
        segments[customer.segment]["count"] += 1
        segments[customer.segment]["revenue"] += customer.monetary
    
    result = [
        SegmentData(
            segment=segment,
            customer_count=int(data["count"]),
            total_revenue=round(data["revenue"], 2)
        )
        for segment, data in segments.items()
    ]
    
    # Sort by revenue descending
    result.sort(key=lambda x: x.total_revenue, reverse=True)
    
    return result
