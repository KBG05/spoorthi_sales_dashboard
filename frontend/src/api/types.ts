// Type definitions matching backend Pydantic schemas

export interface KPIResponse {
  total_revenue: number;
  total_quantity: number;
  month_name: string;
  time_id: number;
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
  products_purchased: string;
  recommendations: string;
}

export interface CustomerBehaviourDataPoint {
  month: string;
  value: number;
  type: string;
  product_id?: number;
}

export interface ProductListItem {
  product_id: number;
}

export interface CustomerListItem {
  customer_id: number;
}

export interface ProductBehaviourDataPoint {
  month: string;
  value: number;
  scaled_value: number;
  type: string;
  product_id?: number;
}

export interface TopPerformerItem {
  id: number;
  revenue: number;
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
  product_id: number;
  forecast_month: string;
  predicted_quantity: number;
}

export interface ForecastResponse {
  table_name: string;
  display_month: string;
  data: ForecastRow[];
}

export interface TransitionAnalysisResponse {
  data: Array<Record<string, any>>; // Flexible structure with dynamic columns
  analysis_type: 'Products' | 'Customers';
  column_headers: string[];
}
