import React from 'react';
import { Box, Typography, Chip, Stack, Divider } from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';
import type { BookingFlowDetail } from '@/types/bookingflows';
import { ModernCard } from '@/components/common';

interface FlowConfigurationInfoProps {
  flow: BookingFlowDetail;
}

export const FlowConfigurationInfo: React.FC<FlowConfigurationInfoProps> = ({ flow }) => (
  <ModernCard sx={{ mt: 3 }}>
    <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
      <SecurityIcon color="primary" />
      Flow Configuration
    </Typography>

    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Guest Booking:
        </Typography>
        <Chip
          label={flow.allow_guest_booking ? 'Allowed' : 'Requires Account'}
          size="small"
          color={flow.allow_guest_booking ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Account Creation:
        </Typography>
        <Chip
          label={flow.require_account_creation ? 'Required' : 'Optional'}
          size="small"
          color={flow.require_account_creation ? 'error' : 'default'}
          variant="outlined"
        />
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Auto Approval:
        </Typography>
        <Chip
          label={flow.auto_approve_bookings ? 'Enabled' : 'Manual Review'}
          size="small"
          color={flow.auto_approve_bookings ? 'success' : 'info'}
          variant="outlined"
        />
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Progress Saving:
        </Typography>
        <Chip
          label={flow.enable_progress_saving ? 'Enabled' : 'Disabled'}
          size="small"
          color={flow.enable_progress_saving ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>

      <Divider />

      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Advance Booking:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {flow.min_advance_booking_days}-{flow.max_advance_booking_days} days
        </Typography>
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Discounts:
        </Typography>
        <Chip
          label={flow.allow_discounts ? 'Allowed' : 'Not Allowed'}
          size="small"
          color={flow.allow_discounts ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>

      {flow.redirect_url && (
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Success Redirect:
          </Typography>
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {flow.redirect_url}
          </Typography>
        </Box>
      )}
    </Stack>
  </ModernCard>
);
