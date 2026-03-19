import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  Alert,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { useAnalyticsDashboardLogic } from './useAnalyticsDashboardLogic';
import { MetricsCards } from './MetricsCards';
import { SpendingTrendChart } from './SpendingTrendChart';
import { UpcomingDeadlines } from './UpcomingDeadlines';
import { RecentEventsTable } from './RecentEventsTable';

export const AnalyticsDashboard: React.FC = () => {
  const {
    timeRange,
    setTimeRange,
    isRefreshing,
    dashboard,
    dashboardLoading,
    dashboardError,
    trendsLoading,
    deadlines,
    deadlinesLoading,
    eventHistory,
    historyLoading,
    chartData,
    handleRefresh,
  } = useAnalyticsDashboardLogic();

  if (dashboardError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Unable to load analytics data. Please try again later.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <AnimatedElement animation="slideDown" delay={100}>
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              My Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track your events, payments, and upcoming deadlines
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha('#fff', 0.2),
                  },
                }}
              >
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="12m">Last 12 months</MenuItem>
              </Select>
            </FormControl>

            <IconButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.2),
                },
              }}
            >
              <RefreshIcon sx={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Box>
        </Box>
      </AnimatedElement>

      <MetricsCards dashboard={dashboard} isLoading={dashboardLoading} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          <SpendingTrendChart
            chartData={chartData}
            isLoading={trendsLoading}
            isRefreshing={isRefreshing}
          />
          <UpcomingDeadlines deadlines={deadlines} isLoading={deadlinesLoading} />
        </Box>

        <RecentEventsTable eventHistory={eventHistory} isLoading={historyLoading} />
      </Box>

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </Box>
  );
};
