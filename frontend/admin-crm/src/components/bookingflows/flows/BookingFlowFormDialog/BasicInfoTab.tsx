// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/BasicInfoTab.tsx

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
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { EnhancedBookingFlowFormData } from './useBookingFlowFormLogic';

interface BasicInfoTabProps {
  formData: EnhancedBookingFlowFormData;
  errors: Record<string, string>;
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  eventTypesData: Array<{ id: number; name: string }>;
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
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  errors,
  firstInputRef,
  eventTypesData,
  handleInputChange,
  handleSwitchChange,
}) => (
  <Stack spacing={3}>
    <TextField
      inputRef={firstInputRef}
      fullWidth
      label="Flow Name"
      value={formData.name}
      onChange={handleInputChange('name')}
      error={!!errors.name}
      helperText={errors.name || 'A descriptive name for this booking flow'}
      required
      autoComplete="off"
    />

    <TextField
      fullWidth
      label="Description"
      value={formData.description}
      onChange={handleInputChange('description')}
      multiline
      rows={3}
      helperText="Optional description explaining when to use this flow"
      autoComplete="off"
    />

    <FormControl fullWidth>
      <InputLabel>Event Type</InputLabel>
      <Select
        value={formData.event_type}
        onChange={handleInputChange('event_type')}
        label="Event Type"
      >
        <MenuItem value="">
          <em>Any Event Type</em>
        </MenuItem>
        {eventTypesData.map((eventType) => (
          <MenuItem key={eventType.id} value={eventType.id.toString()}>
            {eventType.name}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Only one active booking flow is allowed per event type. Choose "Any Event Type" for a
        universal flow.
      </Typography>
    </FormControl>

    <Box>
      <FormControlLabel
        control={<Switch checked={formData.is_active} onChange={handleSwitchChange('is_active')} />}
        label="Active"
      />
      <Typography variant="caption" color="text.secondary" display="block">
        Only active flows are available for client bookings
      </Typography>
    </Box>
  </Stack>
);
