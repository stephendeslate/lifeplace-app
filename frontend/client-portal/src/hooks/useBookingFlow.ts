// frontend/client-portal/src/hooks/useBookingFlow.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingFlowApi } from '../apis/bookingflow.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  BookingSession,
  SessionStepData,
  BookingCompletionResponse,
} from '../types/bookingflow.types';

// Query keys
export const bookingFlowKeys = {
  all: ['bookingflow'] as const,
  flows: () => [...bookingFlowKeys.all, 'flows'] as const,
  flow: (id: number) => [...bookingFlowKeys.flows(), id] as const,
  sessions: () => [...bookingFlowKeys.all, 'sessions'] as const,
  session: (sessionId: string) => [...bookingFlowKeys.sessions(), sessionId] as const,
  paymentGateways: (flowId: number) => [...bookingFlowKeys.flow(flowId), 'payment-gateways'] as const,
  availability: (flowId: number) => [...bookingFlowKeys.flow(flowId), 'availability'] as const,
  userSessions: (params?: any) => [...bookingFlowKeys.sessions(), 'user', params] as const,
};

/**
 * Hook to get all active booking flows
 */
export const useBookingFlows = () => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: bookingFlowKeys.flows(),
    queryFn: bookingFlowApi.getActiveFlows,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (queryResult.isError) {
    showError('Failed to Load', 'Unable to load booking flows. Please try again.');
    console.error('Error fetching booking flows:', queryResult.error);
  }

  return queryResult;
};

/**
 * Hook to get a specific booking flow
 */
export const useBookingFlow = (flowId: number | null) => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: bookingFlowKeys.flow(flowId!),
    queryFn: () => bookingFlowApi.getFlow(flowId!),
    enabled: !!flowId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (queryResult.isError) {
    showError('Failed to Load', 'Unable to load booking flow details. Please try again.');
    console.error('Error fetching booking flow:', queryResult.error);
  }

  return queryResult;
};

/**
 * Hook to get payment gateways for a booking flow
 */
export const useFlowPaymentGateways = (flowId: number | null) => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: bookingFlowKeys.paymentGateways(flowId!),
    queryFn: () => bookingFlowApi.getFlowPaymentGateways(flowId!),
    enabled: !!flowId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  if (queryResult.isError) {
    showError('Failed to Load', 'Unable to load payment options. Please try again.');
    console.error('Error fetching payment gateways:', queryResult.error);
  }

  return queryResult;
};

/**
 * Hook to start a new booking session
 */
export const useStartBookingSession = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: bookingFlowApi.startSession,
    onSuccess: (data) => {
      showSuccess('Session Started', 'Your booking session has been created successfully.');
      
      // Invalidate sessions queries to include the new session
      queryClient.invalidateQueries({ queryKey: bookingFlowKeys.sessions() });
      
      // Pre-populate the new session in cache
      queryClient.setQueryData(
        bookingFlowKeys.session(data.session_id),
        data
      );
    },
    onError: (error: any) => {
      showError('Failed to Start', 'Unable to start booking session. Please try again.');
      console.error('Error starting booking session:', error);
    },
  });
};

/**
 * Hook to get booking session details
 */
export const useBookingSession = (sessionId: string | null) => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: bookingFlowKeys.session(sessionId!),
    queryFn: () => bookingFlowApi.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry if session is not found or expired
      if (error?.response?.status === 404 || error?.response?.status === 410) {
        return false;
      }
      return failureCount < 2;
    },
  });

  if (queryResult.isError) {
    const error: any = queryResult.error;
    if (error?.response?.status === 404) {
      showError('Session Not Found', 'This booking session no longer exists or has expired.');
    } else if (error?.response?.status === 410) {
      showError('Session Expired', 'This booking session has expired. Please start a new booking.');
    } else {
      showError('Failed to Load', 'Unable to load booking session. Please try again.');
    }
    console.error('Error fetching booking session:', error);
  }

  return queryResult;
};

/**
 * Hook to update booking session data
 */
