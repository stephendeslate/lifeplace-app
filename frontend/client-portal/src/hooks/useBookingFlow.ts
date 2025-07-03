// frontend/client-portal/src/hooks/useBookingFlow.ts

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const queryClient = useQueryClient();
  
  // ALWAYS call useState hooks - no conditional calls
  const [selectedFlow, setSelectedFlow] = useState<PublicBookingFlow | null>(null);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | undefined>(eventTypeId);
  const [currentSession, setCurrentSession] = useState<StartSessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  
  // ALWAYS call useRef hooks
  const hasAutoSelectedFlowRef = useRef(false);
  const hasAutoSelectedEventTypeRef = useRef(false);

  // ALWAYS call useQuery hooks in the same order (even if disabled)
  const {
    data: availableFlows,
    isLoading: isLoadingFlows,
    error: flowsError
  } = useQuery({
    queryKey: ['booking-flows', 'active'],
    queryFn: () => bookingFlowAPI.getActiveFlows(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: filteredFlows,
    isLoading: isLoadingFilteredFlows
  } = useQuery({
    queryKey: ['booking-flows', 'by-event-type', selectedEventTypeId],
    queryFn: () => selectedEventTypeId ? bookingFlowAPI.getFlowsByEventType(selectedEventTypeId) : Promise.resolve([]),
    enabled: !!selectedEventTypeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: eventTypes,
    isLoading: isLoadingEventTypes,
    error: eventTypesError
  } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => bookingFlowAPI.getEventTypes(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

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
    refetchOnWindowFocus: false,
  });

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
    refetchOnWindowFocus: false,
  });

  // ALWAYS call useMutation hooks
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

  // ALWAYS call useCallback hooks in the same order
  const selectFlow = useCallback(async (flowId: number) => {
    try {
      const flow = availableFlows?.find(f => f.id === flowId) || 
                   filteredFlows?.find(f => f.id === flowId);
      
      if (!flow) {
        throw new Error('Flow not found');
      }

      setSelectedFlow(flow);
      
      if (autoStart) {
        await startSessionMutation.mutateAsync(flowId);
      }
    } catch (error) {
      setSessionError(error as Error);
    }
  }, [availableFlows, filteredFlows, autoStart, startSessionMutation]);

  const selectEventType = useCallback((eventTypeId: number) => {
    setSelectedEventTypeId(eventTypeId);
    setSelectedFlow(null);
    setCurrentSession(null);
  }, []);

  const startSession = useCallback(async (): Promise<StartSessionResponse | null> => {
    if (!selectedFlow) {
      const error = new Error('No booking flow selected');
      setSessionError(error);
      return null;
    }

    try {
      console.log('useBookingFlow: Starting session for flow', selectedFlow.id);
      const session = await startSessionMutation.mutateAsync(selectedFlow.id);
      console.log('useBookingFlow: Session started successfully', session);
      return session;
    } catch (error) {
      console.error('useBookingFlow: Error starting session', error);
      setSessionError(error as Error);
      return null;
    }
  }, [selectedFlow, startSessionMutation]);

  const clearError = useCallback(() => {
    setSessionError(null);
  }, []);

  const reset = useCallback(() => {
    setSelectedFlow(null);
    setSelectedEventTypeId(undefined);
    setCurrentSession(null);
    setSessionError(null);
    hasAutoSelectedFlowRef.current = false;
    hasAutoSelectedEventTypeRef.current = false;
    startSessionMutation.reset();
  }, [startSessionMutation]);

  // ALWAYS call useMemo hooks in the same order
  const displayFlows = useMemo(() => {
    return selectedEventTypeId ? filteredFlows : availableFlows;
  }, [selectedEventTypeId, filteredFlows, availableFlows]);

  const isLoadingDisplayFlows = useMemo(() => {
    return selectedEventTypeId ? isLoadingFilteredFlows : isLoadingFlows;
  }, [selectedEventTypeId, isLoadingFilteredFlows, isLoadingFlows]);

  const combinedFlowError = useMemo(() => {
    return flowsError || eventTypesError || flowError || paymentGatewaysError;
  }, [flowsError, eventTypesError, flowError, paymentGatewaysError]);

  // ALWAYS call useEffect hooks in the same order
  useEffect(() => {
    if (selectedEventTypeId && 
        filteredFlows && 
        filteredFlows.length === 1 && 
        !selectedFlow &&
        !hasAutoSelectedFlowRef.current) {
      
      hasAutoSelectedFlowRef.current = true;
      setSelectedFlow(filteredFlows[0]);
    }
  }, [selectedEventTypeId, filteredFlows, selectedFlow]);

  useEffect(() => {
    if (eventTypeId && 
        !selectedEventTypeId && 
        !hasAutoSelectedEventTypeRef.current) {
      
      hasAutoSelectedEventTypeRef.current = true;
      setSelectedEventTypeId(eventTypeId);
    }
  }, [eventTypeId, selectedEventTypeId]);

  useEffect(() => {
    if (flowDetails && selectedFlow && flowDetails.id === selectedFlow.id) {
      setSelectedFlow(flowDetails);
    }
  }, [flowDetails, selectedFlow]);

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
}