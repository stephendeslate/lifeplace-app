// frontend/admin-crm/src/components/settings/SettingsForm.tsx

import React from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import type { SettingsFormProps } from '../../types/settings.types';

export const SettingsForm: React.FC<SettingsFormProps> = ({
  title,
  description,
  children,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save Changes',
}) => {
  return (
    <Box component="form" onSubmit={onSubmit}>
      <Box mb={3}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
        {children}
      </Box>

      <Box display="flex" justifyContent="flex-end">
        <Button
          type="submit"
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
          disabled={isLoading}
          sx={{ minWidth: 140 }}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </Box>
    </Box>
  );
};