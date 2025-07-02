// frontend/client-portal/src/hooks/useAvailabilityCheck.ts

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { bookingFlowAPI } from '../apis/bookingflow.api';
import type { 
  AvailabilityCheckRequest,
  AvailabilityCheckResponse,
} from '../types/booking.types';
import React from 'react';

interface UseAvailabilityCheckOptions {
  sessionUUID?: string;
  stepId?: number;
  debounceMs?: number;
  autoCheck?: boolean;
}

interface UseAvailabilityCheckReturn {
  // Availability state
  lastResult: AvailabilityCheckResponse | null;
  isChecking: boolean;
  hasChecked: boolean;
  
  // Availability actions
  checkAvailability: (request: AvailabilityCheckRequest) => Promise<AvailabilityCheckResponse>;
  checkAvailabilityDebounced: (request: AvailabilityCheckRequest) => void;
  clearResult: () => void;
  
  // Convenience methods
  isAvailable: boolean;
  conflicts: string[];
  alternativeDates: string[];
  alternativeTimes: string[];
  availabilityMessage: string;
  
  // Error handling
  error: Error | null;
  clearError: () => void;
}

export const useAvailabilityCheck = (options: UseAvailabilityCheckOptions = {}): UseAvailabilityCheckReturn => {
  const { sessionUUID, stepId, debounceMs = 1000, autoCheck = true } = options;
  
  // Local state
  const [lastResult, setLastResult] = useState<AvailabilityCheckResponse | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Debounce ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Availability check mutation
  const checkMutation = useMutation({
    mutationFn: async (request: AvailabilityCheckRequest): Promise<AvailabilityCheckResponse> => {
      if (!sessionUUID) {
        throw new Error('Session UUID is required for availability checking');
      }
      
      if (!stepId) {
        throw new Error('Step ID is required for availability checking');
      }

      return bookingFlowAPI.checkAvailability(sessionUUID, stepId, request);
    },
    onSuccess: (result) => {
      setLastResult(result);
      setHasChecked(true);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      setHasChecked(true);
      // Set a default "unavailable" result on error
      setLastResult({
        available: false,
        message: error.message || 'Error checking availability',
        conflicts: [],
        alternative_dates: [],
        alternative_times: []
      });
    },
  });

  // Direct availability check
  const checkAvailability = useCallback(async (request: AvailabilityCheckRequest): Promise<AvailabilityCheckResponse> => {
    try {
      const result = await checkMutation.mutateAsync(request);
      return result;
    } catch (error) {
      throw error;
    }
  }, [checkMutation]);

  // Debounced availability check
  const checkAvailabilityDebounced = useCallback((request: AvailabilityCheckRequest) => {
    if (!autoCheck) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      checkAvailability(request).catch(() => {
        // Error already handled by mutation
      });
    }, debounceMs);
  }, [autoCheck, debounceMs, checkAvailability]);

  // Clear result
  const clearResult = useCallback(() => {
    setLastResult(null);
    setHasChecked(false);
    setError(null);
    checkMutation.reset();
  }, [checkMutation]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Convenience computed values
  const isAvailable = lastResult?.available ?? false;
  const conflicts = lastResult?.conflicts ?? [];
  const alternativeDates = lastResult?.alternative_dates ?? [];
  const alternativeTimes = lastResult?.alternative_times ?? [];
  const availabilityMessage = lastResult?.message ?? '';

  return {
    // Availability state
    lastResult,
    isChecking: checkMutation.isPending,
    hasChecked,
    
    // Availability actions
    checkAvailability,
    checkAvailabilityDebounced,
    clearResult,
    
    // Convenience methods
    isAvailable,
    conflicts,
    alternativeDates,
    alternativeTimes,
    availabilityMessage,
    
    // Error handling
    error,
    clearError,
  };
};