export const useUpdateBookingSession = () => {
  const queryClient = useQueryClient();
  const { showError } = useToastActions();

  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted = false,
    }: {
      sessionId: string;
      stepId: number;
      stepData: SessionStepData;
      markCompleted?: boolean;
    }) => bookingFlowApi.updateSessionData(sessionId, stepId, stepData, markCompleted),
    onSuccess: (data, variables) => {
      // Update the session in cache
      queryClient.setQueryData(
        bookingFlowKeys.session(variables.sessionId),
        data
      );

      // If step was marked completed, invalidate user sessions to update lists
      if (variables.markCompleted) {
        queryClient.invalidateQueries({ queryKey: bookingFlowKeys.userSessions() });
      }
    },
    onError: (error: any) => {
      if (error?.response?.status === 422) {
        // Validation errors are handled by the form components
        console.error('Validation errors in session update:', error?.response?.data);
      } else {
        showError('Save Failed', 'Unable to save your progress. Please try again.');
        console.error('Error updating booking session:', error);
      }
    },
  });
};

/**
 * Hook to complete a booking
 */
export const useCompleteBooking = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: bookingFlowApi.completeBooking,
    onSuccess: (data: BookingCompletionResponse, sessionId: string) => {
      showSuccess('Booking Complete!', 'Your event has been successfully booked.');
      
      // Update session as completed
      queryClient.setQueryData(
        bookingFlowKeys.session(sessionId),
        data.session
      );

      // Invalidate user sessions to update lists
      queryClient.invalidateQueries({ queryKey: bookingFlowKeys.userSessions() });
    },
    onError: (error: any) => {
      if (error?.response?.status === 422) {
        showError('Booking Incomplete', 'Please complete all required steps before finalizing your booking.');
      } else if (error?.response?.status === 409) {
        showError('Booking Conflict', 'There was a conflict with your booking. Please review and try again.');
      } else {
        showError('Booking Failed', 'Unable to complete your booking. Please try again or contact support.');
      }
      console.error('Error completing booking:', error);
    },
  });
};

/**
 * Hook to abandon a booking session
 */
export const useAbandonSession = () => {
  const queryClient = useQueryClient();
  const { showInfo, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      bookingFlowApi.abandonSession(sessionId, reason),
    onSuccess: (data, variables) => {
      showInfo('Session Ended', 'Your booking session has been ended.');
      
      // Update session as abandoned
      queryClient.setQueryData(
        bookingFlowKeys.session(variables.sessionId),
        data
      );

      // Invalidate user sessions to update lists
      queryClient.invalidateQueries({ queryKey: bookingFlowKeys.userSessions() });
    },
    onError: (error: any) => {
      showError('Failed to End Session', 'Unable to end booking session. Please try again.');
      console.error('Error abandoning booking session:', error);
    },
  });
};

/**
 * Hook to get user's booking sessions
 */
export const useUserBookingSessions = (params?: {
  booking_flow?: number;
  is_completed?: boolean;
  is_abandoned?: boolean;
}) => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: bookingFlowKeys.userSessions(params),
    queryFn: () => bookingFlowApi.getUserSessions(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  if (queryResult.isError) {
    showError('Failed to Load', 'Unable to load your booking sessions. Please try again.');
    console.error('Error fetching user booking sessions:', queryResult.error);
  }

  return queryResult;
};

/**
 * Hook to check availability
 */
export const useCheckAvailability = () => {
  const { showError } = useToastActions();

  return useMutation({
    mutationFn: ({
      flowId,
      date,
      duration,
    }: {
      flowId: number;
      date: string;
      duration?: number;
    }) => bookingFlowApi.checkAvailability(flowId, date, duration),
    onError: (error: any) => {
      showError('Availability Check Failed', 'Unable to check availability. Please try again.');
      console.error('Error checking availability:', error);
    },
  });
};

/**
 * Hook to validate discount codes
 */
export const useValidateDiscount = () => {
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({
      sessionId,
      discountCode,
    }: {
      sessionId: string;
      discountCode: string;
    }) => bookingFlowApi.validateDiscount(sessionId, discountCode),
    onSuccess: (data) => {
      if (data.valid) {
        showSuccess('Discount Applied', `Discount code applied successfully! You saved $${data.discount_amount}.`);
      } else {
        showError('Invalid Code', data.error || 'This discount code is not valid.');
      }
    },
    onError: (error: any) => {
      showError('Validation Failed', 'Unable to validate discount code. Please try again.');
      console.error('Error validating discount:', error);
    },
  });
};

