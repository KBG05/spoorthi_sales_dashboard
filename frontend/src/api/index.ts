import apiClient from './client.js';
import type {
  KPIResponse,
  ABCTrendResponse,
  CustomerTrendDataPoint,
  CrossSellRecommendation,
  CustomerBehaviourDataPoint,
  CustomerListItem,
  ProductListItem,
  ProductBehaviourDataPoint,
  TopPerformersResponse,
  TicketSizeBand,
  ForecastResponse,
  TransitionAnalysisResponse,
  RFMMetrics,
  RFMSummary,
  SegmentData,
  ClassComparisonDataPoint,
  CategoryBreakupItem,
  ABCXYZMatrixCell,
} from './types.js';

// No longer needed - types and API merged into this file
// export { cbaApi } from './cba.js';
// export type { RFMMetrics, RFMSummary, SegmentData } from './cbaTypes.js';

// Dashboard API
export const dashboardApi = {
  getKPIs: async (timeId?: number) => {
    return await apiClient.get<KPIResponse>('/dashboard/kpis', {
      params: timeId ? { time_id: timeId } : undefined,
    });
  },
  getABCCount: async () => {
    return await apiClient.get('/dashboard/abc-count');
  },
  getABCRevenue: async () => {
    return await apiClient.get('/dashboard/abc-revenue');
  },
  getXYZCount: async () => {
    return await apiClient.get('/dashboard/xyz-count');
  },
  getXYZRevenue: async () => {
    return await apiClient.get('/dashboard/xyz-revenue');
  },
  getABCXYZCount: async () => {
    return await apiClient.get('/dashboard/abc-xyz-count');
  },
  getCategoryBreakup: async (timeId?: number) => {
    return await apiClient.get<CategoryBreakupItem[]>('/dashboard/category-breakup', {
      params: timeId ? { time_id: timeId } : undefined,
    });
  },
  getABCXYZMatrix: async () => {
    return await apiClient.get<ABCXYZMatrixCell[]>('/dashboard/abc-xyz-matrix');
  },
};

// ABC Analysis API
// ABC Analysis API
export const abcApi = {
  getTrend: async (financialYear: string, abcCategories: string, xyzCategories: string, metric: string) => {
    return await apiClient.get<ABCTrendResponse>('/abc/trend', {
      params: {
        financial_year: financialYear,
        abc_categories: abcCategories,
        xyz_categories: xyzCategories,
        metric: metric,
      },
    });
  },
};

// Customer Trend API
export const customerTrendApi = {
  getAvailableYears: async () => {
    return await apiClient.get<{ financial_years: string[] }>('/customer-trend/available-years');
  },
  getTrend: async (financialYear: string, abcCategories: string, metric: string) => {
    return await apiClient.get<CustomerTrendDataPoint[]>('/customer-trend/trend', {
      params: {
        financial_year: financialYear,
        abc_categories: abcCategories,
        metric: metric,
      },
    });
  },
};

// Customer Behaviour API
export const customerBehaviourApi = {
  getAvailableYears: async () => {
    return await apiClient.get<{ financial_years: string[] }>('/customer-behaviour/available-years');
  },
  getCustomers: async (financialYear: string, abcClasses: string) => {
    const response = await apiClient.get<CustomerListItem[]>('/customer-behaviour/customers', {
      params: {
        financial_year: financialYear,
        abc_classes: abcClasses,
      },
    });
    return response.data;
  },
  getProducts: async (financialYear: string, customerIds: string) => {
    const response = await apiClient.get<ProductListItem[]>('/customer-behaviour/products', {
      params: {
        financial_year: financialYear,
        customer_ids: customerIds,
      },
    });
    return response.data;
  },
  getTrend: async (
    financialYear: string,
    customerIds: string,
    productIds: string,
    metric: string
  ) => {
    const response = await apiClient.get<CustomerBehaviourDataPoint[]>('/customer-behaviour/trend', {
      params: {
        financial_year: financialYear,
        customer_ids: customerIds,
        product_ids: productIds,
        metric: metric,
      },
    });
    return response.data;
  },
};

// Product Behaviour API
export const productBehaviourApi = {
  getAvailableYears: async () => {
    return await apiClient.get<{ financial_years: string[] }>('/product-behaviour/available-years');
  },
  getProducts: async (financialYear: string, abcClass: string) => {
    const response = await apiClient.get<ProductListItem[]>('/product-behaviour/products', {
      params: {
        financial_year: financialYear,
        abc_class: abcClass,
      },
    });
    return response.data;
  },
  getCustomers: async (financialYear: string, productId: number, abcClasses: string) => {
    const response = await apiClient.get<CustomerListItem[]>('/product-behaviour/customers', {
      params: {
        financial_year: financialYear,
        product_id: productId,
        abc_classes: abcClasses,
      },
    });
    return response.data;
  },
  getTrend: async (
    financialYear: string,
    abcClass: string,
    productId: number,
    metric: string,
    customerIds?: string
  ) => {
    const response = await apiClient.get<ProductBehaviourDataPoint[]>('/product-behaviour/trend', {
      params: {
        financial_year: financialYear,
        abc_class: abcClass,
        product_id: productId,
        metric: metric,
        customer_ids: customerIds || '',
      },
    });
    return response.data;
  },
};

// Cross-Sell API
export const crossSellApi = {
  getRecommendations: async () => {
    const response = await apiClient.get<CrossSellRecommendation[]>('/cross-sell/recommendations');
    return response.data;
  },
};

// Top Performance API
export const topPerformanceApi = {
  getTopPerformers: async (
    entityType: 'Customers' | 'Products',
    financialYear: string
  ) => {
    const response = await apiClient.get<TopPerformersResponse>(
      `/top-performance/top-performers?entity_type=${entityType}&financial_year=${financialYear}`
    );
    return response.data;
  },
};

// Ticket Size API
export const ticketSizeApi = {
  getBands: async (financialYear: string, dimension: 'Products' | 'Customers') => {
    const response = await apiClient.get<TicketSizeBand[]>('/ticket-size/bands', {
      params: {
        financial_year: financialYear,
        dimension: dimension,
      },
    });
    return response.data;
  },
};

// Forecast API
export const forecastApi = {
  getAvailableMonths: async () => {
    return await apiClient.get<{ months: { table_name: string, display: string, year: string, month: string }[] }>('/forecast/available-months');
  },
  getDemandForecast: async () => {
    const response = await apiClient.get<ForecastResponse>('/forecast/demand');
    return response.data;
  },
};

// Transition Analysis API
export const transitionAnalysisApi = {
  getTransitions: async (
    analysisType: 'Products' | 'Customers',
    financialYear: string = 'FY24-25'
  ) => {
    const response = await apiClient.get<TransitionAnalysisResponse>('/transition-analysis/transitions', {
      params: {
        analysis_type: analysisType,
        financial_year: financialYear,
      },
    });
    return response.data;
  },
};

// ============================================================================
// CBA (Customer Behaviour Analysis) API
// ============================================================================

export const cbaApi = {
  /**
   * Get RFM analysis data for all customers
   */
  getRFMAnalysis: async (timePeriod: number): Promise<RFMMetrics[]> => {
    const response = await apiClient.get<RFMMetrics[]>('/cba/rfm-analysis', {
      params: { time_period: timePeriod }
    });
    return response.data;
  },

  /**
   * Get summary statistics
   */
  getSummary: async (timePeriod: number): Promise<RFMSummary> => {
    const response = await apiClient.get<RFMSummary>('/cba/summary', {
      params: { time_period: timePeriod }
    });
    return response.data;
  },

  /**
   * Get segment data (count and revenue by segment)
   */
  getSegments: async (timePeriod: number): Promise<SegmentData[]> => {
    const response = await apiClient.get<SegmentData[]>('/cba/segments', {
      params: { time_period: timePeriod }
    });
    return response.data;
  },
};

// ============================================================================
// Customer Class Comparison API
// ============================================================================

export const customerClassComparisonApi = {
  /**
   * Get available financial years from database
   */
  getAvailableYears: async (): Promise<{ financial_years: string[] }> => {
    const response = await apiClient.get<{ financial_years: string[] }>(
      '/customer-class-comparison/available-years'
    );
    return response.data;
  },

  /**
   * Get customers in a specific ABC class across multiple financial years
   */
  getCustomers: async (
    abcClass: string,
    financialYears: string
  ): Promise<CustomerListItem[]> => {
    const response = await apiClient.get<CustomerListItem[]>(
      '/customer-class-comparison/customers',
      {
        params: {
          abc_class: abcClass,
          financial_years: financialYears,
        },
      }
    );
    return response.data;
  },

  /**
   * Get class comparison trend data
   */
  getTrend: async (
    abcClass: string,
    customerId: number,
    financialYears: string,
    metric: string
  ): Promise<ClassComparisonDataPoint[]> => {
    const response = await apiClient.get<ClassComparisonDataPoint[]>(
      '/customer-class-comparison/trend',
      {
        params: {
          abc_class: abcClass,
          customer_id: customerId,
          financial_years: financialYears,
          metric: metric,
        },
      }
    );
    return response.data;
  },
};

// Masters API
export const mastersApi = {
  getProducts: async () => {
    const response = await apiClient.get<Record<string, string>>('/masters/products');
    return response.data;
  },
  getCustomers: async () => {
    const response = await apiClient.get<Record<string, string>>('/masters/customers');
    return response.data;
  },
};
