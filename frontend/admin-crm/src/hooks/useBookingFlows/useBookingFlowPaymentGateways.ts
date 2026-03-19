import { useQuery } from '@tanstack/react-query';
import { bookingFlowsApi } from '../../apis/bookingflows';

// FIXED: Payment gateways hook for booking flows
export const useBookingFlowPaymentGateways = () => {
  const useFlowPaymentGateways = (flowId: number) => {
    return useQuery({
      queryKey: ['flow-payment-gateways', flowId],
      queryFn: () => bookingFlowsApi.getFlowPaymentGateways(flowId),
      enabled: !!flowId,
      staleTime: 5 * 60 * 1000,
    });
  };

  const usePublicPaymentGateways = (flowId: number) => {
    return useQuery({
      queryKey: ['public-payment-gateways', flowId],
      queryFn: () => bookingFlowsApi.getPublicPaymentGateways(flowId),
      enabled: !!flowId,
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    useFlowPaymentGateways,
    usePublicPaymentGateways,
  };
};
