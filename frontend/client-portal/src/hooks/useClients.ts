// frontend/client-portal/src/hooks/useClients.ts

import { useMutation, useQuery } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { ErrorHandler } from '../utils/errorHandler';
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
      const message = ErrorHandler.extractMessage(error);
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
