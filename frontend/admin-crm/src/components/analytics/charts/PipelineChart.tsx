// frontend/admin-crm/src/components/analytics/charts/PipelineChart.tsx
import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ReservationPipeline } from '../../../types/analytics.types';

interface PipelineChartProps {
  data: ReservationPipeline[];
  isLoading?: boolean;
  title?: string;
  height?: number;
}

const statusColors: Record<string, string> = {
  LEAD: '#ff9800',
  CONFIRMED: '#2196f3',
  COMPLETED: '#4caf50',
  CANCELLED: '#f44336',
};

export const PipelineChart: React.FC<PipelineChartProps> = ({
  data,
  isLoading = false,
  title = 'Reservation Pipeline',
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
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => [value, name === 'count' ? 'Count' : name]}
            />
            <Bar dataKey="count" name="Bookings" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={statusColors[entry.status] || '#9e9e9e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PipelineChart;
