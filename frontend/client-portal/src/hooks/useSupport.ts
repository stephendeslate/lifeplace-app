// frontend/client-portal/src/hooks/useSupport.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { supportApi } from '../apis/support.api';
import type {
  SupportFilters,
  SupportInquiryCreate,
  SupportReply,
} from '../types/support.types';

export const useSupport = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get support settings
  const useSupportSettings = () => {
    return useQuery({
      queryKey: ['support-settings'],
      queryFn: () => supportApi.getSettings(),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // List support inquiries
  const useSupportInquiries = (filters?: SupportFilters) => {
    return useQuery({
      queryKey: ['support-inquiries', filters],
      queryFn: () => supportApi.getInquiries(filters),
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  // Get single support inquiry detail
  const useSupportInquiry = (id: string) => {
    return useQuery({
      queryKey: ['support-inquiry', id],
      queryFn: () => supportApi.getInquiry(id),
      enabled: !!id,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Create support inquiry mutation
  const useCreateInquiry = () => {
    return useMutation({
      mutationFn: (data: SupportInquiryCreate) => supportApi.createInquiry(data),
      onSuccess: () => {
        showSuccess('Inquiry Submitted', 'Your support inquiry has been submitted successfully.');
        queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to submit inquiry. Please try again.';
        showError('Submission Failed', message);
      },
    });
  };

  // Add reply mutation
  const useAddReply = () => {
    return useMutation({
      mutationFn: ({ inquiryId, data }: { inquiryId: string; data: SupportReply }) =>
        supportApi.addReply(inquiryId, data),
      onSuccess: (_, variables) => {
        showSuccess('Reply Sent', 'Your reply has been sent successfully.');
        queryClient.invalidateQueries({ queryKey: ['support-inquiry', variables.inquiryId] });
        queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to send reply. Please try again.';
        showError('Reply Failed', message);
      },
    });
  };

  // Invalidate all support queries
  const invalidateSupportQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
    queryClient.invalidateQueries({ queryKey: ['support-inquiry'] });
  };

  return {
    // Query hooks
    useSupportSettings,
    useSupportInquiries,
    useSupportInquiry,

    // Mutation hooks
    useCreateInquiry,
    useAddReply,

    // Utility functions
    invalidateSupportQueries,
  };
};

export default useSupport;
