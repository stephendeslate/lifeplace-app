// frontend/admin-crm/src/pages/settings/account/AdminUsersSimple.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { AdminPanelSettings } from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';

export const AdminUsersSimple: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Account Management' },
      { label: 'Admin Users' },
    ]);
  }, [setBreadcrumbs]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Users Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This is a simplified version to test if the basic page structure works.
      </Typography>
      
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <AdminPanelSettings sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Admin Users Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            If you can see this, the basic page structure is working.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We can now add back the complex functionality step by step.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};