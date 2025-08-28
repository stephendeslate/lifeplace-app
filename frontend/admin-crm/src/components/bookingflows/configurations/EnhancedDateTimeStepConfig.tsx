// frontend/admin-crm/src/components/bookingflows/configurations/EnhancedDateTimeStepConfig.tsx

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
  InputLabel,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as TimeIcon,
  CalendarMonth as CalendarIcon,
  Block as BlockIcon,
  CheckCircle as AvailabilityIcon,
  Sync as SyncIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';

import type { 
  BookingFlowStep, 
  DateTimeStepConfiguration 
} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import { useCalendarAvailability, useAvailabilityCache } from '../../../hooks/useAvailability';
import { AvailabilityStats } from '../../availability/AvailabilityIndicator';

interface EnhancedDateTimeStepConfigProps {
  step: BookingFlowStep;
  config?: DateTimeStepConfiguration | null;
  onUpdate: (updatedStep: BookingFlowStep) => void;
  isLoading?: boolean;
}

interface DateTimeConfigFormData {
  allow_time_selection: boolean;
  allow_multi_day: boolean;
  show_calendar_view: boolean;
  min_duration_hours: number;
  max_duration_hours: number;
  default_duration_hours: number;
  
  // Enhanced availability settings
  enable_real_time_availability: boolean;
  show_availability_status: boolean;
  auto_check_conflicts: boolean;
  
  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: any[];
  
  // Buffer settings
  buffer_before_hours: number;
  buffer_after_hours: number;
  
  // Availability checking configuration
  check_venue_availability: boolean;
  check_resource_availability: boolean;
  check_staff_availability: boolean;
  
  // Availability display settings
  availability_display_mode: 'FULL' | 'LIMITED' | 'SIMPLE';
  
  // Conflict resolution
  allow_overbooking: boolean;
  overbooking_threshold: number;
  
  // Integration settings
  sync_with_calendar: boolean;
  calendar_source: 'GOOGLE' | 'OUTLOOK' | 'EXTERNAL' | '';
  
  // Enterprise availability features
  enforce_lead_restrictions: boolean;
  show_conflict_details: boolean;
  highlight_unavailable_dates: boolean;
  show_next_available_date: boolean;
  enable_conflict_resolution: boolean;
  allow_manual_override: boolean;
}

