import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingFlowsApi } from '../../apis/bookingflows';
import { useToastActions } from '../../contexts/ToastContext';
import type { BookingFlowAnalyticsFilters } from '../../types/bookingflows';

export const useBookingFlowAnalytics = (filters?: BookingFlowAnalyticsFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: analytics = [],
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['booking-flow-analytics', filters],
    queryFn: () => bookingFlowsApi.getAllAnalytics(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const useFlowAnalytics = (
    flowId: number,
    dateFilters?: Omit<BookingFlowAnalyticsFilters, 'flow_id'>,
  ) => {
    return useQuery({
      queryKey: ['booking-flow-analytics', flowId, dateFilters],
      queryFn: () => bookingFlowsApi.getFlowAnalytics(flowId, dateFilters),
      enabled: !!flowId,
      staleTime: 10 * 60 * 1000,
    });
  };

  // Mutations
  const updateDailyAnalyticsMutation = useMutation({
    mutationFn: ({ flowId, date }: { flowId: number; date?: string }) =>
      bookingFlowsApi.updateDailyAnalytics(flowId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-analytics'] });
      showSuccess('Analytics Updated', 'Analytics have been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update analytics'
          : 'Failed to update analytics';
      showError('Update Failed', message);
    },
  });

  return {
    // Data
    analytics,

    // Loading states
    isLoadingAnalytics,
    isUpdatingAnalytics: updateDailyAnalyticsMutation.isPending,

    // Error states
    analyticsError,
    updateAnalyticsError: updateDailyAnalyticsMutation.error,

    // Actions
    updateDailyAnalytics: updateDailyAnalyticsMutation.mutate,
    refetchAnalytics,

    // Hooks for specific queries
    useFlowAnalytics,
  };
};
