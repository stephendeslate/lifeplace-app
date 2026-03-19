import type { BookingFlowStep, DateTimeStepConfiguration } from '@/types/bookingflows';

export interface DateTimeStepConfigProps {
  step: BookingFlowStep;
  config?: DateTimeStepConfiguration | null;
  onUpdate: (updatedStep: BookingFlowStep) => void;
  isLoading?: boolean;
}

export interface DateTimeConfigFormData {
  allow_multi_day: boolean;
  min_event_days: number;
  max_event_days: number;
  show_calendar_view: boolean;

  enable_real_time_availability: boolean;
  show_availability_status: boolean;
  auto_check_conflicts: boolean;

  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: unknown[];

  buffer_before_hours: number;
  buffer_after_hours: number;

  check_venue_availability: boolean;
  check_resource_availability: boolean;
  check_staff_availability: boolean;

  availability_display_mode: 'FULL' | 'LIMITED' | 'SIMPLE';

  allow_overbooking: boolean;
  overbooking_threshold: number;

  sync_with_calendar: boolean;
  calendar_source: 'GOOGLE' | 'OUTLOOK' | 'EXTERNAL' | '';
}

export const defaultFormData: DateTimeConfigFormData = {
  allow_multi_day: false,
  min_event_days: 1,
  max_event_days: 7,
  show_calendar_view: true,
  enable_real_time_availability: true,
  show_availability_status: true,
  auto_check_conflicts: true,
  blocked_dates: [],
  available_days_of_week: [1, 2, 3, 4, 5, 6, 0],
  available_time_slots: [],
  buffer_before_hours: 0,
  buffer_after_hours: 0,
  check_venue_availability: true,
  check_resource_availability: true,
  check_staff_availability: true,
  availability_display_mode: 'FULL',
  allow_overbooking: false,
  overbooking_threshold: 0,
  sync_with_calendar: false,
  calendar_source: '',
};

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export const AVAILABILITY_DISPLAY_MODES = [
  { value: 'FULL', label: 'Show Full Availability' },
  { value: 'LIMITED', label: 'Show Limited Availability' },
  { value: 'SIMPLE', label: 'Show Simple Yes/No' },
];

export const CALENDAR_SOURCES = [
  { value: '', label: 'No Calendar Sync' },
  { value: 'GOOGLE', label: 'Google Calendar' },
  { value: 'OUTLOOK', label: 'Outlook Calendar' },
  { value: 'EXTERNAL', label: 'External System' },
];
