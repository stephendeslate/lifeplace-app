// frontend/client-portal/src/hooks/useEventQuestionnaires.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { questionnairesApi } from '../apis/questionnaires.api';
import { ErrorHandler } from '../utils/errorHandler';
import type { QuestionnaireFilters, SaveEventResponsesData } from '../types/questionnaires.types';

export const useEventQuestionnaires = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Active Questionnaires Query (all active questionnaires)
  const useActiveQuestionnaires = (filters?: QuestionnaireFilters) => {
    return useQuery({
      queryKey: ['active-questionnaires', filters],
      queryFn: () => questionnairesApi.getActiveQuestionnaires(),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Questionnaires for a specific event (filtered by booking flow)
  const useQuestionnairesForEvent = (eventId: number) => {
    return useQuery({
      queryKey: ['event-questionnaires', eventId],
      queryFn: () => questionnairesApi.getQuestionnairesForEvent(eventId),
      enabled: !!eventId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // EventQuestionnaires assigned to an event (for admin-assigned questionnaires)
  const useEventQuestionnairesForEvent = (eventId: number) => {
    return useQuery({
      queryKey: ['assigned-questionnaires', eventId],
      queryFn: () => questionnairesApi.getEventQuestionnairesForEvent(eventId),
      enabled: !!eventId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get a single EventQuestionnaire
  const useEventQuestionnaire = (id: number) => {
    return useQuery({
      queryKey: ['event-questionnaire', id],
      queryFn: () => questionnairesApi.getEventQuestionnaire(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Event Responses Query
  const useEventResponses = (eventId: number) => {
    return useQuery({
      queryKey: ['event-responses', eventId],
      queryFn: () => questionnairesApi.getEventResponses(eventId),
      enabled: !!eventId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Save Event Responses Mutation
  const useSaveEventResponses = () => {
    return useMutation({
      mutationFn: (data: SaveEventResponsesData) => questionnairesApi.saveEventResponses(data),
      onSuccess: (_, variables) => {
        showSuccess(
          'Responses Saved',
          'Your questionnaire responses have been saved successfully.',
        );

        // Invalidate event responses to show updated data
        queryClient.invalidateQueries({
          queryKey: ['event-responses', variables.event_id],
        });
      },
      onError: (error: unknown) => {
        const message = ErrorHandler.extractMessage(error);
        showError('Save Failed', message);
      },
    });
  };

  return {
    // Questionnaire operations
    useActiveQuestionnaires,
    useQuestionnairesForEvent,

    // EventQuestionnaire operations (admin-assigned questionnaires)
    useEventQuestionnairesForEvent,
    useEventQuestionnaire,

    // Response operations
    useEventResponses,
    useSaveEventResponses,
  };
};

export default useEventQuestionnaires;
