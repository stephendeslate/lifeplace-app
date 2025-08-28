// frontend/client-portal/src/components/common/PhilippinesDateTimePicker.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { BUSINESS_TIMEZONE_DISPLAY } from '../../utils/timezone';
import { TimezoneBadge } from './TimezoneDisplay';

interface PhilippinesDateTimePickerProps {
  date?: Date | null;
  time?: Date | null;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: Date | null) => void;
  label?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Date/Time picker that clearly indicates selections are in Philippines timezone
 * No confusion - all selections are PHT
 */
export const PhilippinesDateTimePicker: React.FC<PhilippinesDateTimePickerProps> = ({
  date,
  time,
  onDateChange,
  onTimeChange,
  label = "Event Date & Time",
  required = false,
  minDate,
  maxDate
}) => {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6" component="label">
          {label}
          {required && <span style={{ color: 'red' }}>*</span>}
        </Typography>
        <TimezoneBadge />
      </Stack>
      
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ mb: 2, fontStyle: 'italic' }}
      >
        Select your preferred date and time in Philippines timezone ({BUSINESS_TIMEZONE_DISPLAY})
      </Typography>
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <DatePicker
          label="Date (Philippines)"
          value={date}
          onChange={onDateChange}
          minDate={minDate}
          maxDate={maxDate}
          format="EEEE, MMMM d, yyyy"
          slotProps={{
            textField: {
              fullWidth: true,
              helperText: "All events occur in the Philippines"
            }
          }}
        />
        
        <TimePicker
          label="Time (Philippines)"
          value={time}
          onChange={onTimeChange}
          format="h:mm a"
          ampm
          slotProps={{
            textField: {
              fullWidth: true,
              helperText: `Time in ${BUSINESS_TIMEZONE_DISPLAY} timezone`
            }
          }}
        />
      </Stack>
      
      {(date || time) && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 1.5, 
            bgcolor: 'primary.50', 
            borderRadius: 1,
            borderLeft: '3px solid',
            borderColor: 'primary.main'
          }}
        >
          <Typography variant="body2" fontWeight="medium" color="primary.main">
            Selected Time: {date && time ? 
              `${date.toLocaleDateString('en-PH')} at ${time.toLocaleTimeString('en-PH', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })} ${BUSINESS_TIMEZONE_DISPLAY}` 
              : 'Please select both date and time'
            }
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This event will take place in the Philippines at the time shown above
          </Typography>
        </Box>
      )}
    </Box>
  );
};