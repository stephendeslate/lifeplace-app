/**
 * EventSelector - Event selection component for thread creation
 *
 * Features:
 * - Displays events for selected client
 * - Uses existing useClientEvents hook
 * - Shows event name, date, and status
 * - Optional field (can be null for general client communications)
 */

import React, { useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { Event as EventIcon } from '@mui/icons-material';
import { useClients } from '../../../hooks/useClients';
import type { Event } from '../../../types/events.types';

export interface EventSelectorProps {
  clientId: number | null;
  value: Event | null;
  onChange: (event: Event | null) => void;
  disabled?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    case 'lead':
      return 'info';
    default:
      return 'default';
  }
};

const formatEventDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const EventSelector: React.FC<EventSelectorProps> = ({
  clientId,
  value,
  onChange,
  disabled = false,
}) => {
  const { useClientEvents } = useClients();

  // Only fetch events if we have a client selected
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useClientEvents(clientId || 0);

  const events = eventsData || [];

  const handleChange = useCallback((eventId: string) => {
    if (eventId === '') {
      onChange(null);
    } else {
      const selectedEvent = events.find(event => event.id.toString() === eventId);
      onChange(selectedEvent || null);
    }
  }, [events, onChange]);

  const isDisabled = disabled || !clientId || isLoadingEvents;

  return (
    <FormControl fullWidth disabled={isDisabled}>
      <InputLabel id="event-selector-label">
        Event (Optional)
      </InputLabel>
      <Select
        labelId="event-selector-label"
        id="event-selector"
        value={value?.id?.toString() || ''}
        onChange={(e) => handleChange(e.target.value)}
        label="Event (Optional)"
        startAdornment={<EventIcon sx={{ color: 'text.secondary', mr: 1 }} />}
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        <MenuItem value="">
          <Typography color="text.secondary">
            No specific event (general communication)
          </Typography>
        </MenuItem>

        {events.map((event) => (
          <MenuItem key={event.id} value={event.id.toString()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {event.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {event.start_date && formatEventDate(event.start_date)}
                </Typography>
              </Box>
              <Chip
                label={event.status}
                size="small"
                color={getStatusColor(event.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                variant="outlined"
              />
            </Box>
          </MenuItem>
        ))}
      </Select>

      {!clientId && (
        <FormHelperText>
          Select a client first to see their events
        </FormHelperText>
      )}

      {clientId && isLoadingEvents && (
        <FormHelperText>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            Loading events...
          </Box>
        </FormHelperText>
      )}

      {clientId && eventsError && (
        <FormHelperText error>
          Failed to load events
        </FormHelperText>
      )}

      {clientId && !isLoadingEvents && events.length === 0 && (
        <FormHelperText>
          No events found for this client
        </FormHelperText>
      )}
    </FormControl>
  );
};