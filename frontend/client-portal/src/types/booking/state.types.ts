// frontend/client-portal/src/types/booking/state.types.ts

import type { EventType, BookingFlow, BookingSession } from './core.types';
import type { StepData } from './stepData.types';
import type { PaymentGateway } from './payment.types';
import type { BookingCompletionResult, StepValidationResult } from './api.types';

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
  breakdown: any[];
}

// Action types
export interface BookingActions {
  // Flow management
  fetchAvailableFlows: () => Promise<void>;
  selectEventType: (eventType: EventType) => Promise<void>;
  
  // Session management
  startSession: (flowId: number) => Promise<void>;
  updateStepData: (stepType: string, data: any) => Promise<void>;
  validateStep: (stepId: number, data: any) => Promise<StepValidationResult>;
  
  // Navigation
  goToStep: (stepIndex: number) => void;
  nextStep: () => Promise<void>;
  previousStep: () => void;
  skipStep: () => Promise<void>;
  
  // Completion
  completeBooking: () => Promise<BookingCompletionResult>;
  
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