// frontend/admin-crm/src/components/sales/EventQuoteFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  Autocomplete,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Save as SaveIcon, Cancel as CancelIcon, Receipt as QuoteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays, format } from 'date-fns';
import { useEvents } from '../../hooks/useEvents';
import { useActiveQuoteTemplates } from '../../hooks/useSales';
import type {
  EventQuote,
  CreateEventQuoteData,
  UpdateEventQuoteData,
  EventQuoteFormData,
} from '../../types/sales.types';
import type { Event } from '../../types/events.types';
import { tokens } from '../../design-system';

interface EventQuoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingQuote?: EventQuote | null;
  onSubmit: (data: CreateEventQuoteData | UpdateEventQuoteData) => void;
  isLoading: boolean;
}

const initialFormData: EventQuoteFormData = {
  event: '',
  template: '',
  valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  notes: '',
  terms_and_conditions: '',
  client_message: '',
  line_items: [],
};

export const EventQuoteFormDialog: React.FC<EventQuoteFormDialogProps> = ({
  open,
  onClose,
  editingQuote,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<EventQuoteFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<EventQuoteFormData>>({});
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Hooks for dependent data
  const { events = [] } = useEvents();
  const { data: templates = [] } = useActiveQuoteTemplates();

  // Initialize form data when editing
  useEffect(() => {
    if (editingQuote && open) {
      setFormData({
        event: editingQuote.event.toString(),
        template: editingQuote.template?.toString() || '',
        valid_until: editingQuote.valid_until,
        notes: editingQuote.notes || '',
        terms_and_conditions: editingQuote.terms_and_conditions || '',
        client_message: editingQuote.client_message || '',
        line_items: [],
      });

      // Find and set the selected event
      const event = events.find((e) => e.id === editingQuote.event);
      setSelectedEvent(event || null);
    } else if (open && !editingQuote) {
      setFormData(initialFormData);
      setSelectedEvent(null);
    }
  }, [editingQuote, open, events]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setSelectedEvent(null);
      setErrors({});
    }
  }, [open]);

  const handleInputChange =
    (field: keyof EventQuoteFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleSelectChange =
    (field: keyof EventQuoteFormData) => (event: SelectChangeEvent<string>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value as string,
      }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleEventChange = (_event: React.SyntheticEvent, newValue: Event | null) => {
    setSelectedEvent(newValue);
    setFormData((prev) => ({
      ...prev,
      event: newValue ? newValue.id.toString() : '',
    }));

    // Clear error for this field
    if (errors.event) {
      setErrors((prev) => ({
        ...prev,
        event: undefined,
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        valid_until: format(date, 'yyyy-MM-dd'),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EventQuoteFormData> = {};

    if (!formData.event) {
      newErrors.event = 'Please select an event';
    }

    if (!formData.valid_until) {
      newErrors.valid_until = 'Valid until date is required';
    } else if (new Date(formData.valid_until) <= new Date()) {
      newErrors.valid_until = 'Valid until date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateEventQuoteData | UpdateEventQuoteData = {
      ...(editingQuote ? {} : { event: parseInt(formData.event) }),
      ...(formData.template && { template: parseInt(formData.template) }),
      valid_until: formData.valid_until,
      notes: formData.notes.trim() || undefined,
      terms_and_conditions: formData.terms_and_conditions.trim() || undefined,
      client_message: formData.client_message.trim() || undefined,
    };

    onSubmit(submitData);
  };

  const handleCancel = () => {
    onClose();
  };

  const title = editingQuote ? 'Edit Event Quote' : 'Create Event Quote';

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: tokens.spacing.radius.lg,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <QuoteIcon sx={{ color: tokens.color.primary[600] }} />
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {/* Event Selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Event Information
              </Typography>

              <Stack spacing={2.5}>
                {editingQuote ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.spacing.radius.md,
                      backgroundColor: tokens.color.neutral[50],
                      border: `1px solid ${tokens.color.borders.subtle}`,
                    }}
                  >
                    <Typography variant="body2" fontWeight="600" color="text.primary">
                      {editingQuote.event_details?.name || `Event #${editingQuote.event}`}
                    </Typography>
                    {editingQuote.event_details?.client_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Client: {editingQuote.event_details.client_name}
                      </Typography>
                    )}
                    {editingQuote.event_details?.start_date && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Date: {format(new Date(editingQuote.event_details.start_date), 'PPP')}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Autocomplete
                    options={events}
                    getOptionLabel={(option) => option.name || `Event #${option.id}`}
                    value={selectedEvent}
                    onChange={handleEventChange}
                    disabled={isLoading}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {option.name || `Event #${option.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.client_name && `Client: ${option.client_name} • `}
                            Status: {option.status}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Event"
                        error={!!errors.event}
                        helperText={errors.event}
                        required
                        placeholder="Search for an event..."
                      />
                    )}
                  />
                )}

                <FormControl fullWidth>
                  <InputLabel>Quote Template (Optional)</InputLabel>
                  <Select
                    value={formData.template}
                    onChange={handleSelectChange('template')}
                    label="Quote Template (Optional)"
                    disabled={isLoading}
                  >
                    <MenuItem value="">No Template</MenuItem>
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id.toString()}>
                        {template.name}
                        {template.event_type_name && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({template.event_type_name})
                          </Typography>
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Quote Details */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Quote Details
              </Typography>

              <Stack spacing={2.5}>
                <DatePicker
                  label="Valid Until"
                  value={formData.valid_until ? new Date(formData.valid_until) : null}
                  onChange={handleDateChange}
                  disabled={isLoading}
                  minDate={addDays(new Date(), 1)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.valid_until,
                      helperText: errors.valid_until || 'Date until which this quote remains valid',
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="Internal Notes"
                  value={formData.notes}
                  onChange={handleInputChange('notes')}
                  multiline
                  rows={3}
                  placeholder="Internal notes about this quote (not visible to client)..."
                  disabled={isLoading}
                />

                <TextField
                  fullWidth
                  label="Client Message"
                  value={formData.client_message}
                  onChange={handleInputChange('client_message')}
                  multiline
                  rows={3}
                  placeholder="Optional message to include with the quote..."
                  disabled={isLoading}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Terms and Conditions */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Terms and Conditions
              </Typography>

              <TextField
                fullWidth
                label="Terms and Conditions"
                value={formData.terms_and_conditions}
                onChange={handleInputChange('terms_and_conditions')}
                multiline
                rows={4}
                placeholder="Enter terms and conditions for this quote..."
                disabled={isLoading}
              />
            </Box>

            {/* Info Alert */}
            <Alert severity="info" variant="outlined">
              {editingQuote
                ? 'Quote line items and pricing can be managed after updating the quote details.'
                : 'After creating the quote, you can add line items, adjust pricing, and send it to the client.'}
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            startIcon={<CancelIcon />}
            sx={{ color: tokens.color.neutral[600] }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <SaveIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
              px: 3,
            }}
          >
            {isLoading ? 'Saving...' : editingQuote ? 'Update Quote' : 'Create Quote'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
