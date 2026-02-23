// frontend/admin-crm/src/hooks/useClients.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../apis/clients.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  UpdateClientData,
  ClientFilters,
  AcceptInvitationData,
  CreateClientData,
} from '../types/clients.types';
import type { PaginationParams } from '../types/common.types';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
}

export const useClients = (filters?: ClientFilters & PaginationParams) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries with pagination
  const {
    data: clientsData,
    isLoading: isLoadingClients,
    error: clientsError,
    refetch: refetchClients,
  } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientsApi.getClients(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useClient = (id: number) => {
    return useQuery({
      queryKey: ['client', id],
      queryFn: () => clientsApi.getClient(id),
      enabled: !!id,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 404 errors
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as { response?: { status?: number } };
          if (apiError.response?.status === 404) {
            return false;
          }
        }
        return failureCount < 3;
      },
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
    mutationFn: (data: CreateClientData) => clientsApi.createClient(data),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess(
        'Client Created',
        `${newClient.first_name} ${newClient.last_name} has been added successfully.`,
      );
    },
    onError: (error: ApiError) => {
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
      showSuccess(
        'Client Updated',
        `${updatedClient.first_name} ${updatedClient.last_name} has been updated successfully.`,
      );
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update client';
      showError('Update Failed', message);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => clientsApi.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Client Deleted', 'Client has been deleted successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to delete client';
      showError('Delete Failed', message);
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: (clientId: number) => clientsApi.sendInvitation(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Invitation Sent', 'Invitation has been sent to the client.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to send invitation';
      showError('Send Failed', message);
    },
  });

  const importClientsMutation = useMutation({
    mutationFn: (file: File) => clientsApi.importClients(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess('Import Complete', `Successfully imported ${result.success} clients.`);
      if (result.errors.length > 0) {
        showError('Import Errors', result.errors.join(', '));
      }
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to import clients';
      showError('Import Failed', message);
    },
  });

  return {
    // Paginated data
    clients: clientsData?.results || [],
    totalClients: clientsData?.count || 0,
    currentPage: clientsData?.current_page || 1,
    pageCount: clientsData?.page_count || 1,
    pageSize: clientsData?.page_size || 25,
    hasNext: !!clientsData?.next,
    hasPrevious: !!clientsData?.previous,

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
    onError: (error: ApiError) => {
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
