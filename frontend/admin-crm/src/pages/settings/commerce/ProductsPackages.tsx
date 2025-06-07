// frontend/admin-crm/src/pages/settings/commerce/ProductsPackages.tsx

import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Inventory } from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';

export const ProductsPackages: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Commerce' },
      { label: 'Products & Packages' },
    ]);
  }, [setBreadcrumbs]);

  return (
    <Box>
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Products & Packages
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage products and service packages available for client booking.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature is coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};