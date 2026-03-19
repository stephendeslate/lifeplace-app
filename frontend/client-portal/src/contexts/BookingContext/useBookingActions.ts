import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingCoreApi } from '@/apis/booking/core';
import { ErrorHandler } from '@/utils/errorHandler';
import type {
  BookingState,
  BookingActions,
  EventType,
  BookingSession,
  BookingCompletionResult,
  PaymentGateway,
  StepValidationResult,
} from '@/types/booking';
import type { BookingDispatch, DebouncedUpdateRef } from './actionTypes';
import { useNavigationActions } from './useNavigationActions';

export function useBookingActions(
  state: BookingState,
  dispatch: BookingDispatch,
  debouncedUpdateRef: DebouncedUpdateRef,
): BookingActions {
  const navigate = useNavigate();

  const navigationActions = useNavigationActions(state, dispatch, debouncedUpdateRef);

  const getSelectedProducts = useCallback(() => {
    if (!state.currentSession?.booking_data) {
      return { packages: [], addons: [] };
    }

    const bookingData = state.currentSession.booking_data;

    return {
      packages: bookingData.selected_packages || [],
      addons: bookingData.selected_addons || [],
    };
  }, [state.currentSession]);

  const getBookingData = useCallback(() => {
    return state.currentSession?.booking_data || {};
  }, [state.currentSession]);

  const fetchAvailableFlows = useCallback(async () => {
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
  }, []);

  const fetchPaymentGateways = useCallback(async () => {
    if (!state.currentFlow) return;

    try {
      const response = await BookingCoreApi.getFlowPaymentGateways(state.currentFlow.id);
      dispatch({
        type: 'SET_PAYMENT_GATEWAYS',
        payload: response.available_gateways,
      });

      if (response.default_gateway) {
        const defaultGateway = response.available_gateways.find(
          (g) => g.id === response.default_gateway,
        );
        if (defaultGateway) {
          dispatch({
            type: 'SELECT_PAYMENT_GATEWAY',
            payload: defaultGateway,
          });
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to load payment gateways:', error);
    }
  }, [state.currentFlow]);

  const startSession = useCallback(
    async (flowId: number) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });

      try {
        const sessionResponse = await BookingCoreApi.startSession(flowId);

        const sessionData: BookingSession = {
          session_id: sessionResponse.session_id,
          booking_flow: flowId,
          current_step: sessionResponse.current_step as unknown as
            | Record<string, unknown>
            | undefined,
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

        BookingCoreApi.saveSessionToLocal(
          sessionResponse.session_id,
          sessionData as unknown as Record<string, unknown>,
        );

        await fetchPaymentGateways();
      } catch (error) {
        const errorMessage = ErrorHandler.extractMessage(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [fetchPaymentGateways],
  );

  const selectEventType = useCallback(
    async (eventType: EventType) => {
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

        await startSession(selectedFlow.id);
      } catch (error) {
        const errorMessage = ErrorHandler.extractMessage(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [startSession],
  );

  const updateStepData = useCallback(
    async (stepType: string, data: Record<string, unknown>) => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      dispatch({ type: 'CLEAR_ERRORS' });

      const currentStep = state.currentSession.current_step;
      if (!currentStep) {
        throw new Error('No current step found');
      }

      let formattedData = data;

      const bookingDataUpdate: Record<string, unknown> = {
        ...(state.currentSession.booking_data || {}),
        ...formattedData,
      };

      if (stepType === 'package_selection' && data.selected_packages) {
        formattedData = { selected_packages: data.selected_packages };
        bookingDataUpdate.selected_packages = data.selected_packages;
        if (data.venue_additional_hours) {
          (formattedData as Record<string, unknown>).venue_additional_hours =
            data.venue_additional_hours;
          bookingDataUpdate.venue_additional_hours = data.venue_additional_hours;
        }
      } else if (stepType === 'addon_selection' && data.selected_addons) {
        formattedData = { selected_addons: data.selected_addons };
        bookingDataUpdate.selected_addons = data.selected_addons;
        if (data.venue_additional_hours) {
          (formattedData as Record<string, unknown>).venue_additional_hours =
            data.venue_additional_hours;
          bookingDataUpdate.venue_additional_hours = data.venue_additional_hours;
        }
      }

      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: { stepType, data: formattedData },
      });

      const updatedSession = {
        ...state.currentSession,
        booking_data: bookingDataUpdate,
      };
      dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

      if (debouncedUpdateRef.current) {
        debouncedUpdateRef.current(
          state.currentSession.session_id,
          currentStep.id as number,
          bookingDataUpdate,
          state.totalPrice,
        );
      }
    },
    [state.currentSession, state.totalPrice],
  );

  const validateStep = useCallback(
    async (stepId: number, data: Record<string, unknown>): Promise<StepValidationResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }

      try {
        const result = await BookingCoreApi.validateStepData(
          state.currentSession.session_id,
          stepId,
          data,
        );

        if (!result.isValid) {
          const errors: Record<string, string[]> = {};
          result.errors.forEach((error) => {
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
        return {
          isValid: false,
          errors: [{ field: 'general', message: errorMessage }],
        };
      }
    },
    [state.currentSession],
  );

  const completeBooking = useCallback(
    async (completionType: 'payment' | 'quote' = 'payment'): Promise<BookingCompletionResult> => {
      if (!state.currentSession) {
        throw new Error('No active session');
      }

      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'CLEAR_ERRORS' });

      try {
        const result = await BookingCoreApi.completeBooking(
          state.currentSession.session_id,
          completionType,
        );

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
    },
    [state.currentSession],
  );

  const selectPaymentGateway = useCallback((gateway: PaymentGateway) => {
    dispatch({ type: 'SELECT_PAYMENT_GATEWAY', payload: gateway });
  }, []);

  const updateTotalPrice = useCallback(
    async (newTotalPrice: string) => {
      dispatch({ type: 'SET_TOTAL_PRICE', payload: newTotalPrice });

      if (state.currentSession && state.currentSession.current_step) {
        try {
          await BookingCoreApi.updateSessionData(
            state.currentSession.session_id,
            state.currentSession.current_step.id as number,
            { total_price: newTotalPrice },
            false,
          );
        } catch (error) {
          if (import.meta.env.DEV) console.warn('Failed to update session total price:', error);
        }
      }
    },
    [state.currentSession],
  );

  const setOptimisticPrice = useCallback((price: string) => {
    dispatch({ type: 'SET_TOTAL_PRICE', payload: price });
  }, []);

  const setTaxRate = useCallback((rate: number) => {
    dispatch({ type: 'SET_TAX_RATE', payload: rate });
  }, []);

  const setPricingBreakdown = useCallback(
    (breakdown: {
      subtotal: string;
      tax: string;
      discount: string;
      formattedSubtotal: string;
      formattedTax: string;
      formattedDiscount: string;
    }) => {
      dispatch({ type: 'SET_PRICING_BREAKDOWN', payload: breakdown });
    },
    [],
  );

  const calculatePricing = useCallback(async () => {
    // Placeholder - pricing is calculated in the PricingSummaryStep
  }, []);

  const resetBooking = useCallback(() => {
    if (state.currentSession) {
      BookingCoreApi.clearSessionFromLocal(state.currentSession.session_id);
    }

    if (debouncedUpdateRef.current?.cancel) {
      debouncedUpdateRef.current.cancel();
    }

    dispatch({ type: 'RESET_BOOKING' });
    navigate('/');
  }, [state.currentSession, navigate]);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const clearRecoverableSession = useCallback((_sessionId?: string) => {
    dispatch({ type: 'SET_RECOVERABLE_SESSION', payload: null });
    BookingCoreApi.clearAllSessionsFromLocal();
  }, []);

  return {
    getSelectedProducts,
    getBookingData,
    fetchAvailableFlows,
    selectEventType,
    startSession,
    updateStepData,
    validateStep,
    ...navigationActions,
    completeBooking,
    fetchPaymentGateways,
    selectPaymentGateway,
    updateTotalPrice,
    setOptimisticPrice,
    setTaxRate,
    setPricingBreakdown,
    calculatePricing,
    resetBooking,
    clearErrors,
    clearRecoverableSession,
  };
}
