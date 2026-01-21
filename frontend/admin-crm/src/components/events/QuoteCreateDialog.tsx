// frontend/admin-crm/src/components/events/QuoteCreateDialog.tsx

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
  Stack,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays, format } from 'date-fns';
import { useActiveQuoteTemplates, useCreateEventQuote } from '../../hooks/useSales';
import type { Event } from '../../types/events.types';
import type { CreateEventQuoteData } from '../../types/sales.types';

interface QuoteCreateDialogProps {
  open: boolean;
  onClose: () => void;
  event: Event;
  onSuccess?: () => void;
}

interface QuoteFormData {
  template: string;
  valid_until: string;
  notes: string;
  terms_and_conditions: string;
  client_message: string;
}

const initialFormData: QuoteFormData = {
  template: '',
  valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  notes: '',
  terms_and_conditions: '',
  client_message: '',
};

export const QuoteCreateDialog: React.FC<QuoteCreateDialogProps> = ({
  open,
  onClose,
  event,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<QuoteFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<QuoteFormData>>({});

  // Hooks
  const { data: templates = [] } = useActiveQuoteTemplates();
  const createQuoteMutation = useCreateEventQuote();

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const handleInputChange = (field: keyof QuoteFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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

  const handleSelectChange = (field: keyof QuoteFormData) => (
    event: SelectChangeEvent<string>
  ) => {
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

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        valid_until: format(date, 'yyyy-MM-dd'),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<QuoteFormData> = {};

    if (!formData.valid_until) {
      newErrors.valid_until = 'Valid until date is required';
    } else if (new Date(formData.valid_until) <= new Date()) {
      newErrors.valid_until = 'Valid until date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData: CreateEventQuoteData = {
      event: event.id,
      ...(formData.template && { template: parseInt(formData.template) }),
      valid_until: formData.valid_until,
      notes: formData.notes.trim() || undefined,
      terms_and_conditions: formData.terms_and_conditions.trim() || undefined,
      client_message: formData.client_message.trim() || undefined,
    };

    createQuoteMutation.mutate(submitData, {
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isLoading = createQuoteMutation.isPending;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      {open && (
        <>
          <DialogTitle>
            Create Quote for {event.name || `Event #${event.id}`}
          </DialogTitle>
      
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Stack spacing={3}>
                {/* Event Information Display */}
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Event Information
                  </Typography>
                  <Typography variant="body1" fontWeight="600">
                    {event.name || `Event #${event.id}`}
                  </Typography>
                  {event.client_name && (
                    <Typography variant="body2" color="text.secondary">
                      Client: {event.client_name}
                    </Typography>
                  )}
                  {event.start_date && (
                    <Typography variant="body2" color="text.secondary">
                      Date: {format(new Date(event.start_date), 'PPP')}
                    </Typography>
                  )}
                </Box>

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

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    💡 <strong>Tip:</strong> After creating the quote, you can add line items, adjust pricing, and send it to the client.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? 'Creating...' : 'Create Quote'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};