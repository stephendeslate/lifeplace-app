// frontend/admin-crm/src/hooks/useQuestionnaires.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '../apis/questionnaires.api';
import { useToastActions } from '../contexts/ToastContext';
import { extractErrorMessage } from '../utils/errorHandling';
import type {
  QuestionnaireFilters,
  QuestionnaireFieldFilters,
  QuestionnaireResponseFilters,
  CreateQuestionnaireData,
  UpdateQuestionnaireData,
  CreateQuestionnaireFieldData,
  UpdateQuestionnaireFieldData,
  ReorderQuestionnairesData,
  ReorderFieldsData,
  SaveEventResponsesData,
} from '../types/questionnaires.types';

export const useQuestionnaires = (filters?: QuestionnaireFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: questionnaires = [],
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError,
    refetch: refetchQuestionnaires
  } = useQuery({
    queryKey: ['questionnaires', filters],
    queryFn: () => questionnairesApi.getQuestionnaires(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useQuestionnaire = (id: number) => {
    return useQuery({
      queryKey: ['questionnaire', id],
      queryFn: () => questionnairesApi.getQuestionnaire(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  const useActiveQuestionnaires = () => {
    return useQuery({
      queryKey: ['questionnaires', 'active'],
      queryFn: () => questionnairesApi.getActiveQuestionnaires(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createQuestionnaireMutation = useMutation({
    mutationFn: (data: CreateQuestionnaireData) => questionnairesApi.createQuestionnaire(data),
    onSuccess: (newQuestionnaire) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      showSuccess('Questionnaire Created', `${newQuestionnaire.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create questionnaire'
        : 'Failed to create questionnaire';
      showError('Create Failed', message);
    },
  });

  const updateQuestionnaireMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuestionnaireData }) =>
      questionnairesApi.updateQuestionnaire(id, data),
    onSuccess: (updatedQuestionnaire) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire', updatedQuestionnaire.id] });
      showSuccess('Questionnaire Updated', `${updatedQuestionnaire.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update questionnaire'
        : 'Failed to update questionnaire';
      showError('Update Failed', message);
    },
  });

  const deleteQuestionnaireMutation = useMutation({
    mutationFn: (id: number) => questionnairesApi.deleteQuestionnaire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      showSuccess('Questionnaire Deleted', 'Questionnaire has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete questionnaire'
        : 'Failed to delete questionnaire';
      showError('Delete Failed', message);
    },
  });

  const reorderQuestionnairesMutation = useMutation({
    mutationFn: (data: ReorderQuestionnairesData) => questionnairesApi.reorderQuestionnaires(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      showSuccess('Order Updated', 'Questionnaires have been reordered successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to reorder questionnaires'
        : 'Failed to reorder questionnaires';
      showError('Reorder Failed', message);
    },
  });

  return {
    // Data
    questionnaires,
    
    // Loading states
    isLoadingQuestionnaires,
    isCreatingQuestionnaire: createQuestionnaireMutation.isPending,
    isUpdatingQuestionnaire: updateQuestionnaireMutation.isPending,
    isDeletingQuestionnaire: deleteQuestionnaireMutation.isPending,
    isReorderingQuestionnaires: reorderQuestionnairesMutation.isPending,
    
    // Error states
    questionnairesError,
    createError: createQuestionnaireMutation.error,
    updateError: updateQuestionnaireMutation.error,
    deleteError: deleteQuestionnaireMutation.error,
    reorderError: reorderQuestionnairesMutation.error,
    
    // Actions
    createQuestionnaire: createQuestionnaireMutation.mutate,
    updateQuestionnaire: updateQuestionnaireMutation.mutate,
    deleteQuestionnaire: deleteQuestionnaireMutation.mutate,
    reorderQuestionnaires: reorderQuestionnairesMutation.mutate,
    refetchQuestionnaires,
    
    // Hooks for specific queries
    useQuestionnaire,
    useActiveQuestionnaires,
  };
};

export const useQuestionnaireFields = (filters?: QuestionnaireFieldFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: fields = [],
    isLoading: isLoadingFields,
    error: fieldsError,
    refetch: refetchFields
  } = useQuery({
    queryKey: ['questionnaire-fields', filters],
    queryFn: () => questionnairesApi.getFields(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useQuestionnaireFields = (questionnaireId: number) => {
    return useQuery({
      queryKey: ['questionnaire-fields', questionnaireId],
      queryFn: () => questionnairesApi.getQuestionnaireFields(questionnaireId),
      enabled: !!questionnaireId,
      staleTime: 5 * 60 * 1000,
    });
  };

  const useField = (id: number) => {
    return useQuery({
      queryKey: ['questionnaire-field', id],
      queryFn: () => questionnairesApi.getField(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createFieldMutation = useMutation({
    mutationFn: (data: CreateQuestionnaireFieldData) => questionnairesApi.createField(data),
    onSuccess: (newField) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-fields'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      showSuccess('Field Created', `${newField.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error, 'Failed to create field');
      showError('Create Failed', message);
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuestionnaireFieldData }) =>
      questionnairesApi.updateField(id, data),
    onSuccess: (updatedField) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-fields'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire-field', updatedField.id] });
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      showSuccess('Field Updated', `${updatedField.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error, 'Failed to update field');
      showError('Update Failed', message);
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (id: number) => questionnairesApi.deleteField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-fields'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      showSuccess('Field Deleted', 'Field has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error, 'Failed to delete field');
      showError('Delete Failed', message);
    },
  });

  const reorderFieldsMutation = useMutation({
    mutationFn: (data: ReorderFieldsData) => questionnairesApi.reorderFields(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-fields'] });
      showSuccess('Order Updated', 'Fields have been reordered successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to reorder fields'
        : 'Failed to reorder fields';
      showError('Reorder Failed', message);
    },
  });

  return {
    // Data
    fields,
    
    // Loading states
    isLoadingFields,
    isCreatingField: createFieldMutation.isPending,
    isUpdatingField: updateFieldMutation.isPending,
    isDeletingField: deleteFieldMutation.isPending,
    isReorderingFields: reorderFieldsMutation.isPending,
    
    // Error states
    fieldsError,
    createFieldError: createFieldMutation.error,
    updateFieldError: updateFieldMutation.error,
    deleteFieldError: deleteFieldMutation.error,
    reorderFieldsError: reorderFieldsMutation.error,
    
    // Actions
    createField: createFieldMutation.mutate,
    updateField: updateFieldMutation.mutate,
    deleteField: deleteFieldMutation.mutate,
    reorderFields: reorderFieldsMutation.mutate,
    refetchFields,
    
    // Hooks for specific queries
    useQuestionnaireFields,
    useField,
  };
};

export const useQuestionnaireResponses = (filters?: QuestionnaireResponseFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: responses = [],
    isLoading: isLoadingResponses,
    error: responsesError,
    refetch: refetchResponses
  } = useQuery({
    queryKey: ['questionnaire-responses', filters],
    queryFn: () => questionnairesApi.getResponses(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useResponse = (id: number) => {
    return useQuery({
      queryKey: ['questionnaire-response', id],
      queryFn: () => questionnairesApi.getResponse(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createResponseMutation = useMutation({
    mutationFn: (data: Omit<typeof responses[0], 'id' | 'created_at' | 'updated_at'>) =>
      questionnairesApi.createResponse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-responses'] });
      showSuccess('Response Saved', 'Response has been saved successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to save response'
        : 'Failed to save response';
      showError('Save Failed', message);
    },
  });

  const updateResponseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof responses[0]> }) =>
      questionnairesApi.updateResponse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-responses'] });
      showSuccess('Response Updated', 'Response has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update response'
        : 'Failed to update response';
      showError('Update Failed', message);
    },
  });

  const saveEventResponsesMutation = useMutation({
    mutationFn: (data: SaveEventResponsesData) => questionnairesApi.saveEventResponses(data),
    onSuccess: (responses) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-responses'] });
      showSuccess('Responses Saved', `${responses.length} responses have been saved successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to save responses'
        : 'Failed to save responses';
      showError('Save Failed', message);
    },
  });

  return {
    // Data
    responses,
    
    // Loading states
    isLoadingResponses,
    isCreatingResponse: createResponseMutation.isPending,
    isUpdatingResponse: updateResponseMutation.isPending,
    isSavingEventResponses: saveEventResponsesMutation.isPending,
    
    // Error states
    responsesError,
    createResponseError: createResponseMutation.error,
    updateResponseError: updateResponseMutation.error,
    saveEventResponsesError: saveEventResponsesMutation.error,
    
    // Actions
    createResponse: createResponseMutation.mutate,
    updateResponse: updateResponseMutation.mutate,
    saveEventResponses: saveEventResponsesMutation.mutate,
    refetchResponses,
    
    // Hooks for specific queries
    useResponse,
  };
};