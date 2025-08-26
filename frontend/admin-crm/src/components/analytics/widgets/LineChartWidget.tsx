// frontend/admin-crm/src/components/analytics/widgets/LineChartWidget.tsx

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Widget } from '../../../types/analytics.types';

interface LineChartWidgetProps {
  widget: Widget;
  data: {
    timeSeries: Array<{
      date: string;
      value: number;
      comparisonValue?: number;
    }>;
    summary?: {
      total: number;
      average: number;
      peak: number;
    };
  };
  compact?: boolean;
  areaChart?: boolean;
}

export const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  widget,
  data,
  compact = false,
  areaChart = false,
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

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (compact) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: data.timeSeries.length > 30 ? 'numeric' : undefined,
    });
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
            {formatDateLabel(label)}
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

  const ChartComponent = areaChart ? AreaChart : LineChart;

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
              Average
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatTooltipValue(data.summary.average)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Peak
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatTooltipValue(data.summary.peak)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Chart */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data.timeSeries}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            )}
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              fontSize={compact ? 10 : 12}
              tick={{ fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              tickFormatter={formatAxisValue}
              fontSize={compact ? 10 : 12}
              tick={{ fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickLine={{ stroke: '#e0e0e0' }}
              width={compact ? 40 : 60}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {areaChart ? (
              <>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.primary}
                  fill={colors.primary}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name={widget.metric_definition_name || 'Value'}
                  animationDuration={animationEnabled ? 750 : 0}
                />
                {widget.comparison_enabled && (
                  <Area
                    type="monotone"
                    dataKey="comparisonValue"
                    stroke={colors.secondary}
                    fill={colors.secondary}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Comparison"
                    animationDuration={animationEnabled ? 750 : 0}
                  />
                )}
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.primary}
                  strokeWidth={2}
                  dot={compact ? false : { fill: colors.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: colors.primary }}
                  name={widget.metric_definition_name || 'Value'}
                  animationDuration={animationEnabled ? 750 : 0}
                />
                {widget.comparison_enabled && (
                  <Line
                    type="monotone"
                    dataKey="comparisonValue"
                    stroke={colors.secondary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={compact ? false : { fill: colors.secondary, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: colors.secondary }}
                    name="Comparison"
                    animationDuration={animationEnabled ? 750 : 0}
                  />
                )}
              </>
            )}
          </ChartComponent>
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