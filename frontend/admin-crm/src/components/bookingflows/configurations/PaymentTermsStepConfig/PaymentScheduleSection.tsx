// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/PaymentScheduleSection.tsx

import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Stack,
  MenuItem,
  InputAdornment,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import type { PaymentTermsFormData } from './types';

interface PaymentScheduleSectionProps {
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

export const PaymentScheduleSection: React.FC<PaymentScheduleSectionProps> = ({
  formData,
  paymentSettings,
  currencySymbol,
  onInputChange,
  onSelectChange,
  onSwitchChange,
  renderGlobalDefault,
}) => {
  const ps = paymentSettings as Record<string, unknown> | undefined;

  return (
    <>
      {/* Payment Schedule Override */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Payment Schedule Override
        </Typography>

        <Stack spacing={2}>
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              label="Downpayment Percentage"
              type="number"
              value={formData.downpayment_percentage}
              onChange={onInputChange('downpayment_percentage')}
              helperText={`Global: ${ps?.downpayment_percentage || 30}%`}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Downpayment Due (Days)"
              type="number"
              value={formData.downpayment_due_days}
              onChange={onInputChange('downpayment_due_days')}
              helperText={`Global: ${ps?.downpayment_due_days || 7} days`}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
            />
          </Box>

          <Box display="flex" gap={2}>
            <TextField
              select
              fullWidth
              label="Balance Due Type"
              value={formData.balance_due_type || ''}
              onChange={onSelectChange('balance_due_type')}
              helperText={`Global: ${ps?.balance_due_type || 'DAYS_BEFORE'}`}
              size="small"
            >
              <MenuItem value="">Use Global Default</MenuItem>
              <MenuItem value="DAYS_BEFORE">Specific Days Before Event</MenuItem>
              <MenuItem value="DAY_BEFORE">Day Before Event</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Balance Due Days Before"
              type="number"
              value={formData.balance_due_days}
              onChange={onInputChange('balance_due_days')}
              helperText={`Global: ${ps?.balance_due_days || 30} days`}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      {/* Security Deposit Override */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Security Deposit Override
        </Typography>

        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.security_deposit_enabled === true}
                onChange={onSwitchChange('security_deposit_enabled')}
              />
            }
            label={`Enable Security Deposit (Global: ${renderGlobalDefault('security_deposit_enabled', ps?.security_deposit_enabled)})`}
          />

          {formData.security_deposit_enabled && (
            <>
              <TextField
                fullWidth
                label="Security Deposit Amount"
                type="number"
                value={formData.security_deposit_amount}
                onChange={onInputChange('security_deposit_amount')}
                helperText={`Global: ${currencySymbol}${ps?.security_deposit_amount || 0}`}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{currencySymbol}</InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.security_deposit_is_refundable === true}
                    onChange={onSwitchChange('security_deposit_is_refundable')}
                  />
                }
                label={`Refundable (Global: ${renderGlobalDefault('security_deposit_is_refundable', ps?.security_deposit_is_refundable)})`}
              />

              <TextField
                fullWidth
                label="Security Deposit Description"
                value={formData.security_deposit_description}
                onChange={onInputChange('security_deposit_description')}
                helperText="Leave empty to use global description"
                size="small"
                placeholder="e.g., Collected upon check-in"
              />
            </>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Cancellation Fee Override */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Cancellation Fee Override
        </Typography>

        <TextField
          fullWidth
          label="Cancellation Admin Fee"
          type="number"
          value={formData.cancellation_admin_fee_percentage}
          onChange={onInputChange('cancellation_admin_fee_percentage')}
          helperText={`Global: ${ps?.cancellation_admin_fee_percentage || 0}%`}
          size="small"
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />
      </Box>

      <Divider />

      {/* Late Fee Override */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Late Fee Override
        </Typography>

        <Stack spacing={2}>
          <TextField
            select
            fullWidth
            label="Late Fee Type"
            value={formData.late_fee_type || ''}
            onChange={onSelectChange('late_fee_type')}
            helperText={`Global default: ${ps?.late_fee_type || 'FIXED'}`}
            size="small"
          >
            <MenuItem value="">Use Global Default</MenuItem>
            <MenuItem value="FIXED">Fixed Amount</MenuItem>
            <MenuItem value="PERCENTAGE">Percentage of Invoice</MenuItem>
          </TextField>

          {formData.late_fee_type === 'FIXED' && (
            <TextField
              fullWidth
              label="Late Fee Amount"
              type="number"
              value={formData.late_fee_amount}
              onChange={onInputChange('late_fee_amount')}
              helperText={`Global: ${currencySymbol}${ps?.default_late_fee_amount || 25}`}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
              }}
            />
          )}

          {formData.late_fee_type === 'PERCENTAGE' && (
            <TextField
              fullWidth
              label="Late Fee Percentage"
              type="number"
              value={formData.late_fee_percentage}
              onChange={onInputChange('late_fee_percentage')}
              helperText={`Global: ${ps?.late_fee_percentage || 0}%`}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          )}
        </Stack>
      </Box>
    </>
  );
};
