// frontend/client-portal/src/hooks/useBookingFlow.ts

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingFlowAPI } from '../apis/bookingflow.api';
import type { 
  PublicBookingFlow, 
  EventType,
  BookingFlowPaymentGateways 
} from '../types/booking.types';
import type { StartSessionResponse } from '../types/booking-session.types';

interface UseBookingFlowOptions {
  eventTypeId?: number;
  autoStart?: boolean;
}

interface UseBookingFlowReturn {
  // Flow data
  availableFlows: PublicBookingFlow[] | undefined;
  selectedFlow: PublicBookingFlow | null;
  eventTypes: EventType[] | undefined;
  
  // Flow selection
  selectFlow: (flowId: number) => Promise<void>;
  selectEventType: (eventTypeId: number) => void;
  
  // Session management
  startSession: () => Promise<StartSessionResponse | null>;
  currentSession: StartSessionResponse | null;
  
  // Payment gateways
  paymentGateways: BookingFlowPaymentGateways | undefined;
  
  // Loading states
  isLoadingFlows: boolean;
  isLoadingFlow: boolean;
  isLoadingEventTypes: boolean;
  isLoadingPaymentGateways: boolean;
  isStartingSession: boolean;
  
  // Error states
  flowError: Error | null;
  sessionError: Error | null;
  
  // Actions
  clearError: () => void;
  reset: () => void;
}

export const useBookingFlow = (options: UseBookingFlowOptions = {}): UseBookingFlowReturn => {
  const { eventTypeId, autoStart = false } = options;
  // @ts-ignore
  const queryClient = useQueryClient();
  
  // Local state
  const [selectedFlow, setSelectedFlow] = useState<PublicBookingFlow | null>(null);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | undefined>(eventTypeId);
  const [currentSession, setCurrentSession] = useState<StartSessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<Error | null>(null);

  // Query: Get all active booking flows
  const {
    data: availableFlows,
    isLoading: isLoadingFlows,
    error: flowsError
  } = useQuery({
    queryKey: ['booking-flows', 'active'],
    queryFn: () => bookingFlowAPI.getActiveFlows(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query: Get flows by event type (conditional)
  const {
    data: filteredFlows,
    isLoading: isLoadingFilteredFlows
  } = useQuery({
    queryKey: ['booking-flows', 'by-event-type', selectedEventTypeId],
    queryFn: () => selectedEventTypeId ? bookingFlowAPI.getFlowsByEventType(selectedEventTypeId) : Promise.resolve([]),
    enabled: !!selectedEventTypeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query: Get event types
  const {
    data: eventTypes,
    isLoading: isLoadingEventTypes,
    error: eventTypesError
  } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => bookingFlowAPI.getEventTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Query: Get selected flow details (conditional)
  const {
    data: flowDetails,
    isLoading: isLoadingFlow,
    error: flowError
  } = useQuery({
    queryKey: ['booking-flow', selectedFlow?.id],
    queryFn: () => selectedFlow ? bookingFlowAPI.getFlow(selectedFlow.id) : Promise.resolve(null),
    enabled: !!selectedFlow,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query: Get payment gateways for selected flow (conditional)
  const {
    data: paymentGateways,
    isLoading: isLoadingPaymentGateways,
    error: paymentGatewaysError
  } = useQuery({
    queryKey: ['booking-flow', selectedFlow?.id, 'payment-gateways'],
    queryFn: () => selectedFlow ? bookingFlowAPI.getFlowPaymentGateways(selectedFlow.id) : Promise.resolve(null),
    enabled: !!selectedFlow,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Mutation: Start booking session
  const startSessionMutation = useMutation({
    mutationFn: (flowId: number) => bookingFlowAPI.startSession(flowId),
    onSuccess: (data) => {
      setCurrentSession(data);
      setSessionError(null);
    },
    onError: (error: Error) => {
      setSessionError(error);
    },
  });

  // Flow selection handler
  const selectFlow = useCallback(async (flowId: number) => {
    try {
      const flow = availableFlows?.find(f => f.id === flowId) || 
                   filteredFlows?.find(f => f.id === flowId);
      
      if (!flow) {
        throw new Error('Flow not found');
      }

      setSelectedFlow(flow);
      
      // Auto-start session if requested
      if (autoStart) {
        await startSessionMutation.mutateAsync(flowId);
      }
    } catch (error) {
      setSessionError(error as Error);
    }
  }, [availableFlows, filteredFlows, autoStart, startSessionMutation]);

  // Event type selection handler
  const selectEventType = useCallback((eventTypeId: number) => {
    setSelectedEventTypeId(eventTypeId);
    setSelectedFlow(null); // Reset flow selection
    setCurrentSession(null); // Reset session
  }, []);

  // Start session handler
  const startSession = useCallback(async (): Promise<StartSessionResponse | null> => {
    if (!selectedFlow) {
      setSessionError(new Error('No booking flow selected'));
      return null;
    }

    try {
      const session = await startSessionMutation.mutateAsync(selectedFlow.id);
      return session;
    } catch (error) {
      setSessionError(error as Error);
      return null;
    }
  }, [selectedFlow, startSessionMutation]);

  // Clear error handler
  const clearError = useCallback(() => {
    setSessionError(null);
  }, []);

  // Reset handler
  const reset = useCallback(() => {
    setSelectedFlow(null);
    setSelectedEventTypeId(undefined);
    setCurrentSession(null);
    setSessionError(null);
    startSessionMutation.reset();
  }, [startSessionMutation]);

  // Auto-select flow if only one is available for event type
  useEffect(() => {
    if (selectedEventTypeId && filteredFlows && filteredFlows.length === 1 && !selectedFlow) {
      setSelectedFlow(filteredFlows[0]);
    }
  }, [selectedEventTypeId, filteredFlows, selectedFlow]);

  // Update selected flow when flow details are loaded
  useEffect(() => {
    if (flowDetails && selectedFlow && flowDetails.id === selectedFlow.id) {
      setSelectedFlow(flowDetails);
    }
  }, [flowDetails, selectedFlow]);

  // Determine which flows to use (filtered by event type or all)
  const displayFlows = selectedEventTypeId ? filteredFlows : availableFlows;
  const isLoadingDisplayFlows = selectedEventTypeId ? isLoadingFilteredFlows : isLoadingFlows;

  // Combine all errors
  const combinedFlowError = flowsError || eventTypesError || flowError || paymentGatewaysError;

  return {
    // Flow data
    availableFlows: displayFlows,
    selectedFlow,
    eventTypes,
    
    // Flow selection
    selectFlow,
    selectEventType,
    
    // Session management
    startSession,
    currentSession,
    
    // Payment gateways
    paymentGateways: paymentGateways ?? undefined,
    
    // Loading states
    isLoadingFlows: isLoadingDisplayFlows,
    isLoadingFlow,
    isLoadingEventTypes,
    isLoadingPaymentGateways,
    isStartingSession: startSessionMutation.isPending,
    
    // Error states
    flowError: combinedFlowError,
    sessionError,
    
    // Actions
    clearError,
    reset,
  };
};