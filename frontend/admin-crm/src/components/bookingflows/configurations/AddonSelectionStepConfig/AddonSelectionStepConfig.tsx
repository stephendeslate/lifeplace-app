// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/AddonSelectionStepConfig.tsx

import React from 'react';
import { Box, Typography, Stack, Alert, Button } from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import type { AddonSelectionStepConfigProps } from './types';
import { useAddonSelectionStepConfigLogic } from './useAddonSelectionStepConfigLogic';
import { AddonAvailabilitySection } from './AddonAvailabilitySection';
import { SelectionBehaviorSection } from './SelectionBehaviorSection';
import { DisplayOptionsSection } from './DisplayOptionsSection';
import { RecommendationLogicSection } from './RecommendationLogicSection';
import { ConfigurationSummary } from './ConfigurationSummary';

export const AddonSelectionStepConfig: React.FC<AddonSelectionStepConfigProps> = (props) => {
  const { isLoading = false } = props;

  const logic = useAddonSelectionStepConfigLogic(props);

  // Error display
  if (logic.hasErrors) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load configuration data. Please try refreshing the page.
          {logic.updateConfigurationError ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Update Error:{' '}
              {(logic.updateConfigurationError as { message?: string }).message || 'Unknown error'}
            </Typography>
          ) : null}
        </Alert>
        <Button startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add-on Selection Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure which add-on services are available for selection and how they are presented to
        clients.
      </Alert>

      <Stack spacing={3}>
        <AddonAvailabilitySection
          formData={logic.formData}
          errors={logic.errors}
          isDataLoading={logic.isDataLoading}
          isLoadingCategories={logic.isLoadingCategories}
          isLoadingAddons={logic.isLoadingAddons}
          availableCategories={logic.availableCategories}
          availableAddons={logic.availableAddons}
          onSwitchChange={logic.handleSwitchChange}
          onCategoriesChange={logic.handleCategoriesChange}
          onAddonsChange={logic.handleAddonsChange}
        />

        <SelectionBehaviorSection
          formData={logic.formData}
          errors={logic.errors}
          isDataLoading={logic.isDataLoading}
          onInputChange={logic.handleInputChange}
        />

        <DisplayOptionsSection
          formData={logic.formData}
          isDataLoading={logic.isDataLoading}
          onSwitchChange={logic.handleSwitchChange}
        />

        <RecommendationLogicSection
          formData={logic.formData}
          errors={logic.errors}
          isDataLoading={logic.isDataLoading}
          onRecommendationLogicChange={logic.handleRecommendationLogicChange}
        />

        <ConfigurationSummary
          formData={logic.formData}
          isDataLoading={logic.isDataLoading}
          availableCategories={logic.availableCategories}
        />

        {/* Actions */}
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={logic.handleSave}
            disabled={
              isLoading || logic.isUpdatingConfiguration || logic.isDataLoading || !logic.hasChanges
            }
          >
            {isLoading || logic.isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={logic.handleReset}
            disabled={isLoading || logic.isUpdatingConfiguration || logic.isDataLoading}
          >
            Reset Changes
          </Button>

          {logic.hasChanges && (
            <Typography variant="caption" color="primary">
              Unsaved changes
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};
