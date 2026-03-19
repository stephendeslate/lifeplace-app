// frontend/admin-crm/src/pages/metrics/MetricsDashboard/MetricsDashboard.tsx
import React from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useMetricsDashboardLogic } from './useMetricsDashboardLogic';
import { PlatformImpactTab } from './PlatformImpactTab';
import { SystemHealthTab } from './SystemHealthTab';
import { DeploymentsTab } from './DeploymentsTab';

export const MetricsDashboard: React.FC = () => {
  const { tabIndex, setTabIndex } = useMetricsDashboardLogic();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Platform Metrics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track platform impact, system health, and deployment performance.
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Platform Impact" />
        <Tab label="System Health" />
        <Tab label="Deployments & DORA" />
      </Tabs>

      {tabIndex === 0 && <PlatformImpactTab />}
      {tabIndex === 1 && <SystemHealthTab />}
      {tabIndex === 2 && <DeploymentsTab />}
    </Box>
  );
};
