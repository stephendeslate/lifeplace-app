// frontend/client-portal/src/types/booking-steps.types.ts

// Import shared types from booking.types.ts
import type { 
  AvailabilityCheckRequest,
  AvailabilityCheckResponse,
} from './booking.types';

import type { 
  BookingStepType, 
  BookingFlowStep,
} from './booking.types';
import type { BookingStepData } from './booking-session.types';

// Generic step component props interface
export interface BaseStepProps<TData extends BookingStepData = BookingStepData> {
  step: BookingFlowStep;
  data: TData;
  onUpdate: (data: Partial<TData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSave: () => void;
  isLoading?: boolean;
  validationErrors?: Record<string, string[]>;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  showSaveButton?: boolean;
}

// Step navigation state
export interface StepNavigationState {
  currentStepIndex: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  nextStepId: number | null;
  previousStepId: number | null;
}

// Step validation result
export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

// Progress information
export interface BookingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  percentage: number;
  estimatedTimeRemaining?: number;
}

// Step metadata for rendering
export interface StepMetadata {
  stepType: BookingStepType;
  title: string;
  description: string;
  isRequired: boolean;
  isSkippable: boolean;
  estimatedDuration?: number;
  helpText?: string;
  icon?: string;
}

// Re-export shared types for convenience
export type { 
  AvailabilityCheckRequest,
  AvailabilityCheckResponse,
  PaymentOptionsResponse,
  PaymentGatewayConfig,
  SavedPaymentMethod
} from './booking.types';

// Payment processing types for payment_info step
// These are re-exported from booking.types.ts for consistency

// Questionnaire types for questionnaire step
// These need to match the actual questionnaire domain models
export interface QuestionnaireQuestion {
  id: number;
  question_text: string;
  question_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'NUMBER' | 'FILE';
  is_required: boolean;
  options?: QuestionnaireOption[];
  help_text?: string;
  validation_rules?: Record<string, any>;
}

export interface QuestionnaireOption {
  id: number;
  text: string;
  value: string;
  is_other?: boolean;
}

export interface QuestionnaireResponse {
  question_id: number;
  answer: string | string[] | File[];
  other_text?: string;
}

// Package/Addon selection types matching the backend ProductOption model
export interface SelectableProduct {
  id: number;
  name: string;
  description: string;
  type: 'PACKAGE' | 'PRODUCT';
  category: number;
  base_price: string;
  is_active: boolean;
  // Additional fields that might be included from product serializers
  image_url?: string;
  features?: string[];
  capacity?: number;
  duration?: string;
  included_items?: string[];
}

// This matches the SelectedPackage/SelectedAddon format from session types
export interface ProductSelection {
  id: number;
  name: string;
  quantity: number;
  price: string;
  options?: Record<string, any>;
}

// Pricing summary types matching the backend session pricing calculation
export interface PricingBreakdown {
  packages: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  addons: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  subtotal: string;
  discounts: Array<{
    name: string;
    amount: string;
    type: 'PERCENTAGE' | 'FIXED';
  }>;
  total: string;
}

// Contact info form types matching ContactInfoStepData
export interface ContactFormData {
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

// Step component registry type
export interface StepComponentMap {
  introduction: React.ComponentType<BaseStepProps>;
  date_time: React.ComponentType<BaseStepProps>;
  questionnaire: React.ComponentType<BaseStepProps>;
  package_selection: React.ComponentType<BaseStepProps>;
  addon_selection: React.ComponentType<BaseStepProps>;
  pricing_summary: React.ComponentType<BaseStepProps>;
  contact_info: React.ComponentType<BaseStepProps>;
  payment_info: React.ComponentType<BaseStepProps>;
  review_booking: React.ComponentType<BaseStepProps>;
  confirmation: React.ComponentType<BaseStepProps>;
}

// Step hooks return types
export interface UseStepReturn<TData = any> {
  data: TData;
  updateData: (updates: Partial<TData>) => void;
  validate: () => StepValidationResult;
  isValid: boolean;
  isDirty: boolean;
  reset: () => void;
  errors: Record<string, string[]>;
}

// Availability hook return type - uses session validation
export interface UseAvailabilityReturn {
  checkAvailability: (sessionUUID: string, stepId: number, request: AvailabilityCheckRequest) => Promise<AvailabilityCheckResponse>;
  isChecking: boolean;
  lastResult: AvailabilityCheckResponse | null;
  error: string | null;
  clearResult: () => void;
}

// Payment processing hook return type - integrated with session completion
export interface UsePaymentReturn {
  processPayment: (sessionUUID: string, paymentData: any) => Promise<any>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}