// frontend/admin-crm/src/utils/formatters.ts
// Centralized formatting utilities to eliminate duplicate formatter functions

/**
 * Format a number as a percentage
 * Replaces duplicate formatPercent functions across analytics tabs
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a number with locale-aware separators
 */
export const formatNumber = (
  value: number,
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  const { locale = 'en-PH', minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;

  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

/**
 * Format large numbers in compact form (e.g., 1.2K, 3.5M)
 */
export const formatCompactNumber = (
  value: number,
  options: {
    locale?: string;
    maximumFractionDigits?: number;
  } = {}
): string => {
  const { locale = 'en-PH', maximumFractionDigits = 1 } = options;

  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(maximumFractionDigits)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(maximumFractionDigits)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(maximumFractionDigits)}K`;
  }

  return formatNumber(value, { locale, maximumFractionDigits });
};

/**
 * Format a decimal as a percentage (e.g., 0.75 -> "75%")
 * Useful when the backend returns decimals instead of percentages
 */
export const formatDecimalAsPercent = (value: number, decimals: number = 0): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0%';
  }
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a range of numbers (e.g., "100 - 500")
 */
export const formatNumberRange = (
  min: number,
  max: number,
  options: {
    locale?: string;
    separator?: string;
  } = {}
): string => {
  const { locale = 'en-PH', separator = ' - ' } = options;
  return `${formatNumber(min, { locale })}${separator}${formatNumber(max, { locale })}`;
};

/**
 * Format ordinal numbers (1st, 2nd, 3rd, etc.)
 */
export const formatOrdinal = (value: number): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '';
  }

  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = value % 100;

  return value + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
};

/**
 * Get color based on a percentage threshold
 * Useful for progress indicators and KPI cards
 */
export const getThresholdColor = (
  value: number,
  thresholds: { success: number; warning: number }
): 'success' | 'warning' | 'error' => {
  if (value >= thresholds.success) return 'success';
  if (value >= thresholds.warning) return 'warning';
  return 'error';
};
