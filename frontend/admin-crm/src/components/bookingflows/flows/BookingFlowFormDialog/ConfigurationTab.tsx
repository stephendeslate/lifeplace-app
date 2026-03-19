// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/ConfigurationTab.tsx

import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Stack,
  Divider,
  Chip,
  OutlinedInput,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { EnhancedBookingFlowFormData } from './useBookingFlowFormLogic';

interface ConfigurationTabProps {
  formData: EnhancedBookingFlowFormData;
  errors: Record<string, string>;
  discountsData: Array<{ id: number; name: string; code?: string | null }>;
  handleInputChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string | number[]>
      | { target: { value: unknown } },
  ) => void;
  handleSwitchChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleMultiSelectChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (event: SelectChangeEvent<number[]>) => void;
}

export const ConfigurationTab: React.FC<ConfigurationTabProps> = ({
  formData,
  errors,
  discountsData,
  handleInputChange,
  handleSwitchChange,
  handleMultiSelectChange,
}) => (
  <Stack spacing={3}>
    <Typography variant="h6" gutterBottom>
      Booking Settings
    </Typography>

    <Box display="flex" flexDirection="column" gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.allow_guest_booking}
            onChange={handleSwitchChange('allow_guest_booking')}
          />
        }
        label="Allow Guest Booking"
      />
      <Typography variant="caption" color="text.secondary">
        Allow clients to book without creating an account
      </Typography>
    </Box>

    <Box display="flex" flexDirection="column" gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.require_account_creation}
            onChange={handleSwitchChange('require_account_creation')}
          />
        }
        label="Require Account Creation"
      />
      <Typography variant="caption" color="text.secondary">
        Force clients to create an account during booking
      </Typography>
    </Box>

    <Box display="flex" flexDirection="column" gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.auto_approve_bookings}
            onChange={handleSwitchChange('auto_approve_bookings')}
          />
        }
        label="Auto-approve Bookings"
      />
      <Typography variant="caption" color="text.secondary">
        Automatically approve bookings without manual review
      </Typography>
    </Box>

    <Box display="flex" flexDirection="column" gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.enable_progress_saving}
            onChange={handleSwitchChange('enable_progress_saving')}
          />
        }
        label="Enable Progress Saving"
      />
      <Typography variant="caption" color="text.secondary">
        Allow clients to save progress and return later
      </Typography>
    </Box>

    <Divider />

    <Typography variant="h6" gutterBottom>
      Booking Window
    </Typography>

    <Box display="flex" gap={2}>
      <TextField
        label="Minimum Advance Days"
        value={formData.min_advance_booking_days}
        onChange={handleInputChange('min_advance_booking_days')}
        error={!!errors.min_advance_booking_days}
        helperText={errors.min_advance_booking_days || 'Minimum days in advance'}
        type="number"
        sx={{ flex: 1 }}
        autoComplete="off"
      />

      <TextField
        label="Maximum Advance Days"
        value={formData.max_advance_booking_days}
        onChange={handleInputChange('max_advance_booking_days')}
        error={!!errors.max_advance_booking_days}
        helperText={errors.max_advance_booking_days || 'Maximum days in advance'}
        type="number"
        sx={{ flex: 1 }}
        autoComplete="off"
      />
    </Box>

    <Box display="flex" flexDirection="column" gap={2}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.allow_discounts}
            onChange={handleSwitchChange('allow_discounts')}
          />
        }
        label="Allow Discounts"
      />
      <Typography variant="caption" color="text.secondary">
        Enable discount codes and promotional offers
      </Typography>
    </Box>

    {/* Discounts multi-select */}
    {formData.allow_discounts && (
      <FormControl fullWidth>
        <InputLabel>Available Discounts</InputLabel>
        <Select
          multiple
          value={formData.available_discounts}
          onChange={handleMultiSelectChange('available_discounts')}
          input={<OutlinedInput label="Available Discounts" />}
          renderValue={(selected) => (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {(selected as number[]).map((value) => {
                const discount = discountsData.find((d) => d.id === value);
                return (
                  <Chip key={value} label={discount?.name || `Discount ${value}`} size="small" />
                );
              })}
            </Box>
          )}
        >
          {discountsData.map((discount) => (
            <MenuItem key={discount.id} value={discount.id}>
              <Box>
                <Typography variant="body2">{discount.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Code: {discount.code || 'No code required'}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )}
  </Stack>
);
