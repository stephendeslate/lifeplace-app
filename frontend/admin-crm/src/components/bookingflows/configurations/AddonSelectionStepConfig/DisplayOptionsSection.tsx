// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/DisplayOptionsSection.tsx

import React from 'react';
import { Box, FormControlLabel, Switch, Typography, Stack } from '@mui/material';
import type { AddonConfigFormData } from './types';

interface DisplayOptionsSectionProps {
  formData: AddonConfigFormData;
  isDataLoading: boolean;
  onSwitchChange: (
    field: keyof AddonConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DisplayOptionsSection: React.FC<DisplayOptionsSectionProps> = ({
  formData,
  isDataLoading,
  onSwitchChange,
}) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      Display Options
    </Typography>

    <Stack spacing={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.group_by_category}
            onChange={onSwitchChange('group_by_category')}
            disabled={isDataLoading}
          />
        }
        label="Group by Category"
      />
      <Typography variant="caption" color="text.secondary">
        Organize add-ons by their categories for better navigation
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={formData.show_recommendations}
            onChange={onSwitchChange('show_recommendations')}
            disabled={isDataLoading}
          />
        }
        label="Show Recommendations"
      />
      <Typography variant="caption" color="text.secondary">
        Highlight recommended add-ons based on the client's selections
      </Typography>
    </Stack>
  </Box>
);
