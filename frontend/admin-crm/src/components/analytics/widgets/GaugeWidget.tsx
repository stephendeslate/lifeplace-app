// frontend/admin-crm/src/components/analytics/widgets/GaugeWidget.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Widget } from '../../../types/analytics.types';

interface GaugeWidgetProps {
  widget: Widget;
  data: any;
  compact?: boolean;
}

// @ts-ignore
export const GaugeWidget: React.FC<GaugeWidgetProps> = ({ widget, data, compact }) => {
  const percentage = Math.min(100, Math.max(0, (data.value / 1000) * 100));
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        sx={{
          width: compact ? 120 : 160,
          height: compact ? 60 : 80,
          position: 'relative',
          mb: 2,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 160 80">
          <path
            d="M 20 60 A 60 60 0 0 1 140 60"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="8"
          />
          <path
            d={`M 20 60 A 60 60 0 0 1 ${20 + (120 * percentage / 100)} ${60 - Math.sin((percentage / 100) * Math.PI) * 60}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
      </Box>
      <Typography variant={compact ? "h5" : "h4"} fontWeight="bold">
        {data.value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {percentage.toFixed(1)}%
      </Typography>
    </Box>
  );
};