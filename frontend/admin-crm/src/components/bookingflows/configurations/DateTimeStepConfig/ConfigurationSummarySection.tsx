import React from 'react';
import { Typography, Stack } from '@mui/material';
import { ConfigSection } from '@/components/common';
import type { DateTimeConfigFormData } from './types';

interface ConfigurationSummarySectionProps {
  formData: DateTimeConfigFormData;
}

export const ConfigurationSummarySection: React.FC<ConfigurationSummarySectionProps> = ({
  formData,
}) => (
  <ConfigSection title="Configuration Summary">
    <Stack spacing={1}>
      <Typography variant="body2">
        <strong>Display:</strong>{' '}
        {[
          formData.show_calendar_view && 'Calendar View',
          formData.allow_multi_day &&
            `Multi-Day Events (${formData.min_event_days}-${formData.max_event_days} days)`,
        ]
          .filter(Boolean)
          .join(', ') || 'Basic date selection'}
      </Typography>

      <Typography variant="body2">
        <strong>Available Days:</strong> {formData.available_days_of_week.length} days per week
      </Typography>

      <Typography variant="body2">
        <strong>Real-Time Availability:</strong>{' '}
        {formData.enable_real_time_availability ? 'Enabled' : 'Disabled'}
        {formData.enable_real_time_availability && ` (${formData.availability_display_mode})`}
      </Typography>

      {formData.enable_real_time_availability && (
        <Typography variant="body2">
          <strong>Availability Checks:</strong>{' '}
          {[
            formData.check_venue_availability && 'Venue',
            formData.check_resource_availability && 'Resources',
            formData.check_staff_availability && 'Staff',
          ]
            .filter(Boolean)
            .join(', ') || 'None'}
        </Typography>
      )}

      {(formData.buffer_before_hours > 0 || formData.buffer_after_hours > 0) && (
        <Typography variant="body2">
          <strong>Buffer:</strong> {formData.buffer_before_hours}h before,{' '}
          {formData.buffer_after_hours}h after
        </Typography>
      )}

      {formData.blocked_dates.length > 0 && (
        <Typography variant="body2">
          <strong>Blocked Dates:</strong> {formData.blocked_dates.length} dates blocked
        </Typography>
      )}

      {formData.allow_overbooking && (
        <Typography variant="body2">
          <strong>Overbooking:</strong> Allowed (threshold: {formData.overbooking_threshold})
        </Typography>
      )}

      {formData.sync_with_calendar && (
        <Typography variant="body2">
          <strong>Calendar Sync:</strong> {formData.calendar_source || 'Enabled'}
        </Typography>
      )}
    </Stack>
  </ConfigSection>
);
