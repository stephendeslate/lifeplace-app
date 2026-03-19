import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingFlowsApi } from '../../apis/bookingflows';
import { useToastActions } from '../../contexts/ToastContext';
import type { AssignQuestionnairesData, PaymentTermsConfiguration } from '../../types/bookingflows';

export const useBookingFlowStepConfiguration = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Configuration queries
  const useStepConfiguration = (stepId: number) => {
    return useQuery({
      queryKey: ['step-configuration', stepId],
      queryFn: () => bookingFlowsApi.getStepConfiguration(stepId),
      enabled: !!stepId,
      staleTime: 2 * 60 * 1000,
    });
  };

  // FIXED: Step validation rules query
  const useStepValidationRules = (stepId: number) => {
    return useQuery({
      queryKey: ['step-validation-rules', stepId],
      queryFn: () => bookingFlowsApi.getStepValidationRules(stepId),
      enabled: !!stepId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // FIXED: Availability settings query for date_time steps
  const useAvailabilitySettings = (stepId: number) => {
    return useQuery({
      queryKey: ['availability-settings', stepId],
      queryFn: () => bookingFlowsApi.getAvailabilitySettings(stepId),
      enabled: !!stepId,
      staleTime: 2 * 60 * 1000,
    });
  };

  // FIXED: Payment options query for payment_info steps
  const usePaymentOptions = (stepId: number) => {
    return useQuery({
      queryKey: ['payment-options', stepId],
      queryFn: () => bookingFlowsApi.getPaymentOptions(stepId),
      enabled: !!stepId,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Configuration mutations
  const updateConfigurationMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: number; data: Record<string, unknown> }) =>
      bookingFlowsApi.updateStepConfiguration(stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-configuration'] });
      queryClient.invalidateQueries({ queryKey: ['availability-settings'] });
      queryClient.invalidateQueries({ queryKey: ['payment-options'] });
      showSuccess('Configuration Updated', 'Step configuration has been updated successfully.');
    },
    onError: (error: unknown) => {
      console.error('Update configuration error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          const errorData = response.data;

          if (errorData.detail) {
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
        showError('Update Failed', 'Failed to update configuration. Please try again.');
      }
    },
  });

  // Questionnaire configuration
  const useAvailableQuestionnaires = (stepId: number) => {
    return useQuery({
      queryKey: ['available-questionnaires', stepId],
      queryFn: () => bookingFlowsApi.getAvailableQuestionnaires(stepId),
      enabled: !!stepId,
      staleTime: 5 * 60 * 1000,
    });
  };

  const assignQuestionnairesMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: number; data: AssignQuestionnairesData }) =>
      bookingFlowsApi.assignQuestionnaires(stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-configuration'] });
      showSuccess('Questionnaires Assigned', 'Questionnaires have been assigned successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to assign questionnaires'
          : 'Failed to assign questionnaires';
      showError('Assignment Failed', message);
    },
  });

  // Package configuration
  const useAvailablePackages = (stepId: number) => {
    return useQuery({
      queryKey: ['available-packages', stepId],
      queryFn: () => bookingFlowsApi.getAvailablePackages(stepId),
      enabled: !!stepId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Addon configuration
  const useAvailableAddons = (stepId: number) => {
    return useQuery({
      queryKey: ['available-addons', stepId],
      queryFn: () => bookingFlowsApi.getAvailableAddons(stepId),
      enabled: !!stepId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Categories
  const useAvailableCategories = (stepId: number) => {
    return useQuery({
      queryKey: ['available-categories', stepId],
      queryFn: () => bookingFlowsApi.getAvailableCategories(stepId),
      enabled: !!stepId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Payment Terms Configuration (for payment_info steps)
  const usePaymentTermsConfiguration = (stepId: number, options?: { enabled?: boolean }) => {
    const isEnabled = options?.enabled !== undefined ? options.enabled && !!stepId : !!stepId;
    return useQuery({
      queryKey: ['payment-terms-configuration', stepId],
      queryFn: () => bookingFlowsApi.getPaymentTermsConfiguration(stepId),
      enabled: isEnabled,
      staleTime: 2 * 60 * 1000,
    });
  };

  const updatePaymentTermsMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: number; data: Partial<PaymentTermsConfiguration> }) =>
      bookingFlowsApi.updatePaymentTermsConfiguration(stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payment-terms-configuration'],
      });
      showSuccess(
        'Payment Terms Updated',
        'Payment terms configuration has been updated successfully.',
      );
    },
    onError: (error: unknown) => {
      console.error('Update payment terms error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: Record<string, unknown> } }).response;
        if (response?.data) {
          const errorData = response.data;

          if (errorData.detail) {
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
        showError('Update Failed', 'Failed to update payment terms. Please try again.');
      }
    },
  });

  return {
    // Configuration hooks
    useStepConfiguration,
    useStepValidationRules,
    useAvailabilitySettings,
    usePaymentOptions,
    useAvailableQuestionnaires,
    useAvailablePackages,
    useAvailableAddons,
    useAvailableCategories,
    usePaymentTermsConfiguration,

    // Loading states
    isUpdatingConfiguration: updateConfigurationMutation.isPending,
    isAssigningQuestionnaires: assignQuestionnairesMutation.isPending,
    isUpdatingPaymentTerms: updatePaymentTermsMutation.isPending,

    // Error states
    updateConfigurationError: updateConfigurationMutation.error,
    assignQuestionnairesError: assignQuestionnairesMutation.error,
    updatePaymentTermsError: updatePaymentTermsMutation.error,

    // Actions
    updateConfiguration: updateConfigurationMutation.mutate,
    assignQuestionnaires: assignQuestionnairesMutation.mutate,
    updatePaymentTerms: updatePaymentTermsMutation.mutate,
  };
};
