// frontend/client-portal/src/hooks/useClients.ts

import { useMutation, useQuery } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import type { AcceptInvitationData } from '../types/clients.types';
import { clientsApi } from '../apis/clients.api';

export const useClientInvitations = () => {
  const { showSuccess, showError } = useToastActions();

  const useInvitation = (invitationId: string) => {
    return useQuery({
      queryKey: ['client-invitation', invitationId],
      queryFn: () => clientsApi.getInvitation(invitationId),
      enabled: !!invitationId,
      retry: false,
    });
  };

  const acceptInvitationMutation = useMutation({
    mutationFn: ({ invitationId, data }: { invitationId: string; data: AcceptInvitationData }) =>
      clientsApi.acceptInvitation(invitationId, data),
    onSuccess: () => {
      showSuccess('Account Activated', 'Your account has been activated successfully!');
    },
    onError: (error: unknown) => {
      // Error objects from axios have dynamic structure requiring any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorObj = error as any;
      const message = errorObj.response?.data?.detail || 'Failed to accept invitation';
      showError('Activation Failed', message);
    },
  });

  return {
    useInvitation,
    acceptInvitation: acceptInvitationMutation.mutate,
    isAcceptingInvitation: acceptInvitationMutation.isPending,
    acceptInvitationError: acceptInvitationMutation.error,
  };
};