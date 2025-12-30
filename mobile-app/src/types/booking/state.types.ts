/**
 * State Management Types for Booking Flow
 * Defines the React context/store state and actions
 * Adapted from: frontend/client-portal/src/types/booking/state.types.ts
 */

import type { BookingFlow, EventType, BookingFlowStep, StepType } from './core.types';
import type { BookingSession, BookingData, SessionRecoveryInfo } from './bookingData.types';
import type { PaymentGateway } from './payment.types';
import type {
  PricingCalculation,
  SelectedPackage,
  SelectedAddon,
  IntroductionStepData,
  DateTimeStepData,
  VenueSelectionStepData,
  PackageSelectionStepData,
  AddonSelectionStepData,
  QuestionnaireStepData,
  PricingSummaryStepData,
  ContactInfoStepData,
  PaymentStepData,
  ConfirmationStepData,
} from './stepData.types';
import type { BookingCompletionResult, StepValidationResult } from './api.types';

/**
 * Maps step types to their corresponding data interfaces
 */
export interface StepDataMap {
  introduction: IntroductionStepData;
  venue_selection: VenueSelectionStepData;
  date_time: DateTimeStepData;
  questionnaire: QuestionnaireStepData;
  package_selection: PackageSelectionStepData;
  addon_selection: AddonSelectionStepData;
  pricing_summary: PricingSummaryStepData;
  contact_info: ContactInfoStepData;
  payment_info: PaymentStepData;
  confirmation: ConfirmationStepData;
}

/**
 * Union type of all step data types for runtime flexibility
 */
export type AnyStepData =
  | Partial<IntroductionStepData>
  | Partial<DateTimeStepData>
  | Partial<VenueSelectionStepData>
  | Partial<PackageSelectionStepData>
  | Partial<AddonSelectionStepData>
  | Partial<QuestionnaireStepData>
  | Partial<PricingSummaryStepData>
  | Partial<ContactInfoStepData>
  | Partial<PaymentStepData>
  | Partial<ConfirmationStepData>;

/**
 * Partial step data state - allows any step type to have partial data
 * Uses string index to support dynamic step type access at runtime
 */
export interface PartialStepDataState {
  introduction?: Partial<IntroductionStepData>;
  venue_selection?: Partial<VenueSelectionStepData>;
  date_time?: Partial<DateTimeStepData>;
  questionnaire?: Partial<QuestionnaireStepData>;
  package_selection?: Partial<PackageSelectionStepData>;
  addon_selection?: Partial<AddonSelectionStepData>;
  pricing_summary?: Partial<PricingSummaryStepData>;
  contact_info?: Partial<ContactInfoStepData>;
  payment_info?: Partial<PaymentStepData>;
  confirmation?: Partial<ConfirmationStepData>;
  // Allow string index for dynamic access
  [key: string]: AnyStepData | undefined;
}

/**
 * Booking flow progress tracking
 */
export interface BookingProgress {
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number[];
  currentStepId?: number;
  currentStepType?: string;
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  progressPercentage: number;
}

/**
 * UI state for booking flow
 */
export interface BookingUIState {
  isLoading: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
  successMessage?: string;
}

/**
 * Recoverable session info
 */
export interface RecoverableSession {
  sessionId: string;
  bookingFlowName: string;
  eventTypeName: string;
  lastUpdated: string;
  stepName: string;
  progressPercentage: number;
  expiresAt: string;
}

/**
 * Complete booking state
 */
export interface BookingState {
  // Flow Management
  availableFlows: BookingFlow[];
  selectedEventType: EventType | null;
  currentFlow: BookingFlow | null;

  // Session Management
  currentSession: BookingSession | null;
  sessionId: string | null;

  // Step Data (local state before sync)
  stepData: PartialStepDataState;
  pendingChanges: boolean;

  // Progress Tracking
  progress: BookingProgress;

  // UI State
  ui: BookingUIState;

  // Payment Configuration
  paymentGateways: PaymentGateway[];
  selectedPaymentGateway: PaymentGateway | null;

  // Pricing Information
  totalPrice: string;
  taxRate: number;
  pricingBreakdown: PricingCalculation | null;

  // Session Recovery
  recoverableSession: RecoverableSession | null;
  showRecoveryPrompt: boolean;

  // Completion
  completionResult: BookingCompletionResult | null;
}

/**
 * Booking context actions
 */
export interface BookingActions {
  // Flow Management
  fetchAvailableFlows: (eventTypeId?: number) => Promise<void>;
  selectEventType: (eventType: EventType) => Promise<void>;
  selectFlow: (flow: BookingFlow) => void;

  // Session Management
  startSession: (flowId: number) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  updateStepData: (stepType: StepType | string, data: AnyStepData) => void;
  saveStepData: (stepId: number, data: AnyStepData, markCompleted?: boolean) => Promise<void>;
  validateStep: (stepId: number, data: AnyStepData) => Promise<StepValidationResult>;
  abandonSession: (reason?: string) => Promise<void>;

  // Navigation
  goToStep: (stepIndex: number) => Promise<void>;
  nextStep: () => Promise<boolean>;
  previousStep: () => void;
  skipStep: () => Promise<void>;

  // Completion
  completeBooking: (completionType?: 'payment' | 'quote') => Promise<BookingCompletionResult>;

  // Payment Management
  fetchPaymentGateways: (flowId: number) => Promise<void>;
  selectPaymentGateway: (gateway: PaymentGateway) => void;

  // Pricing
  calculatePricing: (discountCode?: string, venueAdditionalHours?: Record<string, number>) => Promise<void>;
  updateTotalPrice: (price: string) => void;
  setTaxRate: (rate: number) => void;
  setPricingBreakdown: (breakdown: PricingCalculation) => void;

  // Session Recovery
  checkForRecoverableSession: () => Promise<void>;
  recoverSession: (sessionId: string) => Promise<void>;
  discardRecoverableSession: () => Promise<void>;
  clearRecoverableSession: () => void;

  // Utilities
  resetBooking: () => void;
  clearErrors: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Helpers
  getSelectedProducts: () => { packages: SelectedPackage[]; addons: SelectedAddon[] };
  getBookingData: () => BookingData;
  getCurrentStep: () => BookingFlowStep | null;
  getStepData: <T>(stepType: string) => T | undefined;
  isStepCompleted: (stepId: number) => boolean;
}

/**
 * Combined context value
 */
export interface BookingContextValue {
  state: BookingState;
  actions: BookingActions;
}

/**
 * Initial state factory
 */
export const createInitialBookingState = (): BookingState => ({
  availableFlows: [],
  selectedEventType: null,
  currentFlow: null,
  currentSession: null,
  sessionId: null,
  stepData: {},
  pendingChanges: false,
  progress: {
    currentStepIndex: 0,
    totalSteps: 0,
    completedSteps: [],
    canGoBack: false,
    canGoNext: true,
    canSkip: false,
    progressPercentage: 0,
  },
  ui: {
    isLoading: false,
    isValidating: false,
    isSubmitting: false,
    isSaving: false,
    error: null,
    validationErrors: {},
  },
  paymentGateways: [],
  selectedPaymentGateway: null,
  totalPrice: '0.00',
  taxRate: 0.12,
  pricingBreakdown: null,
  recoverableSession: null,
  showRecoveryPrompt: false,
  completionResult: null,
});
