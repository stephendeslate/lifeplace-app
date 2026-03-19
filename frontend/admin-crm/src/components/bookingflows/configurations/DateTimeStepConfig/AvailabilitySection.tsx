import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Chip,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  InputLabel,
} from '@mui/material';
import { CheckCircle as AvailabilityIcon, Sync as SyncIcon } from '@mui/icons-material';
import { ConfigSection } from '@/components/common';
import type { DateTimeConfigFormData } from './types';
import { DAYS_OF_WEEK, AVAILABILITY_DISPLAY_MODES, CALENDAR_SOURCES } from './types';

interface AvailabilitySectionProps {
  formData: DateTimeConfigFormData;
  errors: Record<string, string>;
  handleSwitchChange: (
    field: keyof DateTimeConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputChange: (
    field: keyof DateTimeConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => void;
  handleDaysOfWeekChange: (value: number[]) => void;
  handleSelectChange: (field: keyof DateTimeConfigFormData, value: string) => void;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  formData,
  errors,
  handleSwitchChange,
  handleInputChange,
  handleDaysOfWeekChange,
  handleSelectChange,
}) => (
  <>
    <ConfigSection title="Real-Time Availability">
      <Stack spacing={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <AvailabilityIcon color="primary" />
          <FormControlLabel
            control={
              <Switch
                checked={formData.enable_real_time_availability}
                onChange={handleSwitchChange('enable_real_time_availability')}
              />
            }
            label="Enable Real-Time Availability Check"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Check against existing bookings and block unavailable slots
        </Typography>

        {formData.enable_real_time_availability && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_availability_status}
                  onChange={handleSwitchChange('show_availability_status')}
                />
              }
              label="Show Availability Status"
            />
            <Typography variant="caption" color="text.secondary">
              Display availability indicators to clients
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.auto_check_conflicts}
                  onChange={handleSwitchChange('auto_check_conflicts')}
                />
              }
              label="Auto-Check Conflicts"
            />
            <Typography variant="caption" color="text.secondary">
              Automatically prevent conflicting bookings
            </Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Availability Display Mode</InputLabel>
              <Select
                value={formData.availability_display_mode}
                label="Availability Display Mode"
                onChange={(event) => {
                  handleSelectChange('availability_display_mode', event.target.value as string);
                }}
              >
                {AVAILABILITY_DISPLAY_MODES.map((mode) => (
                  <MenuItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        <Box>
          <Typography variant="body2" gutterBottom>
            Available Days of Week
          </Typography>
          <FormControl fullWidth error={!!errors.available_days_of_week}>
            <Select
              multiple
              value={formData.available_days_of_week}
              onChange={(e) => handleDaysOfWeekChange(e.target.value as number[])}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((dayValue) => {
                    const day = DAYS_OF_WEEK.find((d) => d.value === dayValue);
                    return <Chip key={dayValue} label={day?.label} size="small" />;
                  })}
                </Box>
              )}
            >
              {DAYS_OF_WEEK.map((day) => (
                <MenuItem key={day.value} value={day.value}>
                  <Checkbox checked={formData.available_days_of_week.includes(day.value)} />
                  <ListItemText primary={day.label} />
                </MenuItem>
              ))}
            </Select>
            {errors.available_days_of_week && (
              <Typography variant="caption" color="error">
                {errors.available_days_of_week}
              </Typography>
            )}
          </FormControl>
        </Box>
      </Stack>
    </ConfigSection>

    <ConfigSection title="Availability Checking">
      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.check_venue_availability}
              onChange={handleSwitchChange('check_venue_availability')}
              disabled={!formData.enable_real_time_availability}
            />
          }
          label="Check Venue Availability"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.check_resource_availability}
              onChange={handleSwitchChange('check_resource_availability')}
              disabled={!formData.enable_real_time_availability}
            />
          }
          label="Check Resource Availability"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.check_staff_availability}
              onChange={handleSwitchChange('check_staff_availability')}
              disabled={!formData.enable_real_time_availability}
            />
          }
          label="Check Staff Availability"
        />
      </Stack>
    </ConfigSection>

    <ConfigSection title="Conflict Resolution">
      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.allow_overbooking}
              onChange={handleSwitchChange('allow_overbooking')}
            />
          }
          label="Allow Overbooking"
        />
        <Typography variant="caption" color="text.secondary">
          Allow bookings even when conflicts are detected
        </Typography>

        {formData.allow_overbooking && (
          <TextField
            label="Overbooking Threshold"
            type="number"
            value={formData.overbooking_threshold}
            onChange={handleInputChange('overbooking_threshold')}
            error={!!errors.overbooking_threshold}
            helperText={errors.overbooking_threshold || 'Maximum allowed conflicts before blocking'}
            inputProps={{ min: 0 }}
            sx={{ maxWidth: 300 }}
          />
        )}
      </Stack>
    </ConfigSection>

    <ConfigSection title="Calendar Integration" icon={<SyncIcon />}>
      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.sync_with_calendar}
              onChange={handleSwitchChange('sync_with_calendar')}
            />
          }
          label="Sync with External Calendar"
        />
        <Typography variant="caption" color="text.secondary">
          Sync availability with external calendar systems
        </Typography>

        {formData.sync_with_calendar && (
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>Calendar Source</InputLabel>
            <Select
              value={formData.calendar_source}
              label="Calendar Source"
              onChange={(event) => {
                handleSelectChange('calendar_source', event.target.value as string);
              }}
            >
              {CALENDAR_SOURCES.map((source) => (
                <MenuItem key={source.value} value={source.value}>
                  {source.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    </ConfigSection>
  </>
);
