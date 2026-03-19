// frontend/admin-crm/src/components/payments/PaymentForm.tsx

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
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type {
  Payment,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentFormData,
  PaymentStatus,
} from '../../types/payments';
import { PAYMENT_STATUSES } from '../../types/payments';
import { useEvents } from '../../hooks/useEvents';
import { usePaymentMethods } from '../../hooks/usePayments';

interface PaymentFormProps {
  payment?: Payment | null;
  onSubmit: (data: CreatePaymentData | UpdatePaymentData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const getInitialFormData = (payment?: Payment | null): PaymentFormData => {
  if (!payment) {
    return {
      event: '',
      amount: '',
      currency: 'PHP',
      status: 'PENDING',
      due_date: '',
      payment_method: '',
      description: '',
      notes: '',
      reference_number: '',
      is_manual: false,
    };
  }

  return {
    event: payment.event.toString(),
    amount: payment.amount,
    currency: payment.currency || 'PHP',
    status: payment.status,
    due_date: payment.due_date,
    payment_method: payment.payment_method?.toString() || '',
    description: payment.description,
    notes: payment.notes,
    reference_number: payment.reference_number,
    is_manual: payment.is_manual,
  };
};

export const PaymentForm: React.FC<PaymentFormProps> = ({
  payment,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { events } = useEvents();
  const { data: paymentMethods = [] } = usePaymentMethods();

  const [formData, setFormData] = useState<PaymentFormData>(() => getInitialFormData(payment));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when payment prop changes (for edit mode)
  useEffect(() => {
    setFormData(getInitialFormData(payment));
  }, [payment]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.event) {
      newErrors.event = 'Event is required';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof PaymentFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
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

    const submitData: CreatePaymentData | UpdatePaymentData = {
      event: parseInt(formData.event),
      amount: parseFloat(formData.amount).toString(),
      currency: formData.currency,
      status: formData.status,
      due_date: formData.due_date,
      payment_method: formData.payment_method ? parseInt(formData.payment_method) : undefined,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
      reference_number: formData.reference_number || undefined,
      is_manual: formData.is_manual,
    };

    onSubmit(submitData);
  };

  const selectedEvent = events.find((e) => e.id.toString() === formData.event);

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Event Selection */}
        <FormControl fullWidth error={!!errors.event}>
          <Autocomplete
            options={events}
            getOptionLabel={(option) =>
              `${option.name || 'Untitled Event'} - ${option.client_name}`
            }
            value={selectedEvent || null}
            onChange={(_, newValue) => {
              handleChange('event', newValue?.id.toString() || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Event *"
                error={!!errors.event}
                helperText={errors.event}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Box>{option.name || 'Untitled Event'}</Box>
                  <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    {option.client_name} • {new Date(option.start_date).toLocaleDateString()}
                  </Box>
                </Box>
              </Box>
            )}
          />
        </FormControl>

        {/* Currency, Amount and Status Row */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              label="Currency"
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <MenuItem value="PHP">PHP</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount *"
            type="number"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            error={!!errors.amount}
            helperText={errors.amount}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {formData.currency === 'PHP' ? '₱' : '$'}
                </InputAdornment>
              ),
              inputProps: { min: 0, step: '0.01' },
            }}
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => handleChange('status', e.target.value as PaymentStatus)}
            >
              {PAYMENT_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Due Date and Payment Method Row */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <DatePicker
            label="Due Date *"
            value={formData.due_date ? new Date(formData.due_date) : null}
            onChange={(newValue) => {
              handleChange('due_date', newValue ? newValue.toISOString().split('T')[0] : '');
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.due_date,
                helperText: errors.due_date,
              },
            }}
          />

          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.payment_method}
              label="Payment Method"
              onChange={(e) => handleChange('payment_method', e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {paymentMethods.map((method) => (
                <MenuItem key={method.id} value={method.id.toString()}>
                  <Box>
                    <Typography variant="body2">
                      {method.nickname || method.type_display}
                    </Typography>
                    {method.last_four && (
                      <Typography variant="caption" color="text.secondary">
                        **** {method.last_four}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Description */}
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Brief description of this payment"
        />

        {/* Reference Number */}
        <TextField
          fullWidth
          label="Reference Number"
          value={formData.reference_number}
          onChange={(e) => handleChange('reference_number', e.target.value)}
          placeholder="External reference or transaction ID"
        />

        {/* Notes */}
        <TextField
          fullWidth
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          multiline
          rows={3}
          placeholder="Internal notes about this payment"
        />

        {/* Manual Payment Flag */}
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_manual}
              onChange={(e) => handleChange('is_manual', e.target.checked)}
            />
          }
          label="Manual Payment"
        />

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
            {payment ? 'Update Payment' : 'Create Payment'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};
