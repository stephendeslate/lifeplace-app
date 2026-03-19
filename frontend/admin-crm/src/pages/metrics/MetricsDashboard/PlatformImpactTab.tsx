// frontend/admin-crm/src/pages/metrics/MetricsDashboard/PlatformImpactTab.tsx
import React, { useMemo } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
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
  Legend,
} from 'recharts';
import { useKPISnapshots, useKPISnapshotSummary } from '@/hooks/useMetrics';
import { formatPhilippinesTime } from '@/utils/timezone';
import { MetricCard } from './MetricCard';
import { formatCurrency } from './utils';

export const PlatformImpactTab: React.FC = () => {
  const { data: summary, isLoading: summaryLoading } = useKPISnapshotSummary();
  const { data: snapshotsData, isLoading: snapshotsLoading } = useKPISnapshots();

  const snapshots = snapshotsData?.snapshots || [];

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: formatPhilippinesTime(s.date, false, 'MMM d'),
        revenue: s.total_revenue,
        bookings: s.total_bookings,
        clients: s.new_clients,
        conversion: s.conversion_rate,
      })),
    [snapshots],
  );

  if (summaryLoading || snapshotsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No KPI snapshots available yet. Data will appear after the daily snapshot task runs.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <MetricCard
          title="Lifetime Revenue"
          value={formatCurrency(summary.cumulative_revenue)}
          trend7d={summary.trends_7d.revenue_pct}
          trend30d={summary.trends_30d.revenue_pct}
        />
        <MetricCard
          title="Total Bookings"
          value={summary.cumulative_bookings.toLocaleString()}
          trend7d={summary.trends_7d.bookings_pct}
          trend30d={summary.trends_30d.bookings_pct}
        />
        <MetricCard
          title="Total Clients"
          value={summary.cumulative_clients.toLocaleString()}
          trend7d={summary.trends_7d.clients_pct}
          trend30d={summary.trends_30d.clients_pct}
        />
        <MetricCard title="Conversion Rate" value={`${summary.latest_conversion_rate}%`} />
      </Box>

      {/* Revenue Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1976d2"
                  name="Revenue (\u20B1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bookings + Clients Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Bookings & New Clients
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="bookings" fill="#1976d2" name="Bookings" />
                <Bar dataKey="clients" fill="#2e7d32" name="New Clients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
