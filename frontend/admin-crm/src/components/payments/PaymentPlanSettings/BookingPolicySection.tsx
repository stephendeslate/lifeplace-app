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
  Alert,
} from '@mui/material';
import { CalendarMonth as CalendarIcon, EventBusy as DateHoldIcon } from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import type { SectionProps } from './types';

interface BookingPolicySectionProps extends SectionProps {
  dateBlockingPolicy: 'IMMEDIATE' | 'ON_DOWNPAYMENT';
  dateHoldEnabled: boolean;
}

export const BookingPolicySection: React.FC<BookingPolicySectionProps> = ({
  control,
  errors: _errors,
  dateBlockingPolicy,
  dateHoldEnabled,
}) => (
  <>
    {/* Date Blocking Policy Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Date Blocking Policy
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <CalendarIcon color="secondary" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure when dates become blocked for other bookings
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>IMMEDIATE:</strong> Date is blocked as soon as a booking is confirmed (traditional
          behavior).
          <br />
          <strong>ON_DOWNPAYMENT:</strong> Date is only blocked when downpayment is received.
          Multiple clients can book the same date until one pays (first-to-pay wins).
        </Alert>

        <Controller
          name="date_blocking_policy"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              select
              label="Date Blocking Policy"
              helperText="When should dates become unavailable to other clients?"
            >
              <MenuItem value="IMMEDIATE">Block Immediately on Booking</MenuItem>
              <MenuItem value="ON_DOWNPAYMENT">Block When Downpayment Received</MenuItem>
            </TextField>
          )}
        />

        {dateBlockingPolicy === 'ON_DOWNPAYMENT' && (
          <>
            <Controller
              name="downpayment_due_reference"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Downpayment Due Reference Point"
                  helperText="When is the downpayment due date calculated from?"
                >
                  <MenuItem value="DAYS_AFTER_BOOKING">Days After Booking</MenuItem>
                  <MenuItem value="DAYS_BEFORE_EVENT">Days Before Event</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="downpayment_deadline_days"
              control={control}
              rules={{
                required: 'Deadline days is required',
                min: { value: 1, message: 'Must be at least 1 day' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Downpayment Deadline"
                  type="number"
                  helperText="Days until booking is auto-cancelled if downpayment not received"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                  }}
                />
              )}
            />
          </>
        )}
      </Stack>
    </Box>

    {/* Date Holding Settings */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Date Holding Settings
      </Typography>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <DateHoldIcon color="secondary" />
          <Typography variant="subtitle2" color="text.secondary">
            Configure temporary date holds that expire if payment not received
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Date Holds:</strong> Allow clients to temporarily reserve a date while completing
          their booking. The hold automatically expires if payment isn&apos;t received within the
          specified duration.
        </Alert>

        <Controller
          name="date_hold_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} color="secondary" />}
              label="Enable Date Holding"
            />
          )}
        />

        {dateHoldEnabled && (
          <>
            <Controller
              name="date_hold_duration_days"
              control={control}
              rules={{
                required: 'Hold duration is required',
                min: { value: 1, message: 'Must be at least 1 day' },
                max: { value: 30, message: 'Cannot exceed 30 days' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Default Hold Duration"
                  type="number"
                  helperText="Days the date is held before expiring (typical: 7 days)"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 3 }}>
              <Controller
                name="date_hold_max_extensions"
                control={control}
                rules={{
                  required: 'Max extensions is required',
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 5, message: 'Cannot exceed 5 extensions' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Maximum Extensions Allowed"
                    type="number"
                    helperText="How many times client can extend the hold"
                  />
                )}
              />

              <Controller
                name="date_hold_extension_days"
                control={control}
                rules={{
                  required: 'Extension days is required',
                  min: { value: 1, message: 'Must be at least 1 day' },
                  max: { value: 14, message: 'Cannot exceed 14 days' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Days Per Extension"
                    type="number"
                    helperText="Additional days granted per extension"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>,
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
