// frontend/admin-crm/src/hooks/useSupport.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { supportApi } from '../apis/support.api';
import type { SupportFilters, SupportInquiryUpdate, SupportReply } from '../types/support.types';

export const useSupport = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get support statistics
  const useSupportStats = () => {
    return useQuery({
      queryKey: ['support-stats'],
      queryFn: () => supportApi.getStats(),
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // List support inquiries
  const useSupportInquiries = (filters?: SupportFilters) => {
    return useQuery({
      queryKey: ['support-inquiries', filters],
      queryFn: () => supportApi.getInquiries(filters),
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Get single support inquiry detail
  const useSupportInquiry = (id: string) => {
    return useQuery({
      queryKey: ['support-inquiry', id],
      queryFn: () => supportApi.getInquiry(id),
      enabled: !!id,
      staleTime: 15 * 1000, // 15 seconds
    });
  };

  // Update support inquiry mutation
  const useUpdateInquiry = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: SupportInquiryUpdate }) =>
        supportApi.updateInquiry(id, data),
      onSuccess: (_, variables) => {
        showSuccess('Inquiry Updated', 'Support inquiry has been updated.');
        queryClient.invalidateQueries({ queryKey: ['support-inquiry', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['support-stats'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message =
          err.response?.data?.detail || err.response?.data?.error || 'Failed to update inquiry.';
        showError('Update Failed', message);
      },
    });
  };

  // Add reply mutation
  const useAddReply = () => {
    return useMutation({
      mutationFn: ({ inquiryId, data }: { inquiryId: string; data: SupportReply }) =>
        supportApi.addReply(inquiryId, data),
      onSuccess: (_, variables) => {
        const messageType = variables.data.is_internal_note ? 'Internal note added' : 'Reply sent';
        showSuccess(messageType, 'Your message has been sent.');
        queryClient.invalidateQueries({ queryKey: ['support-inquiry', variables.inquiryId] });
        queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message =
          err.response?.data?.detail || err.response?.data?.error || 'Failed to send reply.';
        showError('Reply Failed', message);
      },
    });
  };

  // Invalidate all support queries
  const invalidateSupportQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
    queryClient.invalidateQueries({ queryKey: ['support-inquiry'] });
    queryClient.invalidateQueries({ queryKey: ['support-stats'] });
  };

  return {
    // Query hooks
    useSupportStats,
    useSupportInquiries,
    useSupportInquiry,

    // Mutation hooks
    useUpdateInquiry,
    useAddReply,

    // Utility functions
    invalidateSupportQueries,
  };
};

export default useSupport;
