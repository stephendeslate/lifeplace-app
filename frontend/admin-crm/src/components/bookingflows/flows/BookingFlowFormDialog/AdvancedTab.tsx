// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/AdvancedTab.tsx

import React from 'react';
import { TextField, Typography, Stack, Alert, Divider } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { EnhancedBookingFlowFormData } from './useBookingFlowFormLogic';

interface AdvancedTabProps {
  formData: EnhancedBookingFlowFormData;
  handleInputChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string | number[]>
      | { target: { value: unknown } },
  ) => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({ formData, handleInputChange }) => (
  <Stack spacing={3}>
    <Typography variant="h6" gutterBottom>
      Completion Settings
    </Typography>

    <TextField
      fullWidth
      label="Success Message"
      value={formData.success_message}
      onChange={handleInputChange('success_message')}
      multiline
      rows={3}
      helperText="Message shown to clients after successful booking"
      autoComplete="off"
    />

    <TextField
      fullWidth
      label="Redirect URL"
      value={formData.redirect_url}
      onChange={handleInputChange('redirect_url')}
      helperText="Optional URL to redirect clients after booking completion"
      autoComplete="off"
    />

    <Divider />

    <Typography variant="h6" gutterBottom>
      Analytics & Tracking
    </Typography>

    <TextField
      fullWidth
      label="Conversion Tracking Code"
      value={formData.conversion_tracking_code}
      onChange={handleInputChange('conversion_tracking_code')}
      multiline
      rows={3}
      helperText="JavaScript code for tracking conversions (Google Analytics, Facebook Pixel, etc.)"
      autoComplete="off"
    />

    <Alert severity="warning">
      Advanced settings should only be modified if you understand their impact on the booking
      process.
    </Alert>
  </Stack>
);
