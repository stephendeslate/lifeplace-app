// frontend/client-portal/src/components/events/EventCheckIn.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Login as CheckInIcon,
  CheckCircle as CheckedInIcon,
  Logout as CheckedOutIcon,
  EventBusy as NoShowIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatPhilippinesTime } from '../../utils/timezone';
import { eventsApi } from '../../apis/events.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { EventDetail, CheckInStatus } from '../../types/events.types';

interface EventCheckInProps {
  eventId: number;
  event: EventDetail;
}

const getStatusConfig = (status: CheckInStatus) => {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Pending Check-in',
        color: 'warning' as const,
        icon: <ScheduleIcon />,
        description: 'Your event is ready for check-in on the event day.',
      };
    case 'CHECKED_IN':
      return {
        label: 'Checked In',
        color: 'success' as const,
        icon: <CheckedInIcon />,
        description: 'You have successfully checked in for this event.',
      };
    case 'CHECKED_OUT':
      return {
        label: 'Checked Out',
        color: 'default' as const,
        icon: <CheckedOutIcon />,
        description: 'This event has been completed and checked out.',
      };
    case 'NO_SHOW':
      return {
        label: 'No Show',
        color: 'error' as const,
        icon: <NoShowIcon />,
        description: 'This event was marked as a no-show.',
      };
    default:
      return {
        label: 'Unknown',
        color: 'default' as const,
        icon: <ScheduleIcon />,
        description: '',
      };
  }
};

export const EventCheckIn: React.FC<EventCheckInProps> = ({ eventId, event }) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const statusConfig = getStatusConfig(event.check_in_status);

  // Self check-in mutation
  const checkInMutation = useMutation({
    mutationFn: () => eventsApi.selfCheckIn(eventId),
    onMutate: () => {
      setIsCheckingIn(true);
    },
    onSuccess: (updatedEvent) => {
      // Update the cache with the new event data
      queryClient.setQueryData(['event', eventId], updatedEvent);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showSuccess('Successfully checked in!');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      const errorMessage = error.response?.data?.detail || 'Failed to check in. Please try again.';
      showError(errorMessage);
    },
    onSettled: () => {
      setIsCheckingIn(false);
    },
  });

  const handleCheckIn = () => {
    checkInMutation.mutate();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return formatPhilippinesTime(dateString, false, 'MMMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header with Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CheckInIcon color="primary" />
            <Typography variant="h6">Event Check-in</Typography>
          </Stack>
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            color={statusConfig.color}
            variant="outlined"
          />
        </Box>

        {/* Status Description */}
        <Alert severity={statusConfig.color === 'error' ? 'error' : statusConfig.color === 'success' ? 'success' : 'info'}>
          {statusConfig.description}
        </Alert>

        {/* Time Information */}
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Scheduled Check-in:
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatDateTime(event.scheduled_check_in_time)}
              </Typography>
            </Box>

            {event.actual_check_in_time && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon color="success" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Actual Check-in:
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="success.main">
                  {formatDateTime(event.actual_check_in_time)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Check-in Button (only show if can_self_check_in is true) */}
        {event.can_self_check_in && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handleCheckIn}
              disabled={isCheckingIn || checkInMutation.isPending}
              startIcon={
                isCheckingIn || checkInMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CheckInIcon />
                )
              }
              sx={{ py: 1.5 }}
            >
              {isCheckingIn || checkInMutation.isPending ? 'Checking In...' : 'Check In Now'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Check-in is available on your event day only
            </Typography>
          </Box>
        )}

        {/* Show message if not yet time to check in */}
        {event.check_in_status === 'PENDING' && !event.can_self_check_in && (
          <Alert severity="info">
            Check-in will be available on your event day. Please return on{' '}
            <strong>{formatDateTime(event.scheduled_check_in_time || event.start_date)?.split(',')[0]}</strong>{' '}
            to check in.
          </Alert>
        )}

        {/* Success message for checked-in events */}
        {event.check_in_status === 'CHECKED_IN' && (
          <Alert severity="success" icon={<CheckedInIcon />}>
            You checked in at {formatDateTime(event.actual_check_in_time)}. Enjoy your event!
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};

export default EventCheckIn;
