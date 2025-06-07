// frontend/admin-crm/src/pages/settings/communication/SMSTemplates.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Sms } from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';

export const SMSTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Communication' },
      { label: 'SMS Templates' },
    ]);
  }, [setBreadcrumbs]);

  return (
    <Box>
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Sms sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            SMS Templates
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create and manage SMS templates for text message communications.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature is coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};