// Modern Glassmorphic BarChart Widget
// Enhanced with modern design patterns and smooth animations

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Fade,
  Grow,
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
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getColorScheme = () => {
    const scheme = widget.chart_config?.color_scheme || 'blue';
    
    switch (scheme) {
      case 'blue':
        return { 
          primary: tokens.color.primary[500], 
          secondary: tokens.color.primary[300],
          gradient: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[400]} 100%)`
        };
      case 'green':
        return { 
          primary: tokens.color.success[500], 
          secondary: tokens.color.success[300],
          gradient: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[400]} 100%)`
        };
      case 'orange':
        return { 
          primary: tokens.color.warning[500], 
          secondary: tokens.color.warning[300],
          gradient: `linear-gradient(135deg, ${tokens.color.warning[500]} 0%, ${tokens.color.warning[400]} 100%)`
        };
      case 'purple':
        return { 
          primary: tokens.color.secondary[500], 
          secondary: tokens.color.secondary[300],
          gradient: `linear-gradient(135deg, ${tokens.color.secondary[500]} 0%, ${tokens.color.secondary[400]} 100%)`
        };
      case 'red':
        return { 
          primary: tokens.color.error[500], 
          secondary: tokens.color.error[300],
          gradient: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[400]} 100%)`
        };
      case 'multi':
        return { 
          primary: tokens.color.primary[500], 
          secondary: tokens.color.primary[300],
          colors: [
            tokens.color.primary[500], 
            tokens.color.success[500], 
            tokens.color.warning[500], 
            tokens.color.secondary[500], 
            tokens.color.error[500], 
            tokens.color.info[500]
          ]
        };
      default:
        return { 
          primary: tokens.color.primary[500], 
          secondary: tokens.color.primary[300],
          gradient: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[400]} 100%)`
        };
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
    <Grow in={isLoaded} timeout={600}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Modern Summary Stats */}
        {!compact && data.summary && (
          <Fade in={isLoaded} timeout={800}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 2,
                mb: 3,
              }}
            >
              {[
                { label: 'Total', value: data.summary.total, color: colors.primary },
                { label: 'Highest', value: `${data.summary.highest.name}: ${formatTooltipValue(data.summary.highest.value)}`, color: tokens.color.success[500] },
                { label: 'Lowest', value: `${data.summary.lowest.name}: ${formatTooltipValue(data.summary.lowest.value)}`, color: colors.secondary }
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xl,
                    p: 2,
                    border: `1px solid ${stat.color}20`,
                    background: `linear-gradient(135deg, ${stat.color}08 0%, transparent 100%)`,
                    transition: createTransition(['transform', 'box-shadow'], 'fast'),
                    
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${stat.color}15`,
                    }
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: tokens.color.neutral[500],
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: tokens.color.neutral[700],
                      mt: 0.5
                    }}
                  >
                    {stat.label === 'Total' ? formatTooltipValue(stat.value as number) : stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Fade>
        )}

        {/* Enhanced Chart Container */}
        <Box 
          sx={{ 
            flex: 1, 
            minHeight: 0,
            borderRadius: tokens.spacing.radius.lg,
            background: `linear-gradient(135deg, ${colors.primary}02 0%, transparent 100%)`,
            p: 1,
          }}
        >
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

        {/* Enhanced Time Range Indicator */}
        {!compact && (
          <Fade in={isLoaded} timeout={1000}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                mt: 2,
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.full,
                py: 1,
                px: 2,
                width: 'fit-content',
                mx: 'auto',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 8px ${colors.primary}40`,
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: tokens.color.neutral[600],
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {widget.time_range?.replace('_', ' ') || 'Last 30 days'}
              </Typography>
            </Box>
          </Fade>
        )}
      </Box>
    </Grow>
  );
};