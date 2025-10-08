// frontend/client-portal/src/hooks/useCommunications.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { communicationsApi } from '../apis/communications.api';
import { ErrorHandler } from '../utils/errorHandler';
import type {
  CommunicationFilters,
  SendCommunicationData,
  PreviewCommunicationData,
} from '../types/communications.types';

export const useCommunications = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Templates Query
  const useTemplates = (filters?: { category?: string; channel?: string }) => {
    return useQuery({
      queryKey: ['communication-templates', filters],
      queryFn: () => communicationsApi.getTemplates(filters),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Single Template Query
  const useTemplate = (id: number) => {
    return useQuery({
      queryKey: ['communication-template', id],
      queryFn: () => communicationsApi.getTemplate(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Communication Records Query
  const useRecords = (filters?: CommunicationFilters) => {
    return useQuery({
      queryKey: ['communication-records', filters],
      queryFn: () => communicationsApi.getRecords(filters),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Single Record Query
  const useRecord = (id: string) => {
    return useQuery({
      queryKey: ['communication-record', id],
      queryFn: () => communicationsApi.getRecord(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Preview Template Mutation
  const usePreviewTemplate = () => {
    return useMutation({
      mutationFn: (data: PreviewCommunicationData) => 
        communicationsApi.previewTemplate(data),
      onError: (error: unknown) => {
        const message = ErrorHandler.extractMessage(error);
        showError('Preview Failed', message);
      },
    });
  };

  // Send Manual Communication Mutation
  const useSendManual = () => {
    return useMutation({
      mutationFn: (data: SendCommunicationData) => 
        communicationsApi.sendManual(data),
      onSuccess: (data) => {
        showSuccess(
          'Message Sent',
          `Your ${data.channel.toLowerCase()} has been sent successfully.`
        );
        
        // Invalidate records to show new communication
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
      },
      onError: (error: unknown) => {
        const message = ErrorHandler.extractMessage(error);
        showError('Send Failed', message);
      },
    });
  };

  // Analytics Query
  const useAnalytics = (templateName?: string, days: number = 30) => {
    return useQuery({
      queryKey: ['communication-analytics', templateName, days],
      queryFn: () => communicationsApi.getAnalytics(templateName, days),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Variable Schemas Query
  const useVariableSchemas = () => {
    return useQuery({
      queryKey: ['communication-variable-schemas'],
      queryFn: () => communicationsApi.getVariableSchemas(),
      staleTime: 30 * 60 * 1000, // 30 minutes - rarely changes
    });
  };

  // Mark as read mutation
  const useMarkAsRead = () => {
    return useMutation({
      mutationFn: (recordId: string) => communicationsApi.markAsRead(recordId),
      onSuccess: (data, recordId) => {
        // Update the specific record in cache
        queryClient.setQueryData(['communication-records'], (oldData: unknown) => {
          if (!oldData) return oldData;

          return (oldData as Array<Record<string, unknown>>).map((record: Record<string, unknown>) => 
            record.id === recordId 
              ? { 
                  ...record, 
                  is_opened: true, 
                  opened_at: data.opened_at || new Date().toISOString() 
                }
              : record
          );
        });

        // Also update single record queries
        queryClient.setQueryData(['communication-record', recordId], (oldData: unknown) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            is_opened: true,
            opened_at: data.opened_at || new Date().toISOString()
          };
        });

        // Invalidate to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
      },
      onError: (error: unknown) => {
        const message = ErrorHandler.extractMessage(error);
        showError('Update Failed', message);
      },
    });
  };

  // Mark as unread mutation
  const useMarkAsUnread = () => {
    return useMutation({
      mutationFn: (recordId: string) => communicationsApi.markAsUnread(recordId),
      // @ts-expect-error - queryClient callback parameters not properly typed
      onSuccess: (data, recordId) => {
        // Update the specific record in cache
        queryClient.setQueryData(['communication-records'], (oldData: unknown) => {
          if (!oldData) return oldData;

          return (oldData as Array<Record<string, unknown>>).map((record: Record<string, unknown>) => 
            record.id === recordId 
              ? { 
                  ...record, 
                  is_opened: false, 
                  opened_at: null 
                }
              : record
          );
        });

        // Also update single record queries
        queryClient.setQueryData(['communication-record', recordId], (oldData: unknown) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            is_opened: false,
            opened_at: null
          };
        });

        // Invalidate to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['communication-records'] });
      },
      onError: (error: unknown) => {
        const message = ErrorHandler.extractMessage(error);
        showError('Update Failed', message);
      },
    });
  };

  return {
    // Template operations
    useTemplates,
    useTemplate,
    
    // Record operations
    useRecords,
    useRecord,
    
    // Preview and send operations
    usePreviewTemplate,
    useSendManual,
    
    // Analytics
    useAnalytics,
    useVariableSchemas,

    // Read status operations
    useMarkAsRead,
    useMarkAsUnread,
  };
};

export default useCommunications;