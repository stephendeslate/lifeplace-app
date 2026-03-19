import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { bookingFlowsApi, type BookingFlowStepQueryParams } from '../../apis/bookingflows';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  ReorderStepsData,
} from '../../types/bookingflows';

export const useBookingFlowSteps = (params?: BookingFlowStepQueryParams) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: paginatedData,
    isLoading: isLoadingSteps,
    error: stepsError,
    refetch: refetchSteps,
  } = useQuery({
    queryKey: ['booking-flow-steps', params],
    queryFn: () => bookingFlowsApi.getBookingFlowSteps(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const steps = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageCount = paginatedData?.page_count || 1;

  const useFlowSteps = (flowId: number) => {
    return useQuery({
      queryKey: ['booking-flow-steps', flowId],
      queryFn: () => bookingFlowsApi.getFlowSteps(flowId),
      enabled: !!flowId,
      staleTime: 5 * 60 * 1000,
    });
  };

  const useBookingFlowStep = (id: number) => {
    return useQuery({
      queryKey: ['booking-flow-step', id],
      queryFn: () => bookingFlowsApi.getBookingFlowStep(id),
      enabled: !!id,
    });
  };

  // FIXED: Available step types query
  const useAvailableStepTypes = () => {
    return useQuery({
      queryKey: ['available-step-types'],
      queryFn: () => bookingFlowsApi.getAvailableStepTypes(),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // Mutations
  const createStepMutation = useMutation({
    mutationFn: (data: CreateBookingFlowStepData) => bookingFlowsApi.createBookingFlowStep(data),
    onSuccess: (newStep) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess('Step Created', `${newStep.step_type_display} has been created successfully.`);
    },
    onError: (error: unknown) => {
      console.error('Create step error:', error);

      // Handle backend validation errors
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          const errorData = response.data;

          if (errorData.step_type) {
            const stepTypeError = errorData.step_type;
            const message = Array.isArray(stepTypeError)
              ? String(stepTypeError[0])
              : String(stepTypeError);
            showError('Step Type Error', message);
          } else if (errorData.detail) {
            showError('Create Failed', String(errorData.detail));
          } else if (errorData.non_field_errors) {
            const nonFieldErrors = errorData.non_field_errors;
            const message = Array.isArray(nonFieldErrors)
              ? String(nonFieldErrors[0])
              : String(nonFieldErrors);
            showError('Validation Error', message);
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
        showError('Create Failed', 'Failed to create step. Please try again.');
      }
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBookingFlowStepData }) =>
      bookingFlowsApi.updateBookingFlowStep(id, data),
    onSuccess: (updatedStep) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      queryClient.invalidateQueries({
        queryKey: ['booking-flow-step', updatedStep.id],
      });
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess(
        'Step Updated',
        `${updatedStep.step_type_display} has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      console.error('Update step error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          const errorData = response.data;

          if (errorData.step_type) {
            const stepTypeError = errorData.step_type;
            const message = Array.isArray(stepTypeError)
              ? String(stepTypeError[0])
              : String(stepTypeError);
            showError('Step Type Error', message);
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
        showError('Update Failed', 'Failed to update step. Please try again.');
      }
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: (id: number) => bookingFlowsApi.deleteBookingFlowStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess('Step Deleted', 'Step has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete step'
          : 'Failed to delete step';
      showError('Delete Failed', message);
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: (data: ReorderStepsData) => bookingFlowsApi.reorderSteps(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      showSuccess('Steps Reordered', 'Steps have been reordered successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to reorder steps'
          : 'Failed to reorder steps';
      showError('Reorder Failed', message);
    },
  });

  // FIXED: Migration mutation for availability check steps
  const migrateAvailabilityMutation = useMutation({
    mutationFn: (stepId: number) => bookingFlowsApi.migrateAvailabilityToDateTime(stepId),
    onSuccess: (updatedStep) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      queryClient.invalidateQueries({
        queryKey: ['booking-flow-step', updatedStep.id],
      });
      showSuccess(
        'Step Migrated',
        'Availability check step has been migrated to date & time step with availability features.',
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to migrate step'
          : 'Failed to migrate step';
      showError('Migration Failed', message);
    },
  });

  return {
    // Data
    steps,
    totalCount,
    pageCount,

    // Loading states
    isLoadingSteps,
    isCreatingStep: createStepMutation.isPending,
    isUpdatingStep: updateStepMutation.isPending,
    isDeletingStep: deleteStepMutation.isPending,
    isReorderingSteps: reorderStepsMutation.isPending,
    isMigratingAvailability: migrateAvailabilityMutation.isPending,

    // Error states
    stepsError,
    createStepError: createStepMutation.error,
    updateStepError: updateStepMutation.error,
    deleteStepError: deleteStepMutation.error,
    reorderStepsError: reorderStepsMutation.error,
    migrateAvailabilityError: migrateAvailabilityMutation.error,

    // Actions
    createStep: createStepMutation.mutate,
    updateStep: updateStepMutation.mutate,
    deleteStep: deleteStepMutation.mutate,
    reorderSteps: reorderStepsMutation.mutate,
    migrateAvailabilityStep: migrateAvailabilityMutation.mutate,
    refetchSteps,

    // Hooks for specific queries
    useFlowSteps,
    useBookingFlowStep,
    useAvailableStepTypes,
  };
};
