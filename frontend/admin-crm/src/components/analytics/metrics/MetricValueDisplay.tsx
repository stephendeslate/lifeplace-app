// frontend/admin-crm/src/components/analytics/metrics/MetricValueDisplay.tsx

import React from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Schedule as TimeIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../../../utils/currency';
import { useCurrencySettings } from '../../../hooks/useCurrency';

interface TrendData {
  value: number;
  direction: 'up' | 'down' | 'flat';
  period: string;
}

interface MetricValueDisplayProps {
  value?: string | number;
  displayFormat?: string;
  decimalPlaces?: number;
  label?: string;
  description?: string;
  trend?: TrendData;
  isLoading?: boolean;
  error?: string;
  lastUpdated?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTrend?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export const MetricValueDisplay: React.FC<MetricValueDisplayProps> = ({
  value,
  displayFormat = 'number',
  decimalPlaces = 0,
  label,
  description,
  trend,
  isLoading = false,
  error,
  lastUpdated,
  size = 'medium',
  showLabel = true,
  showTrend = true,
  color = 'primary',
}) => {
  const { settings: currencySettings } = useCurrencySettings();
  
  const formatValue = (val: string | number, format: string, decimals: number): string => {
    if (val === null || val === undefined || val === '') {
      return '--';
    }

    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    
    if (isNaN(numValue)) {
      return '--';
    }

    switch (format) {
      case 'currency': {
        const currency = currencySettings?.defaultCurrency || 'PHP';
        return formatCurrency(numValue, currency, {
          showSymbol: currencySettings?.displayFormat !== 'code',
          showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
          minimumFractionDigits: decimals ?? currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
          maximumFractionDigits: decimals ?? currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
        });
      }
      
      case 'percentage':
        return `${numValue.toFixed(decimals)}%`;
      
      case 'number':
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(numValue);
      
      case 'duration': {
        const hours = Math.floor(numValue / 60);
        const minutes = Math.round(numValue % 60);
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
      }
      
      case 'bytes': {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (numValue === 0) return '0 B';
        const i = Math.floor(Math.log(numValue) / Math.log(1024));
        return `${(numValue / Math.pow(1024, i)).toFixed(decimals)} ${sizes[i]}`;
      }
      
      default:
        return numValue.toFixed(decimals);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUpIcon color="success" fontSize="small" />;
      case 'down':
        return <TrendingDownIcon color="error" fontSize="small" />;
      case 'flat':
        return <TrendingFlatIcon color="action" fontSize="small" />;
      default:
        return null;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      case 'flat':
        return 'text.secondary';
      default:
        return 'text.secondary';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          valueVariant: 'h6' as const,
          labelVariant: 'caption' as const,
          spacing: 1,
          padding: 1.5,
        };
      case 'large':
        return {
          valueVariant: 'h3' as const,
          labelVariant: 'body1' as const,
          spacing: 2,
          padding: 3,
        };
      default: // medium
        return {
          valueVariant: 'h4' as const,
          labelVariant: 'body2' as const,
          spacing: 1.5,
          padding: 2,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const formattedValue = formatValue(value || 0, displayFormat, decimalPlaces);

  if (isLoading) {
    return (
      <Box sx={{ p: sizeStyles.padding }}>
        <Stack spacing={sizeStyles.spacing}>
          {showLabel && label && (
            <Skeleton variant="text" width="60%" height={20} />
          )}
          <Skeleton variant="text" width="80%" height={size === 'large' ? 48 : size === 'small' ? 24 : 32} />
          {showTrend && (
            <Skeleton variant="text" width="40%" height={16} />
          )}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          p: sizeStyles.padding,
          textAlign: 'center',
          color: 'error.main',
        }}
      >
        <Stack spacing={1} alignItems="center">
          <ErrorIcon />
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: sizeStyles.padding }}>
      <Stack spacing={sizeStyles.spacing}>
        {/* Label and Description */}
        {showLabel && label && (
          <Box>
            <Typography 
              variant={sizeStyles.labelVariant} 
              color="text.secondary" 
              gutterBottom
            >
              {label}
            </Typography>
            {description && (
              <Tooltip title={description}>
                <Box display="inline-flex" alignItems="center" gap={0.5}>
                  <InfoIcon fontSize="small" color="action" />
                </Box>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Main Value */}
        <Typography 
          variant={sizeStyles.valueVariant} 
          fontWeight="bold" 
          color={`${color}.main`}
          sx={{ wordBreak: 'break-all' }}
        >
          {formattedValue}
        </Typography>

        {/* Trend and Metadata */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          {/* Trend Information */}
          {showTrend && trend && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {getTrendIcon(trend.direction)}
              <Typography 
                variant="caption" 
                color={getTrendColor(trend.direction)}
                fontWeight="medium"
              >
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {trend.period}
              </Typography>
            </Box>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <TimeIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {new Date(lastUpdated).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Additional Status Chips */}
        {displayFormat === 'currency' && (
          <Chip 
            label="Currency" 
            size="small" 
            variant="outlined" 
            color="success"
          />
        )}
        
        {displayFormat === 'percentage' && (
          <Chip 
            label="Percentage" 
            size="small" 
            variant="outlined" 
            color="info"
          />
        )}
      </Stack>
    </Box>
  );
};

// Specialized variants for common use cases
export const CurrencyMetric: React.FC<Omit<MetricValueDisplayProps, 'displayFormat'>> = (props) => (
  <MetricValueDisplay {...props} displayFormat="currency" color="success" />
);

export const PercentageMetric: React.FC<Omit<MetricValueDisplayProps, 'displayFormat'>> = (props) => (
  <MetricValueDisplay {...props} displayFormat="percentage" color="info" />
);

export const CountMetric: React.FC<Omit<MetricValueDisplayProps, 'displayFormat' | 'decimalPlaces'>> = (props) => (
  <MetricValueDisplay {...props} displayFormat="number" decimalPlaces={0} color="primary" />
);

export const DurationMetric: React.FC<Omit<MetricValueDisplayProps, 'displayFormat'>> = (props) => (
  <MetricValueDisplay {...props} displayFormat="duration" color="warning" />
);

// Compact version for use in tables or small spaces
export const CompactMetricDisplay: React.FC<MetricValueDisplayProps> = (props) => (
  <MetricValueDisplay 
    {...props} 
    size="small" 
    showLabel={false} 
    showTrend={false}
  />
);