const defaultFormData: DateTimeConfigFormData = {
  allow_time_selection: true,
  allow_multi_day: false,
  show_calendar_view: true,
  min_duration_hours: 1,
  max_duration_hours: 24,
  default_duration_hours: 4,
  enable_real_time_availability: true,
  show_availability_status: true,
  auto_check_conflicts: true,
  blocked_dates: [],
  available_days_of_week: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
  available_time_slots: [],
  buffer_before_hours: 0,
  buffer_after_hours: 0,
  check_venue_availability: true,
  check_resource_availability: true,
  check_staff_availability: true,
  availability_display_mode: 'FULL',
  allow_overbooking: false,
  overbooking_threshold: 0,
  sync_with_calendar: false,
  calendar_source: '',
  // New enterprise features
  enforce_lead_restrictions: true,
  show_conflict_details: true,
  highlight_unavailable_dates: true,
  show_next_available_date: true,
  enable_conflict_resolution: true,
  allow_manual_override: false,
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

const AVAILABILITY_DISPLAY_MODES = [
  { value: 'FULL', label: 'Show Full Availability Details' },
  { value: 'LIMITED', label: 'Show Limited Availability Info' },
  { value: 'SIMPLE', label: 'Show Simple Available/Unavailable' },
];

const CALENDAR_SOURCES = [
  { value: '', label: 'No Calendar Sync' },
  { value: 'GOOGLE', label: 'Google Calendar' },
  { value: 'OUTLOOK', label: 'Outlook Calendar' },
  { value: 'EXTERNAL', label: 'External System' },
];

export const EnhancedDateTimeStepConfig: React.FC<EnhancedDateTimeStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<DateTimeConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [testDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ahead
  });

  const {
    updateConfiguration,
    isUpdatingConfiguration,
  } = useBookingFlowStepConfiguration();

  const { invalidateCache } = useAvailabilityCache();

  // Test availability for preview
  const {
    calendarData: testAvailabilityData,
    stats: testStats,
    isLoading: isLoadingTestData,
    error: testError,
    refetch: refetchTestData,
  } = useCalendarAvailability(
    testDateRange.start,
    testDateRange.end,
    {
      booking_flow_id: step.booking_flow,
    },
    previewMode
  );

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
        show_availability_status: config.show_availability_status ?? true,
        auto_check_conflicts: config.auto_check_conflicts ?? true,
        blocked_dates: config.blocked_dates || [],
        available_days_of_week: config.available_days_of_week || [1, 2, 3, 4, 5, 6, 0],
        available_time_slots: config.available_time_slots || [],
        buffer_before_hours: config.buffer_before_hours ?? 0,
        buffer_after_hours: config.buffer_after_hours ?? 0,
        check_venue_availability: config.check_venue_availability ?? true,
        check_resource_availability: config.check_resource_availability ?? true,
        check_staff_availability: config.check_staff_availability ?? true,
        availability_display_mode: config.availability_display_mode ?? 'FULL',
        allow_overbooking: config.allow_overbooking ?? false,
        overbooking_threshold: config.overbooking_threshold ?? 0,
        sync_with_calendar: config.sync_with_calendar ?? false,
        calendar_source: config.calendar_source ?? '',
        // Enterprise features with defaults
        enforce_lead_restrictions: (config as any).enforce_lead_restrictions ?? true,
        show_conflict_details: (config as any).show_conflict_details ?? true,
        highlight_unavailable_dates: (config as any).highlight_unavailable_dates ?? true,
        show_next_available_date: (config as any).show_next_available_date ?? true,
        enable_conflict_resolution: (config as any).enable_conflict_resolution ?? true,
        allow_manual_override: (config as any).allow_manual_override ?? false,
      });
    }
  }, [config]);

  const handleInputChange = (field: keyof DateTimeConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field.includes('hours') || field.includes('threshold') ? parseInt(value as string) || 0 : value,
    }));
    
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

    // Invalidate cache when availability settings change
    if (field.includes('availability') || field.includes('check_') || field.includes('buffer')) {
      invalidateCache();
    }
  };

  const handleDaysOfWeekChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      available_days_of_week: value,
    }));
    invalidateCache();
  };

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !formData.blocked_dates.includes(newBlockedDate)) {
      setFormData(prev => ({
        ...prev,
        blocked_dates: [...prev.blocked_dates, newBlockedDate],
      }));
      setNewBlockedDate('');
      invalidateCache();
    }
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      blocked_dates: prev.blocked_dates.filter(date => date !== dateToRemove),
    }));
    invalidateCache();
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

    if (formData.allow_overbooking && formData.overbooking_threshold < 0) {
      newErrors.overbooking_threshold = 'Overbooking threshold cannot be negative';
    }

    // Validate enterprise features
    if (formData.enable_real_time_availability && !formData.check_venue_availability && 
        !formData.check_resource_availability && !formData.check_staff_availability) {
      newErrors.availability_checks = 'At least one availability check must be enabled when using real-time availability';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    updateConfiguration({
      stepId: step.id,
      data: formData,
    }, {
      onSuccess: () => {
        const updatedStep: BookingFlowStep = {
          ...step,
          configuration_data: {
            ...config,
            ...formData,
          } as DateTimeStepConfiguration,
        };
        onUpdate(updatedStep);
        // Refresh availability data after save
        invalidateCache();
      }
    });
  };

  const handleTestConfiguration = () => {
    setPreviewMode(true);
    refetchTestData();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">
          Enhanced Date & Time Configuration
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => invalidateCache()}
            size="small"
          >
            Refresh Cache
          </Button>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handleTestConfiguration}
            disabled={isLoadingTestData}
            size="small"
          >
            {isLoadingTestData ? 'Testing...' : 'Test Config'}
          </Button>
        </Stack>
      </Stack>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Configure enterprise-level date and time selection with real-time availability checking, 
          conflict detection, and business rule enforcement.
        </Typography>
      </Alert>

      {/* Configuration Preview/Test Results */}
      {previewMode && (
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                Configuration Test Results
              </Typography>
              <Button
                size="small"
                onClick={() => setPreviewMode(false)}
              >
                Hide Preview
              </Button>
            </Stack>

            {isLoadingTestData ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : testError ? (
              <Alert severity="error">
                Failed to test configuration: {testError.message}
              </Alert>
            ) : testStats ? (
              <Box>
                <AvailabilityStats availability={testAvailabilityData || []} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Test period: {testDateRange.start} to {testDateRange.end}
                </Typography>
              </Box>
            ) : null}
          </CardContent>
        </Card>
      )}

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

              <Box display="flex" alignItems="center" gap={1}>
                <CalendarIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_calendar_view}
                      onChange={handleSwitchChange('show_calendar_view')}
                    />
                  }
                  label="Show Enhanced Calendar View"
                />
              </Box>

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

        {/* Enterprise Availability Settings */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AvailabilityIcon color="primary" />
              <Typography variant="subtitle1">
                Enterprise Availability Engine
              </Typography>
              <Badge badgeContent="NEW" color="primary" variant="standard">
                <Chip label="Enterprise" size="small" color="primary" />
              </Badge>
            </Box>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enable_real_time_availability}
                    onChange={handleSwitchChange('enable_real_time_availability')}
                  />
                }
                label="Enable Real-Time Availability Checking"
              />
              <Typography variant="caption" color="text.secondary">
                Enforces business rules: no bookings on dates with confirmed events, leads still allowed
              </Typography>

              {formData.enable_real_time_availability && (
                <>
                  <Divider />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.show_availability_status}
                        onChange={handleSwitchChange('show_availability_status')}
                      />
                    }
                    label="Show Visual Availability Indicators"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.auto_check_conflicts}
                        onChange={handleSwitchChange('auto_check_conflicts')}
                      />
                    }
                    label="Auto-Check and Prevent Conflicts"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enforce_lead_restrictions}
                        onChange={handleSwitchChange('enforce_lead_restrictions')}
                      />
                    }
                    label="Enforce Lead vs Booking Restrictions"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Distinguish between leads (allowed on confirmed dates) and full bookings (blocked on confirmed dates)
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.show_conflict_details}
                        onChange={handleSwitchChange('show_conflict_details')}
                      />
                    }
                    label="Show Detailed Conflict Information"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.highlight_unavailable_dates}
                        onChange={handleSwitchChange('highlight_unavailable_dates')}
                      />
                    }
                    label="Highlight Unavailable Dates in Calendar"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.show_next_available_date}
                        onChange={handleSwitchChange('show_next_available_date')}
                      />
                    }
                    label="Suggest Next Available Date"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enable_conflict_resolution}
                        onChange={handleSwitchChange('enable_conflict_resolution')}
                      />
                    }
                    label="Enable Conflict Resolution Assistant"
                  />

                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Availability Display Mode</InputLabel>
                    <Select
                      value={formData.availability_display_mode}
                      label="Availability Display Mode"
                      onChange={(event) => {
                        const value = event.target.value as 'FULL' | 'LIMITED' | 'SIMPLE';
                        setFormData(prev => ({
                          ...prev,
                          availability_display_mode: value,
                        }));
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
            </Stack>
          </CardContent>
        </Card>

        {/* Availability Checking Configuration */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Availability Validation Rules
            </Typography>
            
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

              {errors.availability_checks && (
                <Alert severity="error">
                  {errors.availability_checks}
                </Alert>
              )}

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

        {/* Conflict Resolution */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Conflict Resolution & Override Policy
            </Typography>
            
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
                Allow bookings even when conflicts are detected (not recommended for most use cases)
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allow_manual_override}
                    onChange={handleSwitchChange('allow_manual_override')}
                  />
                }
                label="Allow Manual Admin Override"
              />
              <Typography variant="caption" color="text.secondary">
                Allow administrators to manually override availability restrictions
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
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <SettingsIcon />
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

              <Divider />

              {/* Calendar Integration */}
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <SyncIcon color="primary" />
                  <Typography variant="subtitle2">
                    Calendar Integration
                  </Typography>
                </Box>
                
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

                  {formData.sync_with_calendar && (
                    <FormControl fullWidth sx={{ maxWidth: 400 }}>
                      <InputLabel>Calendar Source</InputLabel>
                      <Select
                        value={formData.calendar_source}
                        label="Calendar Source"
                        onChange={(event) => {
                          const value = event.target.value as 'GOOGLE' | 'OUTLOOK' | 'EXTERNAL' | '';
                          setFormData(prev => ({
                            ...prev,
                            calendar_source: value,
                          }));
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
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Configuration Summary */}
        <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Enterprise Configuration Summary
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Display:</strong>{' '}
                {[
                  formData.show_calendar_view && 'Enhanced Calendar View',
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
              
              <Typography variant="body2">
                <strong>Real-Time Availability:</strong>{' '}
                <Chip 
                  label={formData.enable_real_time_availability ? 'Enabled' : 'Disabled'} 
                  color={formData.enable_real_time_availability ? 'success' : 'default'}
                  size="small"
                />
                {formData.enable_real_time_availability && ` (${formData.availability_display_mode} mode)`}
              </Typography>
              
              <Typography variant="body2">
                <strong>Business Rules:</strong>{' '}
                <Chip 
                  label={formData.enforce_lead_restrictions ? 'Lead restrictions enforced' : 'No restrictions'} 
                  color={formData.enforce_lead_restrictions ? 'success' : 'warning'}
                  size="small"
                />
              </Typography>
              
              {formData.enable_real_time_availability && (
                <Typography variant="body2">
                  <strong>Availability Checks:</strong>{' '}
                  {[
                    formData.check_venue_availability && 'Venue',
                    formData.check_resource_availability && 'Resources',
                    formData.check_staff_availability && 'Staff'
                  ].filter(Boolean).join(', ') || 'None'}
                </Typography>
              )}
              
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
              
              {formData.allow_overbooking && (
                <Typography variant="body2">
                  <strong>Overbooking:</strong>{' '}
                  <Chip label="Allowed" color="warning" size="small" />
                  {' '}(threshold: {formData.overbooking_threshold})
                </Typography>
              )}
              
              {formData.sync_with_calendar && (
                <Typography variant="body2">
                  <strong>Calendar Sync:</strong> {formData.calendar_source || 'Enabled'}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || isUpdatingConfiguration}
            sx={{ minWidth: 150 }}
          >
            {isLoading || isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
          >
            Reset to Defaults
          </Button>

          <Button
            variant="outlined"
            startIcon={<InfoIcon />}
            onClick={() => setPreviewMode(!previewMode)}
            color={previewMode ? 'primary' : 'inherit'}
          >
            {previewMode ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default EnhancedDateTimeStepConfig;