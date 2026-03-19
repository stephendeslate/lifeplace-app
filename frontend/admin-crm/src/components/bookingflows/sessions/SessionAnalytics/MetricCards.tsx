import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  People as PeopleIcon,
  CheckCircle as CompleteIcon,
  AttachMoney as RevenueIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import type { AnalyticsMetrics } from './useSessionAnalyticsLogic';
import { formatDuration, parseDurationToSeconds } from './useSessionAnalyticsLogic';

interface MetricCardsProps {
  metrics: AnalyticsMetrics;
  formatAnalyticsCurrency: (amount: number) => string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, formatAnalyticsCurrency }) => (
  <Box display="flex" flexWrap="wrap" gap={3}>
    <Box flex="1 1 200px" minWidth={200}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <PeopleIcon color="primary" />
            <Typography variant="subtitle2" color="text.secondary">
              Total Sessions
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold">
            {metrics.totalSessions.toLocaleString()}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <TrendingUpIcon fontSize="small" color="success" />
            <Typography variant="caption" color="success.main">
              +12% vs previous period
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>

    <Box flex="1 1 200px" minWidth={200}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <CompleteIcon color="success" />
            <Typography variant="subtitle2" color="text.secondary">
              Conversion Rate
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold">
            {metrics.conversionRate.toFixed(1)}%
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <TrendingDownIcon fontSize="small" color="error" />
            <Typography variant="caption" color="error.main">
              -2.3% vs previous period
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>

    <Box flex="1 1 200px" minWidth={200}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <RevenueIcon color="success" />
            <Typography variant="subtitle2" color="text.secondary">
              Total Revenue
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold">
            {formatAnalyticsCurrency(metrics.totalRevenue)}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <TrendingUpIcon fontSize="small" color="success" />
            <Typography variant="caption" color="success.main">
              +8.7% vs previous period
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>

    <Box flex="1 1 200px" minWidth={200}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <TimeIcon color="info" />
            <Typography variant="subtitle2" color="text.secondary">
              Avg. Completion Time
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold">
            {formatDuration(parseDurationToSeconds(metrics.averageCompletionTime))}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <TrendingDownIcon fontSize="small" color="success" />
            <Typography variant="caption" color="success.main">
              -15s vs previous period
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);
