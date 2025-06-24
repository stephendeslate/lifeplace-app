// frontend/admin-crm/src/pages/events/EventsCalendar.tsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewModule as MonthIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  EventNote as EventIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isToday, addWeeks, subWeeks, startOfWeek as startOfWeekDate, endOfWeek as endOfWeekDate } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents, useEventTypes } from '../../hooks/useEvents';
import { EventForm } from '../../components/events/EventForm';
import { eventsApi } from '../../apis/events.api';
import type { Event, EventFilters, CreateEventData, EventStatus } from '../../types/events.types';
import { EVENT_STATUSES } from '../../types/events.types';

type CalendarView = 'month' | 'week';

interface CalendarEvent extends Event {
  startDate: Date;
  endDate: Date | null;
}

export const EventsCalendar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [filters, setFilters] = useState<EventFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();

  const {
    events = [],
    isLoadingEvents,
    createEvent,
    isCreatingEvent,
  } = useEvents(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Calendar' },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchValue || undefined
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Convert events to calendar events with parsed dates
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map(event => ({
      ...event,
      startDate: parseISO(event.start_date),
      endDate: event.end_date ? parseISO(event.end_date) : null,
    }));
  }, [events]);

  // Get calendar grid dates
  const calendarDates = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);

      const dates = [];
      let day = startDate;
      while (day <= endDate) {
        dates.push(new Date(day)); // Create new Date objects to avoid reference issues
        day = addDays(day, 1);
      }
      return dates;
    } else {
      // Week view
      const weekStart = startOfWeekDate(currentDate);
      const weekEnd = endOfWeekDate(currentDate);
      
      const dates = [];
      let day = weekStart;
      while (day <= weekEnd) {
        dates.push(new Date(day)); // Create new Date objects to avoid reference issues
        day = addDays(day, 1);
      }
      return dates;
    }
  }, [currentDate, view]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return calendarEvents.filter(event => {
      if (isSameDay(event.startDate, date)) return true;
      if (event.endDate && event.startDate <= date && date <= event.endDate) return true;
      return false;
    });
  };

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    
    // Force a re-render by updating the key or ensuring the calendar recognizes the change
    // The calendar should automatically update to show the current month/week containing today
  };

  const handleEventClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, eventItem: Event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedEvent(eventItem);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedEvent(null);
  };

  const handleExport = async () => {
    try {
      const blob = await eventsApi.exportEvents(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-calendar-${format(currentDate, 'yyyy-MM')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value === 'true' ? true : value === 'false' ? false : parseInt(value) || value
    }));
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'LEAD':
        return 'info';
      case 'CONFIRMED':
        return 'success';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEventTime = (event: CalendarEvent) => {
    if (event.endDate && !isSameDay(event.startDate, event.endDate)) {
      return 'Multi-day';
    }
    return format(event.startDate, 'HH:mm');
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  // Render calendar grid for month view
  const renderMonthView = () => {
    const weeks = [];
    for (let i = 0; i < calendarDates.length; i += 7) {
      weeks.push(calendarDates.slice(i, i + 7));
    }

    return (
      <Card>
        <Box sx={{ p: 2 }}>
          {/* Calendar Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Typography
                key={day}
                variant="subtitle2"
                align="center"
                sx={{ p: 1, fontWeight: 600, color: 'text.secondary' }}
              >
                {day}
              </Typography>
            ))}
          </Box>
          
          {/* Calendar Grid */}
          {weeks.map((week, weekIndex) => (
            <Box key={weekIndex} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
              {week.map(date => {
                const dayEvents = getEventsForDate(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isCurrentDay = isToday(date);
                
                return (
                  <Box
                    key={date.toISOString()}
                    sx={{
                      minHeight: isMobile ? 80 : 120,
                      p: 1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      backgroundColor: isCurrentDay 
                        ? 'primary.main' 
                        : isCurrentMonth 
                          ? 'background.paper' 
                          : 'grey.50',
                      opacity: isCurrentMonth ? 1 : 0.6,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: isCurrentDay 
                          ? 'primary.dark' 
                          : isCurrentMonth 
                            ? 'grey.100' 
                            : 'grey.200',
                      },
                    }}
                    onClick={() => {
                      const clickedDate = new Date(date);
                      setCurrentDate(clickedDate);
                      // If clicking on a date outside current month, navigate to that month
                      if (!isCurrentMonth && view === 'month') {
                        setCurrentDate(clickedDate);
                      }
                    }}
                  >
                    {/* Date Number */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isCurrentDay ? 'bold' : 'normal',
                        color: isCurrentDay 
                          ? 'primary.contrastText' 
                          : isCurrentMonth 
                            ? 'text.primary' 
                            : 'text.secondary',
                        mb: 0.5,
                      }}
                    >
                      {format(date, 'd')}
                    </Typography>
                    
                    {/* Events */}
                    <Stack spacing={0.5}>
                      {dayEvents.slice(0, isMobile ? 2 : 3).map(event => (
                        <Box
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          sx={{
                            p: 0.5,
                            borderRadius: 0.5,
                            backgroundColor: `${getStatusColor(event.status)}.main`,
                            color: `${getStatusColor(event.status)}.contrastText`,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          }}
                        >
                          <Tooltip title={`${event.name || 'Untitled Event'} - ${event.client_name}`}>
                            <Typography variant="caption" sx={{ color: 'inherit' }}>
                              {getEventTime(event)} {event.name || 'Untitled'}
                            </Typography>
                          </Tooltip>
                        </Box>
                      ))}
                      {dayEvents.length > (isMobile ? 2 : 3) && (
                        <Typography variant="caption" color="text.secondary">
                          +{dayEvents.length - (isMobile ? 2 : 3)} more
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Card>
    );
  };

  // Render week view
  const renderWeekView = () => {
    return (
      <Card>
        <Box sx={{ p: 2 }}>
          {/* Week Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
            {calendarDates.map(date => (
              <Box key={date.toISOString()} sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {format(date, 'EEE')}
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: isToday(date) ? 'bold' : 'normal',
                    color: isToday(date) ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {format(date, 'd')}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {/* Week Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {calendarDates.map(date => {
              const dayEvents = getEventsForDate(date);
              
              return (
                <Box
                  key={date.toISOString()}
                  sx={{
                    minHeight: 400,
                    p: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: isToday(date) ? 'primary.main' : 'background.paper',
                    position: 'relative',
                  }}
                >
                  <Stack spacing={1}>
                    {dayEvents.map(event => (
                      <Paper
                        key={event.id}
                        elevation={1}
                        sx={{
                          p: 1,
                          backgroundColor: `${getStatusColor(event.status)}.main`,
                          color: `${getStatusColor(event.status)}.contrastText`,
                          cursor: 'pointer',
                          '&:hover': {
                            elevation: 2,
                            opacity: 0.9,
                          },
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          {getEventTime(event)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {event.name || 'Untitled Event'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {event.client_name}
                        </Typography>
                        
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, event)}
                          sx={{ 
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            color: 'inherit',
                            opacity: 0.7,
                            '&:hover': { opacity: 1 },
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Card>
    );
  };

  if (isLoadingEvents) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {view === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : `Week of ${format(startOfWeekDate(currentDate), 'MMM d')} - ${format(endOfWeekDate(currentDate), 'MMM d, yyyy')}`
            }
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Event
          </Button>
        </Stack>
      </Box>

      {/* Calendar Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center" 
            justifyContent="space-between"
          >
            {/* Navigation Controls */}
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={handlePrevious}>
                <ChevronLeftIcon />
              </IconButton>
              
              <Button
                variant="outlined"
                onClick={handleToday}
                startIcon={<TodayIcon />}
                sx={{ 
                  minWidth: 100,
                  backgroundColor: isToday(currentDate) ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: isToday(currentDate) ? 'primary.main' : 'action.hover',
                  }
                }}
              >
                Today
              </Button>
              
              <IconButton onClick={handleNext}>
                <ChevronRightIcon />
              </IconButton>
              
              <Typography variant="h6" sx={{ ml: 2, minWidth: 200 }}>
                {view === 'month' 
                  ? format(currentDate, 'MMMM yyyy')
                  : `${format(startOfWeekDate(currentDate), 'MMM d')} - ${format(endOfWeekDate(currentDate), 'MMM d, yyyy')}`
                }
              </Typography>
            </Stack>

            {/* View Controls and Filters */}
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Search */}
              <TextField
                size="small"
                placeholder="Search events..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
                sx={{ minWidth: 200 }}
              />

              {/* Filter Toggle */}
              <IconButton 
                onClick={() => setFiltersOpen(!filtersOpen)}
                color={hasActiveFilters ? 'primary' : 'default'}
              >
                <FilterIcon />
              </IconButton>

              {/* View Toggle */}
              <Stack direction="row" spacing={0}>
                <IconButton
                  onClick={() => setView('month')}
                  color={view === 'month' ? 'primary' : 'default'}
                >
                  <MonthIcon />
                </IconButton>
                <IconButton
                  onClick={() => setView('week')}
                  color={view === 'week' ? 'primary' : 'default'}
                >
                  <WeekIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Stack>

          {/* Expandable Filters */}
          {filtersOpen && (
            <>
              <Divider sx={{ my: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || 'all'}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    {EVENT_STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={filters.event_type || 'all'}
                    label="Event Type"
                    onChange={(e) => handleFilterChange('event_type', String(e.target.value))}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {eventTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      setFilters({});
                      setSearchValue('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Calendar View */}
      {view === 'month' ? renderMonthView() : renderWeekView()}

      {/* Legend */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Event Status Legend
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {EVENT_STATUSES.map((status) => (
              <Chip
                key={status.value}
                label={status.label}
                color={getStatusColor(status.value)}
                size="small"
                variant="filled"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedEvent) navigate(`/events/${selectedEvent.id}`);
          handleMenuClose();
        }}>
          <EventIcon sx={{ mr: 1 }} />
          View Event
        </MenuItem>
      </Menu>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <EventForm
            onSubmit={(data) => {
              createEvent(data as CreateEventData, {
                onSuccess: () => setCreateDialogOpen(false)
              });
            }}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={isCreatingEvent}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};