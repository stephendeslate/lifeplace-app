// frontend/admin-crm/src/components/analytics/widgets/PieChartWidget.tsx
import React from 'react';
import { Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Widget } from '../../../types/analytics.types';

interface PieChartWidgetProps {
  widget: Widget;
  data: any;
  compact?: boolean;
}

// @ts-ignore
export const PieChartWidget: React.FC<PieChartWidgetProps> = ({ widget, data, compact }) => {
  const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#dc2626'];
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.categories}
              cx="50%"
              cy="50%"
              innerRadius={compact ? 30 : 40}
              outerRadius={compact ? 60 : 80}
              dataKey="value"
            >
              {data.categories.map((_: any, index: number) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};