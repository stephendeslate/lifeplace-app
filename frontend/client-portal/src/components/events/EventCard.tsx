// frontend/client-portal/src/components/events/EventCard.tsx

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Stack,
  Button,
  Skeleton,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { Event } from '../../types/events.types';
import EventStatusBadge from './EventStatusBadge';
import EventCountdown from './EventCountdown';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  loading?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, loading = false }) => {
  if (loading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </Card>
    );
  }

  const eventDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        } : {},
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
      <CardContent sx={{ flexGrow: 1 }}>
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
                  event.payment_status === 'PAID' ? 'success' :
                  event.payment_status === 'OVERDUE' ? 'error' :
                  event.payment_status === 'PARTIAL' ? 'warning' :
                  'default'
                }
                variant="outlined"
              />
            )}
          </Stack>

          <Box>
            {eventDate && (
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {format(eventDate, 'MMM dd, yyyy')}
                  {endDate && eventDate.getTime() !== endDate.getTime() && 
                    ` - ${format(endDate, 'MMM dd, yyyy')}`
                  }
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
      </CardContent>

      {onClick && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button 
            size="small" 
            endIcon={<ArrowIcon />}
            aria-label={`View details for ${event.name}`}
          >
            View Details
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

export default EventCard;