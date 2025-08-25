// frontend/client-portal/src/pages/events/EventsList.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  ButtonGroup,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Event as EventIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
} from '@mui/icons-material';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/events';
import type { Event, EventStatus } from '../../types/events.types';

const EventsList: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data fetching
  const { useEventsList } = useEvents();
  const { 
    data: events = [], 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useEventsList({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    upcoming_only: upcomingOnly,
  });

  // Event handlers
  const handleStatusFilterChange = (status: EventStatus | 'ALL') => {
    setStatusFilter(status);
  };

  const handleUpcomingToggle = (upcoming: boolean) => {
    setUpcomingOnly(upcoming);
  };

  const handleEventClick = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Filter events by search term
  const filteredEvents = events.filter(event =>
    searchTerm === '' || 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.event_type_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Status options
  const statusOptions: Array<{ value: EventStatus | 'ALL'; label: string; color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = [
    { value: 'ALL', label: 'All Events' },
    { value: 'DRAFT', label: 'Draft', color: 'default' },
    { value: 'CONFIRMED', label: 'Confirmed', color: 'info' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'warning' },
    { value: 'COMPLETED', label: 'Completed', color: 'success' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
  ];

  // Loading skeleton
  const renderSkeleton = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Box 
          key={index}
          sx={{ 
            flex: viewMode === 'grid' 
              ? { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' } 
              : '100%'
          }}
        >
          <EventCard event={{} as Event} loading />
        </Box>
      ))}
    </Box>
  );

  // Empty state
  const renderEmptyState = () => (
    <Paper 
      sx={{ 
        p: 4, 
        textAlign: 'center',
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <EventIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" gutterBottom color="text.secondary">
        {searchTerm || statusFilter !== 'ALL' || upcomingOnly ? 
          'No events match your filters' : 
          'No events yet'
        }
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {searchTerm || statusFilter !== 'ALL' || upcomingOnly ? 
          'Try adjusting your search criteria or filters.' :
          'Your events will appear here once you start planning with us.'
        }
      </Typography>
      {(searchTerm || statusFilter !== 'ALL' || upcomingOnly) && (
        <Button
          variant="outlined"
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('ALL');
            setUpcomingOnly(false);
          }}
        >
          Clear Filters
        </Button>
      )}
    </Paper>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your events and celebrations
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={handleRefresh}
            disabled={isRefetching}
            aria-label="Refresh events"
          >
            <RefreshIcon />
          </IconButton>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
            aria-label="View mode"
          >
            <ToggleButton value="grid" aria-label="Grid view">
              <GridIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view">
              <ListIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Search and upcoming toggle */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems={{ sm: 'center' }}
          >
            <TextField
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, maxWidth: { sm: 300 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Show:
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  variant={upcomingOnly ? 'contained' : 'outlined'}
                  onClick={() => handleUpcomingToggle(!upcomingOnly)}
                  startIcon={<CalendarIcon />}
                >
                  Upcoming Only
                </Button>
              </ButtonGroup>
            </Stack>
          </Stack>

          {/* Status filters */}
          <Stack 
            direction="row" 
            spacing={1} 
            flexWrap="wrap" 
            gap={1}
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Status:
            </Typography>
            {statusOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                variant={statusFilter === option.value ? 'filled' : 'outlined'}
                color={statusFilter === option.value ? (option.color || 'primary') : 'default'}
                onClick={() => handleStatusFilterChange(option.value)}
                clickable
                size="small"
              />
            ))}
          </Stack>

          {/* Active filters indicator */}
          {(searchTerm || statusFilter !== 'ALL' || upcomingOnly) && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Active filters:
              </Typography>
              {searchTerm && (
                <Chip
                  label={`Search: "${searchTerm}"`}
                  size="small"
                  onDelete={() => setSearchTerm('')}
                  variant="outlined"
                />
              )}
              {statusFilter !== 'ALL' && (
                <Chip
                  label={`Status: ${statusFilter}`}
                  size="small"
                  onDelete={() => handleStatusFilterChange('ALL')}
                  variant="outlined"
                />
              )}
              {upcomingOnly && (
                <Chip
                  label="Upcoming only"
                  size="small"
                  onDelete={() => handleUpcomingToggle(false)}
                  variant="outlined"
                />
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Content */}
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Unable to load events. Please try again later.
        </Alert>
      ) : isLoading ? (
        renderSkeleton()
      ) : filteredEvents.length === 0 ? (
        renderEmptyState()
      ) : (
        <Fade in>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {filteredEvents.map((event) => (
              <Box 
                key={event.id}
                sx={{ 
                  flex: viewMode === 'grid' 
                    ? { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' } 
                    : '100%'
                }}
              >
                <EventCard
                  event={event}
                  onClick={() => handleEventClick(event.id)}
                />
              </Box>
            ))}
          </Box>
        </Fade>
      )}

      {/* Results summary */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredEvents.length} of {events.length} events
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EventsList;