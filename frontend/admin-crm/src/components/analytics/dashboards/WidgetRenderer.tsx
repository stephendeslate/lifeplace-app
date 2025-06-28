// frontend/admin-crm/src/components/analytics/dashboards/WidgetRenderer.tsx

import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Widgets as WidgetIcon,
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

  return (
    <Paper
      elevation={1}
      sx={{
        height: getWidgetHeight(widget.size),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: widget.is_visible ? 1 : 0.6,
        transition: 'all 0.2s ease',
        '&:hover': {
          elevation: 2,
          transform: 'translateY(-1px)',
        },
      }}
    >
      {!compact && (
        <Box
          sx={{
            p: 2,
            pb: 1,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="h6"
            fontWeight="medium"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {widget.title}
          </Typography>
          {widget.metric_definition_name && (
            <Typography variant="caption" color="text.secondary">
              {widget.metric_definition_name}
            </Typography>
          )}
        </Box>
      )}
      
      <Box
        sx={{
          flex: 1,
          p: compact ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </Paper>
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