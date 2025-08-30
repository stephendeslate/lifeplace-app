// frontend/admin-crm/src/components/analytics/widgets/FunnelWidget.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Widget } from '../../../types/analytics.types';

interface FunnelWidgetProps {
  widget: Widget;
  data: { categories?: Array<{ value: number; label: string; }> };
  compact?: boolean;
}

export const FunnelWidget: React.FC<FunnelWidgetProps> = ({ data, compact }) => {
  const funnelData = data.categories || [];
  const maxValue = Math.max(...funnelData.map((d) => d.value));
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {funnelData.map((step, index: number) => {
        const width = (step.value / maxValue) * 100;
        return (
          <Box key={index} sx={{ mb: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant={compact ? "caption" : "body2"}>{step.name}</Typography>
              <Typography variant={compact ? "caption" : "body2"} fontWeight="medium">
                {step.value.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                height: compact ? 16 : 24,
                bgcolor: '#e0e0e0',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${width}%`,
                  bgcolor: `hsl(${210 + index * 30}, 70%, 50%)`,
                  transition: 'width 0.5s ease',
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};