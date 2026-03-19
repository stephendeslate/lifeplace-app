import React from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Stack,
  InputAdornment,
} from '@mui/material';
import { CancelPresentation as RefundIcon } from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import type { SectionProps } from './types';

interface RefundPolicySectionProps extends SectionProps {
  allowRefunds: boolean;
}

export const RefundPolicySection: React.FC<RefundPolicySectionProps> = ({
  control,
  errors,
  allowRefunds,
}) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
    <Typography variant="h6" fontWeight={600} gutterBottom>
      Refund Policy Settings
    </Typography>
    <Stack spacing={3}>
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <RefundIcon color="warning" />
        <Typography variant="subtitle2" color="text.secondary">
          Configure global refund policy for all booking flows
        </Typography>
      </Box>

      <Controller
        name="allow_refunds"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch {...field} checked={field.value} color="success" />}
            label="Allow Refunds"
          />
        )}
      />

      {allowRefunds && (
        <>
          <Controller
            name="refund_deadline_hours"
            control={control}
            rules={{
              required: allowRefunds
                ? 'Refund deadline is required when refunds are enabled'
                : false,
              min: { value: 1, message: 'Must be at least 1 hour' },
              max: { value: 8760, message: 'Cannot exceed 1 year (8760 hours)' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Refund Deadline (Hours Before Event)"
                type="number"
                error={!!errors.refund_deadline_hours}
                helperText={
                  errors.refund_deadline_hours?.message ||
                  'Hours before event when refunds are no longer allowed'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                }}
              />
            )}
          />

          <Controller
            name="refund_percentage"
            control={control}
            rules={{
              required: allowRefunds
                ? 'Refund percentage is required when refunds are enabled'
                : false,
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 100, message: 'Cannot exceed 100%' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Refund Percentage"
                type="number"
                error={!!errors.refund_percentage}
                helperText={
                  errors.refund_percentage?.message || 'Percentage of payment that can be refunded'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            )}
          />

          <Controller
            name="refund_policy_text"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={3}
                label="Refund Policy Text"
                helperText="Optional custom refund policy text to display to clients"
                placeholder="e.g., Full refund available up to 48 hours before your event..."
              />
            )}
          />
        </>
      )}
    </Stack>
  </Box>
);
