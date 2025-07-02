// frontend/client-portal/src/hooks/usePaymentProcessing.ts

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingFlowAPI } from '../apis/bookingflow.api';
import { bookingSessionAPI } from '../apis/booking-session.api';
import type { 
  PaymentOptionsResponse,
  PaymentGatewayConfig,
  SavedPaymentMethod,
  BookingFlowPaymentGateways 
} from '../types/booking.types';
import type { 
  CompleteBookingResponse,
  PaymentInfoStepData 
} from '../types/booking-session.types';

interface UsePaymentProcessingOptions {
  stepId?: number;
  flowId?: number;
  sessionUUID?: string;
  enableSavedMethods?: boolean;
}

interface UsePaymentProcessingReturn {
  // Payment options
  paymentOptions: PaymentOptionsResponse | null;
  flowPaymentGateways: BookingFlowPaymentGateways | null;
  availableGateways: PaymentGatewayConfig[];
  savedPaymentMethods: SavedPaymentMethod[];
  
  // Payment state
  selectedGateway: PaymentGatewayConfig | null;
  selectedPaymentMethod: SavedPaymentMethod | null;
  paymentAmount: string;
  requiresImmediatePayment: boolean;
  acceptsDeposit: boolean;
  
  // Loading states
  isLoadingOptions: boolean;
  isProcessing: boolean;
  
  // Actions
  selectGateway: (gatewayId: number) => void;
  selectSavedMethod: (methodId: string) => void;
  clearSelection: () => void;
  
  // Payment processing
  processPayment: (paymentData: PaymentInfoStepData) => Promise<CompleteBookingResponse | null>;
  updatePaymentInfo: (paymentData: PaymentInfoStepData) => Promise<boolean>;
  
  // Error handling
  error: Error | null;
  clearError: () => void;
}

