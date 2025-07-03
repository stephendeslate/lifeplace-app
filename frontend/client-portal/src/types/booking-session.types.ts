// frontend/client-portal/src/types/booking-session.types.ts

/**
 * Main booking session data structure
 * Maps directly to Django BookingSession model
 * All fields verified against backend implementation
 */
export interface BookingSession {
  // Primary key from Django
  id: number;
  
  // UUID field for public session identification
  session_id: string;
  
  // Foreign key references (as IDs)
  booking_flow: number;
  user?: number; // Nullable for guest bookings
  
  // JSON data fields
  booking_data: Record<string, any>; // All step data stored here as step_id: data
  validation_errors: Record<string, any>; // Current validation errors
  
  // State management
  is_completed: boolean;
  is_abandoned: boolean;
  current_step: number | null; // ID of current step (not step details)
  
  // Calculated field (property on Django model)
  total_price: string; // Decimal as string
  
  // Timestamps (ISO datetime strings)
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Response from starting a new booking session
 * Returned by PublicBookingFlowViewSet.start_session()
 * Contains minimal data needed to continue session
 */
export interface StartSessionResponse {
  session_id: string; // UUID of the created session
  expires_at: string; // ISO datetime when session expires
  current_step?: number | null; // ID of the first step (optional)
  message?: string; // Optional success message
}

/**
 * Request to create a new booking session
 * Used by BookingSessionViewSet.create() (admin endpoint)
 */
export interface CreateBookingSessionRequest {
  booking_flow: number;
  user?: number; // Optional for guest bookings
  initial_data?: Record<string, any>;
}

/**
 * Request to update session data for a specific step
 * Used by BookingSessionViewSet.update_data()
 */
export interface UpdateSessionDataRequest {
  session_id: string; // UUID of the session
  step_id: number; // ID of the step being updated
  step_data: Record<string, any>; // Data for the step
  mark_completed?: boolean; // Whether to mark step as completed
}

/**
 * Request to abandon a booking session
 * Used by BookingSessionViewSet.abandon()
 */
export interface AbandonSessionRequest {
  reason?: string; // Optional reason for abandoning
}

/**
 * Response from completing a booking
 * Returned by BookingSessionViewSet.complete_booking()
 * Structure needs verification with actual backend implementation
 */
export interface CompleteBookingResponse {
  // Event details (structure may vary based on backend Event model)
  event: {
    id: number;
    name: string;
    start_date: string;
    end_date?: string;
    status: string;
    total_price: string;
  };
  // Updated session after completion
  session: BookingSession;
  message: string;
  // Optional fields that backend may include
  confirmation_number?: string;
  payment_status?: string;
}

/**
 * Local storage data structure for session persistence
 * Used by session-storage.ts utility
 */
export interface SessionStorageData {
  sessionId: string;
  flowId: number;
  stepData: Record<string, any>; // Keyed by step_id
  lastUpdated: string;
  expiresAt: string;
}

// =============================================================================
// STEP DATA TYPES
// These are stored in BookingSession.booking_data as step_id: StepData
// Each type matches what the step components actually use
// =============================================================================

/**
 * Introduction step data
 * Used by IntroductionStep component
 */
export interface IntroductionStepData {
  acknowledged?: boolean;
  start_time?: string; // ISO datetime when user started
}

/**
 * Date/time step data
 * Used by DateTimeStep component
 */
export interface DateTimeStepData {
  start_date: string; // Required - YYYY-MM-DD format
  start_time?: string; // Optional - HH:MM:SS format
  end_date?: string; // Optional - YYYY-MM-DD format
  end_time?: string; // Optional - HH:MM:SS format
  resource_requirements?: string[]; // Array of resource IDs/names
  staff_requirements?: string[]; // Array of staff requirements
  special_requirements?: string; // Free text for special needs
}

/**
 * Contact information step data
 * Used by ContactInfoStep component
 */
export interface ContactInfoStepData {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  custom_fields?: Record<string, any>; // Dynamic custom fields
  create_account?: boolean; // Account creation flag
  password?: string; // Password for account creation
  password_confirm?: string; // Password confirmation
  marketing_consent?: boolean; // Marketing opt-in
}

/**
 * Package selection step data
 * Used by PackageSelectionStep component
 */
export interface PackageSelectionStepData {
  selected_packages: ProductSelection[];
}

/**
 * Product selection interface
 * Used in package and addon selection
 */
export interface ProductSelection {
  id: number;
  name: string;
  quantity: number;
  price: string; // Price as string to avoid floating point issues
  options?: Record<string, any>; // Product-specific options
}

/**
 * Add-on selection step data
 * Used by AddonSelectionStep component
 */
export interface AddonSelectionStepData {
  selected_addons: SelectedAddon[];
}

/**
 * Selected add-on interface
 * Specific to addon selection (extends ProductSelection)
 */
export interface SelectedAddon {
  id: number;
  name: string;
  quantity: number;
  price: string;
  options?: Record<string, any>; // Addon-specific options
}

/**
 * Questionnaire step data
 * Used by QuestionnaireStep component
 */
export interface QuestionnaireStepData {
  responses: Record<string, any>; // Question ID to response mapping
  uploaded_files?: File[]; // Files uploaded during questionnaire
}

/**
 * Pricing summary step data
 * Used by PricingSummaryStep component
 */
export interface PricingSummaryStepData {
  acknowledged?: boolean; // User has reviewed pricing
  discount_code?: string; // Applied discount code
  applied_discount?: {
    code: string;
    amount: string;
    type: 'PERCENTAGE' | 'FIXED';
  };
}

/**
 * Payment information step data
 * Used by PaymentInfoStep component
 */
export interface PaymentInfoStepData {
  gateway_id: number; // Selected payment gateway ID
  payment_type: 'FULL' | 'DEPOSIT'; // Payment type
  amount: string; // Amount to charge (as string)
  payment_method_token?: string; // Tokenized payment method
  payment_method_id?: string; // Saved payment method ID
  billing_address?: BillingAddress; // Billing address
  save_payment_method?: boolean; // Save for future use
}

/**
 * Billing address interface
 * Used in payment step
 */
export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

/**
 * Review booking step data
 * Used by ReviewBookingStep component
 */
export interface ReviewBookingStepData {
  terms_accepted: boolean; // Required - must accept terms
  marketing_consent?: boolean; // Optional marketing consent
  special_requests?: string; // Any special requests or notes
}

/**
 * Confirmation step data
 * Used by ConfirmationStep component
 */
export interface ConfirmationStepData {
  acknowledged?: boolean; // User has seen confirmation
  feedback?: string; // Optional feedback about booking process
}

/**
 * Union type for all step data
 * Used for type-safe step data handling
 */
export type BookingStepData = 
  | IntroductionStepData
  | DateTimeStepData
  | ContactInfoStepData
  | PackageSelectionStepData
  | AddonSelectionStepData
  | QuestionnaireStepData
  | PricingSummaryStepData
  | PaymentInfoStepData
  | ReviewBookingStepData
  | ConfirmationStepData;

/**
 * Type guard to check if data matches expected step type
 */
export function isStepDataOfType<T extends BookingStepData>(
  data: any,
  stepType: string
): data is T {
  // Basic validation based on step type
  switch (stepType) {
    case 'introduction':
      return typeof data === 'object' && data !== null;
    case 'date_time':
      return typeof data === 'object' && data !== null && 'start_date' in data;
    case 'contact_info':
      return typeof data === 'object' && data !== null;
    case 'package_selection':
      return typeof data === 'object' && data !== null && 'selected_packages' in data;
    case 'addon_selection':
      return typeof data === 'object' && data !== null && 'selected_addons' in data;
    case 'questionnaire':
      return typeof data === 'object' && data !== null && 'responses' in data;
    case 'pricing_summary':
      return typeof data === 'object' && data !== null;
    case 'payment_info':
      return typeof data === 'object' && data !== null && 'gateway_id' in data;
    case 'review_booking':
      return typeof data === 'object' && data !== null && 'terms_accepted' in data;
    case 'confirmation':
      return typeof data === 'object' && data !== null;
    default:
      return false;
  }
}

/**
 * Helper to get empty step data for a given step type
 */
export function getEmptyStepData(stepType: string): BookingStepData {
  switch (stepType) {
    case 'introduction':
      return { acknowledged: false };
    case 'date_time':
      return { start_date: '' };
    case 'contact_info':
      return { marketing_consent: false };
    case 'package_selection':
      return { selected_packages: [] };
    case 'addon_selection':
      return { selected_addons: [] };
    case 'questionnaire':
      return { responses: {} };
    case 'pricing_summary':
      return { acknowledged: false };
    case 'payment_info':
      return { gateway_id: 0, payment_type: 'FULL', amount: '0.00' };
    case 'review_booking':
      return { terms_accepted: false };
    case 'confirmation':
      return { acknowledged: false };
    default:
      return {};
  }
}