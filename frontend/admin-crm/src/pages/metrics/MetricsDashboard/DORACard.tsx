// frontend/admin-crm/src/pages/metrics/MetricsDashboard/DORACard.tsx
import React from 'react';
import { Card, CardContent, Chip, Typography } from '@mui/material';
import { classificationColor } from './utils';

export const DORACard: React.FC<{
  title: string;
  value: string;
  classification: string;
  subtitle?: string;
}> = ({ title, value, classification, subtitle }) => (
  <Card sx={{ flex: 1, minWidth: 200 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {value}
      </Typography>
      <Chip
        label={classification}
        color={classificationColor(classification)}
        size="small"
        sx={{ fontWeight: 600 }}
      />
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);
