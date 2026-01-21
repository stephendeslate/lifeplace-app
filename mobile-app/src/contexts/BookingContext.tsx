/**
 * Booking Context
 *
 * Provides booking flow state and methods throughout the booking screens.
 *
 * KEY CONCEPTS:
 * - Manages the complete booking flow lifecycle
 * - Handles session creation, navigation, and completion
 * - Persists session state locally for recovery
 * - Integrates with React Query for data fetching
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'expo-router';

import { BookingCoreAPI } from '@/apis/booking';
import {
  saveBookingSession,
  loadBookingSession,
  clearBookingSession,
  getRecoverableSession,
} from '@/utils/bookingStorage';
import { isSessionExpired, canSkipStep } from '@/utils/bookingHelpers';
import { useToast } from '@/contexts/ToastContext';
import { logger } from '@/utils/logger';

const bookingLogger = logger.create('BookingContext');

import type {
  EventType,
  BookingFlow,
  BookingFlowStep,
  BookingSession,
  BookingData,
  BookingState,
  BookingActions,
  BookingProgress,
  BookingUIState,
  RecoverableSession,
  PricingCalculation,
  PaymentGateway,
  SelectedPackage,
  SelectedAddon,
  BookingCompletionResult,
  StepValidationResult,
  ValidationError,
} from '@/types/booking';
import { createInitialBookingState } from '@/types/booking';

// =============================================================================
// ACTION TYPES
// =============================================================================

type BookingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_AVAILABLE_FLOWS'; payload: BookingFlow[] }
  | { type: 'SET_EVENT_TYPE'; payload: EventType | null }
  | { type: 'SET_CURRENT_FLOW'; payload: BookingFlow | null }
  | { type: 'SET_SESSION'; payload: { sessionId: string; session: BookingSession } }
  | { type: 'CLEAR_SESSION' }
  | { type: 'UPDATE_STEP_DATA'; payload: { stepType: string; data: Record<string, unknown> } }
  | { type: 'SET_PENDING_CHANGES'; payload: boolean }
  | { type: 'UPDATE_PROGRESS'; payload: Partial<BookingProgress> }
  | { type: 'SET_PAYMENT_GATEWAYS'; payload: PaymentGateway[] }
  | { type: 'SET_SELECTED_GATEWAY'; payload: PaymentGateway | null }
  | { type: 'SET_PRICING'; payload: { total: string; breakdown: PricingCalculation | null } }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'SET_RECOVERABLE_SESSION'; payload: RecoverableSession | null }
  | { type: 'SHOW_RECOVERY_PROMPT'; payload: boolean }
  | { type: 'SET_COMPLETION_RESULT'; payload: BookingCompletionResult | null }
  | { type: 'SET_UI_STATE'; payload: Partial<BookingUIState> }
  | { type: 'SET_DATE_UNAVAILABLE'; payload: { unavailable: boolean; error: string | null } }
  | { type: 'SET_RESERVATION_TOKEN'; payload: string | null }
  | { type: 'RESET' };

// =============================================================================
// REDUCER
// =============================================================================

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload },
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: { ...state.ui, error: action.payload },
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        ui: { ...state.ui, error: null, validationErrors: {} },
      };

    case 'SET_AVAILABLE_FLOWS':
      return {
        ...state,
        availableFlows: action.payload,
      };

    case 'SET_EVENT_TYPE':
      return {
        ...state,
        selectedEventType: action.payload,
      };

    case 'SET_CURRENT_FLOW':
      return {
        ...state,
        currentFlow: action.payload,
      };

    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        currentSession: action.payload.session,
        progress: {
          ...state.progress,
          completedSteps: action.payload.session.completed_steps || [],
          currentStepId: action.payload.session.current_step_id,
        },
      };

    case 'CLEAR_SESSION':
      return {
        ...state,
        sessionId: null,
        currentSession: null,
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
      };

    case 'UPDATE_STEP_DATA':
      return {
        ...state,
        stepData: {
          ...state.stepData,
          [action.payload.stepType]: action.payload.data,
        },
        pendingChanges: true,
      };

    case 'SET_PENDING_CHANGES':
      return {
        ...state,
        pendingChanges: action.payload,
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: { ...state.progress, ...action.payload },
      };

    case 'SET_PAYMENT_GATEWAYS':
      return {
        ...state,
        paymentGateways: action.payload,
      };

    case 'SET_SELECTED_GATEWAY':
      return {
        ...state,
        selectedPaymentGateway: action.payload,
      };

    case 'SET_PRICING':
      return {
        ...state,
        totalPrice: action.payload.total,
        // Preserve existing breakdown if null is passed (allows updating just the total)
        pricingBreakdown: action.payload.breakdown ?? state.pricingBreakdown,
      };

    case 'SET_TAX_RATE':
      return {
        ...state,
        taxRate: action.payload,
      };

    case 'SET_RECOVERABLE_SESSION':
      return {
        ...state,
        recoverableSession: action.payload,
      };

    case 'SHOW_RECOVERY_PROMPT':
      return {
        ...state,
        showRecoveryPrompt: action.payload,
      };

    case 'SET_COMPLETION_RESULT':
      return {
        ...state,
        completionResult: action.payload,
      };

    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };

    case 'SET_DATE_UNAVAILABLE':
      return {
        ...state,
        dateUnavailable: action.payload.unavailable,
        dateUnavailableError: action.payload.error,
      };

    case 'SET_RESERVATION_TOKEN':
      return {
        ...state,
        reservationToken: action.payload,
      };

    case 'RESET':
      return createInitialBookingState();

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface BookingContextValue {
  state: BookingState;
  actions: BookingActions;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface BookingProviderProps {
  children: ReactNode;
}

export function BookingProvider({ children }: BookingProviderProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [state, dispatch] = useReducer(bookingReducer, createInitialBookingState());

  // ===========================================================================
  // SESSION EXPIRY CHECK
  // ===========================================================================

  /**
   * Check if the current session has expired.
   * Returns true if session is still valid, false if expired.
   */
  const verifySessionNotExpired = useCallback((): boolean => {
    if (!state.currentSession?.expires_at) return true;

    if (isSessionExpired(state.currentSession.expires_at)) {
      showToast('Your booking session has expired. Please start a new booking.', 'error');
      dispatch({ type: 'CLEAR_SESSION' });
      dispatch({ type: 'RESET' });
      return false;
    }
    return true;
  }, [state.currentSession?.expires_at, showToast]);

  // ===========================================================================
  // FLOW MANAGEMENT
  // ===========================================================================

  const fetchAvailableFlows = useCallback(async (eventTypeId?: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const flows = await BookingCoreAPI.getAvailableFlows(eventTypeId);
      dispatch({ type: 'SET_AVAILABLE_FLOWS', payload: flows });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load booking flows';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const selectEventType = useCallback(
    async (eventType: EventType) => {
      dispatch({ type: 'SET_EVENT_TYPE', payload: eventType });
      await fetchAvailableFlows(eventType.id);
    },
    [fetchAvailableFlows]
  );

  const selectFlow = useCallback((flow: BookingFlow) => {
    dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
  }, []);

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  const startSession = useCallback(
    async (flowId: number): Promise<string> => {
      dispatch({ type: 'SET_UI_STATE', payload: { isSubmitting: true } });
      try {
        const response = await BookingCoreAPI.startSession(flowId);

        // Save to local storage
        await saveBookingSession(response.session_id, {
          session_id: response.session_id,
          booking_flow_id: flowId,
          expires_at: response.expires_at,
          completed_steps: [],
          booking_data: response.booking_data || {},
        });

        dispatch({
          type: 'SET_SESSION',
          payload: {
            sessionId: response.session_id,
            session: {
              session_id: response.session_id,
              booking_flow: flowId,
              booking_flow_id: flowId,
              booking_data: response.booking_data || {},
              current_step_id: response.current_step_id ?? response.current_step?.id,
              completed_steps: response.completed_steps || [],
              expires_at: response.expires_at,
            },
          },
        });

        return response.session_id;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start session';
        dispatch({ type: 'SET_ERROR', payload: message });
        throw error;
      } finally {
        dispatch({ type: 'SET_UI_STATE', payload: { isSubmitting: false } });
      }
    },
    []
  );

  const loadSession = useCallback(async (sessionId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await BookingCoreAPI.getSession(sessionId);

      dispatch({
        type: 'SET_SESSION',
        payload: {
          sessionId,
          session: {
            session_id: sessionId,
            booking_flow: response.booking_flow ?? response.booking_flow_id ?? 0,
            booking_flow_id: response.booking_flow_id ?? response.booking_flow,
            booking_data: response.booking_data || {},
            current_step_id: response.current_step_id ?? response.current_step?.id,
            completed_steps: response.completed_steps || [],
            expires_at: response.expires_at,
            total_price: response.total_price,
          },
        },
      });

      // Also load the flow
      if (response.booking_flow_id) {
        const flow = await BookingCoreAPI.getFlowById(response.booking_flow_id);
        dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateStepData = useCallback(
    (stepType: string, data: Record<string, unknown>) => {
      dispatch({ type: 'UPDATE_STEP_DATA', payload: { stepType, data } });
    },
    []
  );

  const saveStepData = useCallback(
    async (stepId: number, data: Record<string, unknown>, markCompleted: boolean = false) => {
      if (!state.sessionId) throw new Error('No active session');
      if (!verifySessionNotExpired()) throw new Error('Session expired');

      dispatch({ type: 'SET_UI_STATE', payload: { isSaving: true } });
      try {
        const response = await BookingCoreAPI.updateSessionData(
          state.sessionId,
          stepId,
          data,
          markCompleted
        );

        // Update local storage
        await saveBookingSession(state.sessionId, {
          booking_data: response.booking_data,
          completed_steps: response.completed_steps,
          current_step_id: response.current_step_id,
          total_price: response.total_price,
          pending_sync: false,
        });

        dispatch({ type: 'SET_PENDING_CHANGES', payload: false });

        // Update session in state
        if (state.currentSession) {
          dispatch({
            type: 'SET_SESSION',
            payload: {
              sessionId: state.sessionId,
              session: {
                ...state.currentSession,
                booking_data: response.booking_data || state.currentSession.booking_data,
                completed_steps: response.completed_steps || state.currentSession.completed_steps,
                current_step_id: response.current_step_id,
                total_price: response.total_price,
              },
            },
          });
        }
      } catch (error) {
        // Mark as pending sync for retry
        await saveBookingSession(state.sessionId, { pending_sync: true });
        throw error;
      } finally {
        dispatch({ type: 'SET_UI_STATE', payload: { isSaving: false } });
      }
    },
    [state.sessionId, state.currentSession, verifySessionNotExpired]
  );

  const validateStep = useCallback(
    async (stepId: number, data: Record<string, unknown>): Promise<StepValidationResult> => {
      if (!state.sessionId) throw new Error('No active session');
      if (!verifySessionNotExpired()) throw new Error('Session expired');

      dispatch({ type: 'SET_UI_STATE', payload: { isValidating: true } });
      try {
        const result = await BookingCoreAPI.validateStepData(state.sessionId, stepId, data);

        if (!result.isValid && result.errors) {
          // Convert ValidationError[] to Record<string, string[]> if needed
          let validationErrors: Record<string, string[]> = {};
          if (Array.isArray(result.errors)) {
            for (const err of result.errors as ValidationError[]) {
              if (!validationErrors[err.field]) validationErrors[err.field] = [];
              validationErrors[err.field].push(err.message);
            }
          } else {
            validationErrors = result.errors as Record<string, string[]>;
          }
          dispatch({
            type: 'SET_UI_STATE',
            payload: { validationErrors },
          });
        } else {
          dispatch({
            type: 'SET_UI_STATE',
            payload: { validationErrors: {} },
          });
        }

        return result;
      } finally {
        dispatch({ type: 'SET_UI_STATE', payload: { isValidating: false } });
      }
    },
    [state.sessionId, verifySessionNotExpired]
  );

  const abandonSession = useCallback(
    async (reason?: string) => {
      if (!state.sessionId) return;

      try {
        await BookingCoreAPI.abandonSession(state.sessionId, reason);
      } catch (error) {
        bookingLogger.warn('Failed to abandon session on server:', error);
      }

      await clearBookingSession(state.sessionId);
      dispatch({ type: 'CLEAR_SESSION' });
    },
    [state.sessionId]
  );

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  const goToStep = useCallback(
    async (stepIndex: number) => {
      // Use enabled_steps (primary) or fallback to steps (deprecated)
      const steps = state.currentFlow?.enabled_steps || state.currentFlow?.steps;
      if (!steps || steps.length === 0) return;

      const step = steps[stepIndex];
      if (!step || !state.sessionId) return;

      // Verify session hasn't expired before navigating
      if (!verifySessionNotExpired()) return;

      try {
        await BookingCoreAPI.goToStep(state.sessionId, step.id);

        // Calculate navigation flags
        const totalSteps = steps.length;

        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            currentStepIndex: stepIndex,
            currentStepId: step.id,
            currentStepType: step.step_type,
            totalSteps,
            canGoBack: stepIndex > 0,
            canGoNext: true, // Always allow proceeding; validation happens on click
            canSkip: canSkipStep(step),
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to navigate';
        showToast(message, 'error');
      }
    },
    [state.currentFlow, state.sessionId, showToast, verifySessionNotExpired]
  );

  const nextStep = useCallback(async (): Promise<boolean> => {
    const steps = state.currentFlow?.enabled_steps || state.currentFlow?.steps;
    const totalSteps = steps?.length || 0;
    const newIndex = state.progress.currentStepIndex + 1;

    if (newIndex >= totalSteps) return false;
    if (!state.sessionId) return false;

    // Get current step to save its data before navigating
    const currentStep = steps?.[state.progress.currentStepIndex];
    if (currentStep) {
      // Get the step data from local state
      const stepData = state.stepData[currentStep.step_type];

      if (stepData && Object.keys(stepData).length > 0) {
        // Cast to Record for dynamic access - StepRenderer wraps data under step keys
        const stepDataRecord = stepData as Record<string, unknown>;

        // Extract the actual data from nested structure
        // StepRenderer wraps data under step_type key, so we need to flatten
        const nestedData = (
          stepDataRecord[currentStep.step_type] ||
          stepDataRecord[`step_${currentStep.id}`] ||
          stepDataRecord
        ) as Record<string, unknown>;

        // Build the data to send - extract key fields at root level for backend
        const dataToSave: Record<string, unknown> = { ...nestedData };

        // Extract selected_packages if present (for package_selection step)
        if (nestedData.selected_packages) {
          dataToSave.selected_packages = nestedData.selected_packages;
        }

        // Extract selected_addons if present (for addon_selection step)
        if (nestedData.selected_addons) {
          dataToSave.selected_addons = nestedData.selected_addons;
        }

        // Extract venue_additional_hours if present
        if (nestedData.venue_additional_hours) {
          dataToSave.venue_additional_hours = nestedData.venue_additional_hours;
        }

        try {
          // Save current step data to backend before navigating
          await BookingCoreAPI.updateSessionData(
            state.sessionId,
            currentStep.id,
            dataToSave,
            true // markCompleted
          );
        } catch (error) {
          bookingLogger.warn('Failed to save step data before navigation:', error);
          // Still allow navigation even if save fails
        }
      }
    }

    await goToStep(newIndex);
    return true;
  }, [state.progress.currentStepIndex, state.currentFlow, state.stepData, state.sessionId, goToStep]);

  const previousStep = useCallback(() => {
    const newIndex = state.progress.currentStepIndex - 1;
    if (newIndex < 0) return;
    goToStep(newIndex);
  }, [state.progress.currentStepIndex, goToStep]);

  const skipStep = useCallback(async () => {
    await nextStep();
  }, [nextStep]);

  // ===========================================================================
  // DATE AVAILABILITY (Race Condition Prevention)
  // ===========================================================================

  /**
   * Validate date availability and create a temporary reservation.
   * Should be called BEFORE payment processing to prevent charging
   * customers for unavailable dates.
   */
  const validateDateAvailability = useCallback(
    async (): Promise<{ available: boolean; reservationToken?: string; error?: string }> => {
      if (!state.sessionId) {
        return { available: false, error: 'No active session' };
      }

      try {
        bookingLogger.info('Validating date availability...');
        const result = await BookingCoreAPI.validateAvailability(state.sessionId);

        if (result.available && result.reservation_token) {
          dispatch({ type: 'SET_RESERVATION_TOKEN', payload: result.reservation_token });
          bookingLogger.info('Date reserved, token:', result.reservation_token);
        } else {
          dispatch({
            type: 'SET_DATE_UNAVAILABLE',
            payload: {
              unavailable: true,
              error: result.error || 'This date is no longer available.',
            },
          });
          bookingLogger.warn('Date no longer available:', result.error);
        }

        return {
          available: result.available,
          reservationToken: result.reservation_token,
          error: result.error,
        };
      } catch (error) {
        bookingLogger.warn('Pre-validation failed:', error);
        // Return available=true to allow proceeding - backend has its own atomic check
        return { available: true, error: 'Validation failed, proceeding with backend check' };
      }
    },
    [state.sessionId]
  );

  /**
   * Clear date unavailable error state.
   */
  const clearDateUnavailableError = useCallback(() => {
    dispatch({ type: 'SET_DATE_UNAVAILABLE', payload: { unavailable: false, error: null } });
    dispatch({ type: 'SET_RESERVATION_TOKEN', payload: null });
  }, []);

  // ===========================================================================
  // COMPLETION
  // ===========================================================================

  /**
   * Complete the booking with pre-validation for payment completions.
   *
   * For payment completions, validates date availability BEFORE charging
   * the customer's card to prevent charging for unavailable dates.
   */
  const completeBooking = useCallback(
    async (completionType: 'payment' | 'quote' = 'payment'): Promise<BookingCompletionResult> => {
      if (!state.sessionId) throw new Error('No active session');
      if (!verifySessionNotExpired()) throw new Error('Session expired');

      dispatch({ type: 'SET_UI_STATE', payload: { isSubmitting: true } });
      dispatch({ type: 'SET_DATE_UNAVAILABLE', payload: { unavailable: false, error: null } });

      let reservationToken: string | undefined;

      try {
        // CRITICAL: For payment completions, validate availability BEFORE charging
        // This prevents customers from being charged for unavailable dates
        if (completionType === 'payment') {
          bookingLogger.info('Validating date availability before payment...');

          try {
            const validation = await BookingCoreAPI.validateAvailability(state.sessionId);

            if (!validation.available) {
              // Date is no longer available - show error without charging
              bookingLogger.warn('Date no longer available:', validation.error);
              dispatch({
                type: 'SET_DATE_UNAVAILABLE',
                payload: {
                  unavailable: true,
                  error:
                    validation.error ||
                    'This date is no longer available. Another customer completed their booking just before you.',
                },
              });
              throw new Error('DATE_NO_LONGER_AVAILABLE');
            }

            // Store the reservation token for the completion call
            reservationToken = validation.reservation_token;
            dispatch({ type: 'SET_RESERVATION_TOKEN', payload: reservationToken || null });
            bookingLogger.info('Date reserved, token:', reservationToken);
          } catch (validationErr) {
            // If it's our DATE_NO_LONGER_AVAILABLE error, rethrow
            if (validationErr instanceof Error && validationErr.message === 'DATE_NO_LONGER_AVAILABLE') {
              throw validationErr;
            }
            // For other errors, log but proceed - backend has atomic check
            bookingLogger.warn('Pre-validation failed:', validationErr);
          }
        }

        // Complete the booking (with reservation token if we have one)
        const result = await BookingCoreAPI.completeBooking(
          state.sessionId,
          completionType,
          reservationToken
        );

        dispatch({ type: 'SET_COMPLETION_RESULT', payload: result });

        // Clear local storage
        await clearBookingSession(state.sessionId);

        showToast('Booking completed successfully!', 'success');

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to complete booking';

        // Check if the error is due to date unavailability
        if (
          message === 'DATE_NO_LONGER_AVAILABLE' ||
          message.includes('no longer available') ||
          message.includes('already blocked')
        ) {
          dispatch({
            type: 'SET_DATE_UNAVAILABLE',
            payload: {
              unavailable: true,
              error: 'This date is no longer available. Another customer completed their booking just before you.',
            },
          });
        } else {
          dispatch({ type: 'SET_ERROR', payload: message });
        }

        // Release the reservation if we had one and completion failed
        if (reservationToken && state.sessionId) {
          try {
            await BookingCoreAPI.releaseReservation(state.sessionId, reservationToken);
            bookingLogger.info('Released reservation after error');
          } catch (releaseErr) {
            bookingLogger.warn('Failed to release reservation:', releaseErr);
          }
        }

        throw error;
      } finally {
        dispatch({ type: 'SET_UI_STATE', payload: { isSubmitting: false } });
      }
    },
    [state.sessionId, showToast, verifySessionNotExpired]
  );

  // ===========================================================================
  // PAYMENT MANAGEMENT
  // ===========================================================================

  const fetchPaymentGateways = useCallback(async (flowId: number) => {
    try {
      const response = await BookingCoreAPI.getFlowPaymentGateways(flowId);
      dispatch({ type: 'SET_PAYMENT_GATEWAYS', payload: response.available_gateways || [] });
    } catch (error) {
      bookingLogger.warn('Failed to fetch payment gateways:', error);
    }
  }, []);

  const selectPaymentGateway = useCallback((gateway: PaymentGateway) => {
    dispatch({ type: 'SET_SELECTED_GATEWAY', payload: gateway });
  }, []);

  // ===========================================================================
  // PRICING
  // ===========================================================================

  const calculatePricing = useCallback(
    async (discountCode?: string, venueAdditionalHours?: Record<string, number>) => {
      if (!state.sessionId) return;

      try {
        const pricing = await BookingCoreAPI.calculatePricing(
          state.sessionId,
          discountCode,
          venueAdditionalHours
        );

        dispatch({
          type: 'SET_PRICING',
          payload: { total: pricing.total, breakdown: pricing },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate pricing';
        dispatch({ type: 'SET_ERROR', payload: message });
      }
    },
    [state.sessionId]
  );

  const updateTotalPrice = useCallback((price: string) => {
    // Note: Only updates total, preserving existing breakdown via functional dispatch pattern
    // This avoids dependency on state.pricingBreakdown which would cause infinite re-renders
    dispatch({ type: 'SET_PRICING', payload: { total: price, breakdown: null } });
  }, []);

  const setTaxRate = useCallback((rate: number) => {
    dispatch({ type: 'SET_TAX_RATE', payload: rate });
  }, []);

  const setPricingBreakdown = useCallback((breakdown: PricingCalculation) => {
    dispatch({ type: 'SET_PRICING', payload: { total: breakdown.total, breakdown } });
  }, []);

  // ===========================================================================
  // SESSION RECOVERY
  // ===========================================================================

  const checkForRecoverableSession = useCallback(async () => {
    try {
      const recoverable = await getRecoverableSession();
      // Only show recovery prompt if there's actual progress (> 0%)
      if (recoverable && !isSessionExpired(recoverable.expires_at) && recoverable.progress_percentage > 0) {
        dispatch({
          type: 'SET_RECOVERABLE_SESSION',
          payload: {
            sessionId: recoverable.session_id,
            bookingFlowName: recoverable.booking_flow_name,
            eventTypeName: recoverable.event_type_name,
            lastUpdated: recoverable.last_updated,
            stepName: recoverable.current_step_name,
            progressPercentage: recoverable.progress_percentage,
            expiresAt: recoverable.expires_at,
          },
        });
        dispatch({ type: 'SHOW_RECOVERY_PROMPT', payload: true });
      }
    } catch (error) {
      bookingLogger.warn('Failed to check for recoverable session:', error);
    }
  }, []);

  const recoverSession = useCallback(
    async (sessionId: string) => {
      dispatch({ type: 'SHOW_RECOVERY_PROMPT', payload: false });
      await loadSession(sessionId);
      showToast('Session recovered successfully', 'success');
    },
    [loadSession, showToast]
  );

  const discardRecoverableSession = useCallback(async () => {
    if (state.recoverableSession) {
      await clearBookingSession(state.recoverableSession.sessionId);
    }
    dispatch({ type: 'SET_RECOVERABLE_SESSION', payload: null });
    dispatch({ type: 'SHOW_RECOVERY_PROMPT', payload: false });
  }, [state.recoverableSession]);

  const clearRecoverableSession = useCallback(() => {
    dispatch({ type: 'SET_RECOVERABLE_SESSION', payload: null });
    dispatch({ type: 'SHOW_RECOVERY_PROMPT', payload: false });
  }, []);

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  const resetBooking = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  const getSelectedProducts = useCallback((): {
    packages: SelectedPackage[];
    addons: SelectedAddon[];
  } => {
    const data = state.currentSession?.booking_data || {};
    return {
      packages: (data.selected_packages as SelectedPackage[]) || [],
      addons: (data.selected_addons as SelectedAddon[]) || [],
    };
  }, [state.currentSession]);

  const getBookingData = useCallback((): BookingData => {
    return (state.currentSession?.booking_data || {}) as BookingData;
  }, [state.currentSession]);

  const getCurrentStep = useCallback((): BookingFlowStep | null => {
    if (!state.currentFlow?.steps || state.progress.currentStepIndex === undefined) {
      return null;
    }
    return state.currentFlow.steps[state.progress.currentStepIndex] || null;
  }, [state.currentFlow, state.progress.currentStepIndex]);

  const getStepData = useCallback(
    <T,>(stepType: string): T | undefined => {
      return state.stepData[stepType] as T | undefined;
    },
    [state.stepData]
  );

  const isStepCompleted = useCallback(
    (stepId: number): boolean => {
      return state.progress.completedSteps.includes(stepId);
    },
    [state.progress.completedSteps]
  );

  // ===========================================================================
  // ACTIONS OBJECT
  // ===========================================================================

  const actions: BookingActions = useMemo(
    () => ({
      // Flow Management
      fetchAvailableFlows,
      selectEventType,
      selectFlow,

      // Session Management
      startSession,
      loadSession,
      updateStepData,
      saveStepData,
      validateStep,
      abandonSession,

      // Navigation
      goToStep,
      nextStep,
      previousStep,
      skipStep,

      // Completion
      completeBooking,

      // Payment Management
      fetchPaymentGateways,
      selectPaymentGateway,

      // Pricing
      calculatePricing,
      updateTotalPrice,
      setTaxRate,
      setPricingBreakdown,

      // Session Recovery
      checkForRecoverableSession,
      recoverSession,
      discardRecoverableSession,
      clearRecoverableSession,

      // Date Availability (Race Condition Prevention)
      validateDateAvailability,
      clearDateUnavailableError,

      // Utilities
      resetBooking,
      clearErrors,
      setError,
      setLoading,

      // Helpers
      getSelectedProducts,
      getBookingData,
      getCurrentStep,
      getStepData,
      isStepCompleted,
    }),
    [
      fetchAvailableFlows,
      selectEventType,
      selectFlow,
      startSession,
      loadSession,
      updateStepData,
      saveStepData,
      validateStep,
      abandonSession,
      goToStep,
      nextStep,
      previousStep,
      skipStep,
      completeBooking,
      fetchPaymentGateways,
      selectPaymentGateway,
      calculatePricing,
      updateTotalPrice,
      setTaxRate,
      setPricingBreakdown,
      checkForRecoverableSession,
      recoverSession,
      discardRecoverableSession,
      clearRecoverableSession,
      validateDateAvailability,
      clearDateUnavailableError,
      resetBooking,
      clearErrors,
      setError,
      setLoading,
      getSelectedProducts,
      getBookingData,
      getCurrentStep,
      getStepData,
      isStepCompleted,
    ]
  );

  // ===========================================================================
  // CONTEXT VALUE
  // ===========================================================================

  const value = useMemo<BookingContextValue>(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Use this hook to access booking state and actions in components.
 *
 * USAGE:
 * const { state, actions } = useBookingContext();
 */
export function useBookingContext(): BookingContextValue {
  const context = useContext(BookingContext);

  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }

  return context;
}

/**
 * Hook to access only booking state.
 */
export function useBookingState(): BookingState {
  const { state } = useBookingContext();
  return state;
}

/**
 * Hook to access only booking actions.
 */
export function useBookingActions(): BookingActions {
  const { actions } = useBookingContext();
  return actions;
}
