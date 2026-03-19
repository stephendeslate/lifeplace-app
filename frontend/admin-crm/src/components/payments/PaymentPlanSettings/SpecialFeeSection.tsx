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
import { EventRepeat as RescheduleIcon, AccessTime as LateCheckoutIcon } from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import type { SectionWithCurrencyProps } from './types';

interface SpecialFeeSectionProps extends SectionWithCurrencyProps {
  reschedulingFeeEnabled: boolean;
  reschedulingFeeType: 'PERCENTAGE' | 'FIXED';
  lateCheckoutFeeEnabled: boolean;
  lateCheckoutFeeType: 'FIXED' | 'HOURLY' | 'PERCENTAGE';
}

export const SpecialFeeSection: React.FC<SpecialFeeSectionProps> = ({
  control,
  errors,
  currencySymbol,
  reschedulingFeeEnabled,
  reschedulingFeeType,
  lateCheckoutFeeEnabled,
  lateCheckoutFeeType,
}) => (
  <>
    {/* Rescheduling Fee Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Rescheduling Fee Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <RescheduleIcon color="warning" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure fee when client changes event date after booking
          </Typography>
        </Box>

        <Controller
          name="rescheduling_fee_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} color="warning" />}
              label="Enable Rescheduling Fee"
            />
          )}
        />

        {reschedulingFeeEnabled && (
          <>
            <Controller
              name="rescheduling_fee_type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Rescheduling Fee Type"
                  helperText="Choose whether fee is a percentage or fixed amount"
                >
                  <MenuItem value="PERCENTAGE">Percentage of Contract</MenuItem>
                  <MenuItem value="FIXED">Fixed Amount</MenuItem>
                </TextField>
              )}
            />

            {reschedulingFeeType === 'PERCENTAGE' ? (
              <Controller
                name="rescheduling_fee_percentage"
                control={control}
                rules={{
                  required: 'Rescheduling fee percentage is required',
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 100, message: 'Cannot exceed 100%' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Rescheduling Fee Percentage"
                    type="number"
                    error={!!errors.rescheduling_fee_percentage}
                    helperText={
                      errors.rescheduling_fee_percentage?.message ||
                      'Percentage of contract total charged for rescheduling'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                name="rescheduling_fee_fixed_amount"
                control={control}
                rules={{
                  required: 'Fixed rescheduling fee is required',
                  min: { value: 0, message: 'Cannot be negative' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Fixed Rescheduling Fee"
                    type="number"
                    error={!!errors.rescheduling_fee_fixed_amount}
                    helperText={
                      errors.rescheduling_fee_fixed_amount?.message ||
                      'Fixed amount charged for rescheduling'
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

            <Controller
              name="rescheduling_grace_period_hours"
              control={control}
              rules={{
                required: 'Grace period is required',
                min: { value: 0, message: 'Cannot be negative' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Grace Period"
                  type="number"
                  helperText="Hours after booking during which rescheduling is free"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                  }}
                />
              )}
            />
          </>
        )}
      </Stack>
    </Box>

    {/* Late Checkout Fee Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Late Checkout Fee Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <LateCheckoutIcon color="error" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure fee for checkout beyond scheduled end time
          </Typography>
        </Box>

        <Controller
          name="late_checkout_fee_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} color="error" />}
              label="Enable Late Checkout Fee"
            />
          )}
        />

        {lateCheckoutFeeEnabled && (
          <>
            <Controller
              name="late_checkout_fee_type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Late Checkout Fee Type"
                  helperText="Choose how the late checkout fee is calculated"
                >
                  <MenuItem value="FIXED">Fixed Amount</MenuItem>
                  <MenuItem value="HOURLY">Per Hour</MenuItem>
                  <MenuItem value="PERCENTAGE">Percentage of Contract</MenuItem>
                </TextField>
              )}
            />

            {lateCheckoutFeeType === 'PERCENTAGE' ? (
              <Controller
                name="late_checkout_fee_percentage"
                control={control}
                rules={{
                  required: 'Late checkout fee percentage is required',
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 100, message: 'Cannot exceed 100%' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Late Checkout Fee Percentage"
                    type="number"
                    error={!!errors.late_checkout_fee_percentage}
                    helperText={
                      errors.late_checkout_fee_percentage?.message ||
                      'Percentage of contract for late checkout'
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                name="late_checkout_fee_amount"
                control={control}
                rules={{
                  required: 'Late checkout fee amount is required',
                  min: { value: 0, message: 'Cannot be negative' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={
                      lateCheckoutFeeType === 'HOURLY' ? 'Fee Per Hour' : 'Fixed Late Checkout Fee'
                    }
                    type="number"
                    error={!!errors.late_checkout_fee_amount}
                    helperText={
                      errors.late_checkout_fee_amount?.message ||
                      (lateCheckoutFeeType === 'HOURLY'
                        ? 'Amount charged per hour of late checkout'
                        : 'Fixed amount for late checkout')
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

            <Box sx={{ display: 'flex', gap: 3 }}>
              <Controller
                name="late_checkout_grace_minutes"
                control={control}
                rules={{
                  required: 'Grace period is required',
                  min: { value: 0, message: 'Cannot be negative' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Grace Period"
                    type="number"
                    helperText="Minutes after scheduled end before fee applies"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">min</InputAdornment>,
                    }}
                  />
                )}
              />

              <Controller
                name="late_checkout_max_hours"
                control={control}
                rules={{
                  required: 'Max hours is required',
                  min: { value: 1, message: 'Must be at least 1 hour' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Maximum Billable Hours"
                    type="number"
                    helperText="Cap on hours charged for late checkout"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                    }}
                  />
                )}
              />
            </Box>
          </>
        )}
      </Stack>
    </Box>
  </>
);
