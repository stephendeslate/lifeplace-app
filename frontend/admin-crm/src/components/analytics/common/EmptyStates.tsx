// frontend/admin-crm/src/components/analytics/common/EmptyStates.tsx

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Speed as MetricIcon,
  Dashboard as DashboardIcon,
  Assessment as ReportIcon,
  Timeline as FunnelIcon,
  NotificationsActive as AlertIcon,
  Event as EventIcon,
  Search as SearchIcon,
  ErrorOutline as ErrorIcon,
  CloudOff as OfflineIcon,
  DataUsage as DataIcon,
  BarChart as ChartIcon,
  PieChart as PieChartIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { EmptyState } from '../../common/EmptyState';

// Analytics-specific empty states with proper theming and actions

// No Data States
export const NoAnalyticsDataState: React.FC<{ 
  onSetupClick?: () => void;
  type?: 'general' | 'metrics' | 'events';
}> = ({ onSetupClick, type = 'general' }) => {
  const getContent = () => {
    switch (type) {
      case 'metrics':
        return {
          title: 'No Analytics Data Available',
          description: 'No metric data has been calculated yet. Create metric definitions and start tracking your business performance.',
          icon: DataIcon,
          actionText: 'Set Up Metrics',
        };
      case 'events':
        return {
          title: 'No Events Recorded',
          description: 'No analytics events have been tracked yet. Events will appear here as users interact with your application.',
          icon: EventIcon,
          actionText: 'Learn About Event Tracking',
        };
      default:
        return {
          title: 'No Analytics Data',
          description: 'Start tracking your business performance by setting up analytics and creating your first metrics.',
          icon: AnalyticsIcon,
          actionText: 'Get Started',
        };
    }
  };

  const content = getContent();

  return (
    <EmptyState
      icon={content.icon}
      title={content.title}
      description={content.description}
      action={onSetupClick && (
        <Button
          variant="contained"
          onClick={onSetupClick}
          startIcon={<SettingsIcon />}
        >
          {content.actionText}
        </Button>
      )}
      size="large"
    />
  );
};

// Search/Filter Results States
export const NoSearchResultsState: React.FC<{
  searchQuery?: string;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
  hasFilters?: boolean;
  entityType?: string;
}> = ({ 
  searchQuery, 
  onClearSearch, 
  onClearFilters, 
  hasFilters = false,
  entityType = 'items',
}) => (
  <EmptyState
    icon={SearchIcon}
    title="No Results Found"
    description={
      searchQuery 
        ? `No ${entityType} match "${searchQuery}". Try different search terms or adjust your filters.`
        : `No ${entityType} match your current filters. Try adjusting your search criteria.`
    }
    action={
      <Stack direction="row" spacing={2}>
        {searchQuery && onClearSearch && (
          <Button variant="outlined" onClick={onClearSearch}>
            Clear Search
          </Button>
        )}
        {hasFilters && onClearFilters && (
          <Button variant="outlined" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </Stack>
    }
  />
);

// Entity-Specific Empty States
export const NoMetricsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    icon={MetricIcon}
    title="No Metrics Defined"
    description="Get started by creating your first metric definition to track business performance and key indicators."
    action={
      onCreateClick && (
        <Button
          variant="contained"
          startIcon={<MetricIcon />}
          onClick={onCreateClick}
        >
          Create First Metric
        </Button>
      )
    }
    variant="outlined"
  />
);

export const NoDashboardsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    icon={DashboardIcon}
    title="No Dashboards Created"
    description="Create your first dashboard to visualize your metrics and gain insights into your business performance."
    action={
      onCreateClick && (
        <Button
          variant="contained"
          startIcon={<DashboardIcon />}
          onClick={onCreateClick}
        >
          Create First Dashboard
        </Button>
      )
    }
    variant="outlined"
  />
);

export const NoReportsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    icon={ReportIcon}
    title="No Reports Configured"
    description="Set up your first analytics report to track business metrics over time and schedule automated delivery."
    action={
      onCreateClick && (
        <Button
          variant="contained"
          startIcon={<ReportIcon />}
          onClick={onCreateClick}
        >
          Create First Report
        </Button>
      )
    }
    variant="outlined"
  />
);

export const NoFunnelsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    icon={FunnelIcon}
    title="No Conversion Funnels"
    description="Create conversion funnels to track user journeys and identify optimization opportunities in your business processes."
    action={
      onCreateClick && (
        <Button
          variant="contained"
          startIcon={<FunnelIcon />}
          onClick={onCreateClick}
        >
          Create First Funnel
        </Button>
      )
    }
    variant="outlined"
  />
);

export const NoAlertsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    icon={AlertIcon}
    title="No Alert Rules Configured"
    description="Set up alert rules to monitor important metrics and get notified when thresholds are exceeded."
    action={
      onCreateClick && (
        <Button
          variant="contained"
          startIcon={<AlertIcon />}
          onClick={onCreateClick}
        >
          Create First Alert Rule
        </Button>
      )
    }
    variant="outlined"
  />
);

