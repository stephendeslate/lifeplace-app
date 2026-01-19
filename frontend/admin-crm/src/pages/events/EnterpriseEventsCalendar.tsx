// frontend/admin-crm/src/pages/events/EnterpriseEventsCalendar.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
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
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
  Alert,
  alpha,
  Badge,
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
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  CheckCircle as AvailableIcon,
  Block as BlockedIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  startOfWeek as startOfWeekDate,
  endOfWeek as endOfWeekDate
} from 'date-fns';
import {
  getTodayInManila,
  isTodayInManila,
  formatDateForApi,
  getCalendarGridDates,
  getWeekDates,
  isSameMonthInManila,
  getDayOfWeekInManila,
  formatInManila,
} from '../../utils/timezone';
import { useNavigate } from 'react-router-dom';

import { useLayout } from '../../contexts/LayoutContext';
import { useEvents, useEventTypes } from '../../hooks/useEvents';
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernCard } from '../../components/common/ModernCard';
import { ModernPageHeader, type HeaderAction } from '../../components/common/ModernPageHeader';
import ModernLoadingStates from '../../components/common/ModernLoadingStates';
import { useCalendarAvailability, useAvailabilityCache } from '../../hooks/useAvailability';
import { EventForm } from '../../components/events/EventForm';
import { AvailabilityIndicator, AvailabilityBadge } from '../../components/availability/AvailabilityIndicator';
import { eventsApi } from '../../apis/events.api';

import type { Event, EventFilters, CreateEventData, EventStatus } from '../../types/events.types';
import type { CalendarDateInfo, AvailabilityFilters } from '../../types/availability.types';
import { EVENT_STATUSES } from '../../types/events.types';

type CalendarView = 'month' | 'week';

interface CalendarEvent extends Event {
  startDate: Date;
  endDate: Date | null;
}

interface EnhancedCalendarSettings {
  showAvailabilityIndicators: boolean;
  showConflictDetails: boolean;
  enableRealTimeUpdates: boolean;
  highlightUnavailableDates: boolean;
  showAvailabilityStats: boolean;
  autoRefreshInterval: number;
}

