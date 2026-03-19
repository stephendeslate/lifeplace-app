// Check-in / Checkout tracking card with times, notes, and action buttons

import React from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import {
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Warning as WarningIcon,
  Timer as TimerIcon,
  EventBusy as NoShowIcon,
} from '@mui/icons-material';
import type { EventProfileLogic } from './useEventProfileLogic';

interface CheckInOutCardProps {
  event: NonNullable<EventProfileLogic['event']>;
  formatCheckInTime: EventProfileLogic['formatCheckInTime'];
  formatEventPrice: EventProfileLogic['formatEventPrice'];
  canPerformCheckIn: EventProfileLogic['canPerformCheckIn'];
  canPerformCheckout: EventProfileLogic['canPerformCheckout'];
  onCheckIn: () => void;
  onCheckOut: () => void;
  onNoShow: () => void;
}

export const CheckInOutCard: React.FC<CheckInOutCardProps> = ({
  event,
  formatCheckInTime,
  formatEventPrice,
  canPerformCheckIn,
  canPerformCheckout,
  onCheckIn,
  onCheckOut,
  onNoShow,
}) => {
  if (event.status === 'CANCELLED') return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Stack spacing={3}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <TimerIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Check-in / Checkout
              </Typography>
            </Box>
            <Chip
              label={
                event.check_in_status === 'CHECKED_IN'
                  ? 'Checked In'
                  : event.check_in_status === 'CHECKED_OUT'
                    ? 'Checked Out'
                    : event.check_in_status === 'NO_SHOW'
                      ? 'No Show'
                      : 'Pending'
              }
              color={
                event.check_in_status === 'CHECKED_IN'
                  ? 'success'
                  : event.check_in_status === 'CHECKED_OUT'
                    ? 'info'
                    : event.check_in_status === 'NO_SHOW'
                      ? 'error'
                      : 'default'
              }
              variant="outlined"
            />
          </Box>

          {/* Times Display */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
            }}
          >
            {/* Scheduled Check-in */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                Scheduled Check-in
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1}>
                <CheckInIcon color="action" sx={{ fontSize: 20 }} />
                <Typography variant="body2" fontWeight={500}>
                  {formatCheckInTime(event.scheduled_check_in_time)}
                </Typography>
              </Box>
              {event.actual_check_in_time && (
                <Box mt={1.5} pt={1.5} sx={{ borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    Actual: {formatCheckInTime(event.actual_check_in_time)}
                  </Typography>
                  {event.checked_in_by_name && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      By: {event.checked_in_by_name}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Scheduled Checkout */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                Scheduled Checkout
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1}>
                <CheckOutIcon color="action" sx={{ fontSize: 20 }} />
                <Typography variant="body2" fontWeight={500}>
                  {formatCheckInTime(event.scheduled_checkout_time)}
                </Typography>
              </Box>
              {event.actual_checkout_time && (
                <Box mt={1.5} pt={1.5} sx={{ borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    Actual: {formatCheckInTime(event.actual_checkout_time)}
                  </Typography>
                  {event.checked_out_by_name && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      By: {event.checked_out_by_name}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* Late Checkout Warning */}
          {event.late_checkout_fee_applied && event.late_checkout_fee_amount && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2" fontWeight={600}>
                Late Checkout Fee Applied: {formatEventPrice(event.late_checkout_fee_amount)}
              </Typography>
            </Alert>
          )}

          {/* Notes Display */}
          {(event.check_in_notes || event.checkout_notes) && (
            <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                Notes
              </Typography>
              {event.check_in_notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Check-in:</strong> {event.check_in_notes}
                </Typography>
              )}
              {event.checkout_notes && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Checkout:</strong> {event.checkout_notes}
                </Typography>
              )}
            </Box>
          )}

          {/* Action Buttons */}
          <Box display="flex" gap={2} flexWrap="wrap">
            {canPerformCheckIn() && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckInIcon />}
                onClick={onCheckIn}
              >
                Check In Guest
              </Button>
            )}
            {canPerformCheckout() && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckOutIcon />}
                onClick={onCheckOut}
              >
                Checkout Guest
              </Button>
            )}
            {event.check_in_status === 'PENDING' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<NoShowIcon />}
                onClick={onNoShow}
              >
                Mark No Show
              </Button>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};
