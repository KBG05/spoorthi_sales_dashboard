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

// ABC Category colors – vibrant
// A – Electric green (high-ticket products)
// B – Vivid orange (mid-range)
// C – Hot red       (low-ticket)
// Overall – Vivid blue
export const ABC_COLORS: Record<string, string> = {
  A: '#00C853',     // Electric green
  B: '#FF6D00',     // Vivid amber-orange
  C: '#FF1744',     // Vivid red
  Overall: '#2979FF', // Vivid blue
  Unknown: '#90A4AE', // Muted blue-gray
};

// XYZ Category colors – consistent with ABC
// X – Green (consistent demand)
// Y – Orange (variable demand)
// Z – Red (erratic demand)
export const XYZ_COLORS: Record<string, string> = {
  X: '#00C853', // Electric green
  Y: '#FF6D00', // Vivid orange
  Z: '#FF1744', // Vivid red
};

// Combined ABC-XYZ colors
export const ABC_XYZ_COLORS: Record<string, string> = {
  AX: '#00C853', // A category = electric green
  AY: '#00C853',
  AZ: '#00C853',
  BX: '#FF6D00', // B category = vivid orange
  BY: '#FF6D00',
  BZ: '#FF6D00',
  CX: '#FF1744', // C category = vivid red
  CY: '#FF1744',
  CZ: '#FF1744',
};

// Top-performer palette – 10 vibrant, distinct colors for both light and dark modes
// Each color pair is optimized for readability in both contexts
export const TOP_PERFORMER_PALETTE: readonly [string, string][] = [
  ['#4667C9', '#6F89DB'],
  ['#3D95CC', '#66ADD9'],
  ['#7CD100', '#96D94A'],
  ['#F44F7A', '#F67D9C'],
  ['#F9C612', '#FAD651'],
  ['#22A8C6', '#59BDD4'],
  ['#3A5CB5', '#627FCC'],
  ['#68B600', '#85C93C'],
  ['#E44972', '#EE7392'],
  ['#D5A700', '#E1BA3D'],
];

// Bright dashboard chart palette (matches requested reference swatches)
export const DASHBOARD_CHART_COLORS: readonly string[] = [
  '#4667C9',
  '#3D95CC',
  '#7CD100',
  '#F44F7A',
  '#F9C612',
  '#22A8C6',
];

// Multi-line chart palette (for multi-product / multi-customer grids)
export const PRODUCT_COLORS: readonly string[] = [
  '#3b5a9d',
  '#2d8659',
  '#d4893d',
  '#8b4a7a',
  '#1a7a8f',
];

// RFM / CBA segment colors
export const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#2d8659',
  'Loyal Customers': '#2f63b8',
  'New Customers': '#8b4a7a',
  'Potential Loyalists': '#1a7a8f',
  'At Risk': '#d4893d',
  'Lost Customers': '#b84a42',
  'Regular Customers': '#7a8fa8',
};

// RFM histogram / scatter colors
export const RFM_COLORS = {
  recency: '#2f63b8',
  frequency: '#2d8659',
  monetary: '#b84a42',
  recencyVsFrequency: '#8b4a7a',
} as const;

// Comparison palette (class-comparison page, two-FY overlays)
export const COMPARISON_COLORS = {
  fy1Class: '#b84a42',
  fy1Value: '#2f63b8',
  fy2Class: '#8b4a7a',
  fy2Value: '#d4893d',
} as const;

// Top-performer chart colors
export const TOP_PERFORMER_COLORS = {
  fy: '#2f63b8',
  latest: '#2d8659',
} as const;

// Helper: get ABC color with CSS alpha (hex → rgba)
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper: get the appropriate color from TOP_PERFORMER_PALETTE based on index and theme mode
export function getTopPerformerColor(index: number, isDarkMode: boolean): string {
  const pair = TOP_PERFORMER_PALETTE[index % TOP_PERFORMER_PALETTE.length];
  return isDarkMode ? pair[1] : pair[0];
}

// ──────────────────────────────────────────────────────────────
// Number formatting helpers – SINGLE SOURCE OF TRUTH
// Revenue → 2 decimals, Quantity → 1 decimal
// ──────────────────────────────────────────────────────────────
export function formatRevenue(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatQuantity(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatRevenueCr(value: number): string {
  return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
}

export function formatRevenueFull(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
