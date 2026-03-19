// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/BasicInfoFields.tsx

import React from 'react';
import { TextField, FormControlLabel, Switch, Box, Stack } from '@mui/material';
import type { PaymentGatewayFormData } from '@/types/payments';

interface BasicInfoFieldsProps {
  formData: PaymentGatewayFormData;
  errors: Record<string, string>;
  isEditing: boolean;
  handleChange: (
    field: keyof PaymentGatewayFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  formData,
  errors,
  isEditing,
  handleChange,
}) => (
  <Stack spacing={3}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 3,
      }}
    >
      <TextField
        fullWidth
        label="Gateway Name"
        value={formData.name}
        onChange={handleChange('name')}
        error={!!errors.name}
        helperText={errors.name}
        placeholder="e.g., Stripe, PayMongo, PayPal"
      />

      <TextField
        fullWidth
        label="Gateway Code"
        value={formData.code}
        onChange={handleChange('code')}
        error={!!errors.code}
        helperText={errors.code || 'Unique identifier (lowercase, no spaces)'}
        placeholder="e.g., stripe, paymongo, paypal"
        disabled={isEditing}
      />
    </Box>

    <TextField
      fullWidth
      label="Description"
      value={formData.description}
      onChange={handleChange('description')}
      multiline
      rows={2}
      placeholder="Brief description of this payment gateway"
    />

    <FormControlLabel
      control={<Switch checked={formData.is_active} onChange={handleChange('is_active')} />}
      label="Enable this gateway"
    />
  </Stack>
);
