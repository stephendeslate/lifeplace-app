// frontend/client-portal/src/pages/Analytics.tsx

import React from 'react';
import { Box } from '@mui/material';
import { AnalyticsDashboard } from '../components/analytics';

export const Analytics: React.FC = () => {
  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
      <AnalyticsDashboard />
    </Box>
  );
};