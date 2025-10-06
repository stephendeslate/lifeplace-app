// frontend/client-portal/src/types/booking/state.types.ts

import type { EventType, BookingFlow } from './core.types';
import type { BookingSession } from './bookingData.types';
import type { SelectedAddon, SelectedPackage, StepData } from './stepData.types';
import type { PaymentGateway } from './payment.types';
import type { BookingCompletionResult, StepValidationResult } from './api.types';
import type { BookingData } from './bookingData.types';

// UI State types
export interface BookingProgress {
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number[];
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
}

export interface BookingUIState {
  isLoading: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
}

// Main Booking Context State
export interface BookingState {
  // Flow data
  availableFlows: BookingFlow[];
  selectedEventType: EventType | null;
  currentFlow: BookingFlow | null;
  
  // Session data
  currentSession: BookingSession | null;
  stepData: StepData;
  
  // Progress tracking
  progress: BookingProgress;
  
  // UI state
  ui: BookingUIState;
  
  // Payment data
  paymentGateways: PaymentGateway[];
  selectedPaymentGateway: PaymentGateway | null;
  
  // Pricing
  totalPrice: string;
  breakdown: {
    item_name: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    type: 'PACKAGE' | 'ADDON' | 'TAX' | 'DISCOUNT' | 'FEE';
  }[];
}

// Action types
export interface BookingActions {

  getSelectedProducts: () => { packages: SelectedPackage[]; addons: SelectedAddon[] };
  getBookingData: () => BookingData;

  // Flow management
  fetchAvailableFlows: () => Promise<void>;
  selectEventType: (eventType: EventType) => Promise<void>;
  
  // Session management
  startSession: (flowId: number) => Promise<void>;
  updateStepData: (stepType: string, data: Record<string, unknown>) => Promise<void>;
  validateStep: (stepId: number, data: Record<string, unknown>) => Promise<StepValidationResult>;
  
  // Navigation
  goToStep: (stepIndex: number) => void;
  nextStep: () => Promise<void>;
  previousStep: () => void;
  skipStep: () => Promise<void>;
  
  // Completion
  completeBooking: (completionType?: 'payment' | 'quote') => Promise<BookingCompletionResult>;
  
  // Payment
  fetchPaymentGateways: () => Promise<void>;
  selectPaymentGateway: (gateway: PaymentGateway) => void;
  
  // Pricing
  updateTotalPrice: (newTotalPrice: string) => Promise<void>;
  
  // Utilities
  calculatePricing: () => Promise<void>;
  resetBooking: () => void;
  clearErrors: () => void;
}