export const usePaymentProcessing = (options: UsePaymentProcessingOptions = {}): UsePaymentProcessingReturn => {
  const { stepId, flowId, sessionUUID, enableSavedMethods = true } = options;
  
  // Local state
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayConfig | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SavedPaymentMethod | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Query: Get payment options for step (if stepId provided)
  const {
    data: paymentOptions,
    isLoading: isLoadingStepOptions,
    error: optionsError
  } = useQuery({
    queryKey: ['payment-options', stepId],
    queryFn: () => stepId ? bookingFlowAPI.getPaymentOptions(stepId) : Promise.resolve(null),
    enabled: !!stepId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query: Get flow payment gateways (if flowId provided)
  const {
    data: flowPaymentGateways,
    isLoading: isLoadingFlowGateways,
    error: flowGatewaysError
  } = useQuery({
    queryKey: ['flow-payment-gateways', flowId],
    queryFn: () => flowId ? bookingFlowAPI.getFlowPaymentGateways(flowId) : Promise.resolve(null),
    enabled: !!flowId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Mutation: Update payment info in session
  const updatePaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentInfoStepData) => {
      if (!sessionUUID || !stepId) {
        throw new Error('Session UUID and step ID are required');
      }

      const result = await bookingSessionAPI.updateSessionDataByUUID(sessionUUID, {
        step_id: stepId,
        step_data: paymentData,
        mark_completed: false
      });

      return result;
    },
    onSuccess: () => {
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Mutation: Process payment and complete booking
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentInfoStepData) => {
      if (!sessionUUID || !stepId) {
        throw new Error('Session UUID and step ID are required');
      }

      // First update the session with payment data
      await bookingSessionAPI.updateSessionDataByUUID(sessionUUID, {
        step_id: stepId,
        step_data: paymentData,
        mark_completed: true
      });

      // Then complete the booking (which will process payment)
      return bookingSessionAPI.completeBookingByUUID(sessionUUID);
    },
    onSuccess: () => {
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  // Get available gateways from either source
  const availableGateways = (() => {
    if (paymentOptions?.available_gateways) {
      return paymentOptions.available_gateways;
    }
    
    if (flowPaymentGateways?.available_gateways) {
      return flowPaymentGateways.available_gateways.map(gateway => ({
        ...gateway,
        supported_methods: [] // Flow gateways don't include supported methods
      }));
    }
    
    return [];
  })();

  // Get saved payment methods
  const savedPaymentMethods = enableSavedMethods ? (paymentOptions?.saved_payment_methods ?? []) : [];

  // Determine payment requirements
  const requiresImmediatePayment = paymentOptions?.require_immediate_payment ?? 
                                   flowPaymentGateways?.require_immediate_payment ?? 
                                   false;

  const acceptsDeposit = paymentOptions?.accept_deposit ?? false;

  // Calculate payment amount (this would typically come from session pricing)
  const paymentAmount = '0.00'; // This should be calculated from session data

  // Gateway selection handler
  const selectGateway = useCallback((gatewayId: number) => {
    const gateway = availableGateways.find(g => g.id === gatewayId);
    if (gateway) {
      setSelectedGateway(gateway);
      setSelectedPaymentMethod(null); // Clear saved method when selecting new gateway
    }
  }, [availableGateways]);

  // Saved payment method selection handler
  const selectSavedMethod = useCallback((methodId: string) => {
    const method = savedPaymentMethods.find(m => m.id === methodId);
    if (method) {
      setSelectedPaymentMethod(method);
      setSelectedGateway(null); // Clear gateway when selecting saved method
    }
  }, [savedPaymentMethods]);

  // Clear selection handler
  const clearSelection = useCallback(() => {
    setSelectedGateway(null);
    setSelectedPaymentMethod(null);
  }, []);

  // Update payment info handler
  const updatePaymentInfo = useCallback(async (paymentData: PaymentInfoStepData): Promise<boolean> => {
    try {
      await updatePaymentMutation.mutateAsync(paymentData);
      return true;
    } catch (error) {
      setError(error as Error);
      return false;
    }
  }, [updatePaymentMutation]);

  // Process payment handler
  const processPayment = useCallback(async (paymentData: PaymentInfoStepData): Promise<CompleteBookingResponse | null> => {
    try {
      const result = await processPaymentMutation.mutateAsync(paymentData);
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [processPaymentMutation]);

  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-select default gateway
  useEffect(() => {
    if (availableGateways.length > 0 && !selectedGateway && !selectedPaymentMethod) {
      // Try to select default gateway from flow
      const defaultGatewayId = flowPaymentGateways?.default_gateway;
      if (defaultGatewayId) {
        const defaultGateway = availableGateways.find(g => g.id === defaultGatewayId);
        if (defaultGateway) {
          setSelectedGateway(defaultGateway);
          return;
        }
      }
      
      // Fallback to first available gateway
      setSelectedGateway(availableGateways[0]);
    }
  }, [availableGateways, selectedGateway, selectedPaymentMethod, flowPaymentGateways?.default_gateway]);

  // Auto-select default saved payment method if available
  useEffect(() => {
    if (savedPaymentMethods.length > 0 && !selectedPaymentMethod && !selectedGateway) {
      const defaultMethod = savedPaymentMethods.find(m => m.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    }
  }, [savedPaymentMethods, selectedPaymentMethod, selectedGateway]);

  // Update error from queries
  useEffect(() => {
    const queryError = optionsError || flowGatewaysError;
    if (queryError) {
      setError(queryError as Error);
    }
  }, [optionsError, flowGatewaysError]);

  const isLoading = isLoadingStepOptions || isLoadingFlowGateways;
  const isProcessing = updatePaymentMutation.isPending || processPaymentMutation.isPending;

  return {
    // Payment options
    paymentOptions: paymentOptions ?? null,
    flowPaymentGateways: flowPaymentGateways ?? null,
    availableGateways,
    savedPaymentMethods,
    
    // Payment state
    selectedGateway,
    selectedPaymentMethod,
    paymentAmount,
    requiresImmediatePayment,
    acceptsDeposit,
    
    // Loading states
    isLoadingOptions: isLoading,
    isProcessing,
    
    // Actions
    selectGateway,
    selectSavedMethod,
    clearSelection,
    
    // Payment processing
    processPayment,
    updatePaymentInfo,
    
    // Error handling
    error,
    clearError,
  };
};