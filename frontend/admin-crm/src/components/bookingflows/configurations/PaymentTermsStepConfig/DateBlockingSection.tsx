// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/DateBlockingSection.tsx

import React from 'react';
import { Box, TextField, Typography, Stack, Alert, MenuItem, InputAdornment } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import type { PaymentTermsFormData } from './types';

interface DateBlockingSectionProps {
  formData: PaymentTermsFormData;
  paymentSettings: Record<string, unknown> | undefined;
  onInputChange: (
    field: keyof PaymentTermsFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (
    field: keyof PaymentTermsFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DateBlockingSection: React.FC<DateBlockingSectionProps> = ({
  formData,
  paymentSettings,
  onInputChange,
  onSelectChange,
}) => {
  const ps = paymentSettings as Record<string, unknown> | undefined;

  return (
    <Box>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <CalendarIcon fontSize="small" />
        Date Blocking Policy Override
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Important:</strong> Controls when dates become officially blocked for bookings.
        <br />
        <strong>IMMEDIATE:</strong> Date blocked immediately when booking is confirmed.
        <br />
        <strong>ON_DOWNPAYMENT:</strong> Date blocked only after downpayment is received
        (first-to-pay-wins).
      </Alert>

      <Stack spacing={2}>
        <TextField
          select
          fullWidth
          label="Date Blocking Policy"
          value={formData.date_blocking_policy || ''}
          onChange={onSelectChange('date_blocking_policy')}
          helperText={`Global default: ${ps?.date_blocking_policy || 'IMMEDIATE'}`}
          size="small"
        >
          <MenuItem value="">Use Global Default</MenuItem>
          <MenuItem value="IMMEDIATE">Block Immediately on Booking</MenuItem>
          <MenuItem value="ON_DOWNPAYMENT">Block When Downpayment Received</MenuItem>
        </TextField>

        {formData.date_blocking_policy === 'ON_DOWNPAYMENT' && (
          <>
            <TextField
              select
              fullWidth
              label="Downpayment Due Reference"
              value={formData.downpayment_due_reference || ''}
              onChange={onSelectChange('downpayment_due_reference')}
              helperText={`Global default: ${ps?.downpayment_due_reference || 'DAYS_AFTER_BOOKING'}`}
              size="small"
            >
              <MenuItem value="">Use Global Default</MenuItem>
              <MenuItem value="DAYS_AFTER_BOOKING">Days After Booking</MenuItem>
              <MenuItem value="DAYS_BEFORE_EVENT">Days Before Event</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Auto-Cancel Deadline (Days)"
              type="number"
              value={formData.downpayment_deadline_days}
              onChange={onInputChange('downpayment_deadline_days')}
              helperText={`Global: ${ps?.downpayment_deadline_days || 7} days. Event auto-cancelled if downpayment not received by deadline.`}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
            />
          </>
        )}
      </Stack>
    </Box>
  );
};
