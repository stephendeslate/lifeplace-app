// Modern Glassmorphic LineChart Widget
// Enhanced with modern design patterns and smooth animations

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Fade,
  Grow,
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
  ReferenceLine,
} from 'recharts';
import type { Widget } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

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
          gradient: `linear-gradient(135deg, ${tokens.color.primary[500]}40 0%, ${tokens.color.primary[300]}20 100%)`
        };
      case 'green':
        return { 
          primary: tokens.color.success[500], 
          secondary: tokens.color.success[300],
          gradient: `linear-gradient(135deg, ${tokens.color.success[500]}40 0%, ${tokens.color.success[300]}20 100%)`
        };
      case 'orange':
        return { 
          primary: tokens.color.warning[500], 
          secondary: tokens.color.warning[300],
          gradient: `linear-gradient(135deg, ${tokens.color.warning[500]}40 0%, ${tokens.color.warning[300]}20 100%)`
        };
      case 'purple':
        return { 
          primary: tokens.color.secondary[500], 
          secondary: tokens.color.secondary[300],
          gradient: `linear-gradient(135deg, ${tokens.color.secondary[500]}40 0%, ${tokens.color.secondary[300]}20 100%)`
        };
      case 'red':
        return { 
          primary: tokens.color.error[500], 
          secondary: tokens.color.error[300],
          gradient: `linear-gradient(135deg, ${tokens.color.error[500]}40 0%, ${tokens.color.error[300]}20 100%)`
        };
      default:
        return { 
          primary: tokens.color.primary[500], 
          secondary: tokens.color.primary[300],
          gradient: `linear-gradient(135deg, ${tokens.color.primary[500]}40 0%, ${tokens.color.primary[300]}20 100%)`
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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string; dataKey: string; name?: string; }>; label?: string; }) => {
    if (active && payload && payload.length) {
      return (
        <Fade in timeout={200}>
          <Box
            sx={{
              ...glassPresets.strong,
              borderRadius: tokens.spacing.radius.xl,
              border: `1px solid ${tokens.color.borders.glass}`,
              p: 2.5,
              minWidth: 150,
              boxShadow: tokens.shadow.glass.floating,
              position: 'relative',
              
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: colors.gradient,
                borderRadius: tokens.spacing.radius.xl,
                opacity: 0.1,
                pointerEvents: 'none',
              }
            }}
          >
            <Typography 
              variant="body2" 
              fontWeight="bold" 
              gutterBottom
              sx={{ 
                color: tokens.color.neutral[800],
                position: 'relative',
                zIndex: 1 
              }}
            >
              {formatDateLabel(label)}
            </Typography>
            {payload.map((entry, index: number) => (
              <Box key={index} display="flex" alignItems="center" gap={1} sx={{ position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: entry.color,
                    boxShadow: `0 0 8px ${entry.color}40`,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ 
                    color: tokens.color.neutral[700],
                    fontWeight: 500 
                  }}
                >
                  {entry.name}: 
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ 
                    color: entry.color,
                    fontWeight: 700,
                    ml: 'auto'
                  }}
                >
                  {formatTooltipValue(entry.value)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Fade>
      );
    }
    return null;
  };

  const ChartComponent = areaChart ? AreaChart : LineChart;

  // Calculate chart insights
  const averageValue = data.summary?.average || data.timeSeries.reduce((sum, item) => sum + item.value, 0) / data.timeSeries.length;
  const dataWithAverage = data.timeSeries.map(item => ({ ...item, average: averageValue }));

  return (
    <Grow in={isLoaded} timeout={600}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Modern Summary Stats */}
        {!compact && data.summary && (
          <Fade in={isLoaded} timeout={800}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2,
                mb: 3,
              }}
            >
              {[
                { label: 'Total', value: data.summary.total, color: colors.primary },
                { label: 'Average', value: data.summary.average, color: colors.secondary },
                { label: 'Peak', value: data.summary.peak, color: tokens.color.success[500] }
              ].map((stat, index) => (
                <Box
                  key={stat.label}
                  sx={{
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xl,
                    p: 2,
                    border: `1px solid ${stat.color}20`,
                    background: `linear-gradient(135deg, ${stat.color}08 0%, transparent 100%)`,
                    transition: createTransition(['transform', 'box-shadow'], 'fast'),
                    animationDelay: `${index * 100}ms`,
                    
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
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700,
                      color: stat.color,
                      mt: 0.5
                    }}
                  >
                    {formatTooltipValue(stat.value)}
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
            position: 'relative',
            borderRadius: tokens.spacing.radius.lg,
            background: `linear-gradient(135deg, ${colors.primary}02 0%, transparent 100%)`,
            p: 1,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent 
              data={dataWithAverage}
            >
              {/* Enhanced Grid */}
              {showGrid && (
                <CartesianGrid 
                  strokeDasharray="2 4" 
                  stroke={tokens.color.neutral[200]}
                  strokeOpacity={0.3}
                  horizontal={true}
                  vertical={false}
                />
              )}

              {/* Average Reference Line */}
              {!compact && (
                <ReferenceLine 
                  y={averageValue} 
                  stroke={colors.secondary}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  strokeOpacity={0.7}
                />
              )}

              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                fontSize={compact ? 10 : 12}
                tick={{ 
                  fill: tokens.color.neutral[500], 
                  fontWeight: 500 
                }}
                axisLine={{ stroke: tokens.color.neutral[200], strokeWidth: 1 }}
                tickLine={{ stroke: 'transparent' }}
                dy={5}
              />
              <YAxis
                tickFormatter={formatAxisValue}
                fontSize={compact ? 10 : 12}
                tick={{ 
                  fill: tokens.color.neutral[500], 
                  fontWeight: 500 
                }}
                axisLine={{ stroke: 'transparent' }}
                tickLine={{ stroke: 'transparent' }}
                width={compact ? 40 : 60}
                dx={-5}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ 
                  stroke: colors.primary, 
                  strokeWidth: 2,
                  strokeDasharray: '4 4',
                  strokeOpacity: 0.5
                }}
              />
            
              {areaChart ? (
                <>
                  <defs>
                    <linearGradient id={`gradient-${widget.id || 'default'}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.primary} stopOpacity={0.4}/>
                      <stop offset="50%" stopColor={colors.primary} stopOpacity={0.2}/>
                      <stop offset="100%" stopColor={colors.primary} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.primary}
                    fill={`url(#gradient-${widget.id || 'default'})`}
                    strokeWidth={3}
                    name={widget.metric_definition_name || 'Value'}
                    animationDuration={animationEnabled ? 1200 : 0}
                    animationEasing="ease-out"
                  />
                  {widget.comparison_enabled && (
                    <Area
                      type="monotone"
                      dataKey="comparisonValue"
                      stroke={colors.secondary}
                      fill={colors.secondary}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      name="Comparison"
                      animationDuration={animationEnabled ? 1000 : 0}
                    />
                  )}
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.primary}
                    strokeWidth={3}
                    dot={compact ? false : { 
                      fill: '#ffffff', 
                      stroke: colors.primary,
                      strokeWidth: 3, 
                      r: 5,
                      filter: `drop-shadow(0 2px 4px ${colors.primary}40)`
                    }}
                    activeDot={{ 
                      r: 8, 
                      fill: colors.primary,
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      filter: `drop-shadow(0 4px 8px ${colors.primary}60)`
                    }}
                    name={widget.metric_definition_name || 'Value'}
                    animationDuration={animationEnabled ? 1200 : 0}
                    animationEasing="ease-out"
                  />
                  {widget.comparison_enabled && (
                    <Line
                      type="monotone"
                      dataKey="comparisonValue"
                      stroke={colors.secondary}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={compact ? false : { 
                        fill: '#ffffff', 
                        stroke: colors.secondary,
                        strokeWidth: 2, 
                        r: 4 
                      }}
                      activeDot={{ 
                        r: 6, 
                        fill: colors.secondary,
                        stroke: '#ffffff',
                        strokeWidth: 2
                      }}
                      name="Comparison"
                      animationDuration={animationEnabled ? 1000 : 0}
                    />
                  )}
                </>
              )}
            </ChartComponent>
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