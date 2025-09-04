// frontend/client-portal/src/contexts/BookingContext.tsx

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { BookingCoreApi } from '../apis/booking/core.api';
import type {
  BookingState,
  BookingActions,
  EventType,
  BookingFlow,
  BookingSession,
  BookingCompletionResult,
  PaymentGateway,
  StepValidationResult,
} from '../types/booking';

// Initial state
const initialState: BookingState = {
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
  | { type: 'SET_CURRENT_SESSION'; payload: BookingSession | null }
  | { type: 'UPDATE_STEP_DATA'; payload: { stepType: string; data: any } }
  | { type: 'SET_PROGRESS'; payload: Partial<BookingState['progress']> }
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
  
  // Create a ref to store the debounced update function
  const debouncedUpdateRef = useRef<any>(null);
  
  // Create the debounced backend update function
  const createDebouncedBackendUpdate = useCallback(() => {
    return debounce(async (
      sessionId: string,
      stepId: number,
      bookingDataUpdate: any,
      totalPrice: string
    ) => {
      try {
        // Only update backend, don't update local state here
        const response = await BookingCoreApi.updateSessionData(
          sessionId,
          stepId,
          bookingDataUpdate,
          false  // mark_completed = false for incremental updates
        );
        
        // Only update total price if it changed
        if (response.total_price && response.total_price !== totalPrice) {
          dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
        }
        
        // Handle validation errors from backend
        if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: response.validation_errors });
        }
        
        // Save to local storage
        BookingCoreApi.saveSessionToLocal(sessionId, {
          booking_data: bookingDataUpdate,
          total_price: response.total_price,
          updated_at: response.updated_at,
        } as any);
        
      } catch (error) {
        console.warn('Background update failed:', error);
        // Don't show errors for background updates - they'll retry
      }
    }, 1000); // Debounce for 1 second
  }, []);
  
  // Initialize the debounced function
  useEffect(() => {
    debouncedUpdateRef.current = createDebouncedBackendUpdate();
    
    // Cleanup on unmount
    return () => {
      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }
    };
  }, [createDebouncedBackendUpdate]);

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
  }, [state.currentFlow?.id, state.currentSession?.current_step?.id, updateProgress]);

  // Session recovery on mount
  useEffect(() => {
    BookingCoreApi.cleanupExpiredSessions();
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      BookingCoreApi.getSession(sessionId)
        .then(sessionData => {
          if (!BookingCoreApi.isSessionExpired(sessionData.expires_at)) {
            dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionData as BookingSession });
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

      // Clear any errors immediately for better UX
      dispatch({ type: 'CLEAR_ERRORS' });
      
      const currentStep = state.currentSession.current_step;
      if (!currentStep) {
        throw new Error('No current step found');
      }

      // Format the data based on step type
      let formattedData = data;
      
      // Create the booking_data structure
      const bookingDataUpdate = {
        ...state.currentSession.booking_data || {},
        ...formattedData
      };
      
      // Special handling for package and addon selection
      if (stepType === 'package_selection' && data.selected_packages) {
        formattedData = { selected_packages: data.selected_packages };
        bookingDataUpdate.selected_packages = data.selected_packages;
      } else if (stepType === 'addon_selection' && data.selected_addons) {
        formattedData = { selected_addons: data.selected_addons };
        bookingDataUpdate.selected_addons = data.selected_addons;
      }

      // IMMEDIATELY update local state for responsive UI
      dispatch({ 
        type: 'UPDATE_STEP_DATA', 
        payload: { stepType, data: formattedData } 
      });
      
      // Update session in local state immediately
      const updatedSession = {
        ...state.currentSession,
        booking_data: bookingDataUpdate,
      };
      dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

      // DEBOUNCED backend update - won't block UI
      if (debouncedUpdateRef.current) {
        debouncedUpdateRef.current(
          state.currentSession.session_id,
          currentStep.id,
          bookingDataUpdate,
          state.totalPrice
        );
      }
      
    }, [state.currentSession, state.totalPrice]),

    validateStep: useCallback(async (stepId: number, data: any): Promise<StepValidationResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      // Cancel any pending debounced updates before validation
      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
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
      if (targetStep && state.currentSession) {
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

      // Cancel any pending debounced updates
      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const currentStep = state.currentSession.current_step;
        if (!currentStep) return;

        // Get complete booking data
        const bookingData = state.currentSession.booking_data || {};
        const updatedBookingData = {
          ...bookingData,
          ...state.stepData[currentStep.step_type]
        };
        
        // Now do a FULL update with mark_completed = true
        const response = await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id,
          updatedBookingData,
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

    previousStep: useCallback(async () => {
      if (!state.currentFlow || !state.currentSession) return;
      
      const currentIndex = state.progress.currentStepIndex;
      if (currentIndex > 0) {
        const targetStep = state.currentFlow.enabled_steps[currentIndex - 1];
        
        if (targetStep) {
          dispatch({ type: 'SET_SUBMITTING', payload: true });
          
          try {
            // Use the new endpoint to explicitly set the step
            const response = await BookingCoreApi.goToStep(
              state.currentSession.session_id,
              targetStep.id
            );
            
            const updatedSession = {
              ...state.currentSession,
              current_step: response.current_step,
              progress_percentage: response.progress_percentage,
              updated_at: response.updated_at,
            };
            
            dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
            BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, updatedSession);
            
          } catch (error) {
            const errorMessage = BookingCoreApi.handleApiError(error);
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
          } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
          }
        }
      }
    }, [state.currentFlow, state.currentSession, state.progress.currentStepIndex]),

    skipStep: useCallback(async () => {
      if (!state.currentSession?.current_step?.is_skippable) return;
      await actions.nextStep();
    }, [state.currentSession]),

    completeBooking: useCallback(async (completionType: 'payment' | 'quote' = 'payment'): Promise<BookingCompletionResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      // Cancel any pending debounced updates
      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });
      
      try {
        const result = await BookingCoreApi.completeBooking(state.currentSession.session_id, completionType);
        
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
      
      // Cancel any pending debounced updates
      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }
      
      dispatch({ type: 'RESET_BOOKING' });
      navigate('/');
    }, [state.currentSession, navigate]),

    clearErrors: useCallback(() => {
      dispatch({ type: 'CLEAR_ERRORS' });
    }, []),
  };

  // Fix the circular dependency by creating a stable reference
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Update references where needed
  useEffect(() => {
    actions.startSession = actionsRef.current.startSession;
    actions.nextStep = actionsRef.current.nextStep;
    actions.fetchPaymentGateways = actionsRef.current.fetchPaymentGateways;
  }, [actions]);

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