// frontend/admin-crm/src/components/analytics/widgets/BarChartWidget.tsx

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Widget } from '../../../types/analytics.types';

interface BarChartWidgetProps {
  widget: Widget;
  data: {
    categories: Array<{
      name: string;
      value: number;
      comparisonValue?: number;
    }>;
    summary?: {
      total: number;
      highest: { name: string; value: number };
      lowest: { name: string; value: number };
    };
  };
  compact?: boolean;
  horizontal?: boolean;
}

export const BarChartWidget: React.FC<BarChartWidgetProps> = ({
  widget,
  data,
  compact = false,
  horizontal = false,
}) => {
  const getColorScheme = () => {
    const scheme = widget.chart_config?.color_scheme || 'blue';
    
    switch (scheme) {
      case 'blue':
        return { primary: '#2563eb', secondary: '#93c5fd' };
      case 'green':
        return { primary: '#16a34a', secondary: '#86efac' };
      case 'orange':
        return { primary: '#ea580c', secondary: '#fdba74' };
      case 'purple':
        return { primary: '#9333ea', secondary: '#c4b5fd' };
      case 'red':
        return { primary: '#dc2626', secondary: '#fca5a5' };
      case 'multi':
        return { 
          primary: '#2563eb', 
          secondary: '#93c5fd',
          colors: ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2']
        };
      default:
        return { primary: '#2563eb', secondary: '#93c5fd' };
    }
  };

  const colors = getColorScheme();
  const showGrid = widget.chart_config?.show_grid ?? true;
  const animationEnabled = widget.chart_config?.animation_enabled ?? true;

  const formatTooltipValue = (value: number) => {
    if (typeof value !== 'number') return value;
    
    switch (widget.metric_definition_type) {
      case 'PERCENTAGE':
        return `${value.toFixed(1)}%`;
      case 'REVENUE':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'COUNT':
        return value.toLocaleString();
      default:
        return value.toLocaleString();
    }
  };

  const formatAxisValue = (value: number) => {
    if (typeof value !== 'number') return value;
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const formatCategoryLabel = (label: string) => {
    if (compact && label.length > 8) {
      return label.substring(0, 6) + '...';
    }
    return label;
  };

  const getBarColor = (index: number) => {
    if (colors.colors) {
      return colors.colors[index % colors.colors.length];
    }
    return colors.primary;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: {formatTooltipValue(entry.value)}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Add colors to data for multi-color scheme
  const chartData = data.categories.map((item, index) => ({
    ...item,
    fill: getBarColor(index),
  }));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Summary Stats - only show in non-compact mode */}
      {!compact && data.summary && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatTooltipValue(data.summary.total)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Highest
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {data.summary.highest.name}: {formatTooltipValue(data.summary.highest.value)}
            </Typography>
          </Box>
          {!compact && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Lowest
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {data.summary.lowest.name}: {formatTooltipValue(data.summary.lowest.value)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Chart */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout={horizontal ? 'horizontal' : 'vertical'}
            margin={{
              top: 5,
              right: 5,
              left: horizontal ? (compact ? 60 : 80) : 5,
              bottom: horizontal ? 5 : (compact ? 40 : 60),
            }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            )}
            
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  tickFormatter={formatAxisValue}
                  fontSize={compact ? 10 : 12}
                  tick={{ fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickFormatter={formatCategoryLabel}
                  fontSize={compact ? 10 : 12}
                  tick={{ fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  width={compact ? 60 : 80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  tickFormatter={formatCategoryLabel}
                  fontSize={compact ? 10 : 12}
                  tick={{ fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  angle={compact ? -45 : 0}
                  textAnchor={compact ? 'end' : 'middle'}
                  height={compact ? 40 : 60}
                />
                <YAxis
                  tickFormatter={formatAxisValue}
                  fontSize={compact ? 10 : 12}
                  tick={{ fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  width={compact ? 40 : 60}
                />
              </>
            )}
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar
              dataKey="value"
              fill={colors.colors ? undefined : colors.primary}
              name={widget.metric_definition_name || 'Value'}
              animationDuration={animationEnabled ? 750 : 0}
              radius={[2, 2, 0, 0]}
            />
            
            {widget.comparison_enabled && (
              <Bar
                dataKey="comparisonValue"
                fill={colors.secondary}
                name="Comparison"
                animationDuration={animationEnabled ? 750 : 0}
                radius={[2, 2, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Time Range Indicator */}
      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          {widget.time_range?.replace('_', ' ') || 'Last 30 days'}
        </Typography>
      )}
    </Box>
  );
};