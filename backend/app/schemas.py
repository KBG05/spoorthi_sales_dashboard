from pydantic import BaseModel
from typing import List, Optional

# -----------------------
# Shared / config models
# -----------------------
class FinancialYearsResponse(BaseModel):
    financial_years: List[str]
    default: Optional[str]

# -----------------------
# auth / login_server.R
# -----------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[str] = None
    message: Optional[str] = None

# -----------------------
# dashboard_server.R
# -----------------------
class DashboardKPI(BaseModel):
    total_revenue: float
    total_quantity: float
    month_name: str
    time_id: int

class RollingSummaryRecord(BaseModel):
    time_id: int
    month: str
    total_revenue: float
    total_quantity: float
    abc_category: Optional[str] = None
    xyz_category: Optional[str] = None

class DashboardKPIsResponse(BaseModel):
    kpis: DashboardKPI

class RollingSummaryResponse(BaseModel):
    table_used: str
    records: List[RollingSummaryRecord]

# -----------------------
# abc_server.R
# -----------------------
class ABCTrendRequest(BaseModel):
    fy: str
    abc_categories: List[str]
    xyz_categories: List[str]
    metric: str  # "Revenue" or "Quantity"

class ABCDataPoint(BaseModel):
    month_date: str    # ISO date or YYYY-MM
    abc_category: str
    total_value: float
    total_quantity: float

class ABCTrendResponse(BaseModel):
    data: List[ABCDataPoint]
    metric: str
    fy: str
    table_used: Optional[str] = None

class AggregateRecord(BaseModel):
    category: str
    product_count: int
    total_revenue: float
    total_quantity: float

class ABCSummaryResponse(BaseModel):
    abc_summary: List[AggregateRecord]
    xyz_summary: List[AggregateRecord]
    fy: str
    table_used: Optional[str] = None

# -----------------------
# product_behaviour_server.R
# -----------------------
class ProductListRequest(BaseModel):
    fy: str
    abc_class: str

class ProductListResponse(BaseModel):
    products: List[int]  # or List[str] if product codes are strings

class SeriesPoint(BaseModel):
    month: str
    value: float

class ProductTrendRequest(BaseModel):
    fy: str
    abc_class: str
    product_id: int
    metric: str  # "Revenue" or "Quantity"

class ProductTrendResponse(BaseModel):
    class_total: List[SeriesPoint]
    product_data: List[SeriesPoint]
    metric: str

# -----------------------
# customer_behaviour_server.R
# -----------------------
class CustomerBehaviorRequest(BaseModel):
    fy: str
    abc_classes: List[str]
    xyz_classes: Optional[List[str]] = None
    metric: str  # "Revenue" or "Quantity"

class CustomerRecord(BaseModel):
    customer_id: int
    customer_name: Optional[str] = None
    total_revenue: float
    total_quantity: float

class CustomerBehaviorResponse(BaseModel):
    customers: List[CustomerRecord]
    fy: str

# -----------------------
# customer_trend_server.R
# -----------------------
class CustomerTrendRequest(BaseModel):
    fy: str
    customer_id: int
    metric: str  # "Revenue" or "Quantity"

class CustomerTrendPoint(BaseModel):
    month: str
    value: float

class CustomerTrendResponse(BaseModel):
    monthly: List[CustomerTrendPoint]
    metric: str
    fy: str

# -----------------------
# ticket_size_server.R
# -----------------------
class TicketSizeRequest(BaseModel):
    fy: str
    abc_class: Optional[str] = None

class TicketSizePoint(BaseModel):
    month: str
    avg_ticket_size: float

class TicketSizeResponse(BaseModel):
    series: List[TicketSizePoint]
    fy: str

# -----------------------
# top_performance_server.R
# -----------------------
class TopPerformanceRequest(BaseModel):
    fy: str
    top_n: int = 10
    metric: str  # "Revenue" or "Quantity"

class TopItem(BaseModel):
    id: int
    name: Optional[str] = None
    value: float
    rank: int

class TopPerformanceResponse(BaseModel):
    items: List[TopItem]
    fy: str

# -----------------------
# cross_sell_server.R
# -----------------------
class CrossSellRequest(BaseModel):
    fy: str
    customer_id: int
    top_n: int = 10

class CrossSellItem(BaseModel):
    product_id: int
    co_purchase_count: int
    lift: Optional[float] = None

class CrossSellResponse(BaseModel):
    recommendations: List[CrossSellItem]
    customer_id: int
    fy: str

# -----------------------
# forecast_server.R
# -----------------------
class ForecastRequest(BaseModel):
    product_id: int
    periods: int = 6
    method: Optional[str] = None  # e.g., "ets", "arima", "prophet"

class ForecastPoint(BaseModel):
    month: str
    predicted: float
    lower: Optional[float] = None
    upper: Optional[float] = None

class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    model: Optional[str] = None
    product_id: int

# -----------------------
# export_server.R
# -----------------------
class ExportRequest(BaseModel):
    module: str
    filters: Optional[dict] = None
    format: Optional[str] = "csv"  # "csv" or "xlsx"

class ExportResponse(BaseModel):
    download_url: str
    filename: str

# -----------------------
# transition_analysis_server.R
# -----------------------
class TransitionRequest(BaseModel):
    fy_from: str
    fy_to: str
    abc_from: Optional[List[str]] = None
    abc_to: Optional[List[str]] = None

class TransitionRecord(BaseModel):
    from_category: str
    to_category: str
    count: int
    revenue: float

class TransitionResponse(BaseModel):
    transitions: List[TransitionRecord]
    fy_from: str
    fy_to: str