/**
 * Hook to calculate pricing
 */
export const useCalculatePricing = () => {
  const { showError } = useToastActions();

  return useMutation({
    mutationFn: ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates?: SessionStepData;
    }) => bookingFlowApi.calculatePricing(sessionId, updates),
    onError: (error: any) => {
      showError('Pricing Error', 'Unable to calculate pricing. Please try again.');
      console.error('Error calculating pricing:', error);
    },
  });
};

/**
 * Hook to auto-save session progress
 */
export const useAutoSaveProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      stepData,
    }: {
      sessionId: string;
      stepData: SessionStepData;
    }) => bookingFlowApi.saveProgress(sessionId, stepData),
    onSuccess: (_, variables) => {
      // Silently update the session data in cache
      const currentSession = queryClient.getQueryData<BookingSession>(
        bookingFlowKeys.session(variables.sessionId)
      );
      
      if (currentSession) {
        queryClient.setQueryData(
          bookingFlowKeys.session(variables.sessionId),
          {
            ...currentSession,
            booking_data: {
              ...currentSession.booking_data,
              ...variables.stepData,
            },
            updated_at: new Date().toISOString(),
          }
        );
      }
    },
    onError: (error: any) => {
      // Silently handle auto-save errors to avoid disrupting user experience
      console.warn('Auto-save failed:', error);
    },
  });
};

/**
 * Hook to restore session from auto-save
 */
export const useRestoreSession = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: bookingFlowApi.restoreSession,
    onSuccess: (data, sessionId) => {
      showSuccess('Session Restored', 'Your previous progress has been restored.');
      
      // Update session in cache
      queryClient.setQueryData(
        bookingFlowKeys.session(sessionId),
        data
      );
    },
    onError: (error: any) => {
      showError('Restore Failed', 'Unable to restore your previous session. Starting fresh.');
      console.error('Error restoring session:', error);
    },
  });
};

/**
 * Hook to get session navigation info
 */
export const useSessionNavigation = (sessionId: string | null) => {
  return useQuery({
    queryKey: [...bookingFlowKeys.session(sessionId!), 'navigation'],
    queryFn: () => bookingFlowApi.getSessionNavigation(sessionId!),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
};

/**
 * Hook to get products for a step
 */
export const useStepProducts = (
  stepId: number | null,
  params?: {
    category?: number;
    type?: 'PACKAGE' | 'PRODUCT';
    guest_count?: number;
  }
) => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: [...bookingFlowKeys.all, 'step-products', stepId, params],
    queryFn: () => bookingFlowApi.getStepProducts(stepId!, params),
    enabled: !!stepId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (queryResult.isError) {
    showError('Failed to Load Products', 'Unable to load available products. Please try again.');
    console.error('Error fetching step products:', queryResult.error);
  }

  return queryResult;
};

/**
 * Hook to get questionnaires for a step
 */
export const useStepQuestionnaires = (stepId: number | null) => {
  const { showError } = useToastActions();

  const queryResult = useQuery({
    queryKey: [...bookingFlowKeys.all, 'step-questionnaires', stepId],
    queryFn: () => bookingFlowApi.getStepQuestionnaires(stepId!),
    enabled: !!stepId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  if (queryResult.isError) {
    showError('Failed to Load Questionnaires', 'Unable to load questionnaires. Please try again.');
    console.error('Error fetching step questionnaires:', queryResult.error);
  }

  return queryResult;
};

/**
 * Utility hook for managing booking flow state across components
 */
export const useBookingFlowState = () => {
  const queryClient = useQueryClient();

  const clearBookingFlowCache = () => {
    queryClient.removeQueries({ queryKey: bookingFlowKeys.all });
  };

  const prefetchBookingFlow = (flowId: number) => {
    queryClient.prefetchQuery({
      queryKey: bookingFlowKeys.flow(flowId),
      queryFn: () => bookingFlowApi.getFlow(flowId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPaymentGateways = (flowId: number) => {
    queryClient.prefetchQuery({
      queryKey: bookingFlowKeys.paymentGateways(flowId),
      queryFn: () => bookingFlowApi.getFlowPaymentGateways(flowId),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    clearBookingFlowCache,
    prefetchBookingFlow,
    prefetchPaymentGateways,
  };
};