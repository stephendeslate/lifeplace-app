// design-system/visualizations/EventAvailabilityCalendar/types.ts

// Based on actual Event model from backend
export interface EventData {
  id: number;
  name: string;
  event_type_name: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  start_date: string; // ISO string
  end_date: string; // ISO string
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

// Based on actual booking flow system
export interface AvailabilitySlot {
  date: Date;
  isAvailable: boolean;
  hasEvents: EventData[];
  isBookable: boolean; // Based on booking flow constraints
  reason?: string; // Why not bookable (e.g., "fully booked", "past date", "outside booking window")
}

export interface EventAvailabilityCalendarProps {
  events?: EventData[];
  selectedDate?: Date;
  onDateSelect?: (date: Date, slot: AvailabilitySlot) => void;
  onMonthChange?: (month: Date) => void; // Callback when month changes
  minAdvanceBookingDays?: number; // From booking flow configuration
  maxAdvanceBookingDays?: number; // From booking flow configuration
  // maxEventsPerDay removed - ANY CONFIRMED event blocks the date (business requirement)
  // showEventDetails removed - event details never shown for privacy
  compact?: boolean;
  // Range selection mode (for multi-day events)
  isRangeMode?: boolean;
  selectedEndDate?: Date;
  minRangeDays?: number; // Minimum days required for range (1 = allow same-day selection)
  maxRangeDays?: number; // Maximum days allowed for the range
  onRangeSelect?: (startDate: Date, endDate: Date) => void;
}
