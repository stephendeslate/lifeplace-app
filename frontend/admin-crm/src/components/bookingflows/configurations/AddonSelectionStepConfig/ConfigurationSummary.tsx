// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/ConfigurationSummary.tsx

import React from 'react';
import { Box, Typography, Stack, Skeleton } from '@mui/material';
import type { AddonConfigFormData, AvailableCategory } from './types';

interface ConfigurationSummaryProps {
  formData: AddonConfigFormData;
  isDataLoading: boolean;
  availableCategories: AvailableCategory[];
}

export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  formData,
  isDataLoading,
  availableCategories,
}) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      Configuration Summary
    </Typography>

    {isDataLoading ? (
      <Stack spacing={1}>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="50%" />
      </Stack>
    ) : (
      <Stack spacing={1}>
        <Typography variant="body2">
          <strong>Add-on Source:</strong>{' '}
          {formData.filter_by_event_type
            ? 'Filtered by event type (automatic)'
            : formData.available_addons.length > 0
              ? `${formData.available_addons.length} specific add-ons`
              : formData.available_categories.length > 0
                ? `${formData.available_categories.length} categories (${availableCategories
                    .filter((c) => formData.available_categories.includes(c.id))
                    .map((c) => c.name)
                    .join(', ')})`
                : 'All add-ons'}
        </Typography>

        <Typography variant="body2">
          <strong>Selection:</strong> {formData.min_selection}-{formData.max_selection || '\u221E'}{' '}
          add-ons
          {formData.min_selection === 0 && formData.max_selection === 0 && ' (optional)'}
        </Typography>

        <Typography variant="body2">
          <strong>Display:</strong>{' '}
          {[
            formData.group_by_category && 'Grouped by Category',
            formData.show_recommendations && 'Recommendations Enabled',
          ]
            .filter(Boolean)
            .join(', ') || 'Basic display'}
        </Typography>

        {formData.show_recommendations && Object.keys(formData.recommendation_logic).length > 0 && (
          <Typography variant="body2">
            <strong>Recommendation Logic:</strong> Custom rules configured
          </Typography>
        )}
      </Stack>
    )}
  </Box>
);
