// frontend/admin-crm/src/pages/settings/communication/Notifications.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Notifications } from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';

export const CommunicationNotifications: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Communication' },
      { label: 'Notifications' },
    ]);
  }, [setBreadcrumbs]);

  return (
    <Box>
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Notification Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Configure notification preferences for email, SMS, and in-app notifications.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature is coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};