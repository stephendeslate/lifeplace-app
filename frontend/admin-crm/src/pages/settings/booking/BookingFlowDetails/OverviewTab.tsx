// frontend/admin-crm/src/pages/settings/booking/BookingFlowDetails/OverviewTab.tsx

import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { Settings as SettingsIcon, List as StepsIcon } from '@mui/icons-material';
import { ModernMetricCard } from '@/components/common/ModernDesignSystem';
import {
  getEventTypeDisplayName,
  getEventTypeChipColor,
  getEventTypeChipStyles,
} from '@/utils/bookingFlowUtils';
import type { BookingFlowDetail } from '@/types/bookingflows';

interface OverviewTabProps {
  flow: BookingFlowDetail;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ flow }) => (
  <Stack spacing={4}>
    {/* Flow Metrics Grid */}
    <Box
      display="grid"
      gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
      gap={3}
    >
      <ModernMetricCard
        title="Flow Status"
        value={flow.is_active ? 'Active' : 'Inactive'}
        description={flow.is_test_mode ? 'Test Mode Enabled' : 'Production Ready'}
        color={flow.is_active ? 'success' : 'warning'}
        icon={<SettingsIcon />}
      />

      <ModernMetricCard
        title="Steps Progress"
        value={`${flow.enabled_steps_count}/${flow.total_steps}`}
        description="Steps Configured"
        color="primary"
        icon={<StepsIcon />}
      />

      <ModernMetricCard
        title="Guest Booking"
        value={flow.allow_guest_booking ? 'Allowed' : 'Restricted'}
        description="Access Control"
        color={flow.allow_guest_booking ? 'success' : 'warning'}
        icon={<SettingsIcon />}
      />

      <ModernMetricCard
        title="Auto Approval"
        value={flow.auto_approve_bookings ? 'Enabled' : 'Manual'}
        description="Approval Process"
        color={flow.auto_approve_bookings ? 'success' : 'warning'}
        icon={<SettingsIcon />}
      />
    </Box>

    {/* Flow Information */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
        Flow Information
      </Typography>
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Name
          </Typography>
          <Typography variant="h6" fontWeight="600">
            {flow.name}
          </Typography>
        </Box>

        {flow.description && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {flow.description}
            </Typography>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Event Type
          </Typography>
          <Chip
            label={getEventTypeDisplayName(flow)}
            size="medium"
            color={getEventTypeChipColor(flow)}
            variant="outlined"
            sx={getEventTypeChipStyles(flow)}
          />
        </Box>
      </Stack>
    </Box>

    {/* Configuration Summary */}
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
        Configuration Summary
      </Typography>
      <Stack spacing={2.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight="500">
            Booking Window:
          </Typography>
          <Typography variant="body2" fontWeight="600" color="primary.main">
            {flow.min_advance_booking_days} - {flow.max_advance_booking_days} days
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight="500">
            Discounts:
          </Typography>
          <Chip
            label={flow.allow_discounts ? 'Enabled' : 'Disabled'}
            size="small"
            color={flow.allow_discounts ? 'success' : 'default'}
            variant={flow.allow_discounts ? 'filled' : 'outlined'}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight="500">
            Payment Processing:
          </Typography>
          <Chip
            label={flow.require_immediate_payment ? 'Immediate' : 'Deferred'}
            size="small"
            color={flow.require_immediate_payment ? 'success' : 'warning'}
            variant="outlined"
          />
        </Box>

        {flow.default_payment_gateway && (
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight="500">
              Payment Gateway:
            </Typography>
            <Chip label="Configured" size="small" color="success" variant="filled" />
          </Box>
        )}
      </Stack>
    </Box>
  </Stack>
);
