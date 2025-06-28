// frontend/admin-crm/src/components/common/EmptyState.tsx

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  SvgIcon,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface EmptyStateProps {
  icon?: SvgIconComponent;
  title: string;
  description: string;
  action?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'outlined' | 'contained';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: IconComponent,
  title,
  description,
  action,
  size = 'medium',
  variant = 'default',
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'small': return 48;
      case 'medium': return 64;
      case 'large': return 80;
      default: return 64;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return 3;
      case 'medium': return 4;
      case 'large': return 6;
      default: return 4;
    }
  };

  const getTitleVariant = () => {
    switch (size) {
      case 'small': return 'h6' as const;
      case 'medium': return 'h5' as const;
      case 'large': return 'h4' as const;
      default: return 'h5' as const;
    }
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: getPadding(),
        minHeight: size === 'small' ? 200 : size === 'large' ? 400 : 300,
      }}
    >
      {IconComponent && (
        <Box
          sx={{
            mb: 2,
            color: 'text.secondary',
            opacity: 0.6,
          }}
        >
          <SvgIcon
            component={IconComponent}
            sx={{
              fontSize: getIconSize(),
            }}
          />
        </Box>
      )}

      <Typography
        variant={getTitleVariant()}
        fontWeight="bold"
        color="text.primary"
        gutterBottom
      >
        {title}
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mb: action ? 3 : 0,
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        {description}
      </Typography>

      {action && (
        <Box>
          {action}
        </Box>
      )}
    </Box>
  );

  if (variant === 'outlined') {
    return (
      <Paper variant="outlined" sx={{ bgcolor: 'transparent' }}>
        {content}
      </Paper>
    );
  }

  if (variant === 'contained') {
    return (
      <Paper sx={{ bgcolor: 'grey.50' }}>
        {content}
      </Paper>
    );
  }

  return content;
};

// Predefined empty states for common scenarios
interface EmptyStateVariantProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const NoDataEmptyState: React.FC<EmptyStateVariantProps> = ({
  title = "No data available",
  description = "There's no data to display at the moment. Try refreshing or check back later.",
  action,
  size,
}) => (
  <EmptyState
    title={title}
    description={description}
    action={action}
    size={size}
  />
);

export const NoSearchResultsEmptyState: React.FC<EmptyStateVariantProps> = ({
  title = "No results found",
  description = "No items match your search criteria. Try adjusting your filters or search terms.",
  action,
  size,
}) => (
  <EmptyState
    title={title}
    description={description}
    action={action}
    size={size}
  />
);

export const ErrorEmptyState: React.FC<EmptyStateVariantProps> = ({
  title = "Something went wrong",
  description = "We encountered an error while loading the data. Please try again.",
  action,
  size,
}) => (
  <EmptyState
    title={title}
    description={description}
    action={action}
    size={size}
    variant="outlined"
  />
);

// Analytics-specific empty states
export const NoMetricsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    title="No metrics defined"
    description="Get started by creating your first metric definition to track business performance."
    action={
      onCreateClick && (
        <Button variant="contained" onClick={onCreateClick}>
          Create First Metric
        </Button>
      )
    }
  />
);

export const NoDashboardsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    title="No dashboards created"
    description="Create your first dashboard to visualize your metrics and gain insights into your business."
    action={
      onCreateClick && (
        <Button variant="contained" onClick={onCreateClick}>
          Create First Dashboard
        </Button>
      )
    }
  />
);

export const NoReportsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    title="No reports configured"
    description="Set up your first analytics report to track business metrics over time and schedule automated delivery."
    action={
      onCreateClick && (
        <Button variant="contained" onClick={onCreateClick}>
          Create First Report
        </Button>
      )
    }
  />
);

export const NoFunnelsEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    title="No conversion funnels"
    description="Create conversion funnels to track user journeys and identify optimization opportunities in your business processes."
    action={
      onCreateClick && (
        <Button variant="contained" onClick={onCreateClick}>
          Create First Funnel
        </Button>
      )
    }
  />
);

export const NoAlertRulesEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ 
  onCreateClick 
}) => (
  <EmptyState
    title="No alert rules configured"
    description="Set up alert rules to monitor important metrics and get notified when thresholds are exceeded."
    action={
      onCreateClick && (
        <Button variant="contained" onClick={onCreateClick}>
          Create First Alert Rule
        </Button>
      )
    }
  />
);

export const NoEventsEmptyState: React.FC = () => (
  <EmptyState
    title="No events recorded"
    description="Analytics events will appear here as users interact with your application. Events are automatically tracked in real-time."
    size="large"
  />
);

// Loading empty state (for when data is being fetched)
export const LoadingEmptyState: React.FC<{ message?: string }> = ({ 
  message = "Loading data..." 
}) => (
  <EmptyState
    title="Loading"
    description={message}
    size="small"
  />
);