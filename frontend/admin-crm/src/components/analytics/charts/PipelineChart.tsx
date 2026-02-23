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
import { tokens } from '../../../design-system';

interface PipelineChartProps {
  data: ReservationPipeline[];
  isLoading?: boolean;
  title?: string;
  height?: number;
}

const statusColors: Record<string, string> = {
  LEAD: tokens.color.warning[500],
  CONFIRMED: tokens.color.primary[500],
  COMPLETED: tokens.color.success[500],
  CANCELLED: tokens.color.error[500],
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
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={tokens.color.charts.grid}
              horizontal={false}
            />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Count' : name]} />
            <Bar dataKey="count" name="Bookings" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={statusColors[entry.status] || tokens.color.neutral[400]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PipelineChart;
