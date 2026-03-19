// frontend/client-portal/src/contexts/BookingContext/reducer.ts

import type { BookingState } from '../../types/booking';
import { initialState, type BookingAction } from './types';

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, isLoading: action.payload } };

    case 'SET_VALIDATING':
      return { ...state, ui: { ...state.ui, isValidating: action.payload } };

    case 'SET_SUBMITTING':
      return { ...state, ui: { ...state.ui, isSubmitting: action.payload } };

    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.payload } };

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        ui: { ...state.ui, validationErrors: action.payload },
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        ui: { ...state.ui, error: null, validationErrors: {} },
      };

    case 'SET_AVAILABLE_FLOWS':
      return { ...state, availableFlows: action.payload };

    case 'SELECT_EVENT_TYPE':
      return { ...state, selectedEventType: action.payload };

    case 'SET_CURRENT_FLOW':
      return {
        ...state,
        currentFlow: action.payload,
        progress: {
          ...state.progress,
          totalSteps: action.payload.enabled_steps.length,
          currentStepIndex: 0,
        },
      };

    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSession: action.payload,
        totalPrice: action.payload?.total_price || state.totalPrice,
      };

    case 'UPDATE_STEP_DATA':
      return {
        ...state,
        stepData: {
          ...state.stepData,
          [action.payload.stepType]: action.payload.data,
        },
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: { ...state.progress, ...action.payload },
      };

    case 'SET_PAYMENT_GATEWAYS':
      return { ...state, paymentGateways: action.payload };

    case 'SELECT_PAYMENT_GATEWAY':
      return { ...state, selectedPaymentGateway: action.payload };

    case 'SET_TOTAL_PRICE':
      return { ...state, totalPrice: action.payload };

    case 'SET_TAX_RATE':
      return { ...state, taxRate: action.payload };

    case 'SET_PRICING_BREAKDOWN':
      return { ...state, pricingBreakdown: action.payload };

    case 'RESET_BOOKING':
      return initialState;

    case 'SET_RECOVERABLE_SESSION':
      return { ...state, recoverableSession: action.payload };

    case 'SET_QUICK_QUOTE_MODE':
      return {
        ...state,
        quickQuoteMode: true,
        quickQuoteSourceStepIndex: action.payload.sourceStepIndex,
      };

    case 'EXIT_QUICK_QUOTE_MODE':
      return {
        ...state,
        quickQuoteMode: false,
        quickQuoteSourceStepIndex: null,
      };

    default:
      return state;
  }
}
