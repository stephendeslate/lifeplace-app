/**
 * LifePlace Mobile App - API Types
 *
 * TypeScript interfaces matching the Django backend serializers.
 * These types reflect the actual API response structures.
 */

// =============================================================================
// ENUMS - Backend status values
// =============================================================================

export type UserRole = 'CLIENT' | 'ADMIN';

export type EventStatus = 'LEAD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export type CheckInStatus = 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';

export type ProductType = 'PACKAGE' | 'PRODUCT';

export type PricingModel = 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type PaymentPlanStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SUSPENDED'
  | 'DEFAULTED'
  | 'CANCELLED';

export type InstallmentStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'PARTIAL'
  | 'WAIVED'
  | 'CANCELLED';

export type PaymentTransactionStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type InstallmentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type BookingFlowStepType =
  | 'introduction'
  | 'venue_selection'
  | 'date_time'
  | 'questionnaire'
  | 'package_selection'
  | 'addon_selection'
  | 'pricing_summary'
  | 'contact_info'
  | 'payment_info'
  | 'confirmation';

// =============================================================================
// USER & AUTH
// =============================================================================

export interface UserProfile {
  phone?: string;
  company?: string;
  display_timezone: string;
  timezone_display_mode: 'business_only' | 'business_with_local' | 'dual_display';
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  profile?: UserProfile;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// =============================================================================
// VENUE
// =============================================================================

export interface VenueOperatingRules {
  default_check_in_time: string;
  default_checkout_time: string;
  checkout_next_day: boolean;
  minimum_program_hours: number;
  maximum_program_hours: number;
  default_program_hours: number;
  is_fixed_duration: boolean;
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour?: number;
  earliest_checkin_time?: string;
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour?: number;
  late_checkout_max_hours: number;
  latest_checkout_time?: string;
}

export interface Venue {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_overnight: boolean;
  location_description?: string;
  minimum_capacity: number;
  maximum_capacity: number;
  recommended_capacity: number;
  is_active: boolean;
  is_bookable: boolean;
  featured_image?: string;
  gallery_images: string[];
  sort_order: number;
  is_rentable_standalone: boolean;
  standalone_base_price?: number;
  standalone_included_hours?: number;
  standalone_excess_hour_price?: number;
  operating_rules?: VenueOperatingRules;
}

export interface VenueBlockedDate {
  id: string;
  venue: string;
  date: string;
  reason: string;
  is_full_day: boolean;
  blocked_start_time?: string;
  blocked_end_time?: string;
}

// =============================================================================
// PRODUCTS & PACKAGES
// =============================================================================

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  parent?: ProductCategory;
  is_active: boolean;
  sort_order: number;
  requires_venue: boolean;
  typical_duration_hours?: number;
  full_path: string;
  level: number;
}

export interface ProductOption {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  type: ProductType;
  pricing_model: PricingModel;
  base_price: number;
  currency: string;
  tax_rate: number;
  is_tax_inclusive: boolean;
  formatted_price: string;
  price_with_tax: number;
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  requires_approval: boolean;
  minimum_hours?: number;
  maximum_hours?: number;
  minimum_guests?: number;
  maximum_guests?: number;
  recommended_guests?: number;
  event_days?: number;
  advance_booking_days: number;
  maximum_booking_days: number;
  sku?: string;
  sort_order: number;
}

