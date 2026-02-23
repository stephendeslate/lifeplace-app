// frontend/admin-crm/src/types/availability.types.ts

export type AvailabilityStatus =
  | 'available'
  | 'partially_booked'
  | 'fully_booked'
  | 'blocked'
  | 'outside_range';

export type ConflictLevel = 'none' | 'lead_only' | 'confirmed' | 'multiple_confirmed';

export interface EventConflict {
  event_id: number;
  event_name: string;
  client_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  event_type?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface BufferConflict {
  event_id: number;
  event_name: string;
  start_date: string;
  type: 'buffer_conflict';
}

export interface DateAvailabilityInfo {
  date: string;
  status: AvailabilityStatus;
  conflict_level: ConflictLevel;
  confirmed_events_count: number;
  lead_events_count: number;
  total_events_count: number;
  can_book_event: boolean;
  can_create_lead: boolean;
  conflicts: EventConflict[];
  reasons: string[];
  buffer_conflicts: BufferConflict[];
  next_available_date?: string;
}

export interface AvailabilityRequest {
  start_date: string;
  end_date?: string;
  event_type_id?: number;
  booking_flow_id?: number;
  duration_hours?: number;
  buffer_before_hours?: number;
  buffer_after_hours?: number;
  exclude_event_id?: number;
  include_buffer_conflicts?: boolean;
}

export interface DateRangeAvailabilityResponse {
  start_date: string;
  end_date: string;
  total_days: number;
  availability: DateAvailabilityInfo[];
  summary: {
    total_days: number;
    available_days: number;
    partially_booked_days: number;
    fully_booked_days: number;
    blocked_days: number;
    availability_percentage: number;
  };
}

export interface BookingValidationRequest {
  start_date: string;
  end_date?: string;
  event_type_id?: number;
  booking_flow_id?: number;
  is_lead?: boolean;
  duration_hours?: number;
  buffer_before_hours?: number;
  buffer_after_hours?: number;
  exclude_event_id?: number;
}

export interface BookingValidationResponse {
  is_valid: boolean;
  errors: string[];
  start_date: string;
  end_date?: string;
  is_lead: boolean;
}

export interface NextAvailableDateRequest {
  start_date?: string;
  event_type_id?: number;
  max_days_ahead?: number;
}

export interface NextAvailableDateResponse {
  search_start_date: string;
  max_days_ahead: number;
  next_available_date?: string;
  days_ahead?: number;
}

export interface AvailabilityFilters {
  event_type_id?: number;
  booking_flow_id?: number;
  show_conflicts?: boolean;
  show_buffer_conflicts?: boolean;
}

// Calendar-specific types
export interface CalendarDateInfo extends DateAvailabilityInfo {
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  hasEvents: boolean;
  eventCount: number;
}

export interface AvailabilityIndicator {
  status: AvailabilityStatus;
  color: string;
  icon?: string;
  tooltip: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

// Enterprise calendar features
export interface CalendarViewConfig {
  showAvailabilityIndicators: boolean;
  showConflictDetails: boolean;
  showBufferTimes: boolean;
  enableRealTimeUpdates: boolean;
  highlightUnavailableDates: boolean;
  showNextAvailableDate: boolean;
}

export interface AvailabilityStats {
  totalDaysChecked: number;
  availableDays: number;
  partiallyBookedDays: number;
  fullyBookedDays: number;
  blockedDays: number;
  availabilityRate: number;
  conflictRate: number;
  averageConflictsPerDay: number;
}
