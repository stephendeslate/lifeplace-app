/**
 * useEventQuestionnaires Hook
 *
 * React Query hooks for questionnaire management matching client-portal patterns.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  questionnairesApi,
  type Questionnaire,
  type QuestionnaireResponse,
  type SaveEventResponsesData,
} from '@/apis/questionnaires.api';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const questionnaireKeys = {
  all: ['questionnaires'] as const,
  active: () => [...questionnaireKeys.all, 'active'] as const,
  forEvent: (eventId: number) => [...questionnaireKeys.all, 'event', eventId] as const,
  responses: (eventId: number) => [...questionnaireKeys.all, 'responses', eventId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch questionnaires configured for a specific event
 */
export function useQuestionnairesForEvent(eventId: number) {
  return useQuery({
    queryKey: questionnaireKeys.forEvent(eventId),
    queryFn: () => questionnairesApi.getQuestionnairesForEvent(eventId),
    enabled: eventId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch questionnaire responses for a specific event
 */
export function useEventResponses(eventId: number) {
  return useQuery({
    queryKey: questionnaireKeys.responses(eventId),
    queryFn: () => questionnairesApi.getEventResponses(eventId),
    enabled: eventId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch active questionnaires
 */
export function useActiveQuestionnaires() {
  return useQuery({
    queryKey: questionnaireKeys.active(),
    queryFn: () => questionnairesApi.getActiveQuestionnaires(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Save event questionnaire responses
 */
export function useSaveEventResponses() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: SaveEventResponsesData) =>
      questionnairesApi.saveEventResponses(data),
    onSuccess: (result, variables) => {
      showToast('Responses saved successfully', 'success');

      // Invalidate event responses to show updated data
      queryClient.invalidateQueries({
        queryKey: questionnaireKeys.responses(variables.event_id),
      });

      // Also invalidate legacy questionnaires query from useEvents
      queryClient.invalidateQueries({
        queryKey: ['events', 'questionnaires', variables.event_id],
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to save responses. Please try again.';
      showToast(message, 'error');
    },
  });
}

// =============================================================================
// COMBINED HOOK (matching client-portal pattern)
// =============================================================================

/**
 * Factory hook that returns all questionnaire-related hooks
 * This matches the client-portal useEventQuestionnaires() pattern
 */
export function useEventQuestionnairesHooks() {
  return {
    useQuestionnairesForEvent,
    useEventResponses,
    useActiveQuestionnaires,
    useSaveEventResponses,
  };
}

export default useEventQuestionnairesHooks;
