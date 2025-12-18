// frontend/admin-crm/src/components/analytics/charts/LeadSourceChart.tsx
import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { LeadSource } from '../../../types/analytics.types';

interface LeadSourceChartProps {
  data: LeadSource[];
  isLoading?: boolean;
  title?: string;
  height?: number;
}

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

export const LeadSourceChart: React.FC<LeadSourceChartProps> = ({
  data,
  isLoading = false,
  title = 'Lead Sources',
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

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.lead_count,
    converted: item.converted_count,
    conversionRate: item.conversion_rate,
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props) => {
                if (name === 'value') {
                  return [
                    `${value} leads (${props.payload.conversionRate}% conversion)`,
                    'Leads',
                  ];
                }
                return [value, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default LeadSourceChart;
