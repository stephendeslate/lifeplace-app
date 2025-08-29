// frontend/admin-crm/src/pages/analytics/AnalyticsOverview.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
  Assessment as ReportIcon,
  Speed as MetricIcon,
  Timeline as FunnelIcon,
  NotificationsActive as AlertIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { 
  useBusinessMetrics, 
  useMetricDefinitions, 
  useDashboards, 
  useAlertRules,
} from '../../hooks/useAnalytics';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  trend, 
  icon, 
  color = 'primary' 
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.direction === 'up') {
      return <TrendingUpIcon color="success" fontSize="small" />;
    } else if (trend.direction === 'down') {
      return <TrendingDownIcon color="error" fontSize="small" />;
    }
    return null;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
              {value}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                {getTrendIcon()}
                <Typography 
                  variant="caption" 
                  color={trend.direction === 'up' ? 'success.main' : trend.direction === 'down' ? 'error.main' : 'text.secondary'}
                >
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </Typography>
              </Box>
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
      </CardContent>
    </Card>
  );
};

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  onClick,
}) => {
  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.2s',
        height: '100%',
        minHeight: 120,
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
          <Box 
            sx={{ 
              p: 1.5, 
              borderRadius: 1.5, 
              bgcolor: 'primary.50',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box flex={1} minWidth={0}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {title}
            </Typography>
          </Box>
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export const AnalyticsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [dateRange, setDateRange] = useState<{
    start_date?: string;
    end_date?: string;
  }>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0], // Today
  });

  const [timeRangePreset, setTimeRangePreset] = useState<string>('30_days');

  // Hooks
  const { 
    businessMetrics, 
    isLoadingBusinessMetrics, 
    refetchBusinessMetrics 
  } = useBusinessMetrics(dateRange);

  const { metrics } = useMetricDefinitions({ is_active: true });
  const { dashboards } = useDashboards({ is_active: true });
  const { rules } = useAlertRules({ is_active: true });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics' },
    ]);
  }, [setBreadcrumbs]);

  const handleTimeRangeChange = (preset: string) => {
    setTimeRangePreset(preset);
    
    const now = new Date();
    let startDate: Date;
    
    switch (preset) {
      case '7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1_year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }
    
    setDateRange({
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue);
  };

  const formatPercentage = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${numValue.toFixed(1)}%`;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Analytics Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor your business performance and key metrics
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRangePreset}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
            >
              <MenuItem value="7_days">Last 7 Days</MenuItem>
              <MenuItem value="30_days">Last 30 Days</MenuItem>
              <MenuItem value="90_days">Last 90 Days</MenuItem>
              <MenuItem value="1_year">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh data">
            <span>
              <IconButton 
                onClick={() => refetchBusinessMetrics()}
                disabled={isLoadingBusinessMetrics}
              >
              {isLoadingBusinessMetrics ? (
                <CircularProgress size={20} />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Date Range Display */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <DateRangeIcon fontSize="small" />
          <Typography variant="body2">
            Showing data from{' '}
            <strong>{new Date(dateRange.start_date || '').toLocaleDateString()}</strong>
            {' '}to{' '}
            <strong>{new Date(dateRange.end_date || '').toLocaleDateString()}</strong>
          </Typography>
        </Box>
      </Alert>

      {/* Key Metrics */}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Key Performance Metrics
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          mb: 4
        }}
      >
        {isLoadingBusinessMetrics ? (
          Array.from({ length: 4 }, (_, i) => (
            <Box key={i} sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))
        ) : businessMetrics ? (
          <>
            <Box sx={{ flex: 1 }}>
              <MetricCard
                title="Total Events"
                value={businessMetrics.total_events}
                icon={<EventIcon />}
                color="primary"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MetricCard
                title="Event Conversion Rate"
                value={formatPercentage(businessMetrics.event_conversion_rate)}
                icon={<TrendingUpIcon />}
                color="success"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(businessMetrics.total_revenue)}
                icon={<PaymentIcon />}
                color="secondary"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MetricCard
                title="New Clients"
                value={businessMetrics.new_clients}
                icon={<PeopleIcon />}
                color="warning"
              />
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1 }}>
            <Alert severity="error">
              Failed to load business metrics. Please try again.
            </Alert>
          </Box>
        )}
      </Box>

      {/* Secondary Metrics */}
      {businessMetrics && (
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 3,
            mb: 4
          }}
        >
          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Booking Conversion Rate"
              value={formatPercentage(businessMetrics.booking_conversion_rate)}
              icon={<AnalyticsIcon />}
              color="primary"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Average Payment Value"
              value={formatCurrency(businessMetrics.average_payment_value)}
              icon={<PaymentIcon />}
              color="success"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Completed Payments"
              value={businessMetrics.completed_payments}
              icon={<PaymentIcon />}
              color="primary"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="New Users"
              value={businessMetrics.new_users}
              icon={<PeopleIcon />}
              color="secondary"
            />
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Quick Actions */}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Analytics Tools
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: { sm: 'wrap' },
          gap: 3,
          mb: 4
        }}
      >
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
          <QuickActionCard
            title="Dashboards"
            description="Interactive visualizations and real-time metrics"
            icon={<DashboardIcon />}
            onClick={() => navigate('/analytics/dashboards')}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
          <QuickActionCard
            title="Reports"
            description="Automated reporting and scheduled analytics"
            icon={<ReportIcon />}
            onClick={() => navigate('/analytics/reports')}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
          <QuickActionCard
            title="Metrics"
            description="Custom business metrics and KPI tracking"
            icon={<MetricIcon />}
            onClick={() => navigate('/analytics/metrics')}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
          <QuickActionCard
            title="Conversion Funnels"
            description="User journey analysis and conversion tracking"
            icon={<FunnelIcon />}
            onClick={() => navigate('/analytics/funnels')}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
          <QuickActionCard
            title="Alert Rules"
            description="Automated monitoring and threshold alerts"
            icon={<AlertIcon />}
            onClick={() => navigate('/analytics/alerts')}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
          <QuickActionCard
            title="Events Explorer"
            description="Real-time event tracking and analysis"
            icon={<AnalyticsIcon />}
            onClick={() => navigate('/analytics/events')}
          />
        </Box>
      </Box>

      {/* System Status */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Analytics System Status
        </Typography>
        
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Last metrics calculation
            </Typography>
            <Chip 
              label={businessMetrics ? new Date(businessMetrics.calculation_time).toLocaleString() : 'Unknown'}
              size="small"
              color="info"
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Active metric definitions
            </Typography>
            <Chip 
              label={metrics.length}
              size="small"
              color="success"
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Active dashboards
            </Typography>
            <Chip 
              label={dashboards.length}
              size="small"
              color="primary"
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Alert rules monitoring
            </Typography>
            <Chip 
              label={rules.filter(rule => rule.is_active).length}
              size="small"
              color="warning"
            />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};