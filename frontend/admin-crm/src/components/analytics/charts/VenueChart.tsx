// frontend/admin-crm/src/components/analytics/charts/VenueChart.tsx
import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { VenueUsage } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';

interface VenueChartProps {
  data: VenueUsage[];
  isLoading?: boolean;
  title?: string;
  height?: number;
}

export const VenueChart: React.FC<VenueChartProps> = ({
  data,
  isLoading = false,
  title = 'Venue Usage',
  height = 300,
}) => {
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
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.color.charts.grid} />
            <XAxis dataKey="venue_name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'booking_count') return [value, 'Bookings'];
                if (name === 'total_revenue')
                  return [
                    new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(value as number),
                    'Revenue',
                  ];
                return [value, name];
              }}
            />
            <Bar
              dataKey="booking_count"
              name="Bookings"
              fill={tokens.color.charts.series[1]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default VenueChart;
