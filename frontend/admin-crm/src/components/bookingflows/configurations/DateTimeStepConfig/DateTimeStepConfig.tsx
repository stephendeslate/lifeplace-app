import React from 'react';
import { Box, Typography, Stack, Alert, Button } from '@mui/material';
import type { DateTimeStepConfigProps } from './types';
import { useDateTimeStepConfigLogic } from './useDateTimeStepConfigLogic';
import { CalendarSettingsSection } from './CalendarSettingsSection';
import { AvailabilitySection } from './AvailabilitySection';
import { AdvancedSettingsSection } from './AdvancedSettingsSection';
import { ConfigurationSummarySection } from './ConfigurationSummarySection';

export const DateTimeStepConfig: React.FC<DateTimeStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const {
    formData,
    errors,
    newBlockedDate,
    setNewBlockedDate,
    isUpdatingConfiguration,
    handleInputChange,
    handleSwitchChange,
    handleDaysOfWeekChange,
    handleAddBlockedDate,
    handleRemoveBlockedDate,
    handleSelectChange,
    handleSave,
    handleReset,
  } = useDateTimeStepConfigLogic(step, config, onUpdate);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Date & Time Step Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This step now only handles date selection. Time and duration settings have been moved to the
        Package Selection step where clients can customize their hours per venue.
      </Alert>

      <Stack spacing={3}>
        <CalendarSettingsSection
          formData={formData}
          handleSwitchChange={handleSwitchChange}
          handleInputChange={handleInputChange}
        />

        <AvailabilitySection
          formData={formData}
          errors={errors}
          handleSwitchChange={handleSwitchChange}
          handleInputChange={handleInputChange}
          handleDaysOfWeekChange={handleDaysOfWeekChange}
          handleSelectChange={handleSelectChange}
        />

        <AdvancedSettingsSection
          formData={formData}
          errors={errors}
          newBlockedDate={newBlockedDate}
          setNewBlockedDate={setNewBlockedDate}
          handleInputChange={handleInputChange}
          handleAddBlockedDate={handleAddBlockedDate}
          handleRemoveBlockedDate={handleRemoveBlockedDate}
        />

        <ConfigurationSummarySection formData={formData} />

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || isUpdatingConfiguration}
          >
            {isLoading || isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button variant="outlined" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
