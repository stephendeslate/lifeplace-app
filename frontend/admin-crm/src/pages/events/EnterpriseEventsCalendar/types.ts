import type { Event, EventFilters, EventStatus } from '@/types/events.types';
import type { CalendarDateInfo, AvailabilityFilters } from '@/types/availability.types';

export type CalendarView = 'month' | 'week';

export interface CalendarEvent extends Event {
  startDate: Date;
  endDate: Date | null;
}

export interface EnhancedCalendarSettings {
  showAvailabilityIndicators: boolean;
  showConflictDetails: boolean;
  enableRealTimeUpdates: boolean;
  highlightUnavailableDates: boolean;
  showAvailabilityStats: boolean;
  autoRefreshInterval: number;
}

export interface CalendarLogic {
  // State
  currentDate: Date;
  view: CalendarView;
  filters: EventFilters;
  availabilityFilters: AvailabilityFilters;
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  selectedEvent: Event | null;
  menuAnchor: HTMLElement | null;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  settings: EnhancedCalendarSettings;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  availabilityDetailOpen: boolean;
  setAvailabilityDetailOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Data
  events: Event[];
  isLoadingEvents: boolean;
  isCreatingEvent: boolean;
  isLoadingAvailability: boolean;
  availabilityError: Error | null;
  eventTypes: Array<{ id: number; name: string }>;
  enhancedCalendarDates: CalendarDateInfo[];
  calendarEvents: CalendarEvent[];
  hasActiveFilters: boolean;
  isMobile: boolean;

  // Handlers
  handlePrevious: () => void;
  handleNext: () => void;
  handleToday: () => void;
  handleViewChange: (view: CalendarView) => void;
  handleEventClick: (event: Event) => void;
  handleMenuOpen: (e: React.MouseEvent<HTMLElement>, event: Event) => void;
  handleMenuClose: () => void;
  handleDateSelect: (date: Date) => void;
  handleFilterChange: (key: keyof EventFilters, value: string) => void;
  handleAvailabilityFilterChange: (key: keyof AvailabilityFilters, value: unknown) => void;
  handleSettingChange: (key: keyof EnhancedCalendarSettings, value: unknown) => void;
  handleRefresh: () => Promise<void>;
  handleExport: () => Promise<void>;
  refetchAvailability: () => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getStatusColor: (status: EventStatus) => string;
  getEventTime: (event: CalendarEvent) => string;
  getDateCellStyle: (dateInfo: CalendarDateInfo) => Record<string, unknown>;
  getDateAvailability: (date: string) => CalendarDateInfo | undefined;
  createEvent: (data: unknown, options?: unknown) => void;
}
