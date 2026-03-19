import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTheme, useMediaQuery, alpha } from '@mui/material';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek as startOfWeekDate,
  endOfWeek as endOfWeekDate,
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
  parseDateTimeAsManila,
  isSameDayInManila,
} from '@/utils/timezone';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { useEvents, useEventTypes } from '@/hooks/useEvents';
import { useCalendarAvailability, useAvailabilityCache } from '@/hooks/useAvailability';
import { eventsApi } from '@/apis/events.api';

import type { Event, EventFilters, EventStatus } from '@/types/events.types';
import type { CalendarDateInfo, AvailabilityFilters } from '@/types/availability.types';
import type { CalendarView, CalendarEvent, EnhancedCalendarSettings } from './types';

export function useCalendarLogic() {
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
    autoRefreshInterval: 30000,
  });

  // Selected date for detailed availability view
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availabilityDetailOpen, setAvailabilityDetailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hooks
  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();
  const { refreshCalendar, prefetchDateRange } = useAvailabilityCache();
  const { events = [], isLoadingEvents, createEvent, isCreatingEvent } = useEvents(filters);

  // Calculate calendar date range for availability checking (Manila timezone)
  const calendarDateRange = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: formatDateForApi(startOfWeek(monthStart)),
        end: formatDateForApi(endOfWeek(monthEnd)),
      };
    } else {
      return {
        start: formatDateForApi(startOfWeekDate(currentDate)),
        end: formatDateForApi(endOfWeekDate(currentDate)),
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
    settings.showAvailabilityIndicators,
  );

  // Convert events to calendar events with parsed dates
  // IMPORTANT: Use parseDateTimeAsManila to interpret API datetimes as PHT
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map((event) => ({
      ...event,
      startDate: parseDateTimeAsManila(event.start_date),
      endDate: event.end_date ? parseDateTimeAsManila(event.end_date) : null,
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
  // IMPORTANT: Use isSameDayInManila to compare dates in PHT context
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      return calendarEvents.filter((event) => {
        if (isSameDayInManila(event.startDate, date)) return true;
        if (event.endDate && event.startDate <= date && date <= event.endDate) return true;
        return false;
      });
    },
    [calendarEvents],
  );

  // Enhanced calendar grid with availability data
  const enhancedCalendarDates: CalendarDateInfo[] = useMemo(() => {
    return calendarDates.map((date) => {
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

      return availability
        ? {
            ...availability,
            isToday: isTodayInManila(date),
            isCurrentMonth: isSameMonthInManila(date, currentDate),
            isWeekend: getDayOfWeekInManila(date) === 0 || getDayOfWeekInManila(date) === 6,
            hasEvents: dayEvents.length > 0,
            eventCount: dayEvents.length,
          }
        : defaultAvailability;
    });
  }, [calendarDates, currentDate, getDateAvailability, getEventsForDate]);

  // Enhanced date selection with availability info
  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = formatDateForApi(date);
    setSelectedDate(dateStr);
    setCurrentDate(date);
    setCreateDialogOpen(true);
  }, []);

  // Initialize breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: 'Calendar' }]);
  }, [setBreadcrumbs]);

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchValue || undefined,
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

      const prevStart = formatDateForApi(startOfWeek(startOfMonth(prevMonth)));
      const prevEnd = formatDateForApi(endOfWeek(endOfMonth(prevMonth)));
      prefetchDateRange(prevStart, prevEnd, availabilityFilters);

      const nextStart = formatDateForApi(startOfWeek(startOfMonth(nextMonth)));
      const nextEnd = formatDateForApi(endOfWeek(endOfMonth(nextMonth)));
      prefetchDateRange(nextStart, nextEnd, availabilityFilters);
    }
  }, [currentDate, view, prefetchDateRange, availabilityFilters]);

  // Navigation handlers
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

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
    setSelectedDate(null);
  }, []);

  const handleEventClick = useCallback(
    (event: Event) => {
      navigate(`/events/${event.id}`);
    },
    [navigate],
  );

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, eventItem: Event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedEvent(eventItem);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedEvent(null);
  }, []);

  const handleFilterChange = useCallback((key: keyof EventFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]:
        value === 'all'
          ? undefined
          : value === 'true'
            ? true
            : value === 'false'
              ? false
              : parseInt(value) || value,
    }));
  }, []);

  const handleAvailabilityFilterChange = useCallback(
    (key: keyof AvailabilityFilters, value: unknown) => {
      setAvailabilityFilters((prev) => ({
        ...prev,
        [key]: value === 'all' ? undefined : value,
      }));
    },
    [],
  );

  const handleSettingChange = useCallback((key: keyof EnhancedCalendarSettings, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchAvailability()]);
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
    if (event.endDate && !isSameDayInManila(event.startDate, event.endDate)) {
      return 'Multi-day';
    }
    return formatInManila(event.startDate, 'HH:mm');
  }, []);

  const getDateCellStyle = useCallback(
    (dateInfo: CalendarDateInfo) => {
      const baseStyle = {
        minHeight: isMobile ? 80 : 120,
        p: 1,
        border: 1,
        borderRadius: 1,
        cursor: 'pointer',
        position: 'relative' as const,
        transition: 'all 0.2s ease-in-out',
      };

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
    },
    [isMobile, settings.highlightUnavailableDates, theme],
  );

  const hasActiveFilters = useMemo(() => {
    return (
      Object.values(filters).some((value) => value !== undefined) ||
      Object.values(availabilityFilters).some((value) => value !== undefined)
    );
  }, [filters, availabilityFilters]);

  return {
    // State
    currentDate,
    view,
    filters,
    availabilityFilters,
    createDialogOpen,
    setCreateDialogOpen,
    selectedEvent,
    menuAnchor,
    filtersOpen,
    setFiltersOpen,
    searchValue,
    setSearchValue,
    settings,
    selectedDate,
    setSelectedDate,
    availabilityDetailOpen,
    setAvailabilityDetailOpen,
    settingsOpen,
    setSettingsOpen,

    // Data
    events,
    isLoadingEvents,
    isCreatingEvent,
    isLoadingAvailability,
    availabilityError: availabilityError as Error | null,
    eventTypes,
    enhancedCalendarDates,
    calendarEvents,
    hasActiveFilters,
    isMobile,

    // Handlers
    handlePrevious,
    handleNext,
    handleToday,
    handleViewChange,
    handleEventClick,
    handleMenuOpen,
    handleMenuClose,
    handleDateSelect,
    handleFilterChange,
    handleAvailabilityFilterChange,
    handleSettingChange,
    handleRefresh,
    handleExport,
    refetchAvailability,
    getEventsForDate,
    getStatusColor,
    getEventTime,
    getDateCellStyle,
    getDateAvailability,
    createEvent,
  };
}
