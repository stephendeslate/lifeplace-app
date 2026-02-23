// frontend/client-portal/src/components/events/EventCard.tsx

import React from 'react';
import { Typography, Box, Chip, Stack, Button, Skeleton, useTheme, alpha } from '@mui/material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { CalendarToday as CalendarIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { formatPhilippinesTime } from '../../utils/timezone';
import type { Event } from '../../types/events.types';
import EventStatusBadge from './EventStatusBadge';
import EventCountdown from './EventCountdown';
import ContractStatusChip from './ContractStatusChip';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  loading?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, loading = false }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${alpha('#fff', 0.1)}`,
        }}
      >
        <Box sx={{ p: 3, flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="80%" />
        </Box>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      variant="light"
      intensity="medium"
      hover={Boolean(onClick)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${alpha('#fff', 0.1)}`,
        transition: 'all 0.3s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              backgroundColor: alpha('#fff', 0.08),
              border: `1px solid ${alpha('#fff', 0.2)}`,
            }
          : {},
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Event: ${event.name}`}
    >
      <Box sx={{ p: 3, flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {event.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {event.event_type_name}
            </Typography>
          </Box>
          {event.days_until_event !== null && event.days_until_event !== undefined && (
            <EventCountdown daysUntil={event.days_until_event} compact />
          )}
        </Stack>

        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <EventStatusBadge status={event.status} size="small" />
            {event.payment_status && (
              <Chip
                label={event.payment_status.replace('_', ' ')}
                size="small"
                color={
                  event.payment_status === 'PAID'
                    ? 'success'
                    : event.payment_status === 'OVERDUE'
                      ? 'error'
                      : event.payment_status === 'PARTIAL'
                        ? 'warning'
                        : 'default'
                }
                variant="outlined"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(5px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              />
            )}
            <ContractStatusChip
              status={event.contract_status}
              hasContracts={event.has_contracts}
              contractsCount={event.contracts_count}
              pendingSignatureRequired={event.pending_signature_required}
              contractExpiryDays={event.contract_expiry_days}
              size="small"
            />
          </Stack>

          <Box>
            {event.start_date && (
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatPhilippinesTime(event.start_date, false, 'MMM dd, yyyy')}
                  {event.end_date &&
                    formatPhilippinesTime(event.start_date, false, 'yyyy-MM-dd') !==
                      formatPhilippinesTime(event.end_date, false, 'yyyy-MM-dd') &&
                    ` - ${formatPhilippinesTime(event.end_date, false, 'MMM dd, yyyy')}`}
                </Typography>
              </Stack>
            )}

            {event.current_stage_name && (
              <Typography variant="body2" color="text.secondary">
                Stage: {event.current_stage_name}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      {onClick && (
        <Box sx={{ px: 3, pb: 3 }}>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowIcon />}
            aria-label={`View details for ${event.name}`}
            sx={{
              backgroundColor: alpha('#fff', 0.1),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                transform: 'scale(1.02)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            View Details
          </Button>
        </Box>
      )}
    </GlassCard>
  );
};

export default EventCard;
