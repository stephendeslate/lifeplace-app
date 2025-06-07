// frontend/admin-crm/src/components/settings/SettingsCard.tsx

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import type { SettingsCardProps } from '../../types/settings.types';

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon: IconComponent,
  children,
  action,
}) => {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            {IconComponent && (
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconComponent />
              </Box>
            )}
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {title}
              </Typography>
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          </Box>
          {action && <Box>{action}</Box>}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
};