export interface Discount {
  id: string;
  name: string;
  code: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
  application_type: 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';
  value: number;
  currency: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  max_uses?: number;
  max_uses_per_client?: number;
  current_uses: number;
  minimum_order_amount?: number;
  minimum_hours?: number;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface EventType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

// =============================================================================
// EVENT (BOOKING)
// =============================================================================

export interface EventProductOption {
  id: string;
  product_option: ProductOption;
  quantity: number;
  final_price: number;
  num_participants?: number;
  num_nights?: number;
  excess_hours?: number;
}

export interface Event {
  id: string;
  client: User;
  name: string;
  status: EventStatus;
  payment_status: PaymentStatus;
  start_date: string;
  end_date: string;
  program_start_time?: string;
  program_end_time?: string;
  program_duration_hours?: number;
  venue?: Venue;
  event_type?: EventType;
  num_participants?: number;
  total_amount_due?: number;
  total_amount_paid: number;
  check_in_status: CheckInStatus;
  scheduled_check_in_time?: string;
  scheduled_checkout_time?: string;
  actual_check_in_time?: string;
  actual_checkout_time?: string;
  date_hold_status: 'NONE' | 'TEMPORARY_HOLD' | 'PERMANENTLY_BLOCKED';
  date_hold_expires_at?: string;
  reschedule_count: number;
  last_rescheduled_at?: string;
  preferences: Record<string, unknown>;
  products: EventProductOption[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// QUOTES
// =============================================================================

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  product?: ProductOption;
  item_type: 'PACKAGE' | 'ADDON';
  base_unit_price?: number;
  excess_hours?: number;
  excess_hour_price?: number;
  notes?: string;
}

export interface EventQuote {
  id: string;
  event: string;
  version: number;
  status: QuoteStatus;
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_until: string;
  sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  notes?: string;
  terms_and_conditions?: string;
  client_message?: string;
  discount?: Discount;
  line_items: QuoteLineItem[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PAYMENTS
// =============================================================================

export interface PaymentGateway {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  description?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'DIGITAL_WALLET';
  is_default: boolean;
  nickname?: string;
  instructions?: string;
  gateway?: PaymentGateway;
  last_four?: string;
  expiry_date?: string;
}

export interface PaymentInstallment {
  id: string;
  amount: number;
  due_date: string;
  status: InstallmentStatus;
  installment_number: number;
  description: string;
  late_fee_amount: number;
  late_fee_applied_date?: string;
  last_reminder_sent?: string;
  reminder_count: number;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  days_overdue_count: number;
}

export interface PaymentPlan {
  id: string;
  event: string;
  total_amount: number;
  down_payment_amount: number;
  currency: string;
  down_payment_due_date: string;
  number_of_installments: number;
  frequency: InstallmentFrequency;
  status: PaymentPlanStatus;
  next_payment_date?: string;
  final_payment_date?: string;
  grace_period_days: number;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  auto_payment_enabled: boolean;
  paid_amount: number;
  remaining_balance: number;
  is_overdue: boolean;
  completion_percentage: number;
  installments: PaymentInstallment[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  event: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  due_date: string;
  paid_on?: string;
  payment_method?: PaymentMethod;
  description?: string;
  reference_number?: string;
  notes?: string;
  receipt_number?: string;
  receipt_generated_on?: string;
  receipt_sent: boolean;
  receipt_pdf?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// INVOICE
// =============================================================================

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  product?: ProductOption;
  item_type: 'PACKAGE' | 'ADDON';
  base_unit_price?: number;
  excess_hours?: number;
  excess_hour_price?: number;
  excess_cost?: number;
}

export interface Invoice {
  id: string;
  invoice_id: string;
  event: string;
  client: User;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'CANCELLED';
  notes?: string;
  payment_terms?: string;
  invoice_pdf?: string;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// BOOKING FLOW
// =============================================================================

export interface BookingFlowStep {
  id: string;
  step_type: BookingFlowStepType;
  order: number;
  description?: string;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  display_conditions: Record<string, unknown>;
  configuration: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
}

export interface BookingFlow {
  id: string;
  name: string;
  description?: string;
  event_type?: EventType;
  is_active: boolean;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  auto_approve_bookings: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  allow_discounts: boolean;
  require_immediate_payment: boolean;
  redirect_url?: string;
  success_message?: string;
  is_test_mode: boolean;
  steps: BookingFlowStep[];
}

export interface BookingData {
  selected_venues?: string[];
  selected_packages?: string[];
  selected_addons?: string[];
  event_date?: string;
  duration?: number;
  num_participants?: number;
  contact_info?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  questionnaire_responses?: Record<string, unknown>;
}

export interface BookingSession {
  session_id: string;
  booking_flow: BookingFlow;
  client?: User;
  current_step?: BookingFlowStep;
  completed_steps: BookingFlowStep[];
  booking_data: BookingData;
  validation_errors: Record<string, string[]>;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
  is_completed: boolean;
  is_abandoned: boolean;
  completed_at?: string;
  expires_at: string;
  created_event?: Event;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// QUESTIONNAIRES
// =============================================================================

export type QuestionnaireFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'boolean'
  | 'select'
  | 'multi-select'
  | 'email'
  | 'phone'
  | 'file';

export interface QuestionnaireField {
  id: string;
  name: string;
  type: QuestionnaireFieldType;
  required: boolean;
  order: number;
  options?: string[];
  is_guest_count: boolean;
}

export interface Questionnaire {
  id: string;
  name: string;
  event_type?: EventType;
  is_active: boolean;
  order: number;
  fields: QuestionnaireField[];
}

export interface QuestionnaireResponse {
  id: string;
  event: string;
  field: QuestionnaireField;
  value: string;
}

// =============================================================================
// FEEDBACK & REVIEWS
// =============================================================================

export interface EventFeedback {
  id: string;
  event: string;
  submitted_by?: User;
  overall_rating: 1 | 2 | 3 | 4 | 5;
  categories: Record<string, number>;
  comments?: string;
  testimonial?: string;
  is_public: boolean;
  response?: string;
  response_by?: User;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/** Helper for creating partial updates */
export type PartialUpdate<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;

/** Helper for list item display (minimal fields) */
export interface VenueListItem
  extends Pick<
    Venue,
    | 'id'
    | 'name'
    | 'featured_image'
    | 'minimum_capacity'
    | 'maximum_capacity'
    | 'is_overnight'
    | 'standalone_base_price'
  > {}

export interface EventListItem
  extends Pick<
    Event,
    | 'id'
    | 'name'
    | 'status'
    | 'payment_status'
    | 'start_date'
    | 'end_date'
    | 'venue'
    | 'num_participants'
    | 'total_amount_due'
    | 'total_amount_paid'
  > {}

export interface PackageListItem
  extends Pick<
    ProductOption,
    | 'id'
    | 'name'
    | 'description'
    | 'base_price'
    | 'pricing_model'
    | 'formatted_price'
    | 'minimum_guests'
    | 'maximum_guests'
    | 'event_days'
  > {}
