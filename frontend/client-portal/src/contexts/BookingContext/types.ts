// frontend/client-portal/src/contexts/BookingContext/types.ts

import type {
  BookingState,
  BookingFlow,
  BookingSession,
  PaymentGateway,
} from '../../types/booking';

// Initial state
export const initialState: BookingState = {
  availableFlows: [],
  selectedEventType: null,
  currentFlow: null,
  currentSession: null,
  stepData: {},
  progress: {
    currentStepIndex: 0,
    totalSteps: 0,
    completedSteps: [],
    canGoBack: false,
    canGoNext: true,
    canSkip: false,
  },
  ui: {
    isLoading: false,
    isValidating: false,
    isSubmitting: false,
    error: null,
    validationErrors: {},
  },
  paymentGateways: [],
  selectedPaymentGateway: null,
  totalPrice: '0.00',
  taxRate: 0, // No hardcoded default - fetched from backend TaxRate
  pricingBreakdown: {
    subtotal: '0.00',
    tax: '0.00',
    discount: '0.00',
    formattedSubtotal: '',
    formattedTax: '',
    formattedDiscount: '',
  },
  breakdown: [],
  recoverableSession: null,
  quickQuoteMode: false,
  quickQuoteSourceStepIndex: null,
};

// Action types
export type BookingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string[]> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_AVAILABLE_FLOWS'; payload: BookingFlow[] }
  | { type: 'SELECT_EVENT_TYPE'; payload: BookingState['selectedEventType'] }
  | { type: 'SET_CURRENT_FLOW'; payload: BookingFlow }
  | { type: 'SET_CURRENT_SESSION'; payload: BookingSession | null }
  | {
      type: 'UPDATE_STEP_DATA';
      payload: { stepType: string; data: Record<string, unknown> };
    }
  | { type: 'SET_PROGRESS'; payload: Partial<BookingState['progress']> }
  | { type: 'SET_PAYMENT_GATEWAYS'; payload: PaymentGateway[] }
  | { type: 'SELECT_PAYMENT_GATEWAY'; payload: PaymentGateway }
  | { type: 'SET_TOTAL_PRICE'; payload: string }
  | { type: 'SET_TAX_RATE'; payload: number }
  | {
      type: 'SET_PRICING_BREAKDOWN';
      payload: {
        subtotal: string;
        tax: string;
        discount: string;
        formattedSubtotal: string;
        formattedTax: string;
        formattedDiscount: string;
      };
    }
  | { type: 'RESET_BOOKING' }
  | {
      type: 'SET_RECOVERABLE_SESSION';
      payload: {
        sessionId: string;
        lastUpdated: string;
        stepName: string;
        progressPercentage: number;
      } | null;
    }
  | { type: 'SET_QUICK_QUOTE_MODE'; payload: { sourceStepIndex: number } }
  | { type: 'EXIT_QUICK_QUOTE_MODE' };
