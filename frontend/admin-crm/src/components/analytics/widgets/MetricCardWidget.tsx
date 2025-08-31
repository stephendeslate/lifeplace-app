// frontend/admin-crm/src/components/analytics/widgets/MetricCardWidget.tsx

import React from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import type { Widget } from '../../../types/analytics.types';
import { formatCurrency } from '../../../utils/currency';
import { useCurrencySettings } from '../../../hooks/useCurrency';

interface MetricCardWidgetProps {
  widget: Widget;
  data: {
    value: number;
    trend?: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
    previousValue?: number;
    unit?: string;
    prefix?: string;
    suffix?: string;
  };
  compact?: boolean;
}

export const MetricCardWidget: React.FC<MetricCardWidgetProps> = ({
  widget,
  data,
  compact = false,
}) => {
  const { settings: currencySettings } = useCurrencySettings();
  
  const formatValue = (value: number): string => {
    const { metric_definition_type } = widget;
    
    // Format based on metric type
    switch (metric_definition_type) {
      case 'PERCENTAGE':
        return `${value.toFixed(1)}%`;
      case 'REVENUE':
        const currency = currencySettings?.defaultCurrency || 'PHP';
        return formatCurrency(value, currency, {
          showSymbol: currencySettings?.displayFormat !== 'code',
          showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
          minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
          maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
        });
      case 'COUNT':
        return value.toLocaleString();
      default:
        // Use display format from widget or default formatting
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (!data.trend) return null;
    
    switch (data.trend.direction) {
      case 'up':
        return <TrendingUpIcon fontSize="small" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" />;
      default:
        return <TrendingFlatIcon fontSize="small" />;
    }
  };

  const getTrendColor = () => {
    if (!data.trend) return 'text.secondary';
    
    switch (data.trend.direction) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const getTrendChipColor = () => {
    if (!data.trend) return 'default';
    
    switch (data.trend.direction) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: compact ? 'center' : 'space-between',
        textAlign: compact ? 'center' : 'left',
      }}
    >
      {/* Main Value */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography
          variant={compact ? "h4" : "h2"}
          fontWeight="bold"
          color="primary.main"
          sx={{
            fontSize: compact ? '2rem' : '3rem',
            lineHeight: 1,
            mb: compact ? 0.5 : 1,
          }}
        >
          {data.prefix && (
            <Typography component="span" variant="h5" color="text.secondary">
              {data.prefix}
            </Typography>
          )}
          {formatValue(data.value)}
          {data.suffix && (
            <Typography component="span" variant="h5" color="text.secondary">
              {data.suffix}
            </Typography>
          )}
        </Typography>

        {!compact && widget.metric_definition_name && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {widget.metric_definition_name}
          </Typography>
        )}
      </Box>

      {/* Trend Information */}
      {data.trend && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: compact ? 'center' : 'flex-start',
            gap: 1,
            mt: 'auto',
          }}
        >
          {compact ? (
            getTrendIcon() ? (
              <Chip
                icon={getTrendIcon() as React.ReactElement}
                label={`${data.trend.value > 0 ? '+' : ''}${data.trend.value}%`}
                size="small"
                color={getTrendChipColor() as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                variant="outlined"
              />
            ) : (
              <Chip
                label={`${data.trend.value > 0 ? '+' : ''}${data.trend.value}%`}
                size="small"
                color={getTrendChipColor() as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                variant="outlined"
              />
            )
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: getTrendColor(),
                  bgcolor: data.trend.direction === 'up' ? 'success.50' : 
                           data.trend.direction === 'down' ? 'error.50' : 'action.hover',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                }}
              >
                {getTrendIcon()}
                <Typography
                  variant="body2"
                  fontWeight="medium"
                  sx={{ ml: 0.5 }}
                >
                  {data.trend.value > 0 ? '+' : ''}{data.trend.value}%
                </Typography>
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                vs previous period
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* Comparison Value */}
      {!compact && data.previousValue && widget.comparison_enabled && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Previous: {formatValue(data.previousValue)}
          </Typography>
        </Box>
      )}

      {/* Time Range Indicator */}
      {!compact && (
        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {widget.time_range?.replace('_', ' ') || 'Last 30 days'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};