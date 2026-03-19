// frontend/admin-crm/src/pages/metrics/MetricsDashboard/SystemHealthTab.tsx
import React, { useMemo } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useSystemHealthSnapshots } from '@/hooks/useMetrics';
import { formatPhilippinesTime } from '@/utils/timezone';
import { MetricCard } from './MetricCard';

export const SystemHealthTab: React.FC = () => {
  const { data: healthData, isLoading } = useSystemHealthSnapshots();

  const snapshots = healthData?.snapshots || [];

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: formatPhilippinesTime(s.date, false, 'MMM d'),
        errors: s.error_count,
        success_rate: s.celery_success_rate,
        open_breakers: s.open_circuit_breakers,
        broker_ping: s.broker_ping_ms,
      })),
    [snapshots],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No system health snapshots available yet. Data will appear after the daily health check
          runs.
        </Typography>
      </Box>
    );
  }

  const latest = snapshots[snapshots.length - 1];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Health Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <MetricCard
          title="Celery Success Rate"
          value={`${latest.celery_success_rate}%`}
          icon={
            latest.celery_success_rate >= 99 ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="warning" />
            )
          }
        />
        <MetricCard
          title="DLQ Errors (Latest)"
          value={latest.error_count}
          icon={
            latest.error_count === 0 ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="warning" />
            )
          }
        />
        <MetricCard title="Pending Review" value={latest.pending_review_count} />
        <MetricCard
          title="Open Circuit Breakers"
          value={latest.open_circuit_breakers}
          icon={
            latest.open_circuit_breakers === 0 ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="error" />
            )
          }
        />
      </Box>

      {/* Error Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Error Count Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Bar dataKey="errors" fill="#d32f2f" name="DLQ Errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Success Rate Trend */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Task Success Rate
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[90, 100]} fontSize={12} />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="success_rate"
                  stroke="#2e7d32"
                  name="Success Rate (%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Circuit Breaker States */}
      {latest.circuit_breaker_states && Object.keys(latest.circuit_breaker_states).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Circuit Breaker States
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(latest.circuit_breaker_states).map(([service, state]) => (
                <Chip
                  key={service}
                  label={`${service}: ${state}`}
                  color={state === 'CLOSED' ? 'success' : state === 'OPEN' ? 'error' : 'warning'}
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
