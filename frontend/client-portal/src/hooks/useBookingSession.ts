// frontend/client-portal/src/hooks/useBookingSession.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingSessionAPI } from '../apis/booking-session.api';
import type { 
  BookingSession,
  CompleteBookingResponse,
} from '../types/booking-session.types';

interface UseBookingSessionOptions {
  sessionUUID?: string;
  enableAutoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
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
    autoSaveInterval = 30000 // 30 seconds
  } = options;
  
  const queryClient = useQueryClient();
  
  // Local state
  const [currentSessionUUID, setCurrentSessionUUID] = useState<string | null>(sessionUUID || null);
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});
  const [error, setError] = useState<Error | null>(null);
  const [isAutoSaveActive, setIsAutoSaveActive] = useState(enableAutoSave);
  
  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Record<string, any> | null>(null);

  // Query: Get session data
  const {
    data: session,
    isLoading,
    error: queryError,
    // @ts-ignore
    refetch: refetchSession
  } = useQuery({
    queryKey: ['booking-session', currentSessionUUID],
    queryFn: () => currentSessionUUID ? bookingSessionAPI.getSessionByUUID(currentSessionUUID) : Promise.resolve(null),
    enabled: !!currentSessionUUID,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) => {
      // Refetch more frequently if session is about to expire
      if (query.state.data?.expires_at) {
        const expiresAt = new Date(query.state.data.expires_at);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // If less than 10 minutes until expiry, check every minute
        if (timeUntilExpiry < 10 * 60 * 1000) {
          return 60 * 1000; // 1 minute
        }
      }
      
      // Otherwise check every 5 minutes
      return 5 * 60 * 1000;
    },
  });

  // Mutation: Update session data
  const updateSessionMutation = useMutation({
    mutationFn: ({ stepId, stepData, markCompleted }: { 
      stepId: number; 
      stepData: Record<string, any>; 
      markCompleted?: boolean;
    }) => {
      if (!currentSessionUUID) throw new Error('No active session');
      return bookingSessionAPI.updateSessionDataByUUID(currentSessionUUID, {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted
      });
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(['booking-session', currentSessionUUID], data);
      
      // Update validation errors from response
      setValidationErrors(data.validation_errors || {});
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Mutation: Complete booking
  const completeBookingMutation = useMutation({
    mutationFn: () => {
      if (!currentSessionUUID) throw new Error('No active session');
      return bookingSessionAPI.completeBookingByUUID(currentSessionUUID);
    },
    onSuccess: () => {
      setError(null);
      // Invalidate session query since booking is completed
      queryClient.invalidateQueries({ queryKey: ['booking-session', currentSessionUUID] });
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Mutation: Abandon session
  const abandonSessionMutation = useMutation({
    mutationFn: (reason?: string) => {
      if (!currentSessionUUID) throw new Error('No active session');
      return bookingSessionAPI.abandonSessionByUUID(currentSessionUUID, { reason });
    },
    onSuccess: (data) => {
      setError(null);
      queryClient.setQueryData(['booking-session', currentSessionUUID], data);
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
          await bookingSessionAPI.saveProgress(currentSessionUUID, pendingDataRef.current);
          pendingDataRef.current = null;
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }
    }, autoSaveInterval);
  }, [isAutoSaveActive, currentSessionUUID, autoSaveInterval]);

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
      const result = await bookingSessionAPI.saveProgress(currentSessionUUID, stepData);
      
      // Update cache
      queryClient.setQueryData(['booking-session', currentSessionUUID], result);
      setError(null);
      
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [currentSessionUUID, queryClient]);

  // Validation handler
  const validateStepData = useCallback(async (
    stepId: number, 
    stepData: Record<string, any>
  ): Promise<{ isValid: boolean; errors: Record<string, any> }> => {
    if (!currentSessionUUID) {
      return { isValid: false, errors: { general: ['No active session'] } };
    }

    try {
      const result = await bookingSessionAPI.validateStepData(currentSessionUUID, stepId, stepData);
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

  // Update error from query
  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
    }
  }, [queryError]);

  // Cleanup auto-save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const combinedError = error || queryError;

  return {
    // Session data
    session: session ?? null,
    sessionUUID: currentSessionUUID,
    
    // Session state
    isLoading,
    isUpdating: updateSessionMutation.isPending,
    isCompleting: completeBookingMutation.isPending,
    isSaving: updateSessionMutation.isPending,
    
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