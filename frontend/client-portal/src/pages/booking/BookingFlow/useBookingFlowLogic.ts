// frontend/client-portal/src/pages/booking/BookingFlow/useBookingFlowLogic.ts

import { useState, useEffect } from 'react';
import { useBooking } from '@/contexts/BookingContext';

/**
 * Encapsulates session recovery logic and booking flow state
 * for the main BookingFlowContent component.
 */
export function useBookingFlowLogic() {
  const { state, actions } = useBooking();
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  // Show recovery dialog when recoverable session found and no current flow
  useEffect(() => {
    if (state.recoverableSession && !state.currentFlow && !state.currentSession) {
      setShowRecoveryDialog(true);
    }
  }, [state.recoverableSession, state.currentFlow, state.currentSession]);

  const handleRestoreSession = () => {
    if (state.recoverableSession) {
      // Navigate to booking with session_id to restore the session
      window.location.href = `/booking?session_id=${state.recoverableSession.sessionId}`;
    }
  };

  const handleDiscardSession = () => {
    if (state.recoverableSession) {
      // Clear the session from localStorage and state
      actions.clearRecoverableSession(state.recoverableSession.sessionId);
    }
    setShowRecoveryDialog(false);
  };

  const handleCloseDialog = () => {
    setShowRecoveryDialog(false);
  };

  return {
    state,
    showRecoveryDialog,
    handleRestoreSession,
    handleDiscardSession,
    handleCloseDialog,
  };
}
