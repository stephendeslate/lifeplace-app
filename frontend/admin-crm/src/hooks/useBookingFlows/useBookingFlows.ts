import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { bookingFlowsApi, type BookingFlowQueryParams } from '../../apis/bookingflows';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateBookingFlowData,
  UpdateBookingFlowData,
  DuplicateFlowData,
} from '../../types/bookingflows';

export const useBookingFlows = (params?: BookingFlowQueryParams) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: paginatedData,
    isLoading: isLoadingFlows,
    error: flowsError,
    refetch: refetchFlows,
  } = useQuery({
    queryKey: ['booking-flows', params],
    queryFn: () => bookingFlowsApi.getBookingFlows(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });

  const bookingFlows = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageCount = paginatedData?.page_count || 1;

  const useBookingFlow = (id: number) => {
    return useQuery({
      queryKey: ['booking-flow', id],
      queryFn: () => bookingFlowsApi.getBookingFlow(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  const useActiveBookingFlows = () => {
    return useQuery({
      queryKey: ['booking-flows', 'active'],
      queryFn: () => bookingFlowsApi.getActiveBookingFlows(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // FIXED: Improved error handling for mutations to match backend responses
  const createFlowMutation = useMutation({
    mutationFn: (data: CreateBookingFlowData) => bookingFlowsApi.createBookingFlow(data),
    onSuccess: (newFlow) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess('Booking Flow Created', `${newFlow.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      console.error('Create booking flow error:', error);

      // Handle validation errors from backend
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          const errorData = response.data;

          // Handle event type uniqueness constraint (matches backend validation)
          if (errorData.event_type) {
            const message = Array.isArray(errorData.event_type)
              ? errorData.event_type[0]
              : errorData.event_type;
            showError('Event Type Conflict', message);
          } else if (errorData.non_field_errors) {
            const message = Array.isArray(errorData.non_field_errors)
              ? errorData.non_field_errors[0]
              : errorData.non_field_errors;
            showError('Validation Error', message);
          } else if (errorData.detail) {
            showError('Create Failed', String(errorData.detail));
          } else {
            // Handle field-specific errors
            const fieldErrors = Object.entries(errorData)
              .map(([field, messages]) => {
                const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
                return `${field}: ${messageText}`;
              })
              .join('\n');
            showError('Validation Errors', fieldErrors);
          }
        }
      } else {
        showError('Create Failed', 'Failed to create booking flow. Please try again.');
      }
    },
  });

  const updateFlowMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBookingFlowData }) =>
      bookingFlowsApi.updateBookingFlow(id, data),
    onSuccess: (updatedFlow) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      queryClient.invalidateQueries({
        queryKey: ['booking-flow', updatedFlow.id],
      });
      showSuccess('Booking Flow Updated', `${updatedFlow.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      console.error('Update booking flow error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          const errorData = response.data;

          // Handle event type uniqueness constraint
          if (errorData.event_type) {
            const eventTypeError = errorData.event_type;
            const message = Array.isArray(eventTypeError)
              ? eventTypeError[0]
              : String(eventTypeError);
            showError('Event Type Conflict', message);
          } else if (errorData.non_field_errors) {
            const nonFieldErrors = errorData.non_field_errors;
            const message = Array.isArray(nonFieldErrors)
              ? String(nonFieldErrors[0])
              : String(nonFieldErrors);
            showError('Validation Error', message);
          } else if (errorData.detail) {
            showError('Update Failed', String(errorData.detail));
          } else {
            const fieldErrors = Object.entries(errorData)
              .map(([field, messages]) => {
                const messageText = Array.isArray(messages)
                  ? messages.join(', ')
                  : String(messages);
                return `${field}: ${messageText}`;
              })
              .join('\n');
            showError('Validation Errors', fieldErrors);
          }
        }
      } else {
        showError('Update Failed', 'Failed to update booking flow. Please try again.');
      }
    },
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (id: number) => bookingFlowsApi.deleteBookingFlow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess('Booking Flow Deleted', 'Booking flow has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete booking flow'
          : 'Failed to delete booking flow';
      showError('Delete Failed', message);
    },
  });

  const duplicateFlowMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DuplicateFlowData }) =>
      bookingFlowsApi.duplicateBookingFlow(id, data),
    onSuccess: (newFlow) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess('Booking Flow Duplicated', `${newFlow.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to duplicate booking flow'
          : 'Failed to duplicate booking flow';
      showError('Duplicate Failed', message);
    },
  });

  return {
    // Data
    bookingFlows,
    totalCount,
    pageCount,

    // Loading states
    isLoadingFlows,
    isCreatingFlow: createFlowMutation.isPending,
    isUpdatingFlow: updateFlowMutation.isPending,
    isDeletingFlow: deleteFlowMutation.isPending,
    isDuplicatingFlow: duplicateFlowMutation.isPending,

    // Error states
    flowsError,
    createError: createFlowMutation.error,
    updateError: updateFlowMutation.error,
    deleteError: deleteFlowMutation.error,
    duplicateError: duplicateFlowMutation.error,

    // Actions
    createFlow: createFlowMutation.mutate,
    updateFlow: updateFlowMutation.mutate,
    deleteFlow: deleteFlowMutation.mutate,
    duplicateFlow: duplicateFlowMutation.mutate,
    refetchFlows,

    // Hooks for specific queries
    useBookingFlow,
    useActiveBookingFlows,
  };
};
