// frontend/client-portal/src/contexts/BookingContext.tsx

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingCoreApi } from '../apis/booking/core.api';
import { PaymentApi } from '../apis/booking/payment.api';
import type {
  BookingState,
  BookingActions,
  EventType,
  BookingFlow,
  StepData,
  PaymentGateway,
  StepValidationResult,
  BookingCompletionResult,
  BookingSession,
} from '../types/booking';

// Initial state
const initialState: BookingState = {
  // Flow data
  availableFlows: [],
  selectedEventType: null,
  currentFlow: null,
  
  // Session data
  currentSession: null,
  stepData: {},
  
  // Progress tracking
  progress: {
    currentStepIndex: 0,
    totalSteps: 0,
    completedSteps: [],
    canGoBack: false,
    canGoNext: false,
    canSkip: false,
  },
  
  // UI state
  ui: {
    isLoading: false,
    isValidating: false,
    isSubmitting: false,
    error: null,
    validationErrors: {},
  },
  
  // Payment data
  paymentGateways: [],
  selectedPaymentGateway: null,
  
  // Pricing
  totalPrice: '0.00',
  breakdown: [],
};

// Action types
type BookingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string[]> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_AVAILABLE_FLOWS'; payload: BookingFlow[] }
  | { type: 'SELECT_EVENT_TYPE'; payload: EventType }
  | { type: 'SET_CURRENT_FLOW'; payload: BookingFlow }
  | { type: 'SET_CURRENT_SESSION'; payload: any }
  | { type: 'UPDATE_STEP_DATA'; payload: { stepType: string; data: any } }
  | { type: 'SET_PROGRESS'; payload: Partial<typeof initialState.progress> }
  | { type: 'SET_PAYMENT_GATEWAYS'; payload: PaymentGateway[] }
  | { type: 'SELECT_PAYMENT_GATEWAY'; payload: PaymentGateway }
  | { type: 'SET_TOTAL_PRICE'; payload: string }
  | { type: 'RESET_BOOKING' };

// Reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
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
      return { ...state, ui: { ...state.ui, validationErrors: action.payload } };
    
    case 'CLEAR_ERRORS':
      return { 
        ...state, 
        ui: { ...state.ui, error: null, validationErrors: {} } 
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
        }
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
    
    case 'RESET_BOOKING':
      return initialState;
    
    default:
      return state;
  }
}

// Context creation
const BookingContext = createContext<{
  state: BookingState;
  actions: BookingActions;
} | null>(null);

// Provider component
export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const navigate = useNavigate();

  // Helper function to update progress
  const updateProgress = useCallback(() => {
    if (!state.currentFlow || !state.currentSession) return;

    const currentStepIndex = state.currentFlow.enabled_steps.findIndex(
      step => step.id === state.currentSession?.current_step?.id
    );

    dispatch({
      type: 'SET_PROGRESS',
      payload: {
        currentStepIndex: Math.max(0, currentStepIndex),
        canGoBack: currentStepIndex > 0,
        canGoNext: true,
        canSkip: state.currentSession?.current_step?.is_skippable || false,
      },
    });
  }, [state.currentFlow, state.currentSession]);

  // Update progress only when flow or step changes
  useEffect(() => {
    if (state.currentFlow && state.currentSession) {
      updateProgress();
    }
  }, [state.currentFlow?.id, state.currentSession?.current_step?.id]);

  // Session recovery on mount
  useEffect(() => {
    BookingCoreApi.cleanupExpiredSessions();
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      BookingCoreApi.getSession(sessionId)
        .then(sessionData => {
          if (!BookingCoreApi.isSessionExpired(sessionData.expires_at)) {
            dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionData });
            return BookingCoreApi.getFlowById(sessionData.booking_flow);
          }
        })
        .then(flow => {
          if (flow) {
            dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
          }
        })
        .catch(error => {
          console.warn('Failed to recover session:', error);
        });
    }
  }, []);

  // Actions implementation
  const actions: BookingActions = {
    getSelectedProducts: useCallback(() => {
      if (!state.currentSession?.booking_data) {
        return { packages: [], addons: [] };
      }

      const bookingData = state.currentSession.booking_data;
      
      return {
        packages: bookingData.selected_packages || [],
        addons: bookingData.selected_addons || []
      };
    }, [state.currentSession]),

    getBookingData: useCallback(() => {
      return state.currentSession?.booking_data || {};
    }, [state.currentSession]),
    
    fetchAvailableFlows: useCallback(async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const flows = await BookingCoreApi.getAvailableFlows();
        dispatch({ type: 'SET_AVAILABLE_FLOWS', payload: flows });
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    selectEventType: useCallback(async (eventType: EventType) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        dispatch({ type: 'SELECT_EVENT_TYPE', payload: eventType });
        
        const flows = await BookingCoreApi.getAvailableFlows(eventType.id);
        
        if (flows.length === 0) {
          throw new Error('No booking flows available for this event type');
        }
        
        const selectedFlow = flows[0];
        dispatch({ type: 'SET_CURRENT_FLOW', payload: selectedFlow });
        
        await actions.startSession(selectedFlow.id);
        
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    startSession: useCallback(async (flowId: number) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const sessionResponse = await BookingCoreApi.startSession(flowId);
        
        const sessionData: BookingSession = {
          session_id: sessionResponse.session_id,
          booking_flow: flowId,
          current_step: sessionResponse.current_step,
          progress_percentage: sessionResponse.progress_percentage,
          expires_at: sessionResponse.expires_at,
          is_completed: false,
          is_abandoned: false,
          total_price: '0.00',
          updated_at: new Date().toISOString(),
          booking_data: {},
          created_at: new Date().toISOString(),
        };
        
        dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionData });
        
        BookingCoreApi.saveSessionToLocal(sessionResponse.session_id, sessionData);
        
        await actions.fetchPaymentGateways();
        
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    updateStepData: useCallback(async (stepType: string, data: any) => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      dispatch({ type: 'SET_VALIDATING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const currentStep = state.currentSession.current_step;
        if (!currentStep) {
          throw new Error('No current step found');
        }

        // Format the data based on step type
        let formattedData = data;

        // Create the booking_data structure expected by backend
        const bookingDataUpdate = {
          ...state.currentSession.booking_data || {},
          ...formattedData
        };
        
        // Special handling for package and addon selection to ensure proper structure
        if (stepType === 'package_selection' && data.selected_packages) {
          formattedData = {
            selected_packages: data.selected_packages
          };
          // Also store at root level
          bookingDataUpdate.selected_packages = data.selected_packages;
        } else if (stepType === 'addon_selection' && data.selected_addons) {
          formattedData = {
            selected_addons: data.selected_addons
          };
          // Also store at root level
          bookingDataUpdate.selected_addons = data.selected_addons;
        }

        // The core API now handles the transformation to backend format internally
        // We just pass the booking data and it will be wrapped in step_data
        const response = await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id,
          bookingDataUpdate,  // Pass booking data directly
          false  // mark_completed
        );

        dispatch({ 
          type: 'UPDATE_STEP_DATA', 
          payload: { stepType, data: formattedData } 
        });

        const updatedSession = {
          ...state.currentSession,
          booking_data: bookingDataUpdate,
          current_step: response.current_step,
          progress_percentage: response.progress_percentage,
          total_price: response.total_price,
          updated_at: response.updated_at,
        };

        dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

        if (response.total_price && response.total_price !== state.totalPrice) {
          dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
        }

        if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: response.validation_errors });
        } else {
          dispatch({ type: 'CLEAR_ERRORS' });
        }

        BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, updatedSession);

      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        const validationErrors = BookingCoreApi.extractValidationErrors(error);
        
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validationErrors });
      } finally {
        dispatch({ type: 'SET_VALIDATING', payload: false });
      }
    }, [state.currentSession, state.stepData, state.totalPrice]),

    validateStep: useCallback(async (stepId: number, data: any): Promise<StepValidationResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      try {
        const result = await BookingCoreApi.validateStepData(
          state.currentSession.session_id,
          stepId,
          data
        );
        
        if (!result.isValid) {
          const errors: Record<string, string[]> = {};
          result.errors.forEach(error => {
            errors[error.field] = [error.message];
          });
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
        } else {
          dispatch({ type: 'CLEAR_ERRORS' });
        }
        
        return result;
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        return { isValid: false, errors: [{ field: 'general', message: errorMessage }] };
      }
    }, [state.currentSession]),

    goToStep: useCallback((stepIndex: number) => {
      if (!state.currentFlow) return;
      
      const targetStep = state.currentFlow.enabled_steps[stepIndex];
      if (targetStep) {
        dispatch({
          type: 'SET_CURRENT_SESSION',
          payload: {
            ...state.currentSession,
            current_step: targetStep,
          },
        });
      }
    }, [state.currentFlow, state.currentSession]),

    nextStep: useCallback(async () => {
      if (!state.currentFlow || !state.currentSession) return;

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const currentStep = state.currentSession.current_step;
        if (!currentStep) return;

        // Get current step data from the session's booking_data
        const bookingData = state.currentSession.booking_data || {};
        
        // Prepare the complete booking_data to send
        const updatedBookingData = {
          ...bookingData,
          // Add any step-specific data that might be in state.stepData but not yet in booking_data
          ...state.stepData[currentStep.step_type]
        };
        
        // The core API now handles the transformation to backend format internally
        const response = await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id,
          updatedBookingData,  // Pass booking data directly
          true // mark_completed = true to proceed to next step
        );

        const updatedSession: BookingSession = {
          ...state.currentSession,
          booking_data: updatedBookingData,
          current_step: response.current_step,
          progress_percentage: response.progress_percentage,
          total_price: response.total_price,
          updated_at: response.updated_at,
        };

        dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

        if (response.total_price && response.total_price !== state.totalPrice) {
          dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
        }

        BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, updatedSession);

      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        const validationErrors = BookingCoreApi.extractValidationErrors(error);
        
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validationErrors });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
    }, [state.currentFlow, state.currentSession, state.stepData, state.totalPrice]),

    previousStep: useCallback(() => {
      if (!state.currentFlow) return;
      
      const currentIndex = state.progress.currentStepIndex;
      if (currentIndex > 0) {
        actions.goToStep(currentIndex - 1);
      }
    }, [state.currentFlow, state.progress.currentStepIndex]),

    skipStep: useCallback(async () => {
      if (!state.currentSession?.current_step?.is_skippable) return;
      await actions.nextStep();
    }, [state.currentSession]),

    completeBooking: useCallback(async (): Promise<BookingCompletionResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const result = await BookingCoreApi.completeBooking(state.currentSession.session_id);
        
        BookingCoreApi.clearSessionFromLocal(state.currentSession.session_id);
        
        dispatch({
          type: 'SET_CURRENT_SESSION',
          payload: {
            ...state.currentSession,
            is_completed: true,
          },
        });

        return result;
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
    }, [state.currentSession]),

    fetchPaymentGateways: useCallback(async () => {
      if (!state.currentFlow) return;
      
      try {
        const response = await BookingCoreApi.getFlowPaymentGateways(state.currentFlow.id);
        dispatch({ type: 'SET_PAYMENT_GATEWAYS', payload: response.available_gateways });
        
        if (response.default_gateway) {
          const defaultGateway = response.available_gateways.find(
            g => g.id === response.default_gateway
          );
          if (defaultGateway) {
            dispatch({ type: 'SELECT_PAYMENT_GATEWAY', payload: defaultGateway });
          }
        }
      } catch (error) {
        console.warn('Failed to load payment gateways:', error);
      }
    }, [state.currentFlow]),

    selectPaymentGateway: useCallback((gateway: PaymentGateway) => {
      dispatch({ type: 'SELECT_PAYMENT_GATEWAY', payload: gateway });
    }, []),

    updateTotalPrice: useCallback(async (newTotalPrice: string) => {
      dispatch({ type: 'SET_TOTAL_PRICE', payload: newTotalPrice });
      
      if (state.currentSession && state.currentSession.current_step) {
        try {
          await BookingCoreApi.updateSessionData(
            state.currentSession.session_id,
            state.currentSession.current_step.id,
            { total_price: newTotalPrice },
            false
          );
        } catch (error) {
          console.warn('Failed to update session total price:', error);
        }
      }
    }, [state.currentSession]),

    calculatePricing: useCallback(async () => {
      // Placeholder - pricing is calculated in the PricingSummaryStep
    }, []),

    resetBooking: useCallback(() => {
      if (state.currentSession) {
        BookingCoreApi.clearSessionFromLocal(state.currentSession.session_id);
      }
      
      dispatch({ type: 'RESET_BOOKING' });
      navigate('/');
    }, [state.currentSession, navigate]),

    clearErrors: useCallback(() => {
      dispatch({ type: 'CLEAR_ERRORS' });
    }, []),
  };

  const value = { state, actions };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export default BookingContext;