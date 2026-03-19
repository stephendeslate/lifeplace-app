import React from 'react';
import { Box, TextField, Typography, MenuItem, Stack, InputAdornment } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import { PAYMENT_FREQUENCIES } from '@/types/payments';
import type { SectionProps } from './types';

export const BalanceAndScheduleSection: React.FC<SectionProps> = ({ control, errors }) => (
  <>
    {/* Balance Due Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Balance Due Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <MoneyIcon color="primary" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure when payment balance becomes due
          </Typography>
        </Box>

        <Controller
          name="balance_due_days"
          control={control}
          rules={{
            required: 'Balance due days is required',
            min: { value: 1, message: 'Must be at least 1 day' },
            max: { value: 365, message: 'Cannot exceed 365 days' },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Days Before Event When Balance Is Due"
              type="number"
              error={!!errors.balance_due_days}
              helperText={
                errors.balance_due_days?.message ||
                'Number of days before the event/service date when the remaining balance becomes due'
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
            />
          )}
        />
      </Stack>
    </Box>

    {/* Default Installment Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Default Installment Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <PaymentIcon color="success" />
          <Typography variant="subtitle2" color="text.secondary">
            Set default installment plan configuration
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Controller
            name="default_installments"
            control={control}
            rules={{
              required: 'Number of installments is required',
              min: { value: 2, message: 'Must be at least 2 installments' },
              max: { value: 24, message: 'Cannot exceed 24 installments' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Default Number of Installments"
                type="number"
                error={!!errors.default_installments}
                helperText={
                  errors.default_installments?.message || 'Default number of payment installments'
                }
              />
            )}
          />

          <Controller
            name="default_installment_frequency"
            control={control}
            rules={{ required: 'Frequency is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                select
                label="Default Installment Frequency"
                error={!!errors.default_installment_frequency}
                helperText={
                  errors.default_installment_frequency?.message || 'How often installments are due'
                }
              >
                {PAYMENT_FREQUENCIES.map((freq) => (
                  <MenuItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Box>
      </Stack>
    </Box>

    {/* Payment Schedule Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Payment Schedule Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <ScheduleIcon color="primary" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure downpayment and balance due schedule
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Controller
            name="downpayment_percentage"
            control={control}
            rules={{
              required: 'Downpayment percentage is required',
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 100, message: 'Cannot exceed 100%' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Downpayment Percentage"
                type="number"
                error={!!errors.downpayment_percentage}
                helperText={
                  errors.downpayment_percentage?.message ||
                  'Percentage of total required as downpayment to block the date'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            )}
          />

          <Controller
            name="downpayment_due_days"
            control={control}
            rules={{
              required: 'Downpayment due days is required',
              min: { value: 1, message: 'Must be at least 1 day' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Downpayment Due Within"
                type="number"
                error={!!errors.downpayment_due_days}
                helperText={
                  errors.downpayment_due_days?.message || 'Days after booking to pay downpayment'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
              />
            )}
          />
        </Box>

        <Controller
          name="balance_due_type"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              select
              label="Balance Due Type"
              helperText="When the remaining balance is due"
            >
              <MenuItem value="DAYS_BEFORE">Specific Days Before Event</MenuItem>
              <MenuItem value="DAY_BEFORE">Day Before Event</MenuItem>
            </TextField>
          )}
        />
      </Stack>
    </Box>
  </>
);
