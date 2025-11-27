from pydantic import BaseModel
from typing import List, Optional, Dict, Any


# -----------------------
# dashboard_server.R
# -----------------------
class KPIResponse(BaseModel):
    total_revenue: float
    total_quantity: int
    month_name: str
    time_id: int

class CategoryCountResponse(BaseModel):
    category: str
    count: int

class CategoryRevenueResponse(BaseModel):
    category: str
    revenue: float  # in millions

class ComboCountResponse(BaseModel):
    abc_category: str
    xyz_category: str
    abc_xyz: str
    count: int


# -----------------------
# abc_server.R
# -----------------------
class ABCTrendDataPoint(BaseModel):
    """Single data point for ABC trend (revenue or quantity)"""
    month_date: str  # Format: "YYYY-MM-DD"
    abc_category: str  # "A", "B", "C", or "Overall"
    value: float  # Revenue in millions or Quantity

class ABCTrendResponse(BaseModel):
    """Response for ABC trend endpoint"""
    data: List[ABCTrendDataPoint]
    metric: str  # "Revenue" or "Quantity"
    financial_year: str


# -----------------------
# cross_sell_server.R
# -----------------------
class CrossSellRecommendation(BaseModel):
    """Cross-sell recommendation for a distributor"""
    customer: str  # Distributor_Code
    products_purchased: str  # Comma-separated list
    recommendations: str  # Comma-separated list


# -----------------------
# customer_behaviour_server.R
# -----------------------
class CustomerListItem(BaseModel):
    """Customer ID for dropdown"""
    customer_id: int

class ProductListItem(BaseModel):
    """Product ID for dropdown"""
    product_id: int

class CustomerBehaviourDataPoint(BaseModel):
    """Single data point for customer behaviour plot"""
    month: str  # Format: "YYYY-MM-DD"
    value: float
    type: str  # e.g., "Selected Customers Overall" or "Product 123"
    product_id: Optional[int] = None


# -----------------------
# customer_trend_server.R
# -----------------------
class CustomerTrendDataPoint(BaseModel):
    """Single data point for customer trend"""
    month_label: str  # e.g., "Apr", "May", etc.
    category: str  # "A", "B", "C", or "Overall"
    value: float  # Revenue or Quantity


# -----------------------
# product_behaviour_server.R
# -----------------------
class ProductBehaviourDataPoint(BaseModel):
    """Single data point for product behaviour (dual axis)"""
    month: str  # Format: "YYYY-MM-DD"
    value: float
    scaled_value: float  # For dual axis plotting
    type: str  # e.g., "Class A Total" or "Product 456"
    product_id: Optional[int] = None


# -----------------------
# top_performance_server.R
# -----------------------
class TopPerformerItem(BaseModel):
    """Top performer (customer or product)"""
    id: int  # CustomerID or ProductID
    revenue: float  # Total revenue

class TopPerformersResponse(BaseModel):
    """Response containing top performers"""
    top_fy: List[TopPerformerItem]  # Top 10 for entire FY
    top_latest: List[TopPerformerItem]  # Top 10 for latest month
    entity_type: str  # "Customers" or "Products"


# -----------------------
# ticket_size_server.R
# -----------------------
class TicketSizeBand(BaseModel):
    """Ticket size band data"""
    band: str  # e.g., "0-5L", "5L-20L", etc.
    metric: str  # "Count" or "Revenue"
    value: float
    plot_label: str  # Formatted label for display


# -----------------------
# transition_analysis_server.R
# -----------------------
class TransitionRow(BaseModel):
    """Single row of transition analysis"""
    id: int  # ProductID or CustomerID
    categories: Dict[str, str]  # e.g., {"Category_Jan_2025": "A", "Category_Feb_2025": "B", ...}

class TransitionAnalysisResponse(BaseModel):
    """Response for transition analysis"""
    data: List[Dict[str, Any]]  # Flexible structure for different columns
    analysis_type: str  # "Products" or "Customers"
    column_headers: List[str]  # Dynamic column names


# -----------------------
# forecast_server.R
# -----------------------
class ForecastRow(BaseModel):
    """Single forecast row"""
    product_id: int
    forecast_month: str
    predicted_quantity: float

class ForecastResponse(BaseModel):
    """Response for forecast data"""
    table_name: str
    display_month: str
    data: List[ForecastRow]


# -----------------------
# CBA (Customer Behaviour Analysis)
# server/CustomerBehaviour2.R
# -----------------------
class RFMMetrics(BaseModel):
    """RFM metrics for a single customer"""
    customer_id: int
    recency: int
    frequency: int
    monetary: float
    total_transactions: int
    avg_order_value: float
    r_score: int
    f_score: int
    m_score: int
    rfm_score: str
    segment: str


class RFMSummary(BaseModel):
    """Summary statistics for RFM analysis"""
    total_customers: int
    avg_recency: float
    avg_frequency: float
    avg_monetary: float
    total_revenue: float


class SegmentData(BaseModel):
    """Customer segment aggregated data"""
    segment: str
    customer_count: int
    total_revenue: float


# -----------------------
# Customer Class Comparison
# -----------------------
class ClassComparisonDataPoint(BaseModel):
    """Single data point for class vs customer comparison"""
    month: str  # Format: "YYYY-MM"
    financial_year: str  # e.g., "FY24-25"
    class_total: float  # Total for the entire class
    customer_value: float  # Value for the specific customer
    metric: str  # "Revenue" or "Quantity"


# -----------------------
# Authentication
# -----------------------
class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Data stored in JWT token"""
    username: Optional[str] = None

class User(BaseModel):
    """User model"""
    id: int
    username: str
    role: str

class UserInDB(User):
    """User model with hashed password"""
    hashed_password: str

class PasswordChange(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str
