/**
 * useQuestionnaire Hook
 *
 * React Query hooks for dynamic questionnaire step.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuestionnaireAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireStepData,
  UploadedFile,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const questionnaireKeys = {
  all: ['questionnaires'] as const,
  questionnaire: (id: number) => [...questionnaireKeys.all, 'questionnaire', id] as const,
  fields: (id: number) => [...questionnaireKeys.all, 'fields', id] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all questionnaires for an event type.
 */
export function useQuestionnaires(eventTypeId?: number) {
  return useQuery({
    queryKey: [...questionnaireKeys.all, 'byEventType', eventTypeId] as const,
    queryFn: () => QuestionnaireAPI.getQuestionnaires(eventTypeId),
    enabled: eventTypeId !== undefined && eventTypeId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - questionnaires rarely change
  });
}

/**
 * Fetch questionnaire by ID.
 */
export function useQuestionnaire(questionnaireId: number) {
  return useQuery({
    queryKey: questionnaireKeys.questionnaire(questionnaireId),
    queryFn: () => QuestionnaireAPI.getQuestionnaire(questionnaireId),
    enabled: questionnaireId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - questionnaires rarely change
  });
}

/**
 * Fetch questionnaire fields.
 */
export function useQuestionnaireFields(questionnaireId: number) {
  return useQuery({
    queryKey: questionnaireKeys.fields(questionnaireId),
    queryFn: () => QuestionnaireAPI.getQuestionnaireFields(questionnaireId),
    enabled: questionnaireId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Upload a file for a questionnaire field.
 */
export function useUploadQuestionnaireFile() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      fieldId,
      fileUri,
      fileName,
      mimeType,
    }: {
      sessionId: string;
      fieldId: number;
      fileUri: string;
      fileName: string;
      mimeType: string;
    }) => QuestionnaireAPI.uploadFile(sessionId, fieldId, fileUri, fileName, mimeType),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to upload file.';
      showToast(message, 'error');
    },
  });
}

/**
 * Delete an uploaded file.
 */
export function useDeleteQuestionnaireFile() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (fileId: string) => QuestionnaireAPI.deleteFile(fileId),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to delete file.';
      showToast(message, 'error');
    },
  });
}

/**
 * Validate questionnaire step data.
 */
export function useValidateQuestionnaire() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: QuestionnaireStepData;
    }) => QuestionnaireAPI.validateStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update questionnaire step data.
 */
export function useUpdateQuestionnaire() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: QuestionnaireStepData;
      markCompleted?: boolean;
    }) => QuestionnaireAPI.updateStepData(sessionId, stepId, stepData, markCompleted),
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Check if a field should be visible based on conditional logic.
 */
export function useFieldVisibility(
  field: QuestionnaireField,
  responses: Record<string, unknown>
): boolean {
  return QuestionnaireAPI.isFieldVisible(field, responses);
}

/**
 * Get visible fields based on current responses.
 */
export function useVisibleFields(
  fields: QuestionnaireField[],
  responses: Record<string, unknown>
): QuestionnaireField[] {
  return QuestionnaireAPI.getVisibleFields(fields, responses);
}

/**
 * Group fields by section.
 */
export function useGroupedFields(
  fields: QuestionnaireField[]
): Record<string, QuestionnaireField[]> {
  return QuestionnaireAPI.groupFieldsBySection(fields);
}

/**
 * Validate questionnaire data client-side.
 */
export function useValidateQuestionnaireData(
  data: QuestionnaireStepData,
  fields: QuestionnaireField[]
): { isValid: boolean; errors: Record<string, string[]> } {
  return QuestionnaireAPI.validateData(data, fields);
}

/**
 * Prefetch questionnaire data.
 */
export function usePrefetchQuestionnaire() {
  const queryClient = useQueryClient();

  return (questionnaireId: number) => {
    queryClient.prefetchQuery({
      queryKey: questionnaireKeys.questionnaire(questionnaireId),
      queryFn: () => QuestionnaireAPI.getQuestionnaire(questionnaireId),
      staleTime: 10 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: questionnaireKeys.fields(questionnaireId),
      queryFn: () => QuestionnaireAPI.getQuestionnaireFields(questionnaireId),
      staleTime: 10 * 60 * 1000,
    });
  };
}

/**
 * Invalidate questionnaire queries.
 */
export function useInvalidateQuestionnaires() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: questionnaireKeys.all });
  };
}
