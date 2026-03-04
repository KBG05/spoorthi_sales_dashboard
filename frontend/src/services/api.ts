import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../constants/constants';
import type * as API from '../types/api.types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if needed in future
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ===================================
// Dashboard API
// ===================================
export const dashboardAPI = {
  getKPIs: () => apiClient.get<API.KPIResponse>('/dashboard/kpis'),
  getABCCount: () => apiClient.get<API.CategoryCountResponse[]>('/dashboard/abc-count'),
  getABCRevenue: () => apiClient.get<API.CategoryRevenueResponse[]>('/dashboard/abc-revenue'),
  getXYZCount: () => apiClient.get<API.CategoryCountResponse[]>('/dashboard/xyz-count'),
  getXYZRevenue: () => apiClient.get<API.CategoryRevenueResponse[]>('/dashboard/xyz-revenue'),
  getABCXYZCount: () => apiClient.get<API.ComboCountResponse[]>('/dashboard/abc-xyz-count'),
};

// ===================================
// ABC Analysis API
// ===================================
export const abcAPI = {
  getTrend: (params: {
    financial_year: string;
    abc_categories?: string;
    xyz_categories?: string;
    metric?: string;
  }) => apiClient.get<API.ABCTrendResponse>('/abc/trend', { params }),
};

// ===================================
// Cross-Sell API
// ===================================
export const crossSellAPI = {
  getRecommendations: () => apiClient.get<API.CrossSellRecommendation[]>('/cross-sell/recommendations'),
};

// ===================================
// Customer Behaviour API
// ===================================
export const customerBehaviourAPI = {
  getCustomers: (params: {
    financial_year: string;
    abc_classes: string;
  }) => apiClient.get<API.CustomerListItem[]>('/customer-behaviour/customers', { params }),
  
  getProducts: (params: {
    financial_year: string;
    customer_ids: string;
  }) => apiClient.get<API.ProductListItem[]>('/customer-behaviour/articles', { params }),
  
  getTrend: (params: {
    financial_year: string;
    abc_classes: string;
    customer_ids: string;
    product_ids?: string;
    metric?: string;
  }) => apiClient.get<API.CustomerBehaviourDataPoint[]>('/customer-behaviour/trend', { params }),
};

// ===================================
// Customer Trend API
// ===================================
export const customerTrendAPI = {
  getTrend: (params: {
    financial_year: string;
    abc_categories?: string;
    metric?: string;
  }) => apiClient.get<API.CustomerTrendDataPoint[]>('/customer-trend/trend', { params }),
};

// ===================================
// Product Behaviour API
// ===================================
export const productBehaviourAPI = {
  getProducts: (params: {
    financial_year: string;
    abc_class: string;
  }) => apiClient.get<API.ProductListItem[]>('/article-behaviour/articles', { params }),
  
  getTrend: (params: {
    financial_year: string;
    abc_class: string;
    article_no: string;
    metric?: string;
  }) => apiClient.get<API.ProductBehaviourDataPoint[]>('/article-behaviour/trend', { params }),
};

// ===================================
// Top Performance API
// ===================================
export const topPerformanceAPI = {
  getTopPerformers: (params: {
    entity_type: 'Customers' | 'Products';
    financial_year?: string;
  }) => apiClient.get<API.TopPerformersResponse>('/top-performance/top-performers', { params }),
};

// ===================================
// Ticket Size API
// ===================================
export const ticketSizeAPI = {
  getBands: (params: {
    financial_year: string;
    dimension: 'Products' | 'Customers';
  }) => apiClient.get<API.TicketSizeBand[]>('/ticket-size/bands', { params }),
};

// ===================================
// Forecast API
// ===================================
export const forecastAPI = {
  getDemandForecast: () => apiClient.get<API.ForecastResponse>('/forecast/demand'),
};

// ===================================
// Transition Analysis API
// ===================================
export const transitionAnalysisAPI = {
  getTransitions: (params: {
    analysis_type: 'Products' | 'Customers';
    financial_year?: string;
  }) => apiClient.get<API.TransitionAnalysisResponse>('/transition-analysis/transitions', { params }),
};

// Export the API client
export default apiClient;
