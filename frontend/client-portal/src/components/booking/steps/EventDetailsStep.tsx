// frontend/client-portal/src/components/booking/steps/EventDetailsStep.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Card,
  CardContent,
  Stack,
  Chip,
  Alert,
  InputAdornment,
  Autocomplete,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Event as EventIcon,
  People,
  LocationOn,
  Description,
  Category,
} from '@mui/icons-material';
import { useBookingFlow } from '../../../hooks/useBookingFlow';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  EventDetailsStepConfig,
} from '../../../types/bookingflow.types';

interface EventDetailsStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const EventDetailsStep: React.FC<EventDetailsStepProps> = ({
  step,
  session,
  data,
  validationErrors,
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  
  // Get step configuration
  const config = step.configuration_data as EventDetailsStepConfig | undefined;
  
  // Form state
  const [formData, setFormData] = useState({
    event_name: data.event_name || '',
    description: data.description || '',
    guest_count: data.guest_count || '',
    venue_preference: data.venue_preference || '',
    event_type_id: data.event_type_id || null,
  });

  // Validation state
  // @ts-ignore
  const [localValidationErrors, setLocalValidationErrors] = useState<Record<string, string>>({});

  // Configuration defaults
  const showEventTypeSelection = config?.show_event_type_selection ?? false;
  const requireEventName = config?.require_event_name ?? true;
  const requireDescription = config?.require_description ?? false;
  const requireGuestCount = config?.require_guest_count ?? true;
  const maxGuestCount = config?.max_guest_count;
  const requireVenuePreference = config?.require_venue_preference ?? false;
  const venueOptions = config?.venue_options || [
    'Indoor Venue',
    'Outdoor Venue',
    'Both Indoor & Outdoor',
    'No Preference',
  ];

  // Get booking flow for event types (if needed)
  const { data: bookingFlow } = useBookingFlow(session.booking_flow);

  // Update parent when form data changes
  useEffect(() => {
    const normalizedData = {
      ...formData,
      guest_count:
        formData.guest_count === '' || formData.guest_count === null
          ? undefined
          : typeof formData.guest_count === 'number'
          ? formData.guest_count
          : parseInt(formData.guest_count, 10),
    };
    onChange(normalizedData);
  }, [formData, onChange]);

  // Validate form data
  const validateForm = (): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    // Event name validation
    if (requireEventName && !formData.event_name.trim()) {
      errors.event_name = ['Event name is required'];
    } else if (formData.event_name.length > 255) {
      errors.event_name = ['Event name must be less than 255 characters'];
    }

    // Description validation
    if (requireDescription && !formData.description.trim()) {
      errors.description = ['Event description is required'];
    } else if (formData.description.length > 1000) {
      errors.description = ['Description must be less than 1000 characters'];
    }

    // Guest count validation
    if (requireGuestCount) {
      const guestCount = parseInt(formData.guest_count.toString());
      if (!formData.guest_count || isNaN(guestCount) || guestCount <= 0) {
        errors.guest_count = ['Please enter a valid number of guests'];
      } else if (maxGuestCount && guestCount > maxGuestCount) {
        errors.guest_count = [`Maximum ${maxGuestCount} guests allowed`];
      } else if (guestCount > 1000) {
        errors.guest_count = ['Please contact us directly for events over 1000 guests'];
      }
    }

    // Venue preference validation
    if (requireVenuePreference && !formData.venue_preference) {
      errors.venue_preference = ['Please select a venue preference'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Run validation when data changes
  useEffect(() => {
    if (onValidate) {
      // @ts-ignore
      const result = validateForm();
      const normalizedData = {
        ...formData,
        guest_count:
          formData.guest_count === '' || formData.guest_count === null
            ? undefined
            : typeof formData.guest_count === 'number'
            ? formData.guest_count
            : parseInt(formData.guest_count, 10),
      };
      onValidate(normalizedData);
    }
  }, [formData, onValidate]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Combine validation errors from props and local
  const getFieldError = (field: string): string | undefined => {
    return validationErrors?.[field]?.[0] || localValidationErrors[field];
  };

  const hasFieldError = (field: string): boolean => {
    return !!(validationErrors?.[field] || localValidationErrors[field]);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              mb: 2,
            }}
          >
            <EventIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            Tell Us About Your Event
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Help us understand your vision so we can create the perfect experience for you.
          </Typography>
        </Box>

        {/* Event Type Selection (if enabled) */}
        {showEventTypeSelection && bookingFlow && (
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <Category sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Event Type
                </Typography>
              </Box>
              
              <FormControl fullWidth error={hasFieldError('event_type_id')}>
                <InputLabel>Select Event Type</InputLabel>
                <Select
                  value={formData.event_type_id || ''}
                  label="Select Event Type"
                  onChange={(e) => handleInputChange('event_type_id', e.target.value || null)}
                  disabled={isLoading || isReadOnly}
                >
                  <MenuItem value="">
                    <em>Select an event type</em>
                  </MenuItem>
                  {/* TODO: Add event types from API */}
                  <MenuItem value={1}>Wedding</MenuItem>
                  <MenuItem value={2}>Corporate Event</MenuItem>
                  <MenuItem value={3}>Birthday Party</MenuItem>
                </Select>
                {hasFieldError('event_type_id') && (
                  <FormHelperText>{getFieldError('event_type_id')}</FormHelperText>
                )}
              </FormControl>
            </CardContent>
          </Card>
        )}

        {/* Event Name */}
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <TextField
              fullWidth
              label={requireEventName ? "Event Name *" : "Event Name"}
              value={formData.event_name}
              onChange={(e) => handleInputChange('event_name', e.target.value)}
              error={hasFieldError('event_name')}
              helperText={getFieldError('event_name') || 'Give your event a memorable name'}
              disabled={isLoading || isReadOnly}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EventIcon sx={{ color: 'action.active' }} />
                  </InputAdornment>
                ),
              }}
              placeholder="e.g., Sarah & John's Wedding, Annual Company Retreat"
            />
          </CardContent>
        </Card>

        {/* Guest Count */}
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <People sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Guest Information
              </Typography>
            </Box>

            <TextField
              fullWidth
              type="number"
              label={requireGuestCount ? "Number of Guests *" : "Number of Guests"}
              value={formData.guest_count}
              onChange={(e) => handleInputChange('guest_count', e.target.value)}
              error={hasFieldError('guest_count')}
              helperText={
                getFieldError('guest_count') ||
                (maxGuestCount 
                  ? `Maximum ${maxGuestCount} guests allowed`
                  : 'Approximate number of guests expected')
              }
              disabled={isLoading || isReadOnly}
              inputProps={{
                min: 1,
                max: maxGuestCount || 1000,
              }}
              placeholder="e.g., 150"
            />

            {formData.guest_count && parseInt(formData.guest_count.toString()) > 100 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  For large events over 100 guests, our team will work closely with you 
                  to ensure all logistics are perfectly coordinated.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Event Description */}
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <Description sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Event Description
                {!requireDescription && (
                  <Chip 
                    label="Optional" 
                    size="small" 
                    variant="outlined" 
                    sx={{ ml: 1, fontSize: '0.75rem' }} 
                  />
                )}
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label={requireDescription ? "Describe Your Event *" : "Describe Your Event"}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={hasFieldError('description')}
              helperText={
                getFieldError('description') ||
                'Share your vision, special requirements, or any details that will help us create your perfect event'
              }
              disabled={isLoading || isReadOnly}
              placeholder="Tell us about your event... What's the occasion? Any special themes, requirements, or vision you'd like to share?"
            />
          </CardContent>
        </Card>

        {/* Venue Preference */}
        {venueOptions.length > 0 && (
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <LocationOn sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Venue Preference
                  {!requireVenuePreference && (
                    <Chip 
                      label="Optional" 
                      size="small" 
                      variant="outlined" 
                      sx={{ ml: 1, fontSize: '0.75rem' }} 
                    />
                  )}
                </Typography>
              </Box>

              <Autocomplete
                fullWidth
                options={venueOptions}
                value={formData.venue_preference || null}
                onChange={(_, value) => handleInputChange('venue_preference', value || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={requireVenuePreference ? "Venue Preference *" : "Venue Preference"}
                    error={hasFieldError('venue_preference')}
                    helperText={
                      getFieldError('venue_preference') ||
                      'Let us know your preferred venue type'
                    }
                    placeholder="Select or type your preference"
                  />
                )}
                freeSolo
                disabled={isLoading || isReadOnly}
              />
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {(formData.event_name || formData.guest_count) && (
          <Card 
            elevation={2}
            sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Event Summary
              </Typography>
              <Stack spacing={1}>
                {formData.event_name && (
                  <Typography variant="body2">
                    <strong>Event:</strong> {formData.event_name}
                  </Typography>
                )}
                {formData.guest_count && (
                  <Typography variant="body2">
                    <strong>Guests:</strong> {formData.guest_count} people
                  </Typography>
                )}
                {formData.venue_preference && (
                  <Typography variant="body2">
                    <strong>Venue:</strong> {formData.venue_preference}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default EventDetailsStep;