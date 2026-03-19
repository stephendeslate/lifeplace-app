import React from 'react';
import { Box, Typography, Button, Alert, Stack } from '@mui/material';
import { Save, RestartAlt, Settings } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { NotificationPreference } from '@/types/notifications.types';
import { useNotificationPreferencesFormLogic } from './useNotificationPreferencesFormLogic';
import { GlobalDeliveryMethodsSection } from './GlobalDeliveryMethodsSection';
import { CategoryPreferencesSection } from './CategoryPreferencesSection';
import { MarketingPreferencesSection } from './MarketingPreferencesSection';
import { AdvancedSettingsSection } from './AdvancedSettingsSection';
import { DisabledTypesSection } from './DisabledTypesSection';

interface NotificationPreferencesFormProps {
  preferences: NotificationPreference;
  isLoading: boolean;
}

export const NotificationPreferencesForm: React.FC<NotificationPreferencesFormProps> = ({
  preferences,
  isLoading,
}) => {
  const {
    formData,
    hasChanges,
    quietHoursStart,
    quietHoursEnd,
    notificationTypes,
    isUpdatingPreferences,
    isResettingPreferences,
    handleFieldChange,
    handleQuietHoursChange,
    handleDisabledTypesChange,
    handleSubmit,
    handleReset,
  } = useNotificationPreferencesFormLogic({ preferences });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <Typography color="text.secondary">Loading preferences...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Settings color="primary" />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure how and when you receive notifications
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={handleReset}
              disabled={isResettingPreferences}
            >
              Reset to Defaults
            </Button>

            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={!hasChanges || isUpdatingPreferences}
            >
              {isUpdatingPreferences ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Box>

        <Stack spacing={3}>
          <GlobalDeliveryMethodsSection formData={formData} onFieldChange={handleFieldChange} />

          <CategoryPreferencesSection formData={formData} onFieldChange={handleFieldChange} />

          <MarketingPreferencesSection formData={formData} onFieldChange={handleFieldChange} />

          <AdvancedSettingsSection
            formData={formData}
            quietHoursStart={quietHoursStart}
            quietHoursEnd={quietHoursEnd}
            onFieldChange={handleFieldChange}
            onQuietHoursChange={handleQuietHoursChange}
          />

          <DisabledTypesSection
            notificationTypes={notificationTypes}
            disabledTypes={formData.disabled_types}
            onDisabledTypesChange={handleDisabledTypesChange}
          />
        </Stack>

        {hasChanges && (
          <Alert severity="info" sx={{ mt: 3 }} icon={<Save />}>
            You have unsaved changes. Click "Save Changes" to apply your preferences.
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};
