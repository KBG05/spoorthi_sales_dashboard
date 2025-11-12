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
} from './types.js';

// Dashboard API
export const dashboardApi = {
  getKPIs: async () => {
    return await apiClient.get<KPIResponse>('/dashboard/kpis');
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
  getProducts: async (financialYear: string, abcClass: string) => {
    const response = await apiClient.get<ProductListItem[]>('/product-behaviour/products', {
      params: {
        financial_year: financialYear,
        abc_class: abcClass,
      },
    });
    return response.data;
  },
  getTrend: async (
    financialYear: string,
    abcClass: string,
    productId: number,
    metric: string
  ) => {
    const response = await apiClient.get<ProductBehaviourDataPoint[]>('/product-behaviour/trend', {
      params: {
        financial_year: financialYear,
        abc_class: abcClass,
        product_id: productId,
        metric: metric,
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
