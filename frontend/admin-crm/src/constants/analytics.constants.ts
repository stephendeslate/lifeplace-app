// frontend/admin-crm/src/constants/analytics.constants.ts
// Centralized constants for analytics components to ensure consistency

/**
 * KPI Card layout constants
 */
export const KPI_CARD_MIN_WIDTH = 180;
export const KPI_CARD_DEFAULT_GAP = 2; // MUI spacing units

/**
 * Table and skeleton dimensions
 */
export const TABLE_SKELETON_HEIGHT = 300;
export const CHART_SKELETON_HEIGHT = 250;

/**
 * Chart height presets for consistent sizing
 */
export const CHART_HEIGHT = {
  sm: 200,
  md: 250,
  lg: 300,
  xl: 350,
} as const;

/**
 * Thresholds for completion rate indicators
 */
export const COMPLETION_THRESHOLDS = {
  success: 80,
  warning: 60,
} as const;

/**
 * Thresholds for conversion rate indicators
 */
export const CONVERSION_THRESHOLDS = {
  success: 70,
  warning: 50,
} as const;

/**
 * Thresholds for drop-off rate indicators (inverted - lower is better)
 */
export const DROP_OFF_THRESHOLDS = {
  success: 20, // Below 20% is good
  warning: 40, // Below 40% is acceptable
} as const;

/**
 * Date range presets
 */
export const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Last 365 Days', value: 365 },
] as const;

/**
 * Period options for time-series data
 */
export const PERIOD_OPTIONS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
] as const;

/**
 * Chart color palette for consistent charting
 */
export const CHART_COLORS = {
  primary: '#0087ff',
  secondary: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  neutral: '#737373',
} as const;

/**
 * Standard chart margins
 */
export const CHART_MARGINS = {
  small: { top: 10, right: 10, left: 10, bottom: 10 },
  medium: { top: 20, right: 30, left: 20, bottom: 20 },
  large: { top: 20, right: 30, left: 40, bottom: 40 },
} as const;

/**
 * Export format options
 */
export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
