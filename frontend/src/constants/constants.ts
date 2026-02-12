// Financial Years
export const FINANCIAL_YEARS = [
  'FY25-26',
  'FY24-25',
  'FY23-24',
  'FY22-23',
  'FY21-22',
  'FY20-21',
] as const;

// ──────────────────────────────────────────────────────────────
// Centralized color palette – SINGLE SOURCE OF TRUTH
// Every chart / cell / badge must import from here.
// ──────────────────────────────────────────────────────────────

// ABC Category colors
// A – Red   (high-ticket products, needs attention)
// B – Green (normal / healthy)
// C – Orange (low-ticket, lesser concern)
export const ABC_COLORS: Record<string, string> = {
  A: '#e74c3c',     // Red
  B: '#2ecc71',     // Green
  C: '#f39c12',     // Orange
  Overall: '#3498db', // Blue
  Unknown: '#95a5a6', // Gray
};

// XYZ Category colors (demand variability)
// X – Green  (consistent demand)
// Y – Orange (variable demand)
// Z – Red    (erratic / few customers)
export const XYZ_COLORS: Record<string, string> = {
  X: '#2ecc71', // Green
  Y: '#f39c12', // Orange
  Z: '#e74c3c', // Red
};

// Combined ABC-XYZ colors — simplified 3 groups
// AZ → Red   (high-ticket + erratic = DANGER)
// CX → Orange (low-ticket + consistent = low risk)
// Everything else → Green (acceptable)
export const ABC_XYZ_COLORS: Record<string, string> = {
  AX: '#2ecc71',
  AY: '#2ecc71',
  AZ: '#e74c3c',   // 🔴 Danger
  BX: '#2ecc71',
  BY: '#2ecc71',
  BZ: '#2ecc71',
  CX: '#f39c12',   // 🟠 Low risk
  CY: '#2ecc71',
  CZ: '#2ecc71',
};

// Multi-line chart palette (for multi-product / multi-customer grids)
export const PRODUCT_COLORS: readonly string[] = [
  '#3498db', // Blue
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#e67e22', // Orange
  '#34495e', // Charcoal
];

// RFM / CBA segment colors
export const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#2ecc71',
  'Loyal Customers': '#3498db',
  'New Customers': '#9b59b6',
  'Potential Loyalists': '#1abc9c',
  'At Risk': '#e67e22',
  'Lost Customers': '#e74c3c',
  'Regular Customers': '#95a5a6',
};

// RFM histogram / scatter colors
export const RFM_COLORS = {
  recency: '#3498db',
  frequency: '#2ecc71',
  monetary: '#e74c3c',
  recencyVsFrequency: '#9b59b6',
} as const;

// Comparison palette (class-comparison page, two-FY overlays)
export const COMPARISON_COLORS = {
  fy1Class: '#e74c3c',
  fy1Value: '#3498db',
  fy2Class: '#9b59b6',
  fy2Value: '#e67e22',
} as const;

// Top-performer chart colors
export const TOP_PERFORMER_COLORS = {
  fy: '#9b59b6',
  latest: '#16a085',
} as const;

// Helper: get ABC color with CSS alpha (hex → rgba)
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;

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
