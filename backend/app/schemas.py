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


class ABCXYZMatrixCell(BaseModel):
    abc: str  # "A", "B", or "C"
    xyz: str  # "X", "Y", or "Z"
    count: int
    revenue: float


class ABCXYZMatrixResponse(BaseModel):
    cells: List[ABCXYZMatrixCell]
    period_label: str  # e.g., "FY 2025-26" or "Apr 2025 – Mar 2026"


class ABCXYZArticleItem(BaseModel):
    article_no: str
    article_name: Optional[str] = None


class CategoryHierarchyItem(BaseModel):
    """Item for dual-circle pie chart"""

    id: str  # Unique identifier (category name or subcategory name)
    label: str  # Display label
    value: float  # Revenue or quantity
    color: Optional[str] = None  # Optional color for subcategory
    parent_category: Optional[str] = None  # For subcategories


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
    customer_name: Optional[str] = None
    articles_purchased: str  # Comma-separated list
    article_names_purchased: Optional[str] = None  # Comma-separated names
    recommendations: str  # Comma-separated list
    recommendation_names: Optional[str] = None  # Comma-separated names


# -----------------------
# customer_behaviour_server.R
# -----------------------
class CustomerListItem(BaseModel):
    """Customer ID for dropdown"""

    customer_id: str
    customer_name: Optional[str] = None
    abc_category: Optional[str] = None  # For filtering customers by class


class ArticleListItem(BaseModel):
    """Article ID for dropdown"""

    article_no: str
    article_name: Optional[str] = None


class CustomerBehaviourDataPoint(BaseModel):
    """Single data point for customer behaviour plot"""

    month: str  # Format: "YYYY-MM-DD"
    value: float
    type: str  # e.g., "Selected Customers Overall" or "Article 123"
    article_no: Optional[str] = None


# -----------------------
# customer_trend_server.R
# -----------------------
class CustomerTrendDataPoint(BaseModel):
    """Single data point for customer trend"""

    month_label: str  # e.g., "Apr", "May", etc.
    category: str  # "A", "B", "C", or "Overall"
    value: float  # Revenue or Quantity


# -----------------------
# article_behaviour_server.R
# -----------------------
class ArticleBehaviourDataPoint(BaseModel):
    """Single data point for article behaviour (dual axis)"""

    month: str  # Format: "YYYY-MM-DD"
    value: float
    scaled_value: float  # For dual axis plotting
    type: str  # e.g., "Class A Total" or "Article 456"
    article_no: Optional[str] = None


# -----------------------
# top_performance_server.R
# -----------------------
class TopPerformerItem(BaseModel):
    """Top performer (customer or product)"""

    id: str  # customer_name or article_no
    revenue: float  # Total revenue
    name: Optional[str] = None  # Customer or Article name


class TopPerformersResponse(BaseModel):
    """Response containing top performers"""

    top_fy: List[TopPerformerItem]  # Top 10 for entire FY
    top_latest: List[TopPerformerItem]  # Top 10 for latest month
    entity_type: str  # "Customers" or "Articles"


# Backward-compatible alias
ProductBehaviourDataPoint = ArticleBehaviourDataPoint


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

    id: str  # article_no or CustomerName
    categories: Dict[
        str, str
    ]  # e.g., {"Category_Jan_2025": "A", "Category_Feb_2025": "B", ...}


class TransitionAnalysisResponse(BaseModel):
    """Response for transition analysis"""

    data: List[Dict[str, Any]]  # Flexible structure for different columns
    analysis_type: str  # "Articles" or "Customers"
    column_headers: List[str]  # Dynamic column names


# -----------------------
# forecast_server.R
# -----------------------
class ForecastRow(BaseModel):
    """Single forecast row"""

    article_no: str
    article_description: Optional[str] = None
    forecast_period: str  # "DD-MM-YYYY" or "MM-YYYY - MM-YYYY"
    granularity: str  # "monthly", "bimonthly", "quarterly"
    predicted_quantity: float
    category: str = ""
    abc_xyz: str = ""
    unique_customers: int = 0
    last_3_months_quantity: float = 0.0
    month_1_quantity: float = 0.0
    month_2_quantity: float = 0.0
    month_3_quantity: float = 0.0


class ForecastResponse(BaseModel):
    """Response for forecast data"""

    table_name: str
    display_month: str
    data: List[ForecastRow]
    available_granularities: List[str] = []
    month_1_name: str = "Month 1"
    month_2_name: str = "Month 2"
    month_3_name: str = "Month 3"


# -----------------------
# CBA (Customer Behaviour Analysis)
# server/CustomerBehaviour2.R
# -----------------------
class RFMMetrics(BaseModel):
    """RFM metrics for a single customer"""

    customer_id: str
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
# -----------------------
# Customer Product List
# -----------------------
class CustomerProductRow(BaseModel):
    """Single row of customer-product mapping"""

    customer_name: str
    article_no: str
    article_description: Optional[str] = None
    last_purchase_date: str  # "YYYY-MM-DD"


class CustomerProductResponse(BaseModel):
    """Response for customer product list"""

    data: List[CustomerProductRow]
    total: int
    calculation_date: str


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


class UserCreate(BaseModel):
    """User creation request"""

    username: str
    password: str
    role: str = "user"  # Default role is "user"


class UserResponse(BaseModel):
    """User response after creation"""

    id: int
    username: str
    role: str
    message: str


class PasswordChange(BaseModel):
    """Password change request"""

    current_password: str
    new_password: str
