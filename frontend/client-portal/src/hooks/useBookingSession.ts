// frontend/client-portal/src/hooks/useBookingSession.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingSessionAPI } from '../apis/booking-session.api';
import { bookingFlowAPI } from '../apis/bookingflow.api';
import { saveSessionData, loadSessionData, updateStepData, clearSessionData } from '../utils/session-storage';
import type { 
  BookingSession,
  CompleteBookingResponse,
  SessionStorageData,
} from '../types/booking-session.types';

interface UseBookingSessionOptions {
  sessionUUID?: string;
  enableAutoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  flowId?: number; // Add flowId to help with guest bookings
}

interface UseBookingSessionReturn {
  // Session data
  session: BookingSession | null;
  sessionUUID: string | null;
  
  // Session state
  isLoading: boolean;
  isUpdating: boolean;
  isCompleting: boolean;
  isSaving: boolean;
  isGuestSession: boolean; // New flag to indicate guest booking
  
  // Session data management
  updateSessionData: (stepId: number, stepData: Record<string, any>, markCompleted?: boolean) => Promise<BookingSession | null>;
  saveProgress: (stepData: Record<string, any>) => Promise<BookingSession | null>;
  validateStepData: (stepId: number, stepData: Record<string, any>) => Promise<{ isValid: boolean; errors: Record<string, any> }>;
  
  // Session completion
  completeBooking: () => Promise<CompleteBookingResponse | null>;
  abandonSession: (reason?: string) => Promise<BookingSession | null>;
  
  // Pricing
  getPricing: () => Promise<{ total_price: string; breakdown: any } | null>;
  
  // Error handling
  error: Error | null;
  validationErrors: Record<string, any>;
  clearError: () => void;
  
  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  isAutoSaveEnabled: boolean;
}

