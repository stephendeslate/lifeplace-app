import React from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  MenuItem,
  Stack,
  InputAdornment,
} from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import type { SectionWithCurrencyProps } from './types';

interface DepositSettingsSectionProps extends SectionWithCurrencyProps {
  depositType: 'PERCENTAGE' | 'FIXED';
  securityDepositEnabled: boolean;
}

export const DepositSettingsSection: React.FC<DepositSettingsSectionProps> = ({
  control,
  errors,
  currencySymbol,
  depositType,
  securityDepositEnabled,
}) => (
  <>
    {/* Reservation Deposit Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Reservation Deposit Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <MoneyIcon color="secondary" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure reservation deposit requirements and behavior
          </Typography>
        </Box>

        <Controller
          name="deposit_type"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              select
              label="Deposit Type"
              helperText="Choose whether deposit is a percentage of total or a fixed amount"
            >
              <MenuItem value="PERCENTAGE">Percentage of Total</MenuItem>
              <MenuItem value="FIXED">Fixed Amount</MenuItem>
            </TextField>
          )}
        />

        {depositType === 'PERCENTAGE' ? (
          <Controller
            name="default_deposit_percentage"
            control={control}
            rules={{
              required: 'Deposit percentage is required',
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 100, message: 'Cannot exceed 100%' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Deposit Percentage"
                type="number"
                error={!!errors.default_deposit_percentage}
                helperText={
                  errors.default_deposit_percentage?.message ||
                  'Percentage of total contract price required as deposit'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            )}
          />
        ) : (
          <Controller
            name="deposit_fixed_amount"
            control={control}
            rules={{
              required: 'Fixed deposit amount is required',
              min: { value: 0, message: 'Cannot be negative' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Fixed Deposit Amount"
                type="number"
                error={!!errors.deposit_fixed_amount}
                helperText={
                  errors.deposit_fixed_amount?.message || 'Fixed reservation deposit amount'
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{currencySymbol}</InputAdornment>
                  ),
                }}
              />
            )}
          />
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Controller
            name="deposit_is_refundable"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} color="success" />}
                label="Deposit is Refundable"
              />
            )}
          />

          <Controller
            name="deposit_is_deductible"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} color="success" />}
                label="Deposit is Deductible from Total"
              />
            )}
          />

          <Controller
            name="deposit_waived_on_full_payment"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} color="success" />}
                label="Waive Deposit on Full Payment"
              />
            )}
          />
        </Box>
      </Stack>
    </Box>

    {/* Security Deposit Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Security Deposit Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <MoneyIcon color="info" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure security/damage deposit requirements
          </Typography>
        </Box>

        <Controller
          name="security_deposit_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} color="info" />}
              label="Enable Security Deposit"
            />
          )}
        />

        {securityDepositEnabled && (
          <>
            <Controller
              name="security_deposit_amount"
              control={control}
              rules={{
                required: securityDepositEnabled ? 'Security deposit amount is required' : false,
                min: { value: 0, message: 'Cannot be negative' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Security Deposit Amount"
                  type="number"
                  error={!!errors.security_deposit_amount}
                  helperText={
                    errors.security_deposit_amount?.message ||
                    'Fixed security deposit amount collected on check-in'
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">{currencySymbol}</InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="security_deposit_is_refundable"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      {...field}
                      checked={field.value}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: 'success.main',
                          '& + .MuiSwitch-track': {
                            bgcolor: 'success.main',
                          },
                        },
                      }}
                    />
                  }
                  label="Security Deposit is Refundable (after inspection)"
                />
              )}
            />

            <Controller
              name="security_deposit_description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Security Deposit Description"
                  placeholder="e.g., Collected upon check-in, refunded after inspection"
                  helperText="Optional description shown in contracts"
                />
              )}
            />
          </>
        )}
      </Stack>
    </Box>
  </>
);
