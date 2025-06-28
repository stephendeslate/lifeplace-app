// frontend/admin-crm/src/components/analytics/common/LoadingStates.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Paper,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';

// Generic skeleton loaders for analytics components
interface SkeletonLoaderProps {
  count?: number;
  height?: number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | false;
}

export const AnalyticsSkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  count = 3,
  height = 24,
  variant = 'text',
  animation = 'wave',
}) => (
  <Stack spacing={1}>
    {Array.from({ length: count }, (_, index) => (
      <Skeleton
        key={index}
        variant={variant}
        height={height}
        animation={animation}
      />
    ))}
  </Stack>
);

// Metric Card Loading State
export const MetricCardLoading: React.FC = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
          <Box display="flex" alignItems="center" gap={0.5}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 1 }} />
      </Box>
    </CardContent>
  </Card>
);

// Dashboard Card Loading State
export const DashboardCardLoading: React.FC = () => (
  <Card sx={{ height: '100%', minHeight: 200 }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box flex={1}>
          <Skeleton variant="text" width="70%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="90%" height={16} sx={{ mb: 2 }} />
        </Box>
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
      
      <Skeleton variant="rectangular" width="100%" height={80} sx={{ mb: 2, borderRadius: 1 }} />
      
      <Box display="flex" gap={1} mb={2}>
        <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={70} height={20} sx={{ borderRadius: 1 }} />
      </Box>
      
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Skeleton variant="text" width="40%" height={16} />
        <Skeleton variant="text" width="30%" height={16} />
      </Box>
    </CardContent>
  </Card>
);

// Table Row Loading State
export const TableRowLoading: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      p: 2,
      borderBottom: 1,
      borderColor: 'divider',
    }}
  >
    {Array.from({ length: columns }, (_, index) => (
      <Box key={index} sx={{ flex: 1, pr: index < columns - 1 ? 2 : 0 }}>
        <Skeleton variant="text" width={index === 0 ? '80%' : '60%'} height={20} />
      </Box>
    ))}
  </Box>
);

// List Item Loading State
export const ListItemLoading: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      p: 3,
      borderBottom: 1,
      borderColor: 'divider',
    }}
  >
    <Box sx={{ flex: 1 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="circular" width={20} height={20} />
      </Box>
      <Skeleton variant="text" width="80%" height={16} sx={{ mb: 2 }} />
      <Box display="flex" gap={1}>
        <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 3 }} />
      </Box>
    </Box>
    <Skeleton variant="circular" width={32} height={32} />
  </Box>
);

// Chart Loading State
export const ChartLoading: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <Box sx={{ position: 'relative', height }}>
    <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        Loading chart data...
      </Typography>
    </Box>
  </Box>
);

// Widget Loading State
export const WidgetLoading: React.FC<{ 
  title?: string; 
  height?: number;
  showProgress?: boolean;
}> = ({ 
  title = 'Loading widget...', 
  height = 200,
  showProgress = true,
}) => (
  <Paper variant="outlined" sx={{ p: 2, height }}>
    <Box display="flex" flexDirection="column" height="100%">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
      
      <Box flex={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center">
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {title}
        </Typography>
        {showProgress && (
          <LinearProgress sx={{ width: '60%', mt: 1 }} />
        )}
      </Box>
    </Box>
  </Paper>
);

// Form Loading State
export const FormLoading: React.FC<{ fields?: number }> = ({ fields = 5 }) => (
  <Stack spacing={3}>
    {Array.from({ length: fields }, (_, index) => (
      <Box key={index}>
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
    <Box display="flex" gap={2} justifyContent="flex-end">
      <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
    </Box>
  </Stack>
);

// Page Loading State
export const PageLoading: React.FC<{ 
  title?: string;
  showHeader?: boolean;
  showFilters?: boolean;
  contentType?: 'table' | 'cards' | 'chart';
}> = ({ 
  title = 'Loading...', 
  showHeader = true,
  showFilters = true,
  contentType = 'table',
}) => (
  <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
    {/* Header */}
    {showHeader && (
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={300} height={20} />
        </Box>
        <Box display="flex" gap={2}>
          <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
    )}

    {/* Filters */}
    {showFilters && (
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Skeleton variant="rectangular" width={250} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 3 }} />
        </Box>
      </Paper>
    )}

    {/* Content */}
    <Paper variant="outlined">
      {contentType === 'table' && (
        <Box>
          {Array.from({ length: 8 }, (_, index) => (
            <TableRowLoading key={index} columns={5} />
          ))}
        </Box>
      )}

      {contentType === 'cards' && (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            flexWrap: { sm: 'wrap' },
            gap: 3,
            p: 3,
          }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Box 
              key={index}
              sx={{ 
                flex: { 
                  xs: '1 1 100%', 
                  sm: '1 1 calc(50% - 12px)', 
                  md: '1 1 calc(33.333% - 16px)' 
                },
                minWidth: 300,
              }}
            >
              <DashboardCardLoading />
            </Box>
          ))}
        </Box>
      )}

      {contentType === 'chart' && (
        <Box sx={{ p: 3 }}>
          <ChartLoading height={400} />
        </Box>
      )}
    </Paper>

    <LinearProgress sx={{ mt: 2 }} />
    
    <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </Box>
  </Box>
);

// Progress indicators for operations
export const OperationProgress: React.FC<{
  operation: string;
  progress?: number;
  detail?: string;
}> = ({ operation, progress, detail }) => (
  <Box sx={{ textAlign: 'center', p: 3 }}>
    <CircularProgress 
      variant={progress !== undefined ? 'determinate' : 'indeterminate'}
      value={progress}
      size={60}
      sx={{ mb: 2 }}
    />
    <Typography variant="h6" gutterBottom>
      {operation}
    </Typography>
    {detail && (
      <Typography variant="body2" color="text.secondary">
        {detail}
      </Typography>
    )}
    {progress !== undefined && (
      <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
        {progress.toFixed(0)}% complete
      </Typography>
    )}
  </Box>
);

// Inline loading states
export const InlineLoading: React.FC<{ 
  size?: 'small' | 'medium' | 'large';
  text?: string;
}> = ({ size = 'medium', text }) => {
  const sizeMap = {
    small: 16,
    medium: 20,
    large: 24,
  };

  return (
    <Box display="inline-flex" alignItems="center" gap={1}>
      <CircularProgress size={sizeMap[size]} />
      {text && (
        <Typography variant="caption" color="text.secondary">
          {text}
        </Typography>
      )}
    </Box>
  );
};

// Data refresh indicator
export const RefreshIndicator: React.FC<{
  isRefreshing: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
  // @ts-ignore
}> = ({ isRefreshing, lastUpdated, onRefresh }) => (
  <Box 
    sx={{ 
      position: 'fixed', 
      top: 80, 
      right: 16, 
      zIndex: 1000,
      opacity: isRefreshing ? 1 : 0,
      transition: 'opacity 0.3s',
      pointerEvents: isRefreshing ? 'auto' : 'none',
    }}
  >
    <Paper 
      elevation={4} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <CircularProgress size={16} color="inherit" />
      <Typography variant="body2">
        Refreshing data...
      </Typography>
    </Paper>
  </Box>
);