// Modern Glassmorphic Widget Renderer
// Enhanced with professional glassmorphic design patterns

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Fade,
  Grow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Widgets as WidgetIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import { 
  MetricCardWidget,
  LineChartWidget,
  BarChartWidget,
  PieChartWidget,
  GaugeWidget,
  TableWidget,
  FunnelWidget,
} from '../widgets';
import type { Widget } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

interface WidgetRendererProps {
  widget: Widget;
  isLoading?: boolean;
  error?: string | null;
  data?: any;
  compact?: boolean;
}

interface WidgetWrapperProps {
  widget: Widget;
  children: React.ReactNode;
  compact?: boolean;
}

const WidgetWrapper: React.FC<WidgetWrapperProps> = ({ widget, children, compact = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const getWidgetHeight = (size: string) => {
    if (compact) return '200px';
    
    switch (size) {
      case 'SMALL': return '200px';
      case 'MEDIUM': return '250px';
      case 'LARGE': return '400px';
      case 'TALL': return '350px';
      default: return '250px';
    }
  };

  const getWidgetColorScheme = (type: string) => {
    switch (type) {
      case 'METRIC_CARD':
        return { primary: tokens.color.primary[500], gradient: tokens.color.backgrounds.primaryGradient };
      case 'LINE_CHART':
      case 'AREA_CHART':
        return { primary: tokens.color.info[500], gradient: `linear-gradient(135deg, ${tokens.color.info[500]}08 0%, transparent 100%)` };
      case 'BAR_CHART':
        return { primary: tokens.color.success[500], gradient: `linear-gradient(135deg, ${tokens.color.success[500]}08 0%, transparent 100%)` };
      case 'PIE_CHART':
        return { primary: tokens.color.warning[500], gradient: `linear-gradient(135deg, ${tokens.color.warning[500]}08 0%, transparent 100%)` };
      case 'GAUGE':
        return { primary: tokens.color.secondary[500], gradient: `linear-gradient(135deg, ${tokens.color.secondary[500]}08 0%, transparent 100%)` };
      default:
        return { primary: tokens.color.neutral[500], gradient: `linear-gradient(135deg, ${tokens.color.neutral[500]}08 0%, transparent 100%)` };
    }
  };

  const colors = getWidgetColorScheme(widget.widget_type);

  return (
    <Grow in={isLoaded} timeout={600}>
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          height: getWidgetHeight(widget.size),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: tokens.spacing.radius.xxl,
          
          // Advanced glassmorphic styling
          ...glassPresets.light,
          opacity: widget.is_visible ? 1 : 0.6,
          transition: createTransition(['transform', 'box-shadow', 'background'], 'fast'),
          
          '&:hover': {
            ...glassPresets.medium,
            transform: 'translateY(-4px) scale(1.01)',
            boxShadow: tokens.shadow.glass.floating,
          },
          
          // Subtle gradient overlay based on widget type
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.gradient,
            borderRadius: tokens.spacing.radius.xxl,
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        {/* Modern Header */}
        {!compact && (
          <Fade in={isLoaded} timeout={800}>
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                p: 3,
                pb: 2,
                borderBottom: `1px solid ${tokens.color.borders.glass}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: tokens.color.neutral[800],
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.5,
                  }}
                >
                  {widget.title}
                </Typography>
                {widget.metric_definition_name && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: tokens.color.neutral[600],
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {widget.metric_definition_name}
                  </Typography>
                )}
              </Box>
              
              {/* Modern Action Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  opacity: isHovered ? 1 : 0,
                  transition: createTransition('opacity', 'fast'),
                }}
              >
                <Tooltip title="Refresh Data" placement="top">
                  <IconButton
                    size="small"
                    sx={{
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.full,
                      width: 28,
                      height: 28,
                      color: colors.primary,
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'rotate(90deg)',
                      }
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Expand Widget" placement="top">
                  <IconButton
                    size="small"
                    sx={{
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.full,
                      width: 28,
                      height: 28,
                      color: colors.primary,
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'scale(1.1)',
                      }
                    }}
                  >
                    <FullscreenIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Fade>
        )}
        
        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            p: compact ? 2 : 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </Grow>
  );
};

const LoadingWidget: React.FC<{ widget: Widget }> = ({ widget }) => (
  <WidgetWrapper widget={widget}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2,
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        Loading widget data...
      </Typography>
    </Box>
  </WidgetWrapper>
);

const ErrorWidget: React.FC<{ widget: Widget; error: string }> = ({ widget, error }) => (
  <WidgetWrapper widget={widget}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2,
      }}
    >
      <ErrorIcon color="error" sx={{ fontSize: 40 }} />
      <Alert severity="error" sx={{ width: '100%' }}>
        <Typography variant="body2">
          Failed to load widget data
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {error}
        </Typography>
      </Alert>
    </Box>
  </WidgetWrapper>
);

const UnsupportedWidget: React.FC<{ widget: Widget }> = ({ widget }) => (
  <WidgetWrapper widget={widget}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2,
      }}
    >
      <WidgetIcon color="disabled" sx={{ fontSize: 40 }} />
      <Alert severity="warning" sx={{ width: '100%' }}>
        <Typography variant="body2">
          Widget type "{widget.widget_type}" is not yet supported
        </Typography>
        <Typography variant="caption" color="text.secondary">
          This widget type is currently under development
        </Typography>
      </Alert>
    </Box>
  </WidgetWrapper>
);

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  isLoading = false,
  error = null,
  data = null,
  compact = false,
}) => {
  // Handle loading state
  if (isLoading) {
    return <LoadingWidget widget={widget} />;
  }

  // Handle error state
  if (error) {
    return <ErrorWidget widget={widget} error={error} />;
  }

  // Generate mock data for demonstration
  const mockData = {
    value: Math.floor(Math.random() * 1000) + 100,
    trend: {
      value: Math.floor(Math.random() * 20) - 10,
      direction: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down',
    },
    timeSeries: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 500) + 200,
    })),
    categories: [
      { name: 'Category A', value: Math.floor(Math.random() * 100) + 50 },
      { name: 'Category B', value: Math.floor(Math.random() * 100) + 50 },
      { name: 'Category C', value: Math.floor(Math.random() * 100) + 50 },
      { name: 'Category D', value: Math.floor(Math.random() * 100) + 50 },
    ],
  };

  const widgetData = data || mockData;

  // Render appropriate widget based on type
  const renderWidget = () => {
    switch (widget.widget_type) {
      case 'METRIC_CARD':
        return (
          <MetricCardWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'LINE_CHART':
        return (
          <LineChartWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'BAR_CHART':
        return (
          <BarChartWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'PIE_CHART':
        return (
          <PieChartWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'GAUGE':
        return (
          <GaugeWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'TABLE':
        return (
          <TableWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'FUNNEL':
        return (
          <FunnelWidget
            widget={widget}
            data={widgetData}
            compact={compact}
          />
        );

      case 'AREA_CHART':
        // Use LineChartWidget with area fill for now
        return (
          <LineChartWidget
            widget={widget}
            data={widgetData}
            compact={compact}
            areaChart={true}
          />
        );

      case 'HEATMAP':
      case 'PROGRESS_BAR':
      default:
        return <UnsupportedWidget widget={widget} />;
    }
  };

  return (
    <WidgetWrapper widget={widget} compact={compact}>
      {renderWidget()}
    </WidgetWrapper>
  );
};