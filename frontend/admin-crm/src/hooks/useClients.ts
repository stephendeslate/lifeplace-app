// frontend/admin-crm/src/hooks/useClients.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../apis/clients.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  UpdateClientData,
  ClientFilters,
  AcceptInvitationData
} from '../types/clients.types';

export const useClients = (filters?: ClientFilters) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: clients = [], // Ensure default empty array
    isLoading: isLoadingClients,
    error: clientsError,
    refetch: refetchClients
  } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientsApi.getClients(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useClient = (id: number) => {
    return useQuery({
      queryKey: ['client', id],
      queryFn: () => clientsApi.getClient(id),
      enabled: !!id,
    });
  };

  const useClientEvents = (id: number) => {
    return useQuery({
      queryKey: ['client-events', id],
      queryFn: () => clientsApi.getClientEvents(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: clientsApi.createClient,
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Client Created', `${newClient.first_name} ${newClient.last_name} has been added successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create client';
      showError('Create Failed', message);
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClientData }) => 
      clientsApi.updateClient(id, data),
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', updatedClient.id] });
      showSuccess('Client Updated', `${updatedClient.first_name} ${updatedClient.last_name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update client';
      showError('Update Failed', message);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: clientsApi.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Client Deactivated', 'Client has been deactivated successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to deactivate client';
      showError('Deactivation Failed', message);
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: clientsApi.sendInvitation,
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Invitation Sent', `Invitation has been sent to ${invitation.client_name}.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send invitation';
      showError('Invitation Failed', message);
    },
  });

  const importClientsMutation = useMutation({
    mutationFn: clientsApi.importClients,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Import Complete', `Successfully imported ${result.success} clients.`);
      if (result.errors.length > 0) {
        showError('Import Errors', `${result.errors.length} clients failed to import.`);
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to import clients';
      showError('Import Failed', message);
    },
  });

  return {
    // Data
    clients,
    
    // Loading states
    isLoadingClients,
    isCreatingClient: createClientMutation.isPending,
    isUpdatingClient: updateClientMutation.isPending,
    isDeletingClient: deleteClientMutation.isPending,
    isSendingInvitation: sendInvitationMutation.isPending,
    isImportingClients: importClientsMutation.isPending,
    
    // Error states
    clientsError,
    createError: createClientMutation.error,
    updateError: updateClientMutation.error,
    deleteError: deleteClientMutation.error,
    sendInvitationError: sendInvitationMutation.error,
    importError: importClientsMutation.error,
    
    // Actions
    createClient: createClientMutation.mutate,
    updateClient: updateClientMutation.mutate,
    deleteClient: deleteClientMutation.mutate,
    sendInvitation: sendInvitationMutation.mutate,
    importClients: importClientsMutation.mutate,
    refetchClients,
    
    // Hooks for individual resources
    useClient,
    useClientEvents,
  };
};

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
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to accept invitation';
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