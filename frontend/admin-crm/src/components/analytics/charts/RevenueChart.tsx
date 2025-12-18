// frontend/admin-crm/src/components/analytics/charts/RevenueChart.tsx
import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BookingSummary } from '../../../types/analytics.types';

interface RevenueChartProps {
  data: BookingSummary[];
  isLoading?: boolean;
  title?: string;
  height?: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  isLoading = false,
  title = 'Revenue Over Time',
  height = 300,
}) => {
  // Format data for chart
  const chartData = data.map((item) => ({
    ...item,
    period: new Date(item.period).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  if (isLoading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="rectangular" height={height} sx={{ mt: 2 }} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('en-PH', {
                  style: 'currency',
                  currency: 'PHP',
                }).format(value)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_revenue"
              name="Revenue"
              stroke="#2196f3"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default RevenueChart;
