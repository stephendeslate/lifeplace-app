// frontend/client-portal/src/contexts/BookingContext.tsx

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce, type DebouncedFunc } from 'lodash';
import { BookingCoreApi } from '../apis/booking/core.api';
import { ErrorHandler } from '../utils/errorHandler';
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
  taxRate: 0.12, // Default 12% tax rate, updated from backend
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
  | { type: 'UPDATE_STEP_DATA'; payload: { stepType: string; data: Record<string, unknown> } }
  | { type: 'SET_PROGRESS'; payload: Partial<BookingState['progress']> }
  | { type: 'SET_PAYMENT_GATEWAYS'; payload: PaymentGateway[] }
  | { type: 'SELECT_PAYMENT_GATEWAY'; payload: PaymentGateway }
  | { type: 'SET_TOTAL_PRICE'; payload: string }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'SET_PRICING_BREAKDOWN'; payload: { subtotal: string; tax: string; discount: string; formattedSubtotal: string; formattedTax: string; formattedDiscount: string } }
  | { type: 'RESET_BOOKING' }
  | { type: 'SET_RECOVERABLE_SESSION'; payload: { sessionId: string; lastUpdated: string; stepName: string } | null };

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

    case 'SET_TAX_RATE':
      return { ...state, taxRate: action.payload };

    case 'SET_PRICING_BREAKDOWN':
      return { ...state, pricingBreakdown: action.payload };

    case 'RESET_BOOKING':
      return initialState;

    case 'SET_RECOVERABLE_SESSION':
      return { ...state, recoverableSession: action.payload };

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
  const debouncedUpdateRef = useRef<DebouncedFunc<(sessionId: string, stepId: number, bookingDataUpdate: Record<string, unknown>, totalPrice: string) => Promise<void>> | null>(null);
  
  // Create the debounced backend update function
  const createDebouncedBackendUpdate = useCallback(() => {
    return debounce(async (
      sessionId: string,
      stepId: number,
      bookingDataUpdate: Record<string, unknown>,
      totalPrice: string
    ) => {
      // FAILSAFE: Save to localStorage BEFORE API call
      // This ensures data is preserved even if API fails or tab closes mid-call
      BookingCoreApi.saveSessionToLocal(sessionId, {
        booking_data: bookingDataUpdate,
        total_price: totalPrice,
        updated_at: new Date().toISOString(),
        pending_sync: true, // Flag indicating not yet confirmed by server
      });

      try {
        // Update backend
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
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: response.validation_errors as Record<string, string[]> });
        }

        // Update localStorage with server-confirmed data (clear pending_sync flag)
        BookingCoreApi.saveSessionToLocal(sessionId, {
          booking_data: bookingDataUpdate,
          total_price: response.total_price,
          updated_at: response.updated_at,
          pending_sync: false, // Confirmed by server
        });

      } catch (error) {
        console.warn('Background update failed, data preserved in localStorage:', error);
        // Data is already saved to localStorage from the pre-API save
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
        canSkip: Boolean(state.currentSession?.current_step?.is_skippable),
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
    const sessionIdFromUrl = urlParams.get('session_id');

    if (sessionIdFromUrl) {
      // URL-based recovery - restore the session directly
      BookingCoreApi.getSession(sessionIdFromUrl)
        .then(sessionData => {
          if (!BookingCoreApi.isSessionExpired(sessionData.expires_at)) {
            dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionData as unknown as BookingSession });
            return BookingCoreApi.getFlowById(sessionData.booking_flow);
          }
        })
        .then(flow => {
          if (flow) {
            dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
          }
        })
        .catch(error => {
          console.warn('Failed to recover session from URL:', error);
        });
    } else {
      // No URL param - scan localStorage for recoverable sessions (guests)
      const discoverRecoverableSession = () => {
        try {
          const keys = Object.keys(localStorage);
          const sessionKeys = keys.filter(k => k.startsWith('booking_session_'));

          // Find the most recent non-expired session WITH meaningful progress
          let mostRecentSession: { sessionId: string; lastUpdated: string; stepName: string; timestamp: number; progressPercentage: number } | null = null;

          for (const key of sessionKeys) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');

              // Skip expired sessions
              if (data.expires_at && BookingCoreApi.isSessionExpired(data.expires_at)) {
                localStorage.removeItem(key); // Clean up expired
                continue;
              }

              // Check if session has meaningful progress worth recovering
              // A session is only recoverable if:
              // 1. progress_percentage > 0 OR
              // 2. booking_data has meaningful content (not just empty object)
              const bookingData = data.booking_data || {};
              const hasBookingData = Object.keys(bookingData).length > 0 &&
                // Check if there's actual data, not just empty arrays
                Object.values(bookingData).some((val: unknown) => {
                  if (Array.isArray(val)) return val.length > 0;
                  if (typeof val === 'object' && val !== null) return Object.keys(val).length > 0;
                  return val !== null && val !== undefined && val !== '';
                });
              const progressPercentage = data.progress_percentage || 0;
              const hasMeaningfulProgress = progressPercentage > 0 || hasBookingData;

              // Skip sessions with no meaningful progress
              if (!hasMeaningfulProgress) {
                localStorage.removeItem(key); // Clean up empty sessions
                continue;
              }

              const sessionId = key.replace('booking_session_', '');
              const lastUpdated = data.updated_at || data.savedAt || data.lastSaved;
              const timestamp = lastUpdated ? new Date(lastUpdated).getTime() : 0;

              // Track the most recent session with actual progress
              if (!mostRecentSession || timestamp > mostRecentSession.timestamp) {
                mostRecentSession = {
                  sessionId,
                  lastUpdated: lastUpdated || new Date().toISOString(),
                  stepName: data.current_step?.step_type_display || data.current_step?.step_type || 'Unknown',
                  timestamp,
                  progressPercentage,
                };
              }
            } catch {
              // Remove corrupted data
              localStorage.removeItem(key);
            }
          }

          // Set the most recent recoverable session
          if (mostRecentSession) {
            dispatch({
              type: 'SET_RECOVERABLE_SESSION',
              payload: {
                sessionId: mostRecentSession.sessionId,
                lastUpdated: mostRecentSession.lastUpdated,
                stepName: mostRecentSession.stepName,
              },
            });
          }
        } catch (error) {
          console.warn('Error discovering recoverable sessions:', error);
        }
      };

      discoverRecoverableSession();
    }
  }, []);

  // Unload handlers - save session when user leaves the page
  useEffect(() => {
    if (!state.currentSession) return;

    // Capture session reference at effect time for use in closure
    const currentSession = state.currentSession;

    const saveSessionOnLeave = () => {
      // Force flush any pending debounced updates
      if (debouncedUpdateRef.current?.flush) {
        debouncedUpdateRef.current.flush();
      }

      // Don't save sessions with 0% progress
      const progressPercentage = currentSession.progress_percentage || 0;
      if (progressPercentage === 0) {
        return;
      }

      // Save current state to localStorage synchronously
      try {
        const sessionToSave = {
          ...currentSession,
          stepData: state.stepData,
          booking_data: currentSession.booking_data,
          total_price: state.totalPrice,
          savedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          `booking_session_${currentSession.session_id}`,
          JSON.stringify(sessionToSave)
        );
      } catch (e) {
        console.warn('Failed to save session on unload:', e);
      }
    };

    // Save on page unload (tab close, navigation away)
    window.addEventListener('beforeunload', saveSessionOnLeave);

    // Save on visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveSessionOnLeave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save on page hide (mobile browsers)
    window.addEventListener('pagehide', saveSessionOnLeave);

    return () => {
      window.removeEventListener('beforeunload', saveSessionOnLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', saveSessionOnLeave);
    };
  }, [state.currentSession, state.stepData, state.totalPrice]);

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
        const errorMessage = ErrorHandler.extractMessage(error);
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
        const errorMessage = ErrorHandler.extractMessage(error);
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
          current_step: sessionResponse.current_step as unknown as Record<string, unknown> | undefined,
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
        
        BookingCoreApi.saveSessionToLocal(sessionResponse.session_id, sessionData as unknown as Record<string, unknown>);
        
        await actions.fetchPaymentGateways();
        
      } catch (error) {
        const errorMessage = ErrorHandler.extractMessage(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    updateStepData: useCallback(async (stepType: string, data: Record<string, unknown>) => {
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
      const bookingDataUpdate: Record<string, unknown> = {
        ...state.currentSession.booking_data || {},
        ...formattedData
      };
      
      // Special handling for package and addon selection
      if (stepType === 'package_selection' && data.selected_packages) {
        formattedData = { selected_packages: data.selected_packages };
        bookingDataUpdate.selected_packages = data.selected_packages;
        // Include venue_additional_hours if present
        if (data.venue_additional_hours) {
          (formattedData as Record<string, unknown>).venue_additional_hours = data.venue_additional_hours;
          bookingDataUpdate.venue_additional_hours = data.venue_additional_hours;
        }
      } else if (stepType === 'addon_selection' && data.selected_addons) {
        formattedData = { selected_addons: data.selected_addons };
        bookingDataUpdate.selected_addons = data.selected_addons;
        // Include venue_additional_hours if present for pricing calculation
        if (data.venue_additional_hours) {
          (formattedData as Record<string, unknown>).venue_additional_hours = data.venue_additional_hours;
          bookingDataUpdate.venue_additional_hours = data.venue_additional_hours;
        }
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
          currentStep.id as number,
          bookingDataUpdate,
          state.totalPrice
        );
      }
      
    }, [state.currentSession, state.totalPrice]),

    validateStep: useCallback(async (stepId: number, data: Record<string, unknown>): Promise<StepValidationResult> => {
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
        const errorMessage = ErrorHandler.extractMessage(error);
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
            current_step: targetStep as unknown as Record<string, unknown>,
          },
        });
      }
    }, [state.currentFlow, state.currentSession]),

    nextStep: useCallback(async () => {
      if (!state.currentFlow || !state.currentSession) return;

      // Early return if current step is confirmation type (additional safeguard)
      if (state.currentSession.current_step?.step_type === 'confirmation') {
        console.warn('nextStep called on confirmation step - blocked by safeguard');
        return;
      }

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
        const stepData = state.stepData[currentStep.step_type as string];
        const updatedBookingData = {
          ...bookingData,
          ...(stepData && typeof stepData === 'object' ? stepData : {})
        };
        
        // Now do a FULL update with mark_completed = true
        const response = await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id as number,
          updatedBookingData,
          true // mark_completed = true to proceed to next step
        );

        // Check for validation errors in the response
        if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: response.validation_errors as Record<string, string[]> });
          // Don't proceed - validation failed
          return;
        }

        const responseData = response as unknown as Record<string, unknown>;
        const updatedSession: BookingSession = {
          ...state.currentSession,
          booking_data: updatedBookingData,
          current_step: responseData.current_step as Record<string, unknown> | undefined,
          progress_percentage: responseData.progress_percentage as number,
          total_price: responseData.total_price as string | undefined,
          updated_at: responseData.updated_at as string,
        };

        dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

        if (response.total_price && response.total_price !== state.totalPrice) {
          dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
        }

        BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, updatedSession as unknown as Record<string, unknown>);

      } catch (error) {
        const errorMessage = ErrorHandler.extractMessage(error);
        const validationErrors = ErrorHandler.extractValidationErrorsAsRecord(error);
        
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
            
            const responseData = response as unknown as Record<string, unknown>;
            const updatedSession: BookingSession = {
              ...state.currentSession,
              current_step: responseData.current_step as Record<string, unknown> | undefined,
              progress_percentage: responseData.progress_percentage as number,
              updated_at: responseData.updated_at as string,
            };

            dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
            BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, updatedSession as unknown as Record<string, unknown>);

          } catch (error) {
            const errorMessage = ErrorHandler.extractMessage(error);
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
        const errorMessage = ErrorHandler.extractMessage(error);
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
            state.currentSession.current_step.id as number,
            { total_price: newTotalPrice },
            false
          );
        } catch (error) {
          console.warn('Failed to update session total price:', error);
        }
      }
    }, [state.currentSession]),

    // Immediate local price update without backend sync (for optimistic UI updates)
    setOptimisticPrice: useCallback((price: string) => {
      dispatch({ type: 'SET_TOTAL_PRICE', payload: price });
    }, []),

    // Store tax rate from backend for local calculations
    setTaxRate: useCallback((rate: number) => {
      dispatch({ type: 'SET_TAX_RATE', payload: rate });
    }, []),

    // Update pricing breakdown for footer display
    setPricingBreakdown: useCallback((breakdown: { subtotal: string; tax: string; discount: string; formattedSubtotal: string; formattedTax: string; formattedDiscount: string }) => {
      dispatch({ type: 'SET_PRICING_BREAKDOWN', payload: breakdown });
    }, []),

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

    clearRecoverableSession: useCallback((_sessionId?: string) => {
      // Clear the recoverable session state
      dispatch({ type: 'SET_RECOVERABLE_SESSION', payload: null });
      // Clear ALL booking sessions from localStorage to ensure a clean slate
      // This prevents old sessions from appearing after clicking "Start Over"
      BookingCoreApi.clearAllSessionsFromLocal();
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