// ===================================
// Dashboard Types
// ===================================
export interface KPIResponse {
  total_revenue: number;
  total_quantity: number;
  month_name: string;
  time_id: number;
}

export interface CategoryCountResponse {
  category: string;
  count: number;
}

export interface CategoryRevenueResponse {
  category: string;
  revenue: number;
}

export interface ComboCountResponse {
  abc_category: string;
  xyz_category: string;
  abc_xyz: string;
  count: number;
}

// ===================================
// ABC Analysis Types
// ===================================
export interface ABCTrendDataPoint {
  month_date: string;
  abc_category: string;
  value: number;
}

export interface ABCTrendResponse {
  data: ABCTrendDataPoint[];
  metric: string;
  financial_year: string;
}

// ===================================
// Cross-Sell Types
// ===================================
export interface CrossSellRecommendation {
  customer: string;
  products_purchased: string;
  recommendations: string;
}

// ===================================
// Customer Behaviour Types
// ===================================
export interface CustomerListItem {
  customer_id: number;
}

export interface ProductListItem {
  product_id: number;
}

export interface CustomerBehaviourDataPoint {
  month: string;
  value: number;
  type: string;
  product_id?: number;
}

// ===================================
// Customer Trend Types
// ===================================
export interface CustomerTrendDataPoint {
  month_label: string;
  category: string;
  value: number;
}

// ===================================
// Product Behaviour Types
// ===================================
export interface ProductBehaviourDataPoint {
  month: string;
  value: number;
  scaled_value: number;
  type: string;
  product_id?: number;
}

// ===================================
// Top Performance Types
// ===================================
export interface TopPerformerItem {
  id: number;
  revenue: number;
}

export interface TopPerformersResponse {
  top_fy: TopPerformerItem[];
  top_latest: TopPerformerItem[];
  entity_type: string;
}

// ===================================
// Ticket Size Types
// ===================================
export interface TicketSizeBand {
  band: string;
  metric: string;
  value: number;
  plot_label: string;
}

// ===================================
// Transition Analysis Types
// ===================================
export interface TransitionAnalysisResponse {
  data: Record<string, any>[];
  analysis_type: string;
  column_headers: string[];
}

// ===================================
// Forecast Types
// ===================================
export interface ForecastRow {
  product_id: number;
  forecast_month: string;
  predicted_quantity: number;
}

export interface ForecastResponse {
  table_name: string;
  display_month: string;
  data: ForecastRow[];
}

// ===================================
// Utility Types
// ===================================
export type ThemeMode = 'light' | 'dark';

export type FinancialYear = 'FY25-26' | 'FY24-25' | 'FY23-24' | 'FY22-23' | 'FY21-22' | 'FY20-21';

export type ABCCategory = 'A' | 'B' | 'C';

export type XYZCategory = 'X' | 'Y' | 'Z';

export type MetricType = 'Revenue' | 'Quantity';
