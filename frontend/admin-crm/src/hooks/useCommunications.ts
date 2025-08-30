// frontend/admin-crm/src/hooks/useCommunications.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communicationsApi, type ManualSendData, type ManualPreviewData } from '../apis/communications.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  CommunicationFilters,
  CreateTemplateData,
  UpdateTemplateData,
  BulkSendData,
  PreviewData
} from '../types/communications.types';

export const useCommunications = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Templates
  const useTemplates = (filters?: CommunicationFilters) => {
    return useQuery({
      queryKey: ['communication-templates', filters],
      queryFn: () => communicationsApi.getTemplates(filters),
    });
  };

  const useTemplate = (id: number) => {
    return useQuery({
      queryKey: ['communication-template', id],
      queryFn: () => communicationsApi.getTemplate(id),
      enabled: !!id,
    });
  };

  const useCreateTemplate = () => {
    return useMutation({
      mutationFn: (data: CreateTemplateData) => communicationsApi.createTemplate(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
        showSuccess('Template Created', 'Communication template created successfully');
      },
      onError: (error: unknown) => {
        const message = (error && typeof error === 'object' && 'response' in error)
          ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create template'
          : 'Failed to create template';
        showError('Creation Failed', message);
      },
    });
  };

  const useUpdateTemplate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateTemplateData }) =>
        communicationsApi.updateTemplate(id, data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
        queryClient.invalidateQueries({ queryKey: ['communication-template', data.id] });
        showSuccess('Template Updated', 'Communication template updated successfully');
      },
      onError: (error: unknown) => {
        const message = (error && typeof error === 'object' && 'response' in error)
          ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update template'
          : 'Failed to update template';
        showError('Update Failed', message);
      },
    });
  };

  const useDeleteTemplate = () => {
    return useMutation({
      mutationFn: (id: number) => communicationsApi.deleteTemplate(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
        showSuccess('Template Deleted', 'Communication template deleted successfully');
      },
      onError: (error: unknown) => {
        const message = (error && typeof error === 'object' && 'response' in error)
          ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete template'
          : 'Failed to delete template';
        showError('Deletion Failed', message);
      },
    });
  };

  const usePreviewTemplate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: PreviewData | ManualPreviewData }) =>
        communicationsApi.previewTemplate(id, data),
      onError: (error: unknown) => {
        const message = (error && typeof error === 'object' && 'response' in error)
          ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to preview template'
          : 'Failed to preview template';
        showError('Preview Failed', message);
      },
    });
  };

  const useVariableSchemas = () => {
    return useQuery({
      queryKey: ['communication-variable-schemas'],
      queryFn: () => communicationsApi.getVariableSchemas(),
    });
  };

  // Records
  const useRecords = (filters?: CommunicationFilters) => {
    return useQuery({
      queryKey: ['communication-records', filters],
      queryFn: () => communicationsApi.getRecords(filters),
    });
  };

  const useRecord = (id: string) => {
    return useQuery({
      queryKey: ['communication-record', id],
      queryFn: () => communicationsApi.getRecord(id),
      enabled: !!id,
    });
  };

  const useSendManual = () => {
    return useMutation({
      mutationFn: (data: ManualSendData) => communicationsApi.sendManual(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
        showSuccess('Message Sent', 'Your message has been sent successfully');
      },
      onError: (error: unknown) => {
        let message = 'Failed to send message';
        if (error && typeof error === 'object' && 'response' in error) {
          const response = (error as { response?: { data?: Record<string, unknown> } }).response;
          if (response?.data) {
            const errorData = response.data;
            if (errorData.detail) {
              message = String(errorData.detail);
            } else if (errorData.custom_subject && Array.isArray(errorData.custom_subject)) {
              message = String(errorData.custom_subject[0]);
            } else if (errorData.custom_body && Array.isArray(errorData.custom_body)) {
              message = String(errorData.custom_body[0]);
            }
          }
        }
        showError('Send Failed', message);
      },
    });
  };

  const useSendBulk = () => {
    return useMutation({
      mutationFn: (data: BulkSendData) => communicationsApi.sendBulk(data),
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
        showSuccess(
          'Bulk Send Complete',
          `Successfully sent ${result.sent_count} communications`
        );
      },
      onError: (error: unknown) => {
        const message = (error && typeof error === 'object' && 'response' in error)
          ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to send bulk communications'
          : 'Failed to send bulk communications';
        showError('Bulk Send Failed', message);
      },
    });
  };

  const useAnalytics = (templateName?: string, days: number = 30) => {
    return useQuery({
      queryKey: ['communication-analytics', templateName, days],
      queryFn: () => communicationsApi.getAnalytics(templateName, days),
    });
  };

  return {
    // Templates
    useTemplates,
    useTemplate,
    useCreateTemplate,
    useUpdateTemplate,
    useDeleteTemplate,
    usePreviewTemplate,
    useVariableSchemas,
    // Records
    useRecords,
    useRecord,
    useSendManual,
    useSendBulk,
    useAnalytics,
  };
};