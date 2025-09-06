// frontend/admin-crm/src/components/events/InvoiceCreateDialog.tsx

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
import type { SelectChangeEvent } from '@mui/material';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays, format } from 'date-fns';
import { useInvoices } from '../../hooks/usePayments';
import { useQuotesForEvent } from '../../hooks/useSales';
import type { Event } from '../../types/events.types';
import type { CreateInvoiceData, InvoiceStatus } from '../../types/payments.types';

interface InvoiceCreateDialogProps {
  open: boolean;
  onClose: () => void;
  event: Event;
  onSuccess?: () => void;
}

interface InvoiceFormData {
  invoice_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string;
  payment_terms: string;
  quote: string;
}

const initialFormData: InvoiceFormData = {
  invoice_id: '',
  issue_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  status: 'DRAFT',
  notes: '',
  payment_terms: '',
  quote: '',
};

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const InvoiceCreateDialog: React.FC<InvoiceCreateDialogProps> = ({
  open,
  onClose,
  event,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<InvoiceFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<InvoiceFormData>>({});

  // Hooks
  const { createInvoice, isCreatingInvoice } = useInvoices();
  const { data: quotes = [] } = useQuotesForEvent(event.id);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const handleInputChange = (field: keyof InvoiceFormData) => (
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

  const handleSelectChange = (field: keyof InvoiceFormData) => (
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

  const handleDateChange = (field: 'issue_date' | 'due_date') => (date: Date | null) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        [field]: format(date, 'yyyy-MM-dd'),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<InvoiceFormData> = {};

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    } else if (new Date(formData.due_date) < new Date(formData.issue_date)) {
      newErrors.due_date = 'Due date must be after issue date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData: CreateInvoiceData = {
      event: event.id,
      invoice_id: formData.invoice_id.trim() || undefined,
      issue_date: formData.issue_date,
      due_date: formData.due_date,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      payment_terms: formData.payment_terms.trim() || undefined,
      ...(formData.quote && { quote: parseInt(formData.quote) }),
    };

    createInvoice(submitData, {
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

  const isLoading = isCreatingInvoice;

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
            Create Invoice for {event.name || `Event #${event.id}`}
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

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Invoice Number (Optional)"
                    value={formData.invoice_id}
                    onChange={handleInputChange('invoice_id')}
                    placeholder="Auto-generated if empty"
                    disabled={isLoading}
                  />

                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={handleSelectChange('status')}
                      label="Status"
                      disabled={isLoading}
                    >
                      {INVOICE_STATUSES.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DatePicker
                    label="Issue Date"
                    value={formData.issue_date ? new Date(formData.issue_date) : null}
                    onChange={handleDateChange('issue_date')}
                    disabled={isLoading}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.issue_date,
                        helperText: errors.issue_date,
                      },
                    }}
                  />

                  <DatePicker
                    label="Due Date"
                    value={formData.due_date ? new Date(formData.due_date) : null}
                    onChange={handleDateChange('due_date')}
                    disabled={isLoading}
                    minDate={formData.issue_date ? new Date(formData.issue_date) : new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.due_date,
                        helperText: errors.due_date,
                      },
                    }}
                  />
                </Box>

                {quotes.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>Link to Quote (Optional)</InputLabel>
                    <Select
                      value={formData.quote}
                      onChange={handleSelectChange('quote')}
                      label="Link to Quote (Optional)"
                      disabled={isLoading}
                    >
                      <MenuItem value="">No Quote</MenuItem>
                      {quotes.map((quote) => (
                        <MenuItem key={quote.id} value={quote.id.toString()}>
                          Version {quote.version} - {quote.status_display || quote.status}
                          {quote.total_amount && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({quote.total_amount})
                            </Typography>
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <TextField
                  fullWidth
                  label="Payment Terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange('payment_terms')}
                  multiline
                  rows={2}
                  placeholder="e.g., Net 30 days, 50% deposit required..."
                  disabled={isLoading}
                />

                <TextField
                  fullWidth
                  label="Internal Notes"
                  value={formData.notes}
                  onChange={handleInputChange('notes')}
                  multiline
                  rows={3}
                  placeholder="Internal notes about this invoice (not visible to client)..."
                  disabled={isLoading}
                />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    💡 <strong>Tip:</strong> After creating the invoice, you can add line items, adjust amounts, and send it to the client.
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
              {isLoading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};