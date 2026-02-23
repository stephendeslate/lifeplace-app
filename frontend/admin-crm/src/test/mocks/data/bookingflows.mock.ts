import type {
  BookingFlow,
  BookingFlowStep,
  BookingSession,
  StepType,
} from '../../../types/bookingflows.types';

export function createMockBookingFlow(overrides: Partial<BookingFlow> = {}): BookingFlow {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Booking Flow ${id}`,
    description: `Description for booking flow ${id}`,
    event_type: 1,
    event_type_name: 'Wedding',
    workflow_template: null,
    confirmation_email_template: null,
    reminder_email_template: null,
    is_active: true,
    allow_guest_booking: false,
    require_account_creation: true,
    auto_approve_bookings: false,
    enable_progress_saving: true,
    max_advance_booking_days: 365,
    min_advance_booking_days: 14,
    allow_discounts: true,
    available_discounts: [],
    allowed_payment_gateways: [1],
    default_payment_gateway: 1,
    require_immediate_payment: false,
    redirect_url: '',
    success_message: 'Thank you for your booking!',
    is_test_mode: false,
    conversion_tracking_code: '',
    total_steps: 10,
    enabled_steps_count: 8,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockBookingFlows(count: number): BookingFlow[] {
  const flowNames = [
    'Wedding Booking',
    'Corporate Event',
    'Birthday Party',
    'Team Building',
    'Workshop Booking',
  ];
  return Array.from({ length: count }, (_, i) =>
    createMockBookingFlow({
      id: i + 1,
      name: flowNames[i % flowNames.length],
      is_active: i % 4 !== 0,
      event_type: (i % 3) + 1,
    }),
  );
}

export const mockBookingFlows = createMockBookingFlows(5);

const STEP_TYPE_DISPLAY: Record<StepType, string> = {
  introduction: 'Introduction',
  venue_selection: 'Venue Selection',
  date_time: 'Date & Time Selection',
  questionnaire: 'Questionnaire',
  package_selection: 'Package Selection',
  addon_selection: 'Add-on Selection',
  pricing_summary: 'Pricing Summary',
  contact_info: 'Contact Information',
  payment_info: 'Payment Information',
  confirmation: 'Confirmation',
};

export function createMockBookingFlowStep(
  overrides: Partial<BookingFlowStep> = {},
): BookingFlowStep {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const stepType = overrides.step_type || 'introduction';
  return {
    id,
    booking_flow: 1,
    step_type: stepType,
    step_type_display: STEP_TYPE_DISPLAY[stepType] || 'Introduction',
    description: `${STEP_TYPE_DISPLAY[stepType] || 'Introduction'} step`,
    order: overrides.order || 1,
    is_enabled: true,
    is_required: true,
    is_skippable: false,
    display_conditions: {},
    configuration: {},
    validation_rules: {},
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockBookingFlowSteps(count?: number): BookingFlowStep[] {
  const stepTypes: StepType[] = [
    'introduction',
    'venue_selection',
    'date_time',
    'package_selection',
    'addon_selection',
    'questionnaire',
    'pricing_summary',
    'contact_info',
    'payment_info',
    'confirmation',
  ];
  const total = count || stepTypes.length;
  return Array.from({ length: total }, (_, i) =>
    createMockBookingFlowStep({
      id: i + 1,
      step_type: stepTypes[i % stepTypes.length],
      order: i + 1,
      is_required: i < 3,
    }),
  );
}

export const mockBookingFlowSteps = createMockBookingFlowSteps(10);

export function createMockBookingSession(overrides: Partial<BookingSession> = {}): BookingSession {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    session_id: `sess-${id}-${Date.now()}`,
    booking_flow: 1,
    booking_flow_details: {
      id: 1,
      name: 'Wedding Booking',
      event_type_name: 'Wedding',
      total_steps: 10,
    },
    client: 1,
    current_step: 1,
    booking_data: {},
    validation_errors: {},
    is_completed: false,
    is_abandoned: false,
    completed_at: null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    progress_percentage: 30,
    total_price: '25000.00',
    is_expired: false,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockBookingSessions(count: number): BookingSession[] {
  return Array.from({ length: count }, (_, i) =>
    createMockBookingSession({
      id: i + 1,
      session_id: `sess-${i + 1}-${Date.now()}`,
      is_completed: i % 3 === 0,
      is_abandoned: i % 5 === 0,
      progress_percentage: Math.min(100, (i + 1) * 20),
    }),
  );
}

export const mockBookingSessions = createMockBookingSessions(5);
