import React from 'react';
import { Box, TextField, FormControlLabel, Switch, Typography, Stack } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { ConfigSection } from '@/components/common';
import type { DateTimeConfigFormData } from './types';

interface CalendarSettingsSectionProps {
  formData: DateTimeConfigFormData;
  handleSwitchChange: (
    field: keyof DateTimeConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputChange: (
    field: keyof DateTimeConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => void;
}

export const CalendarSettingsSection: React.FC<CalendarSettingsSectionProps> = ({
  formData,
  handleSwitchChange,
  handleInputChange,
}) => (
  <ConfigSection title="Calendar Settings">
    <Stack spacing={2}>
      <Box display="flex" alignItems="center" gap={1}>
        <CalendarIcon color="primary" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.show_calendar_view}
              onChange={handleSwitchChange('show_calendar_view')}
            />
          }
          label="Show Calendar View"
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Display a visual calendar for date selection
      </Typography>

      <Box display="flex" alignItems="center" gap={1}>
        <CalendarIcon color="action" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.allow_multi_day}
              onChange={handleSwitchChange('allow_multi_day')}
            />
          }
          label="Allow Multi-Day Events"
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Allow events that span multiple days
      </Typography>

      {formData.allow_multi_day && (
        <Box display="flex" gap={2} flexWrap="wrap" mt={1}>
          <TextField
            label="Minimum Days"
            type="number"
            value={formData.min_event_days}
            onChange={(e) => {
              const days = parseInt(e.target.value) || 1;
              handleInputChange('min_event_days')({
                target: { value: String(days) },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
            helperText="Minimum days (1 = allow single-day)"
            inputProps={{ min: 1 }}
            sx={{ maxWidth: 200 }}
          />
          <TextField
            label="Maximum Days"
            type="number"
            value={formData.max_event_days}
            onChange={(e) => {
              const days = parseInt(e.target.value) || 1;
              handleInputChange('max_event_days')({
                target: { value: String(days) },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
            helperText="Maximum days allowed"
            inputProps={{ min: 1 }}
            sx={{ maxWidth: 200 }}
          />
        </Box>
      )}
    </Stack>
  </ConfigSection>
);
