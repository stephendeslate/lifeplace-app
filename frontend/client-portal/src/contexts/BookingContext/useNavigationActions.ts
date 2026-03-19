import { useCallback } from 'react';
import { BookingCoreApi } from '@/apis/booking/core';
import { ErrorHandler } from '@/utils/errorHandler';
import type { BookingState, BookingSession } from '@/types/booking';
import type { BookingDispatch, DebouncedUpdateRef } from './actionTypes';

export function useNavigationActions(
  state: BookingState,
  dispatch: BookingDispatch,
  debouncedUpdateRef: DebouncedUpdateRef,
) {
  const goToStep = useCallback(
    (stepIndex: number) => {
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
    },
    [state.currentFlow, state.currentSession],
  );

  const nextStep = useCallback(async () => {
    if (!state.currentFlow || !state.currentSession) return;

    if (state.currentSession.current_step?.step_type === 'confirmation') {
      if (import.meta.env.DEV)
        console.warn('nextStep called on confirmation step - blocked by safeguard');
      return;
    }

    if (debouncedUpdateRef.current?.cancel) {
      debouncedUpdateRef.current.cancel();
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'CLEAR_ERRORS' });

    try {
      const currentStep = state.currentSession.current_step;
      if (!currentStep) return;

      const bookingData = state.currentSession.booking_data || {};
      const stepData = state.stepData[currentStep.step_type as string];
      const updatedBookingData = {
        ...bookingData,
        ...(stepData && typeof stepData === 'object' ? stepData : {}),
      };

      const response = await BookingCoreApi.updateSessionData(
        state.currentSession.session_id,
        currentStep.id as number,
        updatedBookingData,
        true,
      );

      if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
        dispatch({
          type: 'SET_VALIDATION_ERRORS',
          payload: response.validation_errors as Record<string, string[]>,
        });
        return;
      }

      const responseData = response as unknown as Record<string, unknown>;
      let updatedSession: BookingSession = {
        ...state.currentSession,
        booking_data: updatedBookingData,
        current_step: responseData.current_step as Record<string, unknown> | undefined,
        progress_percentage: responseData.progress_percentage as number,
        total_price: responseData.total_price as string | undefined,
        updated_at: responseData.updated_at as string,
      };

      if (state.quickQuoteMode && currentStep.step_type === 'contact_info') {
        const paymentStep = state.currentFlow.enabled_steps.find(
          (s) => s.step_type === 'payment_info',
        );
        if (paymentStep) {
          const goToResponse = await BookingCoreApi.goToStep(
            state.currentSession.session_id,
            paymentStep.id,
          );
          const goToData = goToResponse as unknown as Record<string, unknown>;
          updatedSession = {
            ...updatedSession,
            current_step: goToData.current_step as Record<string, unknown> | undefined,
            progress_percentage: goToData.progress_percentage as number,
            updated_at: goToData.updated_at as string,
          };
        }
      }

      dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

      if (response.total_price && response.total_price !== state.totalPrice) {
        dispatch({ type: 'SET_TOTAL_PRICE', payload: response.total_price });
      }

      BookingCoreApi.saveSessionToLocal(
        state.currentSession.session_id,
        updatedSession as unknown as Record<string, unknown>,
      );
    } catch (error) {
      const errorMessage = ErrorHandler.extractMessage(error);
      const validationErrors = ErrorHandler.extractValidationErrorsAsRecord(error);

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validationErrors });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [
    state.currentFlow,
    state.currentSession,
    state.stepData,
    state.totalPrice,
    state.quickQuoteMode,
  ]);

  const previousStep = useCallback(async () => {
    if (!state.currentFlow || !state.currentSession) return;

    if (state.quickQuoteMode) {
      const currentStepType = state.currentSession.current_step?.step_type;

      dispatch({ type: 'SET_SUBMITTING', payload: true });
      try {
        let navTargetStep;

        if (currentStepType === 'contact_info' && state.quickQuoteSourceStepIndex !== null) {
          navTargetStep = state.currentFlow.enabled_steps[state.quickQuoteSourceStepIndex];
        } else if (currentStepType === 'payment_info') {
          navTargetStep = state.currentFlow.enabled_steps.find(
            (s) => s.step_type === 'contact_info',
          );
        }

        if (navTargetStep) {
          const response = await BookingCoreApi.goToStep(
            state.currentSession.session_id,
            navTargetStep.id,
          );
          const responseData = response as unknown as Record<string, unknown>;
          const updatedSession: BookingSession = {
            ...state.currentSession,
            current_step: responseData.current_step as Record<string, unknown> | undefined,
            progress_percentage: responseData.progress_percentage as number,
            updated_at: responseData.updated_at as string,
          };

          dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
          BookingCoreApi.saveSessionToLocal(
            state.currentSession.session_id,
            updatedSession as unknown as Record<string, unknown>,
          );

          if (currentStepType === 'contact_info') {
            dispatch({ type: 'EXIT_QUICK_QUOTE_MODE' });
          }
        }
      } catch (error) {
        const errorMessage = ErrorHandler.extractMessage(error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
      return;
    }

    const currentIndex = state.progress.currentStepIndex;
    if (currentIndex > 0) {
      const targetStep = state.currentFlow.enabled_steps[currentIndex - 1];

      if (targetStep) {
        dispatch({ type: 'SET_SUBMITTING', payload: true });

        try {
          const response = await BookingCoreApi.goToStep(
            state.currentSession.session_id,
            targetStep.id,
          );

          const responseData = response as unknown as Record<string, unknown>;
          const updatedSession: BookingSession = {
            ...state.currentSession,
            current_step: responseData.current_step as Record<string, unknown> | undefined,
            progress_percentage: responseData.progress_percentage as number,
            updated_at: responseData.updated_at as string,
          };

          dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
          BookingCoreApi.saveSessionToLocal(
            state.currentSession.session_id,
            updatedSession as unknown as Record<string, unknown>,
          );
        } catch (error) {
          const errorMessage = ErrorHandler.extractMessage(error);
          dispatch({ type: 'SET_ERROR', payload: errorMessage });
        } finally {
          dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
      }
    }
  }, [
    state.currentFlow,
    state.currentSession,
    state.progress.currentStepIndex,
    state.quickQuoteMode,
    state.quickQuoteSourceStepIndex,
  ]);

  const skipStep = useCallback(async () => {
    if (!state.currentSession?.current_step?.is_skippable) return;
    await nextStep();
  }, [state.currentSession, nextStep]);

  const requestQuote = useCallback(async () => {
    if (!state.currentFlow || !state.currentSession) return;

    const currentStepIndex = state.progress.currentStepIndex;

    if (debouncedUpdateRef.current?.flush) {
      debouncedUpdateRef.current.flush();
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'CLEAR_ERRORS' });

    try {
      const currentStep = state.currentSession.current_step;
      if (currentStep) {
        const bookingData = state.currentSession.booking_data || {};
        const stepData = state.stepData[currentStep.step_type as string];
        const updatedBookingData = {
          ...bookingData,
          ...(stepData && typeof stepData === 'object' ? stepData : {}),
        };

        await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id as number,
          updatedBookingData,
          false,
        );
      }

      const contactInfoStep = state.currentFlow.enabled_steps.find(
        (s) => s.step_type === 'contact_info',
      );
      if (!contactInfoStep) {
        throw new Error('Contact info step not found in this booking flow');
      }

      dispatch({
        type: 'SET_QUICK_QUOTE_MODE',
        payload: { sourceStepIndex: currentStepIndex },
      });

      const response = await BookingCoreApi.goToStep(
        state.currentSession.session_id,
        contactInfoStep.id,
      );

      const responseData = response as unknown as Record<string, unknown>;
      const updatedSession: BookingSession = {
        ...state.currentSession,
        current_step: responseData.current_step as Record<string, unknown> | undefined,
        progress_percentage: responseData.progress_percentage as number,
        updated_at: responseData.updated_at as string,
      };

      dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
      BookingCoreApi.saveSessionToLocal(
        state.currentSession.session_id,
        updatedSession as unknown as Record<string, unknown>,
      );
    } catch (error) {
      const errorMessage = ErrorHandler.extractMessage(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'EXIT_QUICK_QUOTE_MODE' });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [state.currentFlow, state.currentSession, state.stepData, state.progress.currentStepIndex]);

  const exitQuickQuoteMode = useCallback(async () => {
    if (!state.currentFlow || !state.currentSession || state.quickQuoteSourceStepIndex === null)
      return;

    dispatch({ type: 'SET_SUBMITTING', payload: true });

    try {
      const sourceStep = state.currentFlow.enabled_steps[state.quickQuoteSourceStepIndex];
      if (!sourceStep) return;

      const response = await BookingCoreApi.goToStep(
        state.currentSession.session_id,
        sourceStep.id,
      );

      const responseData = response as unknown as Record<string, unknown>;
      const updatedSession: BookingSession = {
        ...state.currentSession,
        current_step: responseData.current_step as Record<string, unknown> | undefined,
        progress_percentage: responseData.progress_percentage as number,
        updated_at: responseData.updated_at as string,
      };

      dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });
      dispatch({ type: 'EXIT_QUICK_QUOTE_MODE' });
      BookingCoreApi.saveSessionToLocal(
        state.currentSession.session_id,
        updatedSession as unknown as Record<string, unknown>,
      );
    } catch (error) {
      const errorMessage = ErrorHandler.extractMessage(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [state.currentFlow, state.currentSession, state.quickQuoteSourceStepIndex]);

  return {
    goToStep,
    nextStep,
    previousStep,
    skipStep,
    requestQuote,
    exitQuickQuoteMode,
  };
}
