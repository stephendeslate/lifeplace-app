// frontend/admin-crm/src/components/events/EventForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  CircularProgress,
  Autocomplete,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { Event, CreateEventData, UpdateEventData, EventFormData, EventStatus } from '../../types/events.types';
import { EVENT_STATUSES } from '../../types/events.types';
import { useClients } from '../../hooks/useClients';
import { useEventTypes } from '../../hooks/useEvents';
import { useWorkflowTemplates } from '../../hooks/useWorkflows';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: CreateEventData | UpdateEventData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const getInitialFormData = (event?: Event | null): EventFormData => {
  if (!event) {
    return {
      client: '',
      event_type: '',
      workflow_template: '',
      status: 'LEAD',
      name: '',
      start_date: '',
      end_date: '',
      lead_source: '',
      total_price: '',
      num_participants: '',
    };
  }

  // Handle client ID extraction properly
  let clientId = '';
  if (typeof event.client === 'number') {
    clientId = event.client.toString();
  } else if (typeof event.client === 'object' && event.client !== null && 'id' in event.client) {
    clientId = (event.client as { id: number }).id.toString();
  }

  // Handle event_type ID extraction properly
  let eventTypeId = '';
  if (typeof event.event_type === 'number') {
    eventTypeId = event.event_type.toString();
  } else if (typeof event.event_type === 'object' && event.event_type !== null && 'id' in event.event_type) {
    eventTypeId = (event.event_type as { id: number }).id.toString();
  }

  // Handle workflow_template ID extraction properly
  let workflowTemplateId = '';
  if (typeof event.workflow_template === 'number') {
    workflowTemplateId = event.workflow_template.toString();
  } else if (typeof event.workflow_template === 'object' && event.workflow_template !== null && 'id' in event.workflow_template) {
    workflowTemplateId = (event.workflow_template as { id: number }).id.toString();
  }

  return {
    client: clientId,
    event_type: eventTypeId,
    workflow_template: workflowTemplateId,
    status: event.status || 'LEAD',
    name: event.name || '',
    start_date: event.start_date || '',
    end_date: event.end_date || '',
    lead_source: event.lead_source || '',
    total_price: event.total_price || '',
    num_participants: event.num_participants?.toString() || '',
  };
};

export const EventForm: React.FC<EventFormProps> = ({
  event,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { clients } = useClients();
  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();
  const { useActiveWorkflowTemplates } = useWorkflowTemplates();
  const { data: workflowTemplates = [] } = useActiveWorkflowTemplates();

  const [formData, setFormData] = useState<EventFormData>(() => getInitialFormData(event));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when event prop changes (for edit mode)
  useEffect(() => {
    setFormData(getInitialFormData(event));
  }, [event]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client) {
      newErrors.client = 'Client is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (formData.total_price && isNaN(parseFloat(formData.total_price))) {
      newErrors.total_price = 'Total price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateEventData | UpdateEventData = {
      client: parseInt(formData.client),
      event_type: formData.event_type ? parseInt(formData.event_type) : null,
      workflow_template: formData.workflow_template ? parseInt(formData.workflow_template) : null,
      status: formData.status,
      name: formData.name || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      lead_source: formData.lead_source || undefined,
      total_price: formData.total_price ? parseFloat(formData.total_price).toString() : null,
      num_participants: formData.num_participants ? parseInt(formData.num_participants) : null,
    };

    onSubmit(submitData);
  };

  const selectedClient = clients.find(c => c.id.toString() === formData.client);

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Client Selection */}
        <FormControl fullWidth error={!!errors.client}>
          <Autocomplete
            options={clients}
            getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
            value={selectedClient || null}
            onChange={(_, newValue) => {
              handleChange('client', newValue?.id.toString() || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Client *"
                error={!!errors.client}
                helperText={errors.client}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Box>{option.first_name} {option.last_name}</Box>
                  <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    {option.email}
                  </Box>
                </Box>
              </Box>
            )}
          />
        </FormControl>

        {/* Event Type, Workflow Template and Status Row */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
          <FormControl fullWidth>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={formData.event_type}
              label="Event Type"
              onChange={(e) => handleChange('event_type', e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {eventTypes.map((type) => (
                <MenuItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Workflow Template</InputLabel>
            <Select
              value={formData.workflow_template}
              label="Workflow Template"
              onChange={(e) => handleChange('workflow_template', e.target.value)}
            >
              <MenuItem value="">
                <em>No Workflow</em>
              </MenuItem>
              {workflowTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id.toString()}>
                  <Box>
                    <Typography variant="body2">{template.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {template.stages_count} stages
                      {template.event_type_name && ` • ${template.event_type_name}`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                💡 Manual workflow assignment for admin-created events. Booking flows automatically assign workflows for client bookings.
              </Typography>
            </Box>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => handleChange('status', e.target.value as EventStatus)}
            >
              {EVENT_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Event Name */}
        <TextField
          fullWidth
          label="Event Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Wedding Reception, Corporate Event"
        />

        {/* Date & Time Row */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <DateTimePicker
            label="Start Date & Time *"
            value={formData.start_date ? new Date(formData.start_date) : null}
            onChange={(newValue) => {
              handleChange('start_date', newValue ? newValue.toISOString() : '');
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.start_date,
                helperText: errors.start_date,
              },
            }}
          />

          <DateTimePicker
            label="End Date & Time"
            value={formData.end_date ? new Date(formData.end_date) : null}
            onChange={(newValue) => {
              handleChange('end_date', newValue ? newValue.toISOString() : '');
            }}
            minDateTime={formData.start_date ? new Date(formData.start_date) : undefined}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.end_date,
                helperText: errors.end_date,
              },
            }}
          />
        </Box>

        {/* Lead Source, Total Price, and Number of Guests Row */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <TextField
            fullWidth
            label="Lead Source"
            value={formData.lead_source}
            onChange={(e) => handleChange('lead_source', e.target.value)}
            placeholder="e.g., Website, Referral, Social Media"
          />

          <TextField
            fullWidth
            label="Total Price"
            type="number"
            value={formData.total_price}
            onChange={(e) => handleChange('total_price', e.target.value)}
            error={!!errors.total_price}
            helperText={errors.total_price}
            InputProps={{
              inputProps: { min: 0, step: '0.01' }
            }}
          />

          <TextField
            fullWidth
            label="Number of Guests"
            type="number"
            value={formData.num_participants}
            onChange={(e) => handleChange('num_participants', e.target.value)}
            placeholder="Total expected guests"
            InputProps={{
              inputProps: { min: 0 }
            }}
          />
        </Box>

        {/* Form Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {event ? 'Update Event' : 'Create Event'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};