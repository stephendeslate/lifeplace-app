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
        totalPrice: action.payload?.total_price || state.totalPrice, // Keep existing totalPrice if session doesn't have one
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

    const completedSteps = Object.keys(state.stepData)
      .map(stepType => {
        const step = state.currentFlow?.enabled_steps.find(s => s.step_type === stepType);
        return step?.id;
      })
      .filter(Boolean) as number[];

    dispatch({
      type: 'SET_PROGRESS',
      payload: {
        currentStepIndex: Math.max(0, currentStepIndex),
        completedSteps,
        canGoBack: currentStepIndex > 0,
        canGoNext: true, // Will be validated in nextStep
        canSkip: state.currentSession?.current_step?.is_skippable || false,
      },
    });
  }, [state.currentFlow, state.currentSession, state.stepData]);

  // Actions implementation using dedicated APIs
  const actions: BookingActions = {
    // Flow management
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
        
        // Get flows for this event type
        const flows = await BookingCoreApi.getAvailableFlows(eventType.id);
        
        if (flows.length === 0) {
          throw new Error('No booking flows available for this event type');
        }
        
        // Auto-select the first available flow
        const selectedFlow = flows[0];
        dispatch({ type: 'SET_CURRENT_FLOW', payload: selectedFlow });
        
        // Start the session
        await actions.startSession(selectedFlow.id);
        
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    // Session management using BookingCoreApi
    startSession: useCallback(async (flowId: number) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const sessionResponse = await BookingCoreApi.startSession(flowId);
        
        // Use exact response structure from BookingSessionStartResponse
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
        };
        
        dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionData });
        
        // Save session to local storage for persistence
        BookingCoreApi.saveSessionToLocal(sessionResponse.session_id, sessionData);
        
        // Load payment gateways
        await actions.fetchPaymentGateways();
        
      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    // Update step data with exact backend API structure
    updateStepData: useCallback(async (stepType: string, data: any) => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      dispatch({ type: 'SET_VALIDATING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        // Find the current step
        const currentStep = state.currentSession.current_step;
        if (!currentStep) {
          throw new Error('No current step found');
        }

        // Format data according to backend expectations
        const formattedData = BookingCoreApi.formatStepData(stepType, data);

        // Update session data on backend
        const response = await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id,
          formattedData,
          false // Don't mark as completed yet
        );

        // Update local state
        dispatch({ 
          type: 'UPDATE_STEP_DATA', 
          payload: { stepType, data: formattedData } 
        });

        // Update session with exact response structure
        const updatedSession = {
          ...state.currentSession,
          current_step: response.current_step,
          progress_percentage: response.progress_percentage,
          total_price: response.total_price,
          updated_at: response.updated_at,
        };

        dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

        // Update total price in state if it changed
        if (response.total_price && response.total_price !== state.totalPrice) {
          dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
        }

        // Handle validation errors from backend
        if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: response.validation_errors });
        } else {
          dispatch({ type: 'CLEAR_ERRORS' });
        }

        // Save to local storage
        BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, {
          ...updatedSession,
          stepData: { ...state.stepData, [stepType]: formattedData },
        });

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

    // Navigation
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

    // Next step with proper completion handling
    nextStep: useCallback(async () => {
      if (!state.currentFlow || !state.currentSession) return;

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const currentStep = state.currentSession.current_step;
        if (!currentStep) return;

        // Get current step data and format it
        const currentStepData = state.stepData[currentStep.step_type] || {};
        const formattedData = BookingCoreApi.formatStepData(currentStep.step_type, currentStepData);
        
        // Mark current step as completed
        const response = await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id,
          formattedData,
          true // Mark as completed
        );

        // Update session with exact response structure
        const updatedSession: BookingSession = {
          ...state.currentSession,
          current_step: response.current_step,
          progress_percentage: response.progress_percentage,
          total_price: response.total_price,
          updated_at: response.updated_at,
        };

        dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

        // Update total price if it changed
        if (response.total_price && response.total_price !== state.totalPrice) {
          dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
        }

        // If no next step, we're at the end - either review or complete
        if (!response.current_step) {
          // Check if this is the last step or if we should complete
          const isLastStep = currentStep.step_type === 'confirmation';
          if (isLastStep) {
            navigate('/booking/complete');
          } else {
            // Continue to next step if available
            const nextStepIndex = state.currentFlow.enabled_steps.findIndex(
              step => step.id === currentStep.id
            ) + 1;
            
            if (nextStepIndex < state.currentFlow.enabled_steps.length) {
              const nextStep = state.currentFlow.enabled_steps[nextStepIndex];
              dispatch({
                type: 'SET_CURRENT_SESSION',
                payload: { ...updatedSession, current_step: nextStep }
              });
            } else {
              navigate('/booking/complete');
            }
          }
        }

      } catch (error) {
        const errorMessage = BookingCoreApi.handleApiError(error);
        const validationErrors = BookingCoreApi.extractValidationErrors(error);
        
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validationErrors });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
    }, [state.currentFlow, state.currentSession, state.stepData, state.totalPrice, navigate]),

    previousStep: useCallback(() => {
      if (!state.currentFlow) return;
      
      const currentIndex = state.progress.currentStepIndex;
      if (currentIndex > 0) {
        actions.goToStep(currentIndex - 1);
      }
    }, [state.currentFlow, state.progress.currentStepIndex]),

    skipStep: useCallback(async () => {
      if (!state.currentSession?.current_step?.is_skippable) return;
      
      // Just move to next step without saving data
      await actions.nextStep();
    }, [state.currentSession]),

    // Completion
    completeBooking: useCallback(async (): Promise<BookingCompletionResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const result = await BookingCoreApi.completeBooking(state.currentSession.session_id);
        
        // Clear session data
        BookingCoreApi.clearSessionFromLocal(state.currentSession.session_id);
        
        // Update session as completed
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

    // Payment using PaymentApi
    fetchPaymentGateways: useCallback(async () => {
      if (!state.currentFlow) return;
      
      try {
        const response = await BookingCoreApi.getFlowPaymentGateways(state.currentFlow.id);
        dispatch({ type: 'SET_PAYMENT_GATEWAYS', payload: response.available_gateways });
        
        // Auto-select default gateway
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

    // NEW: Update total price action
    updateTotalPrice: useCallback(async (newTotalPrice: string) => {
      // Update the global state immediately
      dispatch({ type: 'SET_TOTAL_PRICE', payload: newTotalPrice });
      
      // Also update the session to persist the change
      if (state.currentSession && state.currentSession.current_step) {
        try {
          await BookingCoreApi.updateSessionData(
            state.currentSession.session_id,
            state.currentSession.current_step.id,
            { total_price: newTotalPrice },
            false // Don't mark as completed
          );
        } catch (error) {
          console.warn('Failed to update session total price:', error);
          // Don't throw error as this is not critical for UX
        }
      }
    }, [state.currentSession]),

    // Utilities
    calculatePricing: useCallback(async () => {
      // This would calculate pricing based on selected packages, add-ons, etc.
      // For now, the total_price comes from the session updates and PricingSummaryStep
    }, []),

    resetBooking: useCallback(() => {
      // Clear any saved session data
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

  // Update progress when dependencies change
  useEffect(() => {
    updateProgress();
  }, [updateProgress]);

  // Session recovery on mount
  useEffect(() => {
    // Clean up expired sessions
    BookingCoreApi.cleanupExpiredSessions();
    
    // Try to recover session from URL or local storage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      // Try to recover session from backend
      BookingCoreApi.getSession(sessionId)
        .then(sessionData => {
          if (!BookingCoreApi.isSessionExpired(sessionData.expires_at)) {
            dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionData });
            
            // Get the flow for this session
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

  const value = { state, actions };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

// Hook to use the booking context
export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export default BookingContext;