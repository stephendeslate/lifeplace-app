// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/DepositSettingsSection.tsx

import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';
import type { PaymentTermsFormData } from './types';

interface DepositSettingsSectionProps {
  formData: PaymentTermsFormData;
  paymentSettings: Record<string, unknown> | undefined;
  currencySymbol: string;
  onInputChange: (
    field: keyof PaymentTermsFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (
    field: keyof PaymentTermsFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSwitchChange: (
    field: keyof PaymentTermsFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  renderGlobalDefault: (field: string, value: unknown) => string;
}

export const DepositSettingsSection: React.FC<DepositSettingsSectionProps> = ({
  formData,
  paymentSettings,
  currencySymbol,
  onInputChange,
  onSelectChange,
  onSwitchChange,
  renderGlobalDefault,
}) => {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <MoneyIcon fontSize="small" />
        Deposit Settings Override
      </Typography>

      <Stack spacing={2}>
        <TextField
          select
          fullWidth
          label="Deposit Type"
          value={formData.deposit_type || ''}
          onChange={onSelectChange('deposit_type')}
          helperText={`Global default: ${(paymentSettings as Record<string, unknown>)?.deposit_type || 'PERCENTAGE'}`}
          size="small"
        >
          <MenuItem value="">Use Global Default</MenuItem>
          <MenuItem value="PERCENTAGE">Percentage of Total</MenuItem>
          <MenuItem value="FIXED">Fixed Amount</MenuItem>
        </TextField>

        {formData.deposit_type === 'PERCENTAGE' && (
          <TextField
            fullWidth
            label="Deposit Percentage"
            type="number"
            value={formData.deposit_percentage}
            onChange={onInputChange('deposit_percentage')}
            helperText={`Global default: ${(paymentSettings as Record<string, unknown>)?.default_deposit_percentage || 50}%`}
            size="small"
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />
        )}

        {formData.deposit_type === 'FIXED' && (
          <TextField
            fullWidth
            label="Fixed Deposit Amount"
            type="number"
            value={formData.deposit_fixed_amount}
            onChange={onInputChange('deposit_fixed_amount')}
            helperText={`Global default: ${currencySymbol}${(paymentSettings as Record<string, unknown>)?.deposit_fixed_amount || 0}`}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
            }}
          />
        )}

        <Box display="flex" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch
                checked={formData.deposit_is_refundable === true}
                onChange={onSwitchChange('deposit_is_refundable')}
              />
            }
            label={`Refundable (Global: ${renderGlobalDefault('deposit_is_refundable', (paymentSettings as Record<string, unknown>)?.deposit_is_refundable)})`}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.deposit_is_deductible === true}
                onChange={onSwitchChange('deposit_is_deductible')}
              />
            }
            label={`Deductible (Global: ${renderGlobalDefault('deposit_is_deductible', (paymentSettings as Record<string, unknown>)?.deposit_is_deductible)})`}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.deposit_waived_on_full_payment === true}
                onChange={onSwitchChange('deposit_waived_on_full_payment')}
              />
            }
            label={`Waive on Full Payment (Global: ${renderGlobalDefault('deposit_waived_on_full_payment', (paymentSettings as Record<string, unknown>)?.deposit_waived_on_full_payment)})`}
          />
        </Box>
      </Stack>
    </Box>
  );
};
