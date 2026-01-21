// frontend/client-portal/src/hooks/booking/useBookingCore.ts

import { useState, useEffect, useCallback } from 'react';
import { BookingCoreApi } from '../../apis/booking/core.api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  EventType,
  BookingFlow,
  BookingSessionStartResponse,
  BookingSessionGetResponse,
  BookingSessionUpdateResponse,
  StepValidationResult,
  PaymentGatewayResponse,
} from '../../types/booking';

// Hook for managing event types
export const useEventTypes = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const types = await BookingCoreApi.getEventTypes();
      setEventTypes(types.filter(type => type.is_active));
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch event types only once on mount
  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  return {
    eventTypes,
    loading,
    error,
    refetch: fetchEventTypes,
  };
};

// Hook for managing booking flows
export const useBookingFlows = (eventTypeId?: number) => {
  const [flows, setFlows] = useState<BookingFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const flowData = await BookingCoreApi.getAvailableFlows(eventTypeId);
      setFlows(flowData);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [eventTypeId]);

  // Only fetch when eventTypeId changes
  useEffect(() => {
    if (eventTypeId !== undefined) {
      fetchFlows();
    }
  }, [eventTypeId, fetchFlows]);

  return {
    flows,
    loading,
    error,
    refetch: fetchFlows,
  };
};

// Hook for managing a single booking flow
export const useBookingFlow = (flowId?: number) => {
  const [flow, setFlow] = useState<BookingFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlow = useCallback(async () => {
    if (!flowId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const flowData = await BookingCoreApi.getFlowById(flowId);
      setFlow(flowData);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  // Only fetch when flowId changes
  useEffect(() => {
    if (flowId) {
      fetchFlow();
    }
  }, [flowId, fetchFlow]);

  return {
    flow,
    loading,
    error,
    refetch: fetchFlow,
  };
};

// Hook for managing booking sessions
export const useBookingSession = (sessionId?: string) => {
  const [session, setSession] = useState<BookingSessionGetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const sessionData = await BookingCoreApi.getSession(sessionId);
      
      // Check if session is expired
      if (BookingCoreApi.isSessionExpired(sessionData.expires_at)) {
        setError('Session has expired. Please start a new booking.');
        return;
      }
      
      setSession(sessionData);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const startSession = useCallback(async (
    flowId: number, 
    sessionData?: { ip_address?: string; user_agent?: string; referrer_url?: string }
  ): Promise<BookingSessionStartResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await BookingCoreApi.startSession(flowId, sessionData);
      
      // Save to local storage for recovery
      BookingCoreApi.saveSessionToLocal(response.session_id, {
        session_id: response.session_id,
        booking_flow: flowId,
        current_step: response.current_step,
        expires_at: response.expires_at,
        progress_percentage: response.progress_percentage,
      });
      
      return response;
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSessionData = useCallback(async (
    stepId: number,
    stepData: Record<string, unknown>,
    markCompleted: boolean = false
  ): Promise<BookingSessionUpdateResponse | null> => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    setLoading(true);
    setError(null);
    setValidationErrors({});
    
    try {
      // The core API now handles the transformation internally
      // We just pass the data and it will be wrapped properly
      const response = await BookingCoreApi.updateSessionData(
        sessionId,
        stepId,
        stepData,
        markCompleted  // This is now properly named as mark_completed in the API
      );
      
      // Update local session state
      if (session) {
        setSession({
          ...session,
          current_step: response.current_step,
          progress_percentage: response.progress_percentage,
          total_price: response.total_price,
        });
      }
      
      // Handle validation errors
      if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
        setValidationErrors(response.validation_errors as Record<string, string[]>);
      }
      
      return response;
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      const validationErrs = ErrorHandler.extractValidationErrorsAsRecord(err);

      setError(errorMessage);
      setValidationErrors(validationErrs);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, session]);

  const validateStep = useCallback(async (
    stepId: number,
    stepData: Record<string, unknown>
  ): Promise<StepValidationResult | null> => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    try {
      const result = await BookingCoreApi.validateStepData(sessionId, stepId, stepData);
      
      if (!result.isValid) {
        const errors: Record<string, string[]> = {};
        result.errors.forEach(error => {
          errors[error.field] = [error.message];
        });
        setValidationErrors(errors);
      } else {
        setValidationErrors({});
      }
      
      return result;
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
      return null;
    }
  }, [sessionId]);


  const abandonSession = useCallback(async (reason?: string): Promise<void> => {
    if (!sessionId) return;
    
    try {
      await BookingCoreApi.abandonSession(sessionId, reason);
      
      // Clear session from local storage
      BookingCoreApi.clearSessionFromLocal(sessionId);
      
      // Update session state
      if (session) {
        setSession({
          ...session,
          is_abandoned: true,
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Failed to abandon session:', err);
    }
  }, [sessionId, session]);

  // Only fetch session when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, fetchSession]);

  return {
    session,
    loading,
    error,
    validationErrors,
    startSession,
    updateSessionData,
    validateStep,
    abandonSession,
    refetch: fetchSession,
    clearErrors: () => {
      setError(null);
      setValidationErrors({});
    },
  };
};

// Hook for managing flow payment gateways
export const useFlowPaymentGateways = (flowId?: number) => {
  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentGateways = useCallback(async () => {
    if (!flowId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const gateways = await BookingCoreApi.getFlowPaymentGateways(flowId);
      setPaymentGateways(gateways);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  // Only fetch when flowId changes
  useEffect(() => {
    if (flowId) {
      fetchPaymentGateways();
    }
  }, [flowId, fetchPaymentGateways]);

  return {
    paymentGateways,
    loading,
    error,
    refetch: fetchPaymentGateways,
  };
};

// Hook for session time management
export const useSessionTimer = (expiresAt?: string) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, expired: false });

  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimeRemaining = () => {
      const remaining = BookingCoreApi.getSessionTimeRemaining(expiresAt);
      setTimeRemaining(remaining);
      
      // Consider "expiring soon" if less than 15 minutes remain
      setIsExpiringSoon(!remaining.expired && remaining.hours === 0 && remaining.minutes <= 15);
    };

    // Update immediately
    updateTimeRemaining();

    // Update every minute
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTimeRemaining = useCallback((): string => {
    if (timeRemaining.expired) return 'Expired';
    if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }
    return `${timeRemaining.minutes}m`;
  }, [timeRemaining]);

  return {
    timeRemaining,
    isExpiringSoon,
    expired: timeRemaining.expired,
    formatTimeRemaining,
  };
};

// Hook for session recovery
export const useSessionRecovery = () => {
  const [recoveredSession, setRecoveredSession] = useState<Record<string, unknown> | null>(null);

  const attemptSessionRecovery = useCallback((sessionId: string) => {
    const sessionData = BookingCoreApi.loadSessionFromLocal(sessionId);
    
    if (sessionData) {
      setRecoveredSession(sessionData);
      return sessionData;
    }
    
    return null;
  }, []);

  const clearRecoveredSession = useCallback(() => {
    setRecoveredSession(null);
  }, []);

  useEffect(() => {
    // Clean up expired sessions on mount
    BookingCoreApi.cleanupExpiredSessions();
  }, []);

  return {
    recoveredSession,
    attemptSessionRecovery,
    clearRecoveredSession,
  };
};