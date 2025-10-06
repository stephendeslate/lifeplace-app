// frontend/client-portal/src/hooks/useEventQuestionnaires.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { questionnairesApi } from '../apis/questionnaires.api';
import type {
  QuestionnaireFilters,
  SaveEventResponsesData,
} from '../types/questionnaires.types';

export const useEventQuestionnaires = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Active Questionnaires Query
  const useActiveQuestionnaires = (filters?: QuestionnaireFilters) => {
    return useQuery({
      queryKey: ['active-questionnaires', filters],
      queryFn: () => questionnairesApi.getActiveQuestionnaires(),
      staleTime: 5 * 60 * 1000, // 5 minutes
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
      mutationFn: (data: SaveEventResponsesData) =>
        questionnairesApi.saveEventResponses(data),
      onSuccess: (_, variables) => {
        showSuccess(
          'Responses Saved',
          'Your questionnaire responses have been saved successfully.'
        );

        // Invalidate event responses to show updated data
        queryClient.invalidateQueries({
          queryKey: ['event-responses', variables.event_id]
        });
      },
      onError: (error: unknown) => {
        // Error objects from axios have dynamic structure requiring any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorObj = error as any;
        const message = errorObj.response?.data?.detail || 'Failed to save responses';
        showError('Save Failed', message);
      },
    });
  };

  return {
    // Questionnaire operations
    useActiveQuestionnaires,

    // Response operations
    useEventResponses,
    useSaveEventResponses,
  };
};

export default useEventQuestionnaires;