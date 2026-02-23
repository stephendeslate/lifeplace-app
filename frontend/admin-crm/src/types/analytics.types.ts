// frontend/admin-crm/src/types/analytics.types.ts
// Simplified analytics types for the new dashboard

// ============================================================================
// Date Range and Period Types
// ============================================================================

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ExportFormat = 'csv' | 'excel';

// ============================================================================
// Dashboard KPIs
// ============================================================================

export interface DashboardKPIs {
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  event_revenue: number; // Revenue from completed events only
  total_revenue: number; // All collected payments (includes cancelled event deposits)
  event_revenue_trend: number; // Trend for event revenue
  total_revenue_trend: number; // Trend for total revenue
  avg_booking_value: number;
  new_clients: number;
  booking_sessions: number;
  completed_sessions: number;
  conversion_rate: number;
  period: DateRange;
}

// ============================================================================
// Sales & Reservations Types
// ============================================================================

export interface BookingSummary {
  period: string;
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  leads: number;
  total_revenue: number;
}

export interface ReservationPipeline {
  status: string;
  label: string;
  count: number;
  total_value: number;
}

export interface RevenueByType {
  name: string;
  type: string;
  category: string;
  booking_count: number;
  total_revenue: number;
  avg_revenue: number;
  total_participants: number;
}

export interface PaymentTracking {
  total_payments: number;
  total_amount: number;
  completed_amount: number;
  pending_amount: number;
  failed_count: number;
  overdue_count: number;
  overdue_amount: number;
  upcoming_count: number;
  upcoming_amount: number;
}

// ============================================================================
// Events & Guests Types
// ============================================================================

export interface EventAttendance {
  name: string;
  type: string;
  total_guests: number;
  event_count: number;
}

export interface PackagePerformance {
  id: number;
  name: string;
  base_price: number;
  booking_count: number;
  total_revenue: number;
  total_guests: number;
  avg_guests: number;
}

export interface FeedbackScores {
  total_feedback: number;
  avg_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  satisfaction_rate: number;
}

export interface EventTypeBreakdown {
  event_type: string;
  count: number;
  confirmed: number;
  completed: number;
  revenue: number;
}

// ============================================================================
// Customers & Leads Types
// ============================================================================

export interface LeadSource {
  lead_source: string;
  label: string;
  lead_count: number;
  converted_count: number;
  conversion_rate: number;
  total_value: number;
}

export interface ConversionRates {
  total_inquiries: number;
  total_leads: number;
  confirmed_bookings: number;
  completed_bookings: number;
  converted_total: number;
  event_conversion_rate: number;
  booking_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;
  booking_conversion_rate: number;
  abandonment_rate: number;
}

export interface CustomerRecord {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  total_events: number;
  confirmed_events: number;
  completed_events: number;
  total_spent: number;
  created_at: string;
}

export interface CustomerGrowth {
  month: string;
  new_customers: number;
}

// ============================================================================
// Operations Types
// ============================================================================

export interface VenueUsage {
  venue_id: number;
  venue_name: string;
  venue_code: string;
  booking_count: number;
  total_revenue: number;
  confirmed_count: number;
  completed_count: number;
  utilization_percentage: number;
}

export interface MonthlyUtilization {
  month: number;
  month_name: string;
  booking_count: number;
  total_revenue: number;
}

export interface DailyUtilization {
  day_of_week: number;
  day_name: string;
  booking_count: number;
}

export interface CalendarUtilization {
  by_month: MonthlyUtilization[];
  by_day_of_week: DailyUtilization[];
}

export interface BookingTimeAnalysis {
  hour: number;
  hour_label: string;
  booking_count: number;
}

// ============================================================================
// Placeholder Response (for features in development)
// ============================================================================

export interface PlaceholderResponse {
  status: 'placeholder';
  message: string;
  data: null;
}

// ============================================================================
// Lead Source Options
// ============================================================================

export const LEAD_SOURCE_OPTIONS = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WALKIN', label: 'Walk-in' },
  { value: 'CLIENT_PORTAL', label: 'Client Portal' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCE_OPTIONS)[number]['value'];

// ============================================================================
// Booking Flow Analytics Types
// ============================================================================

export interface BookingFlowFunnelStep {
  step_type: string;
  step_name: string;
  order: number;
  sessions_reached: number;
  sessions_completed: number;
  completion_rate: number;
  drop_off_rate: number;
}

export interface BookingFlowPerformance {
  flow_id: number;
  flow_name: string;
  event_type: string;
  total_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;
  conversion_rate: number;
  abandonment_rate: number;
  total_revenue: number;
  avg_revenue: number;
}

export interface BookingFlowAbandonment {
  total_abandoned: number;
  by_step: {
    step_type: string;
    step_name: string;
    count: number;
    percentage: number;
  }[];
}

export interface BookingFlowTrend {
  date: string;
  total_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;
  conversion_rate: number;
}

// ============================================================================
// Questionnaire Analytics Types
// ============================================================================

export interface QuestionnaireSummaryItem {
  questionnaire_id: number;
  questionnaire_name: string;
  total_fields: number;
  required_fields: number;
  events_with_responses: number;
  complete_responses: number;
  incomplete_responses: number;
  completion_rate: number;
}

export interface QuestionnaireSummary {
  overall: {
    total_events_with_responses: number;
    total_complete: number;
    total_incomplete: number;
    overall_completion_rate: number;
  };
  by_questionnaire: QuestionnaireSummaryItem[];
}

export interface QuestionnaireFieldHeatmap {
  field_id: number;
  field_name: string;
  field_type: string;
  required: boolean;
  order: number;
  response_count: number;
  completion_rate: number;
}

export interface QuestionnaireProblemField {
  questionnaire_id: number;
  questionnaire_name: string;
  field_id: number;
  field_name: string;
  field_type: string;
  completion_rate: number;
  gap_from_threshold: number;
}
