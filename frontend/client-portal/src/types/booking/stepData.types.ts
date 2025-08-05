// frontend/client-portal/src/types/booking/stepData.types.ts

// Step data types for form inputs
export interface IntroductionStepData {
  acknowledged?: boolean;
}

export interface DateTimeStepData {
  start_date: string; // Required
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration?: number;
  venue_preference?: string;
  resource_requirements?: string[];
  staff_requirements?: string[];
}

export interface QuestionnaireStepData {
  responses?: Record<string, any>; // field_id -> response value
  uploaded_files?: Record<string, File[]>; // field_id -> uploaded files
}

// Standardized to use product_id while keeping all display fields
export interface SelectedPackage {
  product_id: number; // Standardized from 'package_id'
  name: string;
  price: string; // base price as string
  quantity: number;
  included_hours?: number;
  excess_hour_price?: string;
  duration_hours?: number; // Added for excess hour calculations
  // Enhanced fields for proper tax calculation
  tax_rate?: string; // individual tax rate as percentage string (e.g., "0.00", "12.00")
  price_with_tax?: string; // pre-calculated price including tax
}

export interface PackageSelectionStepData {
  selected_packages?: SelectedPackage[];
}

// Standardized to use product_id while keeping all display fields
export interface SelectedAddon {
  product_id: number; // Standardized from 'addon_id'
  name: string;
  price: string; // base price as string
  quantity: number;
  // Enhanced fields for proper tax calculation
  tax_rate?: string; // individual tax rate as percentage string (e.g., "12.00")
  price_with_tax?: string; // pre-calculated price including tax
}

export interface AddonSelectionStepData {
  selected_addons?: SelectedAddon[];
}

// Fixed: Changed to match backend expectations - only store discount code
export interface PricingSummaryStepData {
  applied_discount_code?: string; // Changed from applied_discount object to just the code
}

export interface ContactInfoStepData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  create_account?: boolean;
  password?: string;
  custom_fields?: Record<string, any>;
}

export interface PaymentStepData {
  payment_method: string;
  payment_type: 'FULL' | 'DEPOSIT';
  payment_gateway_id?: number;
  payment_method_id?: string; // Stripe payment method ID
  payment_method_token?: string; // Alternative token field for other gateways
  billing_address?: any;
  save_payment_method?: boolean;
}

export type PaymentMethodType = 
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'DIGITAL_WALLET'
  | 'BANK_TRANSFER'
  | 'MANUAL'
  | 'CASH';

export interface EnhancedPaymentStepData {
  payment_method: PaymentMethodType;
  payment_type: 'FULL' | 'DEPOSIT';
  payment_gateway_id?: number;
  payment_method_id?: string; // Stripe payment method ID
  payment_method_token?: string; // Alternative token for other gateways
  billing_address?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  save_payment_method?: boolean;
  // Additional fields for future extensibility
  payment_intent_id?: string; // For tracking Stripe payment intents
  client_secret?: string; // For 3D Secure authentication
  payment_status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

// Server response for pricing calculation
export interface PricingCalculation {
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  discount_details?: {
    name: string;
    code: string;
    type: string;
    value: string;
    amount: string;
  };
}

export interface ReviewStepData {
  terms_accepted: boolean;
  marketing_consent?: boolean;
  special_requests?: string;
}

export interface ConfirmationStepData {
  booking_reference: string;
  completion_status: 'pending' | 'processing' | 'completed' | 'failed';
  confirmation_email_sent: boolean;
  completed_at?: string;
  event_id?: number;
  booking_completion_result?: any; // BookingCompletionResult from api.types
}

// Combined step data type
export interface StepData {
  introduction?: IntroductionStepData;
  date_time?: DateTimeStepData;
  questionnaire?: QuestionnaireStepData;
  package_selection?: PackageSelectionStepData;
  addon_selection?: AddonSelectionStepData;
  pricing_summary?: PricingSummaryStepData;
  contact_info?: ContactInfoStepData;
  payment_info?: PaymentStepData;
  review_booking?: ReviewStepData;
  confirmation?: ConfirmationStepData;
  [key: string]: any;
}

// Product option from backend
export interface ProductOption {
  id: number;
  name: string;
  description: string;
  product_type: 'PACKAGE' | 'PRODUCT';
  base_price: string;
  tax_rate: number | null;
  category: number;
  category_name?: string;
  is_active: boolean;
  is_featured: boolean;
  
  // Package-specific fields
  has_excess_hours?: boolean;
  included_hours?: number;
  excess_hour_price?: string;
  pricing_model?: 'FLAT' | 'HOURLY';
  
  // Booking constraints
  advance_booking_days?: number;
  maximum_booking_days?: number;
  minimum_quantity?: number;
  maximum_quantity?: number;
  
  // Display
  image_url?: string;
  sort_order: number;
  
  // Metadata
  sku?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// Discount type from products domain
export interface Discount {
  id: number;
  name: string;
  code: string | null;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
  application_type: 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';
  value: string;
  currency: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  max_uses_per_client: number | null;
  current_uses: number;
  minimum_order_amount: string | null;
  minimum_hours: number | null;
  created_at: string;
  updated_at: string;
}