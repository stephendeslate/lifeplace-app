// frontend/admin-crm/src/hooks/useEventQuestionnaires.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '../apis/questionnaires.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  CreateEventQuestionnaireData,
  UpdateEventQuestionnaireData,
} from '../types/questionnaires.types';

// Get all EventQuestionnaires for an event
export const useEventQuestionnairesForEvent = (eventId: number) => {
  return useQuery({
    queryKey: ['eventQuestionnaires', 'forEvent', eventId],
    queryFn: () => questionnairesApi.getEventQuestionnairesForEvent(eventId),
    enabled: !!eventId,
  });
};

// Get a single EventQuestionnaire by ID
export const useEventQuestionnaire = (id: number) => {
  return useQuery({
    queryKey: ['eventQuestionnaire', id],
    queryFn: () => questionnairesApi.getEventQuestionnaire(id),
    enabled: !!id,
  });
};

// Get all EventQuestionnaires (for admin list views)
export const useEventQuestionnaires = () => {
  return useQuery({
    queryKey: ['eventQuestionnaires'],
    queryFn: () => questionnairesApi.getEventQuestionnaires(),
  });
};

// Create (assign) a questionnaire to an event
export const useCreateEventQuestionnaire = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateEventQuestionnaireData) =>
      questionnairesApi.createEventQuestionnaire(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuestionnaires'] });
      queryClient.invalidateQueries({
        queryKey: ['eventQuestionnaires', 'forEvent', variables.event],
      });
      showSuccess('Questionnaire Assigned', 'Questionnaire has been assigned to the event.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to assign questionnaire'
          : 'Failed to assign questionnaire';
      showError('Assignment Failed', message);
    },
  });
};

// Update an EventQuestionnaire
export const useUpdateEventQuestionnaire = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventQuestionnaireData }) =>
      questionnairesApi.updateEventQuestionnaire(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuestionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuestionnaire', id] });
      showSuccess('Questionnaire Updated', 'Questionnaire assignment has been updated.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update questionnaire'
          : 'Failed to update questionnaire';
      showError('Update Failed', message);
    },
  });
};

// Delete (unassign) a questionnaire from an event
export const useDeleteEventQuestionnaire = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => questionnairesApi.deleteEventQuestionnaire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuestionnaires'] });
      showSuccess('Questionnaire Removed', 'Questionnaire has been removed from the event.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to remove questionnaire'
          : 'Failed to remove questionnaire';
      showError('Removal Failed', message);
    },
  });
};

// Send a questionnaire to the client
export const useSendEventQuestionnaire = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => questionnairesApi.sendEventQuestionnaire(id),
    onSuccess: (updatedQuestionnaire) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuestionnaires'] });
      queryClient.invalidateQueries({
        queryKey: ['eventQuestionnaire', updatedQuestionnaire.id],
      });
      queryClient.setQueryData(
        ['eventQuestionnaire', updatedQuestionnaire.id],
        updatedQuestionnaire,
      );
      showSuccess('Questionnaire Sent', 'Questionnaire has been sent to the client.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send questionnaire'
          : 'Failed to send questionnaire';
      showError('Send Failed', message);
    },
  });
};

// Send a reminder for an incomplete questionnaire
export const useSendQuestionnaireReminder = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => questionnairesApi.sendEventQuestionnaireReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuestionnaires'] });
      showSuccess('Reminder Sent', 'Reminder has been sent to the client.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send reminder'
          : 'Failed to send reminder';
      showError('Reminder Failed', message);
    },
  });
};

// Get responses for a specific EventQuestionnaire
export const useEventQuestionnaireResponses = (id: number) => {
  return useQuery({
    queryKey: ['eventQuestionnaireResponses', id],
    queryFn: () => questionnairesApi.getEventQuestionnaireResponses(id),
    enabled: !!id,
  });
};
