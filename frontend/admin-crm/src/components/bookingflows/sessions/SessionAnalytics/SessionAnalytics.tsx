import React from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { BookingFlowDetail } from '@/types/bookingflows';
import type { DateRange } from './useSessionAnalyticsLogic';
import { useSessionAnalyticsLogic } from './useSessionAnalyticsLogic';
import { MetricCards } from './MetricCards';
import { PerformanceCharts } from './PerformanceCharts';
import { StepPerformanceTable } from './StepPerformanceTable';
import { KPIAndSuggestions } from './KPIAndSuggestions';

interface SessionAnalyticsProps {
  flow: BookingFlowDetail;
}

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({ flow }) => {
  const {
    dateRange,
    setDateRange,
    isRefreshing,
    selectedMetric,
    setSelectedMetric,
    isLoadingAnalytics,
    isUpdatingAnalytics,
    handleRefresh,
    metrics,
    stepAnalytics,
    chartData,
    conversionFunnelData,
    sessionStatusData,
    formatAnalyticsCurrency,
  } = useSessionAnalyticsLogic(flow);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <AnalyticsIcon color="primary" />
          <Typography variant="h6">Analytics: {flow.name}</Typography>
        </Box>

        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value as DateRange)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={isRefreshing || isUpdatingAnalytics}
            size="small"
          >
            Refresh
          </Button>

          <Button variant="outlined" startIcon={<DownloadIcon />} size="small">
            Export
          </Button>
        </Box>
      </Box>

      {isLoadingAnalytics ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <MetricCards metrics={metrics} formatAnalyticsCurrency={formatAnalyticsCurrency} />
          <PerformanceCharts
            chartData={chartData}
            sessionStatusData={sessionStatusData}
            conversionFunnelData={conversionFunnelData}
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
          />
          <StepPerformanceTable stepAnalytics={stepAnalytics} />
          <KPIAndSuggestions
            metrics={metrics}
            stepAnalytics={stepAnalytics}
            formatAnalyticsCurrency={formatAnalyticsCurrency}
          />
        </Stack>
      )}
    </Box>
  );
};
