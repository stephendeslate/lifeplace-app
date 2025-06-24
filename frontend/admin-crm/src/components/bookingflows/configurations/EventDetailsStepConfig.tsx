// frontend/admin-crm/src/components/bookingflows/configurations/EventDetailsStepConfig.tsx

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
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  People as GuestsIcon,
  LocationOn as VenueIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  EventDetailsStepConfiguration 
} from '../../../types/bookingflows.types';

interface EventDetailsStepConfigProps {
  step: BookingFlowStep;
  config?: EventDetailsStepConfiguration | null;
  onUpdate: (data: Partial<EventDetailsStepConfiguration>) => void;
  isLoading?: boolean;
}

interface EventDetailsConfigFormData {
  show_event_type_selection: boolean;
  require_event_name: boolean;
  require_description: boolean;
  require_guest_count: boolean;
  max_guest_count: number | null;
  require_venue_preference: boolean;
  venue_options: string[];
}

const defaultFormData: EventDetailsConfigFormData = {
  show_event_type_selection: false,
  require_event_name: true,
  require_description: false,
  require_guest_count: true,
  max_guest_count: null,
  require_venue_preference: false,
  venue_options: [],
};

export const EventDetailsStepConfig: React.FC<EventDetailsStepConfigProps> = ({
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<EventDetailsConfigFormData>(defaultFormData);
  const [newVenueOption, setNewVenueOption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config) {
      setFormData({
        show_event_type_selection: config.show_event_type_selection ?? false,
        require_event_name: config.require_event_name ?? true,
        require_description: config.require_description ?? false,
        require_guest_count: config.require_guest_count ?? true,
        max_guest_count: config.max_guest_count,
        require_venue_preference: config.require_venue_preference ?? false,
        venue_options: config.venue_options || [],
      });
    }
  }, [config]);

  const handleSwitchChange = (field: keyof EventDetailsConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleNumberChange = (field: keyof EventDetailsConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : parseInt(value),
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleAddVenueOption = () => {
    if (newVenueOption.trim() && !formData.venue_options.includes(newVenueOption.trim())) {
      setFormData(prev => ({
        ...prev,
        venue_options: [...prev.venue_options, newVenueOption.trim()],
      }));
      setNewVenueOption('');
    }
  };

  const handleRemoveVenueOption = (optionToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      venue_options: prev.venue_options.filter(option => option !== optionToRemove),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.max_guest_count !== null && formData.max_guest_count < 1) {
      newErrors.max_guest_count = 'Maximum guest count must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onUpdate({
      show_event_type_selection: formData.show_event_type_selection,
      require_event_name: formData.require_event_name,
      require_description: formData.require_description,
      require_guest_count: formData.require_guest_count,
      max_guest_count: formData.max_guest_count,
      require_venue_preference: formData.require_venue_preference,
      venue_options: formData.venue_options,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Event Details Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure what event information to collect from clients during the booking process.
      </Alert>

      <Stack spacing={3}>
        {/* Event Type Selection */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Event Type
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_event_type_selection}
                    onChange={handleSwitchChange('show_event_type_selection')}
                  />
                }
                label="Allow Event Type Selection"
              />
              <Typography variant="caption" color="text.secondary">
                Let clients choose or change the event type during booking
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Event Information */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Event Information
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_event_name}
                      onChange={handleSwitchChange('require_event_name')}
                    />
                  }
                  label="Require Event Name"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Require clients to provide a name for their event
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon color="action" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_description}
                      onChange={handleSwitchChange('require_description')}
                    />
                  }
                  label="Require Event Description"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Require clients to provide additional details about their event
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Guest Count */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Guest Count
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <GuestsIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_guest_count}
                      onChange={handleSwitchChange('require_guest_count')}
                    />
                  }
                  label="Require Guest Count"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Require clients to specify the number of expected guests
              </Typography>

              {formData.require_guest_count && (
                <TextField
                  label="Maximum Guest Count"
                  type="number"
                  value={formData.max_guest_count || ''}
                  onChange={handleNumberChange('max_guest_count')}
                  error={!!errors.max_guest_count}
                  helperText={errors.max_guest_count || 'Optional limit on guest count (leave empty for no limit)'}
                  inputProps={{ min: 1 }}
                  sx={{ maxWidth: 300 }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Venue Preferences */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Venue Preferences
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <VenueIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_venue_preference}
                      onChange={handleSwitchChange('require_venue_preference')}
                    />
                  }
                  label="Require Venue Preference"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Ask clients about their venue preferences or requirements
              </Typography>

              {formData.require_venue_preference && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Venue Options
                  </Typography>
                  
                  {/* Add new venue option */}
                  <Box display="flex" gap={1} mb={2}>
                    <TextField
                      size="small"
                      placeholder="Add venue option..."
                      value={newVenueOption}
                      onChange={(e) => setNewVenueOption(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddVenueOption()}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddVenueOption}
                      disabled={!newVenueOption.trim()}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* List existing venue options */}
                  {formData.venue_options.length > 0 ? (
                    <List dense>
                      {formData.venue_options.map((option, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            border: 1, 
                            borderColor: 'divider', 
                            borderRadius: 1, 
                            mb: 1,
                            backgroundColor: 'background.paper'
                          }}
                        >
                          <ListItemText primary={option} />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveVenueOption(option)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No venue options added. Clients will be able to enter free text.
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Configuration Summary */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Event Type Selection:</strong>{' '}
                {formData.show_event_type_selection ? 'Enabled' : 'Disabled'}
              </Typography>
              
              <Typography variant="body2">
                <strong>Required Fields:</strong>{' '}
                {[
                  formData.require_event_name && 'Event Name',
                  formData.require_description && 'Description',
                  formData.require_guest_count && 'Guest Count',
                  formData.require_venue_preference && 'Venue Preference'
                ].filter(Boolean).join(', ') || 'None'}
              </Typography>
              
              {formData.max_guest_count && (
                <Typography variant="body2">
                  <strong>Max Guests:</strong> {formData.max_guest_count}
                </Typography>
              )}
              
              {formData.venue_options.length > 0 && (
                <Typography variant="body2">
                  <strong>Venue Options:</strong> {formData.venue_options.length} predefined options
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