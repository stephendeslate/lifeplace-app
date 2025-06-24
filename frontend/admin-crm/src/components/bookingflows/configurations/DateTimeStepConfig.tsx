// frontend/admin-crm/src/components/bookingflows/configurations/DateTimeStepConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as TimeIcon,
  CalendarMonth as CalendarIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  DateTimeStepConfiguration 
} from '../../../types/bookingflows.types';

interface DateTimeStepConfigProps {
  step: BookingFlowStep;
  config?: DateTimeStepConfiguration | null;
  onUpdate: (data: Partial<DateTimeStepConfiguration>) => void;
  isLoading?: boolean;
}

interface DateTimeConfigFormData {
  allow_time_selection: boolean;
  allow_multi_day: boolean;
  show_calendar_view: boolean;
  min_duration_hours: number;
  max_duration_hours: number;
  default_duration_hours: number;
  enable_real_time_availability: boolean;
  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: any[];
  buffer_before_hours: number;
  buffer_after_hours: number;
}

const defaultFormData: DateTimeConfigFormData = {
  allow_time_selection: true,
  allow_multi_day: false,
  show_calendar_view: true,
  min_duration_hours: 1,
  max_duration_hours: 24,
  default_duration_hours: 4,
  enable_real_time_availability: true,
  blocked_dates: [],
  available_days_of_week: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
  available_time_slots: [],
  buffer_before_hours: 0,
  buffer_after_hours: 0,
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export const DateTimeStepConfig: React.FC<DateTimeStepConfigProps> = ({
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<DateTimeConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newBlockedDate, setNewBlockedDate] = useState('');

  useEffect(() => {
    if (config) {
      setFormData({
        allow_time_selection: config.allow_time_selection ?? true,
        allow_multi_day: config.allow_multi_day ?? false,
        show_calendar_view: config.show_calendar_view ?? true,
        min_duration_hours: config.min_duration_hours ?? 1,
        max_duration_hours: config.max_duration_hours ?? 24,
        default_duration_hours: config.default_duration_hours ?? 4,
        enable_real_time_availability: config.enable_real_time_availability ?? true,
        blocked_dates: config.blocked_dates || [],
        available_days_of_week: config.available_days_of_week || [1, 2, 3, 4, 5, 6, 0],
        available_time_slots: config.available_time_slots || [],
        buffer_before_hours: config.buffer_before_hours ?? 0,
        buffer_after_hours: config.buffer_after_hours ?? 0,
      });
    }
  }, [config]);

  const handleInputChange = (field: keyof DateTimeConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field.includes('hours') ? parseInt(value) || 0 : value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSwitchChange = (field: keyof DateTimeConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleDaysOfWeekChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      available_days_of_week: value,
    }));
  };

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !formData.blocked_dates.includes(newBlockedDate)) {
      setFormData(prev => ({
        ...prev,
        blocked_dates: [...prev.blocked_dates, newBlockedDate],
      }));
      setNewBlockedDate('');
    }
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      blocked_dates: prev.blocked_dates.filter(date => date !== dateToRemove),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.min_duration_hours < 1) {
      newErrors.min_duration_hours = 'Minimum duration must be at least 1 hour';
    }

    if (formData.max_duration_hours < formData.min_duration_hours) {
      newErrors.max_duration_hours = 'Maximum duration must be greater than minimum';
    }

    if (formData.default_duration_hours < formData.min_duration_hours || 
        formData.default_duration_hours > formData.max_duration_hours) {
      newErrors.default_duration_hours = 'Default duration must be between minimum and maximum';
    }

    if (formData.buffer_before_hours < 0 || formData.buffer_after_hours < 0) {
      newErrors.buffer = 'Buffer hours cannot be negative';
    }

    if (formData.available_days_of_week.length === 0) {
      newErrors.available_days_of_week = 'At least one day of the week must be available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onUpdate({
      allow_time_selection: formData.allow_time_selection,
      allow_multi_day: formData.allow_multi_day,
      show_calendar_view: formData.show_calendar_view,
      min_duration_hours: formData.min_duration_hours,
      max_duration_hours: formData.max_duration_hours,
      default_duration_hours: formData.default_duration_hours,
      enable_real_time_availability: formData.enable_real_time_availability,
      blocked_dates: formData.blocked_dates,
      available_days_of_week: formData.available_days_of_week,
      available_time_slots: formData.available_time_slots,
      buffer_before_hours: formData.buffer_before_hours,
      buffer_after_hours: formData.buffer_after_hours,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Date & Time Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure how clients select dates and times for their events, including availability rules and restrictions.
      </Alert>

      <Stack spacing={3}>
        {/* Basic Settings */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Display Options
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <TimeIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allow_time_selection}
                      onChange={handleSwitchChange('allow_time_selection')}
                    />
                  }
                  label="Allow Time Selection"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Let clients choose specific times in addition to dates
              </Typography>

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
            </Stack>
          </CardContent>
        </Card>

        {/* Duration Settings */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Duration Settings
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" gap={2}>
                <TextField
                  label="Minimum Duration (hours)"
                  type="number"
                  value={formData.min_duration_hours}
                  onChange={handleInputChange('min_duration_hours')}
                  error={!!errors.min_duration_hours}
                  helperText={errors.min_duration_hours}
                  inputProps={{ min: 1 }}
                  sx={{ flex: 1 }}
                />
                
                <TextField
                  label="Maximum Duration (hours)"
                  type="number"
                  value={formData.max_duration_hours}
                  onChange={handleInputChange('max_duration_hours')}
                  error={!!errors.max_duration_hours}
                  helperText={errors.max_duration_hours}
                  inputProps={{ min: 1 }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                label="Default Duration (hours)"
                type="number"
                value={formData.default_duration_hours}
                onChange={handleInputChange('default_duration_hours')}
                error={!!errors.default_duration_hours}
                helperText={errors.default_duration_hours || 'Pre-selected duration when the form loads'}
                inputProps={{ min: 1 }}
                sx={{ maxWidth: 300 }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Availability Settings */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Availability Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enable_real_time_availability}
                    onChange={handleSwitchChange('enable_real_time_availability')}
                  />
                }
                label="Enable Real-Time Availability Check"
              />
              <Typography variant="caption" color="text.secondary">
                Check against existing bookings and block unavailable slots
              </Typography>

              {/* Available Days */}
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
                          const day = DAYS_OF_WEEK.find(d => d.value === dayValue);
                          return (
                            <Chip key={dayValue} label={day?.label} size="small" />
                          );
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
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1">Advanced Settings</Typography>
              {(formData.blocked_dates.length > 0 || formData.buffer_before_hours > 0 || formData.buffer_after_hours > 0) && (
                <Chip label="Configured" size="small" color="primary" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Buffer Settings */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Buffer Times
                </Typography>
                <Stack spacing={2}>
                  <Box display="flex" gap={2}>
                    <TextField
                      label="Buffer Before (hours)"
                      type="number"
                      value={formData.buffer_before_hours}
                      onChange={handleInputChange('buffer_before_hours')}
                      error={!!errors.buffer}
                      helperText="Time to block before the event"
                      inputProps={{ min: 0 }}
                      sx={{ flex: 1 }}
                    />
                    
                    <TextField
                      label="Buffer After (hours)"
                      type="number"
                      value={formData.buffer_after_hours}
                      onChange={handleInputChange('buffer_after_hours')}
                      error={!!errors.buffer}
                      helperText="Time to block after the event"
                      inputProps={{ min: 0 }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  {errors.buffer && (
                    <Typography variant="caption" color="error">
                      {errors.buffer}
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Blocked Dates */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Blocked Dates
                </Typography>
                
                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    type="date"
                    size="small"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    sx={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<BlockIcon />}
                    onClick={handleAddBlockedDate}
                    disabled={!newBlockedDate}
                  >
                    Block Date
                  </Button>
                </Box>

                {formData.blocked_dates.length > 0 ? (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {formData.blocked_dates.map((date, index) => (
                      <Chip
                        key={index}
                        label={new Date(date).toLocaleDateString()}
                        onDelete={() => handleRemoveBlockedDate(date)}
                        color="error"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No blocked dates set
                  </Typography>
                )}
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Configuration Summary */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Display:</strong>{' '}
                {[
                  formData.show_calendar_view && 'Calendar View',
                  formData.allow_time_selection && 'Time Selection',
                  formData.allow_multi_day && 'Multi-Day Events'
                ].filter(Boolean).join(', ') || 'Basic date selection'}
              </Typography>
              
              <Typography variant="body2">
                <strong>Duration:</strong> {formData.min_duration_hours}-{formData.max_duration_hours} hours (default: {formData.default_duration_hours}h)
              </Typography>
              
              <Typography variant="body2">
                <strong>Available Days:</strong> {formData.available_days_of_week.length} days per week
              </Typography>
              
              {(formData.buffer_before_hours > 0 || formData.buffer_after_hours > 0) && (
                <Typography variant="body2">
                  <strong>Buffer:</strong> {formData.buffer_before_hours}h before, {formData.buffer_after_hours}h after
                </Typography>
              )}
              
              {formData.blocked_dates.length > 0 && (
                <Typography variant="body2">
                  <strong>Blocked Dates:</strong> {formData.blocked_dates.length} dates blocked
                </Typography>
              )}
              
              <Typography variant="body2">
                <strong>Real-Time Availability:</strong> {formData.enable_real_time_availability ? 'Enabled' : 'Disabled'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};