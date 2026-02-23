// frontend/admin-crm/src/hooks/useCommunications.ts

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  communicationsApi,
  type ManualSendData,
  type ManualPreviewData,
  type CommunicationTemplateQueryParams,
} from '../apis/communications.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  CommunicationFilters,
  CreateTemplateData,
  UpdateTemplateData,
  BulkSendData,
  PreviewData,
} from '../types/communications.types';

export const useCommunications = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Templates
  const useTemplates = (params?: CommunicationTemplateQueryParams) => {
    const {
      data: paginatedData,
      isLoading,
      error,
      refetch,
    } = useQuery({
      queryKey: ['communication-templates', params],
      queryFn: () => communicationsApi.getTemplates(params),
      placeholderData: keepPreviousData,
    });

    const items = paginatedData?.results || [];
    const totalCount = paginatedData?.count || 0;
    const pageCount = paginatedData?.page_count || 1;

    return { data: items, totalCount, pageCount, isLoading, error, refetch };
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
        queryClient.invalidateQueries({
          queryKey: ['communication-templates'],
        });
        showSuccess('Template Created', 'Communication template created successfully');
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
              ) || 'Failed to create template'
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
        queryClient.invalidateQueries({
          queryKey: ['communication-templates'],
        });
        queryClient.invalidateQueries({
          queryKey: ['communication-template', data.id],
        });
        showSuccess('Template Updated', 'Communication template updated successfully');
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
              ) || 'Failed to update template'
            : 'Failed to update template';
        showError('Update Failed', message);
      },
    });
  };

  const useDeleteTemplate = () => {
    return useMutation({
      mutationFn: (id: number) => communicationsApi.deleteTemplate(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['communication-templates'],
        });
        showSuccess('Template Deleted', 'Communication template deleted successfully');
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
              ) || 'Failed to delete template'
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
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
              ) || 'Failed to preview template'
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
        showSuccess('Bulk Send Complete', `Successfully sent ${result.sent_count} communications`);
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
              ) || 'Failed to send bulk communications'
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

  // Mark all as read
  const useMarkAllAsRead = () => {
    return useMutation({
      mutationFn: (filters?: { client_id?: number; channel?: string; category?: string }) =>
        communicationsApi.markAllAsRead(filters),
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
        showSuccess('Marked as Read', `${result.updated_count} messages marked as read`);
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response?.data?.error,
              ) || 'Failed to mark messages as read'
            : 'Failed to mark messages as read';
        showError('Operation Failed', message);
      },
    });
  };

  // Template history
  const useTemplateHistory = (templateId: number) => {
    return useQuery({
      queryKey: ['communication-template-history', templateId],
      queryFn: () => communicationsApi.getTemplateHistory(templateId),
      enabled: !!templateId,
    });
  };

  // Rollback template
  const useRollbackTemplate = () => {
    return useMutation({
      mutationFn: ({ templateId, version }: { templateId: number; version: number }) =>
        communicationsApi.rollbackTemplate(templateId, version),
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: ['communication-templates'],
        });
        queryClient.invalidateQueries({
          queryKey: ['communication-template', data.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['communication-template-history', data.id],
        });
        showSuccess(
          'Template Rolled Back',
          'Template has been rolled back to the selected version',
        );
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response?.data?.error,
              ) || 'Failed to rollback template'
            : 'Failed to rollback template';
        showError('Rollback Failed', message);
      },
    });
  };

  // Duplicate template
  const useDuplicateTemplate = () => {
    return useMutation({
      mutationFn: ({ templateId, newName }: { templateId: number; newName?: string }) =>
        communicationsApi.duplicateTemplate(templateId, newName),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['communication-templates'],
        });
        showSuccess('Template Duplicated', 'Template has been duplicated successfully');
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response?.data?.error,
              ) || 'Failed to duplicate template'
            : 'Failed to duplicate template';
        showError('Duplication Failed', message);
      },
    });
  };

  // Send test communication
  const useSendTest = () => {
    return useMutation({
      mutationFn: ({
        templateId,
        data,
      }: {
        templateId: number;
        data: { recipient: string; client_id?: number; event_id?: number };
      }) => communicationsApi.sendTest(templateId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
        showSuccess('Test Sent', 'Test communication sent successfully. Check your inbox.');
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response?.data?.error,
              ) || 'Failed to send test communication'
            : 'Failed to send test communication';
        showError('Test Send Failed', message);
      },
    });
  };

  // Template usage statistics
  const useTemplateStats = (templateId: number, days: number = 30) => {
    return useQuery({
      queryKey: ['communication-template-stats', templateId, days],
      queryFn: () => communicationsApi.getTemplateStats(templateId, days),
      enabled: !!templateId,
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
    useTemplateHistory,
    useRollbackTemplate,
    useDuplicateTemplate,
    useTemplateStats,
    useSendTest,
    // Records
    useRecords,
    useRecord,
    useSendManual,
    useSendBulk,
    useAnalytics,
    useMarkAllAsRead,
  };
};
