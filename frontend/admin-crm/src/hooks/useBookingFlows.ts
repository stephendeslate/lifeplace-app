// frontend/admin-crm/src/hooks/useBookingFlows.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingFlowsApi } from '../apis/bookingflows.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  BookingFlowFilters,
  BookingFlowStepFilters,
  BookingSessionFilters,
  BookingFlowAnalyticsFilters,
  CreateBookingFlowData,
  UpdateBookingFlowData,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  CreateBookingSessionData,
  UpdateBookingSessionData,
  ReorderStepsData,
  DuplicateFlowData,
  AssignQuestionnairesData,
} from '../types/bookingflows.types';

// FIXED: Remove non-existent hook dependencies
// Only use actual hooks that exist in the project
// import { useEventTypes } from './useEvents';
// import { useQuestionnaires } from './useQuestionnaires';
// import { useProductCategories, useProducts } from './useProducts';

export const useBookingFlows = (filters?: BookingFlowFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: bookingFlows = [],
    isLoading: isLoadingFlows,
    error: flowsError,
    refetch: refetchFlows
  } = useQuery({
    queryKey: ['booking-flows', filters],
    queryFn: () => bookingFlowsApi.getBookingFlows(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
    onError: (error: any) => {
      console.error('Create booking flow error:', error);
      
      // Handle validation errors from backend
      if (error.response?.data) {
        const errorData = error.response.data;
        
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
          showError('Create Failed', errorData.detail);
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
      queryClient.invalidateQueries({ queryKey: ['booking-flow', updatedFlow.id] });
      showSuccess('Booking Flow Updated', `${updatedFlow.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      console.error('Update booking flow error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle event type uniqueness constraint
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
          showError('Update Failed', errorData.detail);
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete booking flow';
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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to duplicate booking flow';
      showError('Duplicate Failed', message);
    },
  });

  return {
    // Data
    bookingFlows,
    
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

export const useBookingFlowSteps = (filters?: BookingFlowStepFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: steps = [],
    isLoading: isLoadingSteps,
    error: stepsError,
    refetch: refetchSteps
  } = useQuery({
    queryKey: ['booking-flow-steps', filters],
    queryFn: () => bookingFlowsApi.getBookingFlowSteps(filters),
    staleTime: 5 * 60 * 1000,
  });

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
      showSuccess('Step Created', `${newStep.name} has been created successfully.`);
    },
    onError: (error: any) => {
      console.error('Create step error:', error);
      
      // Handle backend validation errors
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.step_type) {
          const message = Array.isArray(errorData.step_type)
            ? errorData.step_type[0]
            : errorData.step_type;
          showError('Step Type Error', message);
        } else if (errorData.detail) {
          showError('Create Failed', errorData.detail);
        } else if (errorData.non_field_errors) {
          const message = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
          showError('Validation Error', message);
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
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
      queryClient.invalidateQueries({ queryKey: ['booking-flow-step', updatedStep.id] });
      queryClient.invalidateQueries({ queryKey: ['booking-flows'] });
      showSuccess('Step Updated', `${updatedStep.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      console.error('Update step error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.step_type) {
          const message = Array.isArray(errorData.step_type)
            ? errorData.step_type[0]
            : errorData.step_type;
          showError('Step Type Error', message);
        } else if (errorData.detail) {
          showError('Update Failed', errorData.detail);
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete step';
      showError('Delete Failed', message);
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: (data: ReorderStepsData) => bookingFlowsApi.reorderSteps(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      showSuccess('Steps Reordered', 'Steps have been reordered successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to reorder steps';
      showError('Reorder Failed', message);
    },
  });

  // FIXED: Migration mutation for availability check steps
  const migrateAvailabilityMutation = useMutation({
    mutationFn: (stepId: number) => bookingFlowsApi.migrateAvailabilityToDateTime(stepId),
    onSuccess: (updatedStep) => {
      queryClient.invalidateQueries({ queryKey: ['booking-flow-steps'] });
      queryClient.invalidateQueries({ queryKey: ['booking-flow-step', updatedStep.id] });
      showSuccess('Step Migrated', 'Availability check step has been migrated to date & time step with availability features.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to migrate step';
      showError('Migration Failed', message);
    },
  });

  return {
    // Data
    steps,
    
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
    mutationFn: ({ stepId, data }: { stepId: number; data: Record<string, any> }) =>
      bookingFlowsApi.updateStepConfiguration(stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-configuration'] });
      queryClient.invalidateQueries({ queryKey: ['availability-settings'] });
      queryClient.invalidateQueries({ queryKey: ['payment-options'] });
      showSuccess('Configuration Updated', 'Step configuration has been updated successfully.');
    },
    onError: (error: any) => {
      console.error('Update configuration error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.detail) {
          showError('Update Failed', errorData.detail);
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to assign questionnaires';
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
    
    // Loading states
    isUpdatingConfiguration: updateConfigurationMutation.isPending,
    isAssigningQuestionnaires: assignQuestionnairesMutation.isPending,
    
    // Error states
    updateConfigurationError: updateConfigurationMutation.error,
    assignQuestionnairesError: assignQuestionnairesMutation.error,
    
    // Actions
    updateConfiguration: updateConfigurationMutation.mutate,
    assignQuestionnaires: assignQuestionnairesMutation.mutate,
  };
};

export const useBookingSessions = (filters?: BookingSessionFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    error: sessionsError,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['booking-sessions', filters],
    queryFn: () => bookingFlowsApi.getBookingSessions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useBookingSession = (id: number) => {
    return useQuery({
      queryKey: ['booking-session', id],
      queryFn: () => bookingFlowsApi.getBookingSession(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: (data: CreateBookingSessionData) => bookingFlowsApi.createBookingSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Session Created', 'Booking session has been created successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create session';
      showError('Create Failed', message);
    },
  });

  const updateSessionDataMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBookingSessionData }) =>
      bookingFlowsApi.updateBookingSessionData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Session Updated', 'Session data has been updated successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update session';
      showError('Update Failed', message);
    },
  });

  const completeBookingMutation = useMutation({
    mutationFn: (id: number) => bookingFlowsApi.completeBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Booking Completed', 'Booking has been completed successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to complete booking';
      showError('Completion Failed', message);
    },
  });

  const abandonSessionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      bookingFlowsApi.abandonSession(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Session Abandoned', 'Session has been marked as abandoned.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to abandon session';
      showError('Action Failed', message);
    },
  });

  return {
    // Data
    sessions,
    
    // Loading states
    isLoadingSessions,
    isCreatingSession: createSessionMutation.isPending,
    isUpdatingSessionData: updateSessionDataMutation.isPending,
    isCompletingBooking: completeBookingMutation.isPending,
    isAbandoningSession: abandonSessionMutation.isPending,
    
    // Error states
    sessionsError,
    createSessionError: createSessionMutation.error,
    updateSessionDataError: updateSessionDataMutation.error,
    completeBookingError: completeBookingMutation.error,
    abandonSessionError: abandonSessionMutation.error,
    
    // Actions
    createSession: createSessionMutation.mutate,
    updateSessionData: updateSessionDataMutation.mutate,
    completeBooking: completeBookingMutation.mutate,
    abandonSession: abandonSessionMutation.mutate,
    refetchSessions,
    
    // Hooks for specific queries
    useBookingSession,
  };
};

export const useBookingFlowAnalytics = (filters?: BookingFlowAnalyticsFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: analytics = [],
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['booking-flow-analytics', filters],
    queryFn: () => bookingFlowsApi.getAllAnalytics(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const useFlowAnalytics = (flowId: number, dateFilters?: Omit<BookingFlowAnalyticsFilters, 'flow_id'>) => {
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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update analytics';
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

// REMOVED: useBookingFlowDependencies hook since it depends on non-existent hooks
// This should be implemented when the actual dependency hooks are available