export const useBookingSession = (options: UseBookingSessionOptions = {}): UseBookingSessionReturn => {
  const { 
    sessionUUID, 
    enableAutoSave = false, 
    autoSaveInterval = 30000,
    flowId
  } = options;
  
  const queryClient = useQueryClient();
  
  // Local state
  const [currentSessionUUID, setCurrentSessionUUID] = useState<string | null>(sessionUUID || null);
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});
  const [error, setError] = useState<Error | null>(null);
  const [isAutoSaveActive, setIsAutoSaveActive] = useState(enableAutoSave);
  const [isGuestSession, setIsGuestSession] = useState(true); // Default to guest session
  const [localSession, setLocalSession] = useState<BookingSession | null>(null);
  
  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Record<string, any> | null>(null);

  // Try to get session data using public endpoint
  const {
    data: serverSession,
    isLoading,
    error: queryError,
    refetch: refetchSession
  } = useQuery({
    queryKey: ['booking-session-public', currentSessionUUID],
    queryFn: async () => {
      if (!currentSessionUUID) return null;
      
      try {
        // Use public endpoint to get session data
        const session = await bookingFlowAPI.getSessionByUUID(currentSessionUUID);
        
        // Check if this is a guest session
        if (!session.user && session.id === 0) {
          setIsGuestSession(true);
          
          // Try to load from local storage for guest sessions
          const storedData = loadSessionData();
          if (storedData && storedData.sessionId === currentSessionUUID) {
            const enrichedSession: BookingSession = {
              ...session,
              booking_flow: storedData.flowId,
              booking_data: storedData.stepData,
            };
            return enrichedSession;
          }
        } else {
          setIsGuestSession(false);
        }
        
        return session;
      } catch (error: any) {
        // This is likely a guest session
        setIsGuestSession(true);
        
        // Create a guest session object
        const guestSession: BookingSession = {
          id: 0,
          session_id: currentSessionUUID,
          booking_flow: flowId || 0,
          booking_data: {},
          validation_errors: {},
          is_completed: false,
          is_abandoned: false,
          current_step: null,
          total_price: '0.00',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        
        // Try to load from local storage
        const storedData = loadSessionData();
        if (storedData && storedData.sessionId === currentSessionUUID) {
          guestSession.booking_flow = storedData.flowId;
          guestSession.booking_data = storedData.stepData;
        }
        
        return guestSession;
      }
    },
    enabled: !!currentSessionUUID,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false, // Don't retry for guest sessions
  });

  // Use local session for guest bookings, server session for authenticated
  const session = isGuestSession ? (localSession || serverSession) : serverSession;

  // Update local session when server session changes
  useEffect(() => {
    if (serverSession && (!isGuestSession || !localSession)) {
      setLocalSession(serverSession);
    }
  }, [serverSession, isGuestSession, localSession]);

  // Save guest session data to local storage
  const saveGuestSessionData = useCallback((sessionData: BookingSession) => {
    if (isGuestSession && sessionData.session_id) {
      const storageData: SessionStorageData = {
        sessionId: sessionData.session_id,
        flowId: sessionData.booking_flow,
        stepData: sessionData.booking_data,
        lastUpdated: new Date().toISOString(),
        expiresAt: sessionData.expires_at,
      };
      saveSessionData(storageData);
    }
  }, [isGuestSession]);

  // Mutation: Update session data using public endpoint
  const updateSessionMutation = useMutation({
    mutationFn: async ({ stepId, stepData, markCompleted }: { 
      stepId: number; 
      stepData: Record<string, any>; 
      markCompleted?: boolean;
    }) => {
      if (!currentSessionUUID) throw new Error('No active session');
      
      // Use public endpoint for all session updates
      return bookingFlowAPI.updateSessionDataByUUID(
        currentSessionUUID,
        stepId,
        stepData,
        markCompleted || false
      );
    },
    onSuccess: (data) => {
      // For guest sessions, save to local storage
      if (isGuestSession) {
        setLocalSession(data);
        saveGuestSessionData(data);
      } else {
        // Update cache for authenticated sessions
        queryClient.setQueryData(['booking-session-public', currentSessionUUID], data);
      }
      
      // Update validation errors from response
      setValidationErrors(data.validation_errors || {});
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Mutation: Complete booking using public endpoint
  const completeBookingMutation = useMutation({
    mutationFn: async () => {
      if (!currentSessionUUID) throw new Error('No active session');
      
      // Use public completion endpoint
      return bookingFlowAPI.completeBookingByUUID(currentSessionUUID);
    },
    onSuccess: () => {
      setError(null);
      if (!isGuestSession) {
        queryClient.invalidateQueries({ queryKey: ['booking-session-public', currentSessionUUID] });
      }
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Mutation: Abandon session
  const abandonSessionMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!currentSessionUUID) throw new Error('No active session');
      
      return bookingSessionAPI.abandonSessionByUUID(currentSessionUUID, { reason });
    },
    onSuccess: (data) => {
      setError(null);
      if (isGuestSession) {
        setLocalSession(data);
        clearSessionData(); // Clear from storage
      } else {
        queryClient.setQueryData(['booking-session-public', currentSessionUUID], data);
      }
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Auto-save functionality
  const scheduleAutoSave = useCallback((stepData: Record<string, any>) => {
    if (!isAutoSaveActive || !currentSessionUUID) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Store pending data
    pendingDataRef.current = stepData;

    // Schedule auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (pendingDataRef.current && currentSessionUUID) {
        try {
          if (isGuestSession) {
            // For guest sessions, just update local storage
            updateStepData(0, pendingDataRef.current);
          } else {
            await bookingSessionAPI.saveProgress(currentSessionUUID, pendingDataRef.current);
          }
          pendingDataRef.current = null;
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }
    }, autoSaveInterval);
  }, [isAutoSaveActive, currentSessionUUID, autoSaveInterval, isGuestSession]);

  // Session data update handler
  const updateSessionData = useCallback(async (
    stepId: number, 
    stepData: Record<string, any>, 
    markCompleted = false
  ): Promise<BookingSession | null> => {
    try {
      const result = await updateSessionMutation.mutateAsync({
        stepId,
        stepData,
        markCompleted
      });

      // Schedule auto-save for future changes if not marking completed
      if (!markCompleted && isAutoSaveActive) {
        scheduleAutoSave(stepData);
      }

      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [updateSessionMutation, isAutoSaveActive, scheduleAutoSave]);

  // Save progress handler
  const saveProgress = useCallback(async (stepData: Record<string, any>): Promise<BookingSession | null> => {
    if (!currentSessionUUID) {
      setError(new Error('No active session'));
      return null;
    }

    try {
      if (isGuestSession) {
        // For guest sessions, save to local storage
        updateStepData(0, stepData);
        const updatedSession: BookingSession = {
          ...session!,
          booking_data: {
            ...session!.booking_data,
            progress: stepData,
          },
          updated_at: new Date().toISOString(),
        };
        setLocalSession(updatedSession);
        saveGuestSessionData(updatedSession);
        return updatedSession;
      }
      
      const result = await bookingSessionAPI.saveProgress(currentSessionUUID, stepData);
      
      // Update cache
      queryClient.setQueryData(['booking-session-public', currentSessionUUID], result);
      setError(null);
      
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [currentSessionUUID, queryClient, isGuestSession, session, saveGuestSessionData]);

  // Validation handler using public endpoint
  const validateStepData = useCallback(async (
    stepId: number, 
    stepData: Record<string, any>
  ): Promise<{ isValid: boolean; errors: Record<string, any> }> => {
    if (!currentSessionUUID) {
      return { isValid: false, errors: { general: ['No active session'] } };
    }

    try {
      const result = await bookingFlowAPI.validateStepData(currentSessionUUID, stepId, stepData);
      setValidationErrors(result.errors);
      return result;
    } catch (error) {
      const errorObj = { general: ['Validation failed'] };
      setValidationErrors(errorObj);
      return { isValid: false, errors: errorObj };
    }
  }, [currentSessionUUID]);

  // Complete booking handler
  const completeBooking = useCallback(async (): Promise<CompleteBookingResponse | null> => {
    try {
      const result = await completeBookingMutation.mutateAsync();
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [completeBookingMutation]);

  // Abandon session handler
  const abandonSession = useCallback(async (reason?: string): Promise<BookingSession | null> => {
    try {
      const result = await abandonSessionMutation.mutateAsync(reason);
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [abandonSessionMutation]);

  // Get pricing handler
  const getPricing = useCallback(async (): Promise<{ total_price: string; breakdown: any } | null> => {
    if (!currentSessionUUID) {
      setError(new Error('No active session'));
      return null;
    }

    try {
      const result = await bookingSessionAPI.getSessionPricing(currentSessionUUID);
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [currentSessionUUID]);

  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
    setValidationErrors({});
  }, []);

  // Auto-save control
  const enableAutoSaveHandler = useCallback(() => {
    setIsAutoSaveActive(true);
  }, []);

  const disableAutoSaveHandler = useCallback(() => {
    setIsAutoSaveActive(false);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  // Update session UUID
  useEffect(() => {
    setCurrentSessionUUID(sessionUUID || null);
  }, [sessionUUID]);

  // Update validation errors from session data
  useEffect(() => {
    if (session?.validation_errors) {
      setValidationErrors(session.validation_errors);
    }
  }, [session?.validation_errors]);

  // Cleanup auto-save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const combinedError = error || (queryError && !isGuestSession ? queryError as Error : null);

  return {
    // Session data
    session: session ?? null,
    sessionUUID: currentSessionUUID,
    
    // Session state
    isLoading: isLoading && !isGuestSession,
    isUpdating: updateSessionMutation.isPending,
    isCompleting: completeBookingMutation.isPending,
    isSaving: updateSessionMutation.isPending,
    isGuestSession,
    
    // Session data management
    updateSessionData,
    saveProgress,
    validateStepData,
    
    // Session completion
    completeBooking,
    abandonSession,
    
    // Pricing
    getPricing,
    
    // Error handling
    error: combinedError,
    validationErrors,
    clearError,
    
    // Auto-save
    enableAutoSave: enableAutoSaveHandler,
    disableAutoSave: disableAutoSaveHandler,
    isAutoSaveEnabled: isAutoSaveActive,
  };
};