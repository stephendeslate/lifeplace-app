// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/SelectionBehaviorSection.tsx

import React from 'react';
import { Box, TextField, Typography, Stack } from '@mui/material';
import type { AddonConfigFormData } from './types';

interface SelectionBehaviorSectionProps {
  formData: AddonConfigFormData;
  errors: Record<string, string>;
  isDataLoading: boolean;
  onInputChange: (
    field: keyof AddonConfigFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } },
  ) => void;
}

export const SelectionBehaviorSection: React.FC<SelectionBehaviorSectionProps> = ({
  formData,
  errors,
  isDataLoading,
  onInputChange,
}) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      Selection Behavior
    </Typography>

    <Stack spacing={2}>
      <Box display="flex" gap={2}>
        <TextField
          label="Minimum Selection"
          type="number"
          value={formData.min_selection}
          onChange={onInputChange('min_selection')}
          error={!!errors.min_selection}
          helperText={
            errors.min_selection || 'Minimum add-ons clients must select (0 = none required)'
          }
          inputProps={{ min: 0 }}
          disabled={isDataLoading}
          sx={{ flex: 1 }}
        />

        <TextField
          label="Maximum Selection"
          type="number"
          value={formData.max_selection}
          onChange={onInputChange('max_selection')}
          error={!!errors.max_selection}
          helperText={errors.max_selection || 'Maximum add-ons allowed (0 = unlimited)'}
          inputProps={{ min: 0 }}
          disabled={isDataLoading}
          sx={{ flex: 1 }}
        />
      </Box>
    </Stack>
  </Box>
);
