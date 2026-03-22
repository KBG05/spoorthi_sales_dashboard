// Type definitions matching backend Pydantic schemas

export interface KPIResponse {
  total_revenue: number;
  total_quantity: number;
  month_name: string;
  time_id: number;
}

export interface ABCXYZMatrixCell {
  abc: string;
  xyz: string;
  count: number;
  revenue: number;
}

export interface ABCXYZMatrixResponse {
  cells: ABCXYZMatrixCell[];
  period_label: string;
}

export interface ABCXYZProductItem {
  article_no: string;
  article_name?: string;
}

export interface CategoryHierarchyItem {
  id: string;
  label: string;
  value: number;
  color?: string;
  parent_category?: string;
}

export interface CategoryHierarchyResponse {
  main_categories: CategoryHierarchyItem[];
  subcategories: CategoryHierarchyItem[];
}

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

export interface CustomerTrendDataPoint {
  month_label: string;
  category: string;
  value: number;
}

export interface CrossSellRecommendation {
  customer: string;
  customer_name?: string;
  articles_purchased: string;
  article_names_purchased?: string;
  recommendations: string;
  recommendation_names?: string;
}

export interface CustomerBehaviourDataPoint {
  month: string;
  value: number;
  type: string;
  article_no?: string;
}

export interface ProductListItem {
  article_no: string;
  article_name?: string;
}

export interface CustomerListItem {
  customer_id: string;
  customer_name?: string;
  abc_category?: string;
}

export interface ProductBehaviourDataPoint {
  month: string;
  value: number;
  scaled_value: number;
  type: string;
  article_no?: string;
}

export interface TopPerformerItem {
  id: string;
  revenue: number;
  name?: string;
}

export interface TopPerformersResponse {
  top_fy: TopPerformerItem[];
  top_latest: TopPerformerItem[];
  entity_type: 'Customers' | 'Products';
}

export interface TicketSizeBand {
  band: string;
  metric: string; // "Count" or "Revenue"
  value: number;
  plot_label: string;
}

export interface ForecastRow {
  article_no: string;
  article_description?: string;
  forecast_period: string;
  granularity: string;
  predicted_quantity: number;
  category: string;
  abc_xyz: string;
  unique_customers: number;
  last_3_months_quantity: number;
  month_1_quantity: number;
  month_2_quantity: number;
  month_3_quantity: number;
}

export interface ForecastResponse {
  table_name: string;
  display_month: string;
  data: ForecastRow[];
  available_granularities: string[];
  month_1_name: string;
  month_2_name: string;
  month_3_name: string;
}

export interface TransitionAnalysisResponse {
  data: Array<Record<string, any>>; // Flexible structure with dynamic columns
  analysis_type: 'Products' | 'Customers';
  column_headers: string[];
}

// ============================================================================
// CBA (Customer Behaviour Analysis) Types
// ============================================================================

export interface RFMMetrics {
  customer_id: string;
  recency: number;
  frequency: number;
  monetary: number;
  total_transactions: number;
  avg_order_value: number;
  r_score: number;
  f_score: number;
  m_score: number;
  rfm_score: string;
  segment: string;
}

export interface RFMSummary {
  total_customers: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
  total_revenue: number;
}

export interface SegmentData {
  segment: string;
  customer_count: number;
  total_revenue: number;
  [key: string]: string | number; // Add index signature for dataset compatibility
}

export interface DistributionBin {
  bin: string;
  count: number;
}

// ============================================================================
// Customer Class Comparison Types
// ============================================================================

// ============================================================================
// Customer Product List Types
// ============================================================================

export interface CustomerProductRow {
  customer_name: string;
  article_no: string;
  article_description?: string;
  last_purchase_date: string;
}

export interface CustomerProductResponse {
  data: CustomerProductRow[];
  total: number;
  calculation_date: string;
}

export interface ClassComparisonDataPoint {
  month: string;  // Format: "YYYY-MM"
  financial_year: string;  // e.g., "FY24-25"
  class_total: number;  // Total for the entire class
  customer_value: number;  // Value for the specific customer
  metric: string;  // "Revenue" or "Quantity"
}

