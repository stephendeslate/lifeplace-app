// frontend/admin-crm/src/components/analytics/charts/PackageChart.tsx
import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PackagePerformance } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';

interface PackageChartProps {
  data: PackagePerformance[];
  isLoading?: boolean;
  title?: string;
  height?: number;
}

export const PackageChart: React.FC<PackageChartProps> = ({
  data,
  isLoading = false,
  title = 'Top Packages',
  height = 300,
}) => {
  // Truncate long names for display
  const chartData = data.map((item) => ({
    ...item,
    shortName: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
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
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.color.charts.grid} />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'booking_count') return [value, 'Bookings'];
                if (name === 'total_revenue')
                  return [
                    new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(value),
                    'Revenue',
                  ];
                return [value, name];
              }}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.shortName === label);
                return item?.name || label;
              }}
            />
            <Bar
              dataKey="booking_count"
              name="Bookings"
              fill={tokens.color.charts.series[0]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PackageChart;
