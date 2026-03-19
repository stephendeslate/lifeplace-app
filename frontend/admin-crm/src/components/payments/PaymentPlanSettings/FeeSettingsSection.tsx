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
import {
  Schedule as ScheduleIcon,
  AutorenewRounded as AutoPayIcon,
  CancelPresentation as RefundIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import type { SectionWithCurrencyProps } from './types';

interface FeeSettingsSectionProps extends SectionWithCurrencyProps {
  lateFeeEnabled: boolean;
  lateFeeType: 'FIXED' | 'PERCENTAGE';
  serviceChargeEnabled: boolean;
}

export const FeeSettingsSection: React.FC<FeeSettingsSectionProps> = ({
  control,
  errors,
  currencySymbol,
  lateFeeEnabled,
  lateFeeType,
  serviceChargeEnabled,
}) => (
  <>
    {/* Grace Period & Late Fees */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Grace Period & Late Fees
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <ScheduleIcon color="warning" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure grace periods and late fee policies
          </Typography>
        </Box>

        <Controller
          name="grace_period_days"
          control={control}
          rules={{
            required: 'Grace period is required',
            min: { value: 0, message: 'Cannot be negative' },
            max: { value: 90, message: 'Cannot exceed 90 days' },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Grace Period Days"
              type="number"
              error={!!errors.grace_period_days}
              helperText={
                errors.grace_period_days?.message ||
                'Number of days after due date before late fees apply'
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
            />
          )}
        />

        <Controller
          name="late_fee_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} color="warning" />}
              label="Enable Late Fees"
            />
          )}
        />

        {lateFeeEnabled && (
          <>
            <Controller
              name="late_fee_type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Late Fee Type"
                  helperText="Choose whether late fee is a fixed amount or percentage of invoice"
                >
                  <MenuItem value="FIXED">Fixed Amount</MenuItem>
                  <MenuItem value="PERCENTAGE">Percentage of Invoice</MenuItem>
                </TextField>
              )}
            />

            {lateFeeType === 'FIXED' ? (
              <Controller
                name="default_late_fee_amount"
                control={control}
                rules={{
                  required: lateFeeEnabled ? 'Late fee amount is required when enabled' : false,
                  min: { value: 0, message: 'Cannot be negative' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Late Fee Amount"
                    type="number"
                    error={!!errors.default_late_fee_amount}
                    helperText={
                      errors.default_late_fee_amount?.message ||
                      'Fixed late fee amount applied to overdue payments'
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">{currencySymbol}</InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                name="late_fee_percentage"
                control={control}
                rules={{
                  required: lateFeeEnabled ? 'Late fee percentage is required when enabled' : false,
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 100, message: 'Cannot exceed 100%' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Late Fee Percentage"
                    type="number"
                    error={!!errors.late_fee_percentage}
                    helperText={
                      errors.late_fee_percentage?.message ||
                      'Percentage of invoice amount applied as late fee'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                )}
              />
            )}
          </>
        )}
      </Stack>
    </Box>

    {/* Service Charge Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Service Charge Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <ReceiptIcon color="info" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure service charge applied to bookings (separate from tax)
          </Typography>
        </Box>

        <Controller
          name="service_charge_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} color="info" />}
              label="Enable Service Charge"
            />
          )}
        />

        {serviceChargeEnabled && (
          <Controller
            name="service_charge_percentage"
            control={control}
            rules={{
              required: serviceChargeEnabled ? 'Service charge percentage is required' : false,
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 100, message: 'Cannot exceed 100%' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Service Charge Percentage"
                type="number"
                error={!!errors.service_charge_percentage}
                helperText={
                  errors.service_charge_percentage?.message ||
                  'Percentage applied to (subtotal - discount)'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            )}
          />
        )}
      </Stack>
    </Box>

    {/* Cancellation Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Cancellation Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <RefundIcon color="error" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure cancellation administrative fees
          </Typography>
        </Box>

        <Controller
          name="cancellation_admin_fee_percentage"
          control={control}
          rules={{
            min: { value: 0, message: 'Cannot be negative' },
            max: { value: 100, message: 'Cannot exceed 100%' },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Cancellation Admin Fee"
              type="number"
              error={!!errors.cancellation_admin_fee_percentage}
              helperText={
                errors.cancellation_admin_fee_percentage?.message ||
                'Percentage of payment deducted as admin fee on client cancellation'
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          )}
        />
      </Stack>
    </Box>

    {/* Auto Payment Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Auto Payment Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <AutoPayIcon color="error" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure automatic payment retry behavior
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Controller
            name="auto_payment_retry_attempts"
            control={control}
            rules={{
              required: 'Retry attempts is required',
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 10, message: 'Cannot exceed 10 attempts' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Auto Payment Retry Attempts"
                type="number"
                error={!!errors.auto_payment_retry_attempts}
                helperText={
                  errors.auto_payment_retry_attempts?.message ||
                  'Number of times to retry failed automatic payments'
                }
              />
            )}
          />

          <Controller
            name="auto_payment_retry_delay_days"
            control={control}
            rules={{
              required: 'Retry delay is required',
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 30, message: 'Cannot exceed 30 days' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Retry Delay"
                type="number"
                error={!!errors.auto_payment_retry_delay_days}
                helperText={
                  errors.auto_payment_retry_delay_days?.message ||
                  'Days to wait between retry attempts'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
              />
            )}
          />
        </Box>
      </Stack>
    </Box>
  </>
);
