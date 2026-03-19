// frontend/admin-crm/src/pages/metrics/MetricsDashboard/MetricCard.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

const TrendIndicator: React.FC<{ value: number | null; suffix?: string }> = ({
  value,
  suffix = '%',
}) => {
  if (value === null || value === undefined)
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  const isPositive = value >= 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {isPositive ? (
        <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
      )}
      <Typography variant="body2" color={isPositive ? 'success.main' : 'error.main'}>
        {isPositive ? '+' : ''}
        {value.toFixed(1)}
        {suffix}
      </Typography>
    </Box>
  );
};

export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  trend7d?: number | null;
  trend30d?: number | null;
  icon?: React.ReactNode;
}> = ({ title, value, trend7d, trend30d, icon }) => (
  <Card sx={{ flex: 1, minWidth: 200 }}>
    <CardContent>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
      >
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {icon}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {value}
      </Typography>
      {(trend7d !== undefined || trend30d !== undefined) && (
        <Stack direction="row" spacing={2}>
          {trend7d !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                7d
              </Typography>
              <TrendIndicator value={trend7d ?? null} />
            </Box>
          )}
          {trend30d !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                30d
              </Typography>
              <TrendIndicator value={trend30d ?? null} />
            </Box>
          )}
        </Stack>
      )}
    </CardContent>
  </Card>
);