export const NoEventsEmptyState: React.FC<{ 
  showSetup?: boolean;
  onSetupClick?: () => void;
}> = ({ showSetup = false, onSetupClick }) => (
  <EmptyState
    icon={EventIcon}
    title="No Events Recorded"
    description="Analytics events will appear here as users interact with your application. Events are automatically tracked in real-time."
    action={
      showSetup && onSetupClick && (
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={onSetupClick}
        >
          Set Up Event Tracking
        </Button>
      )
    }
    size="large"
  />
);

// Error States
export const AnalyticsErrorState: React.FC<{
  error?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  type?: 'calculation' | 'data' | 'connection';
}> = ({ error, onRetry, onRefresh, type = 'data' }) => {
  const getContent = () => {
    switch (type) {
      case 'calculation':
        return {
          title: 'Calculation Failed',
          description: error || 'Unable to calculate metric. This might be due to invalid configuration or insufficient data.',
          icon: ErrorIcon,
        };
      case 'connection':
        return {
          title: 'Connection Error',
          description: error || 'Unable to connect to analytics service. Please check your connection and try again.',
          icon: OfflineIcon,
        };
      default:
        return {
          title: 'Unable to Load Data',
          description: error || 'Something went wrong while loading analytics data. Please try again.',
          icon: ErrorIcon,
        };
    }
  };

  const content = getContent();

  return (
    <EmptyState
      icon={content.icon}
      title={content.title}
      description={content.description}
      action={
        <Stack direction="row" spacing={2}>
          {onRetry && (
            <Button variant="contained" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {onRefresh && (
            <Button variant="outlined" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </Stack>
      }
      variant="outlined"
    />
  );
};

// Widget-Specific Empty States
export const NoChartDataState: React.FC<{
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  metric?: string;
}> = ({ chartType = 'line', metric }) => {
  const getIcon = () => {
    switch (chartType) {
      case 'pie': return PieChartIcon;
      case 'bar': return ChartIcon;
      default: return ChartIcon;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: 'text.secondary',
      }}
    >
      <Box sx={{ mb: 2 }}>
        {React.createElement(getIcon(), { sx: { fontSize: 48, opacity: 0.5 } })}
      </Box>
      <Typography variant="h6" gutterBottom>
        No Chart Data
      </Typography>
      <Typography variant="body2" textAlign="center" sx={{ maxWidth: 300 }}>
        {metric 
          ? `No data available for ${metric}. Check your metric configuration and date range.`
          : 'No data available to display in this chart. Try adjusting your filters or date range.'
        }
      </Typography>
    </Box>
  );
};

// Status-Specific States
export const ProcessingDataState: React.FC<{
  message?: string;
  progress?: number;
  // @ts-ignore
}> = ({ message = 'Processing analytics data...', progress }) => (
  <EmptyState
    icon={DataIcon}
    title="Processing Data"
    description={message}
    size="medium"
  />
);

export const MaintenanceModeState: React.FC<{
  estimatedTime?: string;
}> = ({ estimatedTime }) => (
  <Alert 
    severity="info" 
    sx={{ 
      mb: 3,
      '& .MuiAlert-message': {
        width: '100%',
        textAlign: 'center',
      },
    }}
  >
    <Typography variant="h6" gutterBottom>
      Analytics Maintenance
    </Typography>
    <Typography variant="body2">
      Analytics services are temporarily unavailable for scheduled maintenance.
      {estimatedTime && ` Expected completion: ${estimatedTime}`}
    </Typography>
  </Alert>
);

// Configuration States
export const ConfigurationRequiredState: React.FC<{
  feature: string;
  onConfigureClick?: () => void;
}> = ({ feature, onConfigureClick }) => (
  <EmptyState
    icon={SettingsIcon}
    title={`${feature} Configuration Required`}
    description={`${feature} has not been configured yet. Complete the setup to start using this feature.`}
    action={
      onConfigureClick && (
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={onConfigureClick}
        >
          Configure {feature}
        </Button>
      )
    }
    variant="outlined"
  />
);

// Permission States
export const InsufficientPermissionsState: React.FC<{
  feature: string;
  requiredRole?: string;
}> = ({ feature, requiredRole }) => (
  <Alert severity="warning" sx={{ textAlign: 'center' }}>
    <Typography variant="h6" gutterBottom>
      Access Restricted
    </Typography>
    <Typography variant="body2">
      You don't have permission to access {feature}.
      {requiredRole && ` This feature requires ${requiredRole} role or higher.`}
    </Typography>
  </Alert>
);

// Loading States with Context
export const AnalyticsLoadingState: React.FC<{
  message?: string;
  showMetrics?: boolean;
}> = ({ message = 'Loading analytics...', showMetrics = false }) => (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <AnalyticsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
    <Typography variant="h5" gutterBottom>
      {message}
    </Typography>
    {showMetrics && (
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
        <Chip label="Calculating metrics" size="small" />
        <Chip label="Processing events" size="small" />
        <Chip label="Generating insights" size="small" />
      </Stack>
    )}
  </Box>
);