// frontend/admin-crm/src/pages/analytics/funnels/FunnelAnalytics.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  Timeline as FunnelIcon,
  TrendingUp as ConversionIcon,
  Analytics as AnalyticsIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useConversionFunnels } from '../../../hooks/useAnalytics';
import { FunnelVisualization } from '../../../components/analytics/funnels/FunnelVisualization';
import { LoadingTable } from '../../../components/common/LoadingTable';
import { EmptyState } from '../../../components/common/EmptyState';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  trend 
}) => {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
            {value}
          </Typography>
          {trend && (
            <Typography 
              variant="caption" 
              color={trend.direction === 'up' ? 'success.main' : trend.direction === 'down' ? 'error.main' : 'text.secondary'}
              sx={{ mt: 0.5 }}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}% from last period
            </Typography>
          )}
        </Box>
        <Box 
          sx={{ 
            p: 1.5, 
            borderRadius: 1, 
            bgcolor: `${color}.50`,
            color: `${color}.main` 
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
};

export const FunnelAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [timeRange, setTimeRange] = useState<string>('last_30_days');

  const { useConversionFunnel, useFunnelAnalytics } = useConversionFunnels();
  
  const funnelId = parseInt(id || '0', 10);
  
  const {
    data: funnel,
    isLoading: isLoadingFunnel,
    error: funnelError
  } = useConversionFunnel(funnelId);

  // Convert time range to date filters
  const getDateFilters = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    };
  };

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useFunnelAnalytics(funnelId, getDateFilters());

  useEffect(() => {
    if (funnel) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Conversion Funnels', path: '/analytics/funnels' },
        { label: funnel.name },
        { label: 'Analytics' },
      ]);
    }
  }, [setBreadcrumbs, funnel]);

  const handleBack = () => {
    navigate('/analytics/funnels');
  };

  const handleEdit = () => {
    navigate(`/analytics/funnels/${funnelId}/edit`);
  };

  const handleRefresh = () => {
    refetchAnalytics();
  };

  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
  };

  if (isLoadingFunnel) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
        <LoadingTable />
      </Box>
    );
  }

  if (funnelError || !funnel) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          {funnelError ? 'Failed to load funnel' : 'Funnel not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Funnels
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleBack} size="small">
            <BackIcon />
          </IconButton>
          
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {funnel.name} Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {funnel.description || 'Conversion funnel performance analysis'}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              startAdornment={<DateRangeIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="last_7_days">Last 7 Days</MenuItem>
              <MenuItem value="last_30_days">Last 30 Days</MenuItem>
              <MenuItem value="last_90_days">Last 90 Days</MenuItem>
              <MenuItem value="this_month">This Month</MenuItem>
              <MenuItem value="this_year">This Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={isLoadingAnalytics}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit Funnel
          </Button>
        </Box>
      </Box>

      {/* Funnel Info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" gutterBottom>
            Funnel Configuration
          </Typography>
          <Chip
            label={funnel.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={funnel.is_active ? 'success' : 'default'}
            variant={funnel.is_active ? 'filled' : 'outlined'}
          />
        </Box>
        
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Time Window: {funnel.time_window_hours} hours
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Steps: {funnel.steps.length} steps
          </Typography>
          
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Funnel Steps
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {funnel.steps.map((step, index) => (
                <React.Fragment key={step.order}>
                  <Chip
                    icon={index === 0 ? <StartIcon /> : index === funnel.steps.length - 1 ? <CompleteIcon /> : undefined}
                    label={step.name}
                    size="small"
                    variant="outlined"
                    color={index === 0 ? 'success' : index === funnel.steps.length - 1 ? 'primary' : 'default'}
                  />
                  {index < funnel.steps.length - 1 && (
                    <Typography variant="body2" color="text.secondary">
                      →
                    </Typography>
                  )}
                </React.Fragment>
              ))}
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* Analytics Content */}
      {analyticsError ? (
        <Alert severity="error">
          Failed to load analytics data. Please try refreshing.
        </Alert>
      ) : isLoadingAnalytics ? (
        <LoadingTable />
      ) : !analytics ? (
        <EmptyState
          icon={AnalyticsIcon}
          title="No analytics data available"
          description="Analytics data will appear here once users start interacting with your funnel."
        />
      ) : (
        <Stack spacing={3}>
          {/* Key Metrics */}
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Key Performance Metrics
            </Typography>
            
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3,
                mb: 3
              }}
            >
              <Box sx={{ flex: 1 }}>
                <MetricCard
                  title="Total Started"
                  value={analytics.total_started.toLocaleString()}
                  icon={<StartIcon />}
                  color="primary"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <MetricCard
                  title="Total Completed"
                  value={analytics.total_completed.toLocaleString()}
                  icon={<CompleteIcon />}
                  color="success"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <MetricCard
                  title="Overall Conversion Rate"
                  value={`${parseFloat(analytics.overall_conversion_rate).toFixed(1)}%`}
                  icon={<ConversionIcon />}
                  color="warning"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <MetricCard
                  title="Drop-off Rate"
                  value={`${(100 - parseFloat(analytics.overall_conversion_rate)).toFixed(1)}%`}
                  icon={<FunnelIcon />}
                  color="error"
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Funnel Visualization */}
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Conversion Funnel
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 3 }}>
              <FunnelVisualization
                funnel={funnel}
                analytics={analytics}
              />
            </Paper>
          </Box>

          <Divider />

          {/* Step-by-Step Analysis */}
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Step-by-Step Analysis
            </Typography>
            
            <Paper variant="outlined">
              <Box sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Performance breakdown for each step in the funnel
                </Typography>
              </Box>
              
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 600, p: 3, pt: 0 }}>
                  {analytics.step_analytics.map((stepData, index) => (
                    <Box 
                      key={stepData.step_index}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        borderBottom: index < analytics.step_analytics.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Box sx={{ minWidth: 40, textAlign: 'center', mr: 3 }}>
                        <Typography variant="h6" color="primary">
                          {stepData.step_index + 1}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ flex: 1, mr: 3 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {stepData.step_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stepData.completed_count.toLocaleString()} completions
                        </Typography>
                      </Box>
                      
                      <Box sx={{ minWidth: 120, textAlign: 'right' }}>
                        <Typography variant="h6" color="success.main">
                          {stepData.conversion_rate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          conversion rate
                        </Typography>
                      </Box>
                      
                      {index < analytics.step_analytics.length - 1 && (
                        <Box sx={{ ml: 2, color: 'text.secondary' }}>
                          →
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Time Range Display */}
          <Alert severity="info">
            <Box display="flex" alignItems="center" gap={1}>
              <DateRangeIcon fontSize="small" />
              <Typography variant="body2">
                Showing data from{' '}
                <strong>{new Date(analytics.time_range.start_date).toLocaleDateString()}</strong>
                {' '}to{' '}
                <strong>{new Date(analytics.time_range.end_date).toLocaleDateString()}</strong>
              </Typography>
            </Box>
          </Alert>
        </Stack>
      )}
    </Box>
  );
};