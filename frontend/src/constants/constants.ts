// Financial Years
export const FINANCIAL_YEARS = [
  'FY25-26',
  'FY24-25',
  'FY23-24',
  'FY22-23',
  'FY21-22',
  'FY20-21',
] as const;

// ABC Category colors matching R app
export const ABC_COLORS = {
  A: '#2ecc71', // Green - High value
  B: '#f1c40f', // Yellow - Medium value
  C: '#e74c3c', // Red - Low value
  Overall: '#3498db', // Blue - Overall/Total
  Unknown: '#95a5a6', // Gray - Unknown/Missing
} as const;

// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Base date for TimeID calculations (matching backend)
export const BASE_DATE = new Date('2021-01-01');

// Drawer widths
export const DRAWER_WIDTH = {
  EXPANDED: 280,
  COLLAPSED: 60,
} as const;

// Revenue bands for Ticket Size
export const REVENUE_BANDS = [
  '0-5L',
  '5L-20L',
  '20L-50L',
  '50L-1CR',
  '1CR+',
] as const;

// Chart height defaults
export const CHART_HEIGHTS = {
  small: 300,
  medium: 400,
  large: 500,
  xlarge: 600,
} as const;