export const EnterpriseEventsCalendar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  // Core calendar state - use Manila timezone for "today"
  const [currentDate, setCurrentDate] = useState(() => getTodayInManila());
  const [view, setView] = useState<CalendarView>('month');
  const [filters, setFilters] = useState<EventFilters>({});
  const [availabilityFilters, setAvailabilityFilters] = useState<AvailabilityFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Enterprise calendar settings
  const [settings, setSettings] = useState<EnhancedCalendarSettings>({
    showAvailabilityIndicators: true,
    showConflictDetails: true,
    enableRealTimeUpdates: false,
    highlightUnavailableDates: true,
    showAvailabilityStats: true,
    autoRefreshInterval: 30000, // 30 seconds
  });
  
  // Selected date for detailed availability view
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availabilityDetailOpen, setAvailabilityDetailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Hooks
  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();
  const { refreshCalendar, prefetchDateRange } = useAvailabilityCache();

  const {
    events = [],
    isLoadingEvents,
    createEvent,
    isCreatingEvent,
  } = useEvents(filters);
  
  // Calculate calendar date range for availability checking (Manila timezone)
  const calendarDateRange = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return {
        start: formatDateForApi(startDate),
        end: formatDateForApi(endDate),
      };
    } else {
      const weekStart = startOfWeekDate(currentDate);
      const weekEnd = endOfWeekDate(currentDate);
      return {
        start: formatDateForApi(weekStart),
        end: formatDateForApi(weekEnd),
      };
    }
  }, [currentDate, view]);
  
  // Availability data
  const {
    isLoading: isLoadingAvailability,
    error: availabilityError,
    refetch: refetchAvailability,
    getDateAvailability,
  } = useCalendarAvailability(
    calendarDateRange.start,
    calendarDateRange.end,
    {
      event_type_id: availabilityFilters.event_type_id,
      booking_flow_id: availabilityFilters.booking_flow_id,
      show_conflicts: availabilityFilters.show_conflicts,
      show_buffer_conflicts: availabilityFilters.show_buffer_conflicts,
    },
    settings.showAvailabilityIndicators
  );

  // Convert events to calendar events with parsed dates
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map(event => ({
      ...event,
      startDate: parseISO(event.start_date),
      endDate: event.end_date ? parseISO(event.end_date) : null,
    }));
  }, [events]);

  // Get calendar grid dates (Manila timezone aware)
  const calendarDates = useMemo(() => {
    if (view === 'month') {
      return getCalendarGridDates(currentDate);
    } else {
      return getWeekDates(currentDate);
    }
  }, [currentDate, view]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    return calendarEvents.filter(event => {
      if (isSameDay(event.startDate, date)) return true;
      if (event.endDate && event.startDate <= date && date <= event.endDate) return true;
      return false;
    });
  }, [calendarEvents]);
  
  // Enhanced calendar grid with availability data
  const enhancedCalendarDates: CalendarDateInfo[] = useMemo(() => {
    return calendarDates.map(date => {
      const dateStr = formatDateForApi(date);
      const availability = getDateAvailability(dateStr);
      const dayEvents = getEventsForDate(date);
      
      const defaultAvailability: CalendarDateInfo = {
        date: dateStr,
        status: 'available' as const,
        conflict_level: 'none' as const,
        confirmed_events_count: 0,
        lead_events_count: 0,
        total_events_count: 0,
        can_book_event: true,
        can_create_lead: true,
        conflicts: [],
        reasons: [],
        buffer_conflicts: [],
        isToday: isTodayInManila(date),
        isCurrentMonth: isSameMonthInManila(date, currentDate),
        isWeekend: getDayOfWeekInManila(date) === 0 || getDayOfWeekInManila(date) === 6,
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
      };

      return availability ? {
        ...availability,
        isToday: isTodayInManila(date),
        isCurrentMonth: isSameMonthInManila(date, currentDate),
        isWeekend: getDayOfWeekInManila(date) === 0 || getDayOfWeekInManila(date) === 6,
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
      } : defaultAvailability;
    });
  }, [calendarDates, currentDate, getDateAvailability, getEventsForDate]);

  // Enhanced date selection with availability info
  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = formatDateForApi(date);

    setSelectedDate(dateStr);
    setCurrentDate(date);

    // Open create event dialog
    setCreateDialogOpen(true);
  }, []);

  // Initialize breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Calendar' },
    ]);
  }, [setBreadcrumbs]);

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchValue || undefined
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Auto-refresh availability data
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (settings.enableRealTimeUpdates && settings.autoRefreshInterval > 0) {
      interval = setInterval(() => {
        refetchAvailability();
      }, settings.autoRefreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.enableRealTimeUpdates, settings.autoRefreshInterval, refetchAvailability]);
  
  // Prefetch adjacent months for better UX
  useEffect(() => {
    if (view === 'month') {
      const prevMonth = subMonths(currentDate, 1);
      const nextMonth = addMonths(currentDate, 1);

      // Prefetch previous month
      const prevStart = formatDateForApi(startOfWeek(startOfMonth(prevMonth)));
      const prevEnd = formatDateForApi(endOfWeek(endOfMonth(prevMonth)));
      prefetchDateRange(prevStart, prevEnd, availabilityFilters);

      // Prefetch next month
      const nextStart = formatDateForApi(startOfWeek(startOfMonth(nextMonth)));
      const nextEnd = formatDateForApi(endOfWeek(endOfMonth(nextMonth)));
      prefetchDateRange(nextStart, nextEnd, availabilityFilters);
    }
  }, [currentDate, view, prefetchDateRange, availabilityFilters]);

  // Enhanced navigation handlers
  const handlePrevious = useCallback(() => {
    const newDate = view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
  }, [view, currentDate]);

  const handleNext = useCallback(() => {
    const newDate = view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
  }, [view, currentDate]);

  const handleToday = useCallback(() => {
    const today = getTodayInManila();
    setCurrentDate(today);
    setSelectedDate(formatDateForApi(today));
    refetchAvailability();
  }, [refetchAvailability]);
  
  // Enhanced view switching
  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
    setSelectedDate(null);
  }, []);

  const handleEventClick = useCallback((event: Event) => {
    navigate(`/events/${event.id}`);
  }, [navigate]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, eventItem: Event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedEvent(eventItem);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedEvent(null);
  }, []);
  
  // Enhanced filter handlers
  const handleFilterChange = useCallback((key: keyof EventFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value === 'true' ? true : value === 'false' ? false : parseInt(value) || value
    }));
  }, []);
  
  const handleAvailabilityFilterChange = useCallback((key: keyof AvailabilityFilters, value: unknown) => {
    setAvailabilityFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  }, []);
  
  const handleSettingChange = useCallback((key: keyof EnhancedCalendarSettings, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  // Enhanced refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchAvailability(),
    ]);
    await refreshCalendar(calendarDateRange.start, calendarDateRange.end);
  }, [refetchAvailability, refreshCalendar, calendarDateRange]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await eventsApi.exportEvents(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-calendar-${formatInManila(currentDate, 'yyyy-MM')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [filters, currentDate]);

  // Enhanced utility functions
  const getStatusColor = useCallback((status: EventStatus) => {
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
  }, []);

  const getEventTime = useCallback((event: CalendarEvent) => {
    if (event.endDate && !isSameDay(event.startDate, event.endDate)) {
      return 'Multi-day';
    }
    return format(event.startDate, 'HH:mm');
  }, []);
  
  const getDateCellStyle = useCallback((dateInfo: CalendarDateInfo) => {
    const baseStyle = {
      minHeight: isMobile ? 80 : 120,
      p: 1,
      border: 1,
      borderRadius: 1,
      cursor: 'pointer',
      position: 'relative' as const,
      transition: 'all 0.2s ease-in-out',
    };
    
    // Availability-based styling
    if (settings.highlightUnavailableDates && !dateInfo.can_book_event) {
      return {
        ...baseStyle,
        borderColor: theme.palette.error.main,
        backgroundColor: dateInfo.isCurrentMonth
          ? alpha(theme.palette.error.main, 0.1)
          : alpha(theme.palette.error.main, 0.05),
        opacity: dateInfo.isCurrentMonth ? 1 : 0.7,
        '&:hover': {
          backgroundColor: alpha(theme.palette.error.main, 0.2),
        },
      };
    }
    
    // Standard styling with availability indicators
    const backgroundColor = dateInfo.isToday
      ? theme.palette.primary.main
      : dateInfo.isCurrentMonth
        ? 'background.paper'
        : 'grey.50';
        
    return {
      ...baseStyle,
      borderColor: dateInfo.hasEvents ? theme.palette.primary.light : 'divider',
      backgroundColor,
      opacity: dateInfo.isCurrentMonth ? 1 : 0.6,
      '&:hover': {
        backgroundColor: dateInfo.isToday
          ? theme.palette.primary.dark
          : dateInfo.isCurrentMonth
            ? 'grey.100'
            : 'grey.200',
        transform: 'scale(1.02)',
      },
    };
  }, [isMobile, settings.highlightUnavailableDates, theme]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== undefined) ||
           Object.values(availabilityFilters).some(value => value !== undefined);
  }, [filters, availabilityFilters]);

  // Enhanced month view renderer
  const renderEnhancedMonthView = () => {
    const weeks = [];
    for (let i = 0; i < enhancedCalendarDates.length; i += 7) {
      weeks.push(enhancedCalendarDates.slice(i, i + 7));
    }

    return (
      <ModernCard variant="flat" size="large">
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
              {week.map((dateInfo) => {
                const date = new Date(dateInfo.date);
                const dayEvents = getEventsForDate(date);
                
                return (
                  <Box
                    key={dateInfo.date}
                    sx={getDateCellStyle(dateInfo)}
                    onClick={() => handleDateSelect(date)}
                  >
                    {/* Date Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: dateInfo.isToday ? 'bold' : 'normal',
                          color: dateInfo.isToday 
                            ? 'primary.contrastText' 
                            : dateInfo.isCurrentMonth 
                              ? 'text.primary' 
                              : 'text.secondary',
                        }}
                      >
                        {formatInManila(date, 'd')}
                      </Typography>
                      
                      {/* Availability Indicator */}
                      {settings.showAvailabilityIndicators && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <AvailabilityBadge 
                            availability={dateInfo} 
                            size="small"
                          />
                          {dateInfo.conflicts.length > 0 && (
                            <Badge badgeContent={dateInfo.conflicts.length} color="error" max={9}>
                              <WarningIcon fontSize="small" color="warning" />
                            </Badge>
                          )}
                        </Stack>
                      )}
                    </Stack>
                    
                    {/* Events */}
                    <Stack spacing={0.5} sx={{ maxHeight: isMobile ? 40 : 80, overflow: 'hidden' }}>
                      {dayEvents.slice(0, isMobile ? 1 : 3).map(event => (
                        <Tooltip 
                          key={event.id} 
                          title={`${event.name || 'Untitled Event'} - ${event.client_name}`}
                          arrow
                        >
                          <Box
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
                                transform: 'scale(1.02)',
                              },
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'inherit' }}>
                              {getEventTime(event)} {event.name || 'Untitled'}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ))}
                      
                      {/* More events indicator */}
                      {dayEvents.length > (isMobile ? 1 : 3) && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            textAlign: 'center',
                            fontStyle: 'italic',
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' }
                          }}
                          onClick={() => setSelectedDate(dateInfo.date)}
                        >
                          +{dayEvents.length - (isMobile ? 1 : 3)} more
                        </Typography>
                      )}
                    </Stack>
                    
                    {/* Availability Status Bar */}
                    {settings.showAvailabilityIndicators && !dateInfo.can_book_event && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          backgroundColor: dateInfo.can_create_lead ? 'warning.main' : 'error.main',
                          borderRadius: '0 0 4px 4px',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </ModernCard>
    );
  };

  // Enhanced week view renderer
  const renderEnhancedWeekView = () => {
    return (
      <ModernCard variant="flat" size="large">
        <Box sx={{ p: 2 }}>
          {/* Week Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
            {enhancedCalendarDates.map(dateInfo => {
              const date = new Date(dateInfo.date);
              return (
                <Box key={dateInfo.date} sx={{ textAlign: 'center', p: 1 }}>
                  <Stack spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {formatInManila(date, 'EEE')}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: dateInfo.isToday ? 'bold' : 'normal',
                        color: dateInfo.isToday ? 'primary.main' : 'text.primary',
                      }}
                    >
                      {formatInManila(date, 'd')}
                    </Typography>
                    {settings.showAvailabilityIndicators && (
                      <AvailabilityBadge availability={dateInfo} size="medium" />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
          
          {/* Week Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {enhancedCalendarDates.map(dateInfo => {
              const date = new Date(dateInfo.date);
              const dayEvents = getEventsForDate(date);
              
              return (
                <Box
                  key={dateInfo.date}
                  sx={{
                    minHeight: 400,
                    p: 1,
                    border: 1,
                    borderColor: dateInfo.hasEvents ? 'primary.light' : 'divider',
                    borderRadius: 1,
                    backgroundColor: dateInfo.isToday ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                  onClick={() => handleDateSelect(date)}
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
                          position: 'relative',
                          '&:hover': {
                            elevation: 3,
                            transform: 'translateY(-1px)',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, event);
                          }}
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
                    
                    {/* Availability info for week view */}
                    {settings.showAvailabilityIndicators && (
                      <Box sx={{ mt: 'auto', pt: 1 }}>
                        <AvailabilityIndicator 
                          availability={dateInfo} 
                          compact={true}
                          interactive={true}
                          onClick={() => setAvailabilityDetailOpen(true)}
                        />
                      </Box>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>
      </ModernCard>
    );
  };

  // Build header actions
  const primaryAction: HeaderAction = {
    icon: <AddIcon />,
    label: 'Add Event',
    onClick: () => setCreateDialogOpen(true),
    variant: 'contained',
  };

  const secondaryActions: HeaderAction[] = [
    {
      icon: <RefreshIcon />,
      label: isLoadingAvailability ? 'Refreshing...' : 'Refresh',
      onClick: handleRefresh,
      variant: 'outlined',
      disabled: isLoadingAvailability,
    },
    {
      icon: <ExportIcon />,
      label: 'Export',
      onClick: handleExport,
      variant: 'outlined',
    },
  ];

  // Loading state
  if (isLoadingEvents && !events.length) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernLoadingStates.ModernLoadingSpinner
          size={40}
          message="Loading calendar..."
          variant="circular"
        />
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title="Calendar"
        subtitle={view === 'month'
          ? formatInManila(currentDate, 'MMMM yyyy')
          : `Week of ${format(startOfWeekDate(currentDate), 'MMM d')} - ${format(endOfWeekDate(currentDate), 'MMM d, yyyy')}`
        }
        icon={<EventIcon />}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        size="medium"
      />

      {/* Availability Error Alert */}
      {availabilityError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Unable to load availability data. Some features may be limited.
          <Button size="small" onClick={() => refetchAvailability()} sx={{ ml: 1 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Calendar Controls */}
      <ModernCard variant="flat" size="medium" sx={{ mb: 3 }}>
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
                  backgroundColor: isTodayInManila(currentDate) ? 'primary.light' : 'transparent',
                }}
              >
                Today
              </Button>
              
              <IconButton onClick={handleNext}>
                <ChevronRightIcon />
              </IconButton>
              
              <Typography variant="h6" sx={{ ml: 2, minWidth: 200 }}>
                {view === 'month' 
                  ? formatInManila(currentDate, 'MMMM yyyy')
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
                  onClick={() => handleViewChange('month')}
                  color={view === 'month' ? 'primary' : 'default'}
                >
                  <MonthIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleViewChange('week')}
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

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Availability</InputLabel>
                  <Select
                    value={availabilityFilters.show_conflicts !== undefined ? 
                           (availabilityFilters.show_conflicts ? 'conflicts' : 'available') : 'all'}
                    label="Availability"
                    onChange={(e) => handleAvailabilityFilterChange('show_conflicts', 
                      e.target.value === 'conflicts' ? true : 
                      e.target.value === 'available' ? false : undefined
                    )}
                  >
                    <MenuItem value="all">All Dates</MenuItem>
                    <MenuItem value="available">Available Only</MenuItem>
                    <MenuItem value="conflicts">With Conflicts</MenuItem>
                  </Select>
                </FormControl>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      setFilters({});
                      setAvailabilityFilters({});
                      setSearchValue('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </>
          )}
      </ModernCard>

      {/* Calendar View */}
      {view === 'month' ? renderEnhancedMonthView() : renderEnhancedWeekView()}

      {/* Legend */}
      <ModernCard variant="flat" size="medium" sx={{ mt: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Event Status
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
            </Box>
            
            {settings.showAvailabilityIndicators && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Availability Status
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AvailableIcon color="success" fontSize="small" />
                    <Typography variant="caption">Available</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WarningIcon color="warning" fontSize="small" />
                    <Typography variant="caption">Leads Only</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BlockedIcon color="error" fontSize="small" />
                    <Typography variant="caption">Unavailable</Typography>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Stack>
      </ModernCard>

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

      {/* Availability Detail Dialog */}
      <Dialog
        open={availabilityDetailOpen}
        onClose={() => setAvailabilityDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Availability Details
            </Typography>
            <IconButton onClick={() => setAvailabilityDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedDate && (
            <AvailabilityIndicator
              availability={getDateAvailability(selectedDate) || {
                date: selectedDate,
                status: 'available',
                conflict_level: 'none',
                confirmed_events_count: 0,
                lead_events_count: 0,
                total_events_count: 0,
                can_book_event: true,
                can_create_lead: true,
                conflicts: [],
                reasons: [],
                buffer_conflicts: [],
              }}
              showDetails={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Calendar Settings
            </Typography>
            <IconButton onClick={() => setSettingsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showAvailabilityIndicators}
                  onChange={(e) => handleSettingChange('showAvailabilityIndicators', e.target.checked)}
                />
              }
              label="Show Availability Indicators"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showConflictDetails}
                  onChange={(e) => handleSettingChange('showConflictDetails', e.target.checked)}
                />
              }
              label="Show Conflict Details"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.highlightUnavailableDates}
                  onChange={(e) => handleSettingChange('highlightUnavailableDates', e.target.checked)}
                />
              }
              label="Highlight Unavailable Dates"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showAvailabilityStats}
                  onChange={(e) => handleSettingChange('showAvailabilityStats', e.target.checked)}
                />
              }
              label="Show Availability Statistics"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableRealTimeUpdates}
                  onChange={(e) => handleSettingChange('enableRealTimeUpdates', e.target.checked)}
                />
              }
              label="Enable Real-time Updates"
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </ModernPageLayout>
  );
};

export default EnterpriseEventsCalendar;