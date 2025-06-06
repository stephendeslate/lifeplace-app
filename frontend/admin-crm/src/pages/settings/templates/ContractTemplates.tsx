// frontend/admin-crm/src/pages/settings/templates/ContractTemplates.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Description } from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';

export const ContractTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Template Management' },
      { label: 'Contract Templates' },
    ]);
  }, [setBreadcrumbs]);

  return (
    <Box>
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Contract Templates
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage contract templates for different event types and services.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature is coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};