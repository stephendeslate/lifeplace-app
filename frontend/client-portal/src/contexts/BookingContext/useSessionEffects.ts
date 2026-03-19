import { useCallback, useEffect } from 'react';
import { BookingCoreApi } from '@/apis/booking/core';
import type { BookingState, BookingSession } from '@/types/booking';
import type { BookingDispatch, DebouncedUpdateRef } from './actionTypes';

export function useProgressTracking(state: BookingState, dispatch: BookingDispatch) {
  const updateProgress = useCallback(() => {
    if (!state.currentFlow || !state.currentSession) return;

    const currentStepIndex = state.currentFlow.enabled_steps.findIndex(
      (step) => step.id === state.currentSession?.current_step?.id,
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

  useEffect(() => {
    if (state.currentFlow && state.currentSession) {
      updateProgress();
    }
  }, [state.currentFlow?.id, state.currentSession?.current_step?.id, updateProgress]);
}

export function useSessionRecovery(dispatch: BookingDispatch) {
  useEffect(() => {
    BookingCoreApi.cleanupExpiredSessions();

    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session_id');

    if (sessionIdFromUrl) {
      BookingCoreApi.getSession(sessionIdFromUrl)
        .then((sessionData) => {
          if (!BookingCoreApi.isSessionExpired(sessionData.expires_at)) {
            dispatch({
              type: 'SET_CURRENT_SESSION',
              payload: sessionData as unknown as BookingSession,
            });
            return BookingCoreApi.getFlowById(sessionData.booking_flow);
          }
        })
        .then((flow) => {
          if (flow) {
            dispatch({ type: 'SET_CURRENT_FLOW', payload: flow });
          }
        })
        .catch((error) => {
          if (import.meta.env.DEV) console.warn('Failed to recover session from URL:', error);
        });
    } else {
      const discoverRecoverableSession = () => {
        try {
          const keys = Object.keys(localStorage);
          const sessionKeys = keys.filter((k) => k.startsWith('booking_session_'));

          let mostRecentSession: {
            sessionId: string;
            lastUpdated: string;
            stepName: string;
            timestamp: number;
            progressPercentage: number;
          } | null = null;

          for (const key of sessionKeys) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');

              if (data.expires_at && BookingCoreApi.isSessionExpired(data.expires_at)) {
                localStorage.removeItem(key);
                continue;
              }

              const progressPercentage = data.progress_percentage || 0;
              const hasMeaningfulProgress = progressPercentage > 0;

              if (!hasMeaningfulProgress) {
                localStorage.removeItem(key);
                continue;
              }

              const stepName =
                data.current_step?.step_type_display || data.current_step?.step_type || '';
              if (stepName.toLowerCase() === 'confirmation') {
                localStorage.removeItem(key);
                continue;
              }

              const sessionId = key.replace('booking_session_', '');
              const lastUpdated = data.updated_at || data.savedAt || data.lastSaved;
              const timestamp = lastUpdated ? new Date(lastUpdated).getTime() : 0;

              if (!mostRecentSession || timestamp > mostRecentSession.timestamp) {
                mostRecentSession = {
                  sessionId,
                  lastUpdated: lastUpdated || new Date().toISOString(),
                  stepName: stepName || 'Unknown',
                  timestamp,
                  progressPercentage,
                };
              }
            } catch {
              localStorage.removeItem(key);
            }
          }

          if (mostRecentSession) {
            dispatch({
              type: 'SET_RECOVERABLE_SESSION',
              payload: {
                sessionId: mostRecentSession.sessionId,
                lastUpdated: mostRecentSession.lastUpdated,
                stepName: mostRecentSession.stepName,
                progressPercentage: mostRecentSession.progressPercentage,
              },
            });
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn('Error discovering recoverable sessions:', error);
        }
      };

      discoverRecoverableSession();
    }
  }, []);
}

export function useSessionPersistence(state: BookingState, debouncedUpdateRef: DebouncedUpdateRef) {
  useEffect(() => {
    if (!state.currentSession) return;

    const currentSession = state.currentSession;

    const saveSessionOnLeave = () => {
      if (debouncedUpdateRef.current?.flush) {
        debouncedUpdateRef.current.flush();
      }

      const progressPercentage = currentSession.progress_percentage || 0;
      if (progressPercentage === 0) {
        return;
      }

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
          JSON.stringify(sessionToSave),
        );
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Failed to save session on unload:', e);
      }
    };

    window.addEventListener('beforeunload', saveSessionOnLeave);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveSessionOnLeave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    window.addEventListener('pagehide', saveSessionOnLeave);

    return () => {
      window.removeEventListener('beforeunload', saveSessionOnLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', saveSessionOnLeave);
    };
  }, [state.currentSession, state.stepData, state.totalPrice]);
}
