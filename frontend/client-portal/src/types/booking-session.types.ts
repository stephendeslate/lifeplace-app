// frontend/client-portal/src/types/booking-session.types.ts

// Booking session matching backend BookingSession model
export interface BookingSession {
  id: number;
  session_id: string;
  booking_flow: number;
  booking_flow_details: BookingFlowBasic;
  client: number | null;
  current_step: number | null;
  current_step_details: BookingFlowStepBasic | null;
  booking_data: Record<string, any>;
  validation_errors: Record<string, any>;
  is_completed: boolean;
  is_abandoned: boolean;
  completed_at: string | null;
  expires_at: string;
  progress_percentage: number;
  total_price: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

// Basic booking flow info for session
export interface BookingFlowBasic {
  id: number;
  name: string;
  event_type_name: string | null;
  total_steps: number;
}

// Basic step info for session
export interface BookingFlowStepBasic {
  id: number;
  booking_flow: number;
  step_type: string;
  step_type_display: string;
  name: string;
  description: string;
  order: number;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
}

// Session creation request
export interface CreateBookingSessionRequest {
  booking_flow: number;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
}

// Session creation response (from start_session endpoint)
export interface StartSessionResponse {
  session_id: string;
  current_step: BookingFlowStepBasic | null;
  expires_at: string;
  progress_percentage: number;
}

// Session update request
export interface UpdateSessionDataRequest {
  session_id: string;
  step_id: number;
  step_data: Record<string, any>;
  mark_completed?: boolean;
}

// Complete booking request/response
export interface CompleteBookingResponse {
  detail: string;
  event: EventBasic;
  session: BookingSession;
}

// Basic event info for completion response
export interface EventBasic {
  id: number;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  total_price: string;
}

// Abandon session request
export interface AbandonSessionRequest {
  reason?: string;
}

// Step data types for different step types
export interface IntroductionStepData {
  acknowledged?: boolean;
  start_time?: string;
}

export interface DateTimeStepData {
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration?: number;
  venue_preference?: string;
  resource_requirements?: string[];
  staff_requirements?: string[];
  guest_count?: number;
  special_requirements?: string;
}

export interface QuestionnaireStepData {
  responses: Record<string, any>;
  uploaded_files?: File[];
}

export interface PackageSelectionStepData {
  selected_packages: SelectedPackage[];
}

export interface SelectedPackage {
  id: number;
  name: string;
  quantity: number;
  price: string;
  options?: Record<string, any>;
}

export interface AddonSelectionStepData {
  selected_addons: SelectedAddon[];
}

export interface SelectedAddon {
  id: number;
  name: string;
  quantity: number;
  price: string;
  options?: Record<string, any>;
}

export interface PricingSummaryStepData {
  acknowledged?: boolean;
  discount_code?: string;
  applied_discount?: {
    code: string;
    amount: string;
    type: 'PERCENTAGE' | 'FIXED';
  };
}

export interface ContactInfoStepData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  custom_fields?: Record<string, any>;
  create_account?: boolean;
  password?: string;
  password_confirm?: string;
  marketing_consent?: boolean;
}

export interface PaymentInfoStepData {
  gateway_id: number;
  payment_method_token?: string;
  payment_method_id?: string;
  payment_type: 'FULL' | 'DEPOSIT';
  amount: string;
  billing_address?: BillingAddress;
  save_payment_method?: boolean;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface ReviewBookingStepData {
  terms_accepted: boolean;
  marketing_consent?: boolean;
  special_requests?: string;
}

export interface ConfirmationStepData {
  acknowledged?: boolean;
  feedback?: string;
}

// Union type for all step data
export type BookingStepData = 
  | IntroductionStepData
  | DateTimeStepData
  | QuestionnaireStepData
  | PackageSelectionStepData
  | AddonSelectionStepData
  | PricingSummaryStepData
  | ContactInfoStepData
  | PaymentInfoStepData
  | ReviewBookingStepData
  | ConfirmationStepData;

// Session state for frontend management
export interface BookingSessionState {
  session: BookingSession | null;
  currentStep: BookingFlowStepBasic | null;
  stepData: Record<string, any>;
  validationErrors: Record<string, string[]>;
  isLoading: boolean;
  isUpdating: boolean;
  isCompleting: boolean;
  error: string | null;
}

// Session storage interface for progress saving
export interface SessionStorageData {
  sessionId: string;
  flowId: number;
  stepData: Record<string, any>;
  lastUpdated: string;
  expiresAt: string;
}