// frontend/admin-crm/src/hooks/useUpdateHeadcount.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../apis/events.api';
import { useToastActions } from '../contexts/ToastContext';

interface UpdateHeadcountData {
  eventId: number;
  data: {
    num_participants: number;
    notes?: string;
    create_quote_revision?: boolean;
    create_supplementary_invoice?: boolean;
  };
}

export const useUpdateHeadcount = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ eventId, data }: UpdateHeadcountData) =>
      eventsApi.updateHeadcount(eventId, data),
    onSuccess: (result, { eventId }) => {
      // Invalidate event details, quotes, and invoices
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess(
        'Headcount Updated',
        `Headcount changed from ${result.old_count} to ${result.new_count}.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update headcount'
          : 'Failed to update headcount';
      showError('Update Failed', message);
    },
  });
};
