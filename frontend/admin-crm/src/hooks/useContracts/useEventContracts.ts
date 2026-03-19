import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '../../apis/contracts.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateEventContractData,
  UpdateEventContractData,
  EventContractFilters,
} from '../../types/contracts.types';

// Event Contracts
export const useEventContracts = (
  filters?: EventContractFilters,
  options?: { refetchInterval?: number },
) => {
  return useQuery({
    queryKey: ['eventContracts', filters],
    queryFn: () => contractsApi.getEventContracts(filters),
    refetchInterval: options?.refetchInterval,
  });
};

export const useEventContract = (id: number) => {
  return useQuery({
    queryKey: ['eventContract', id],
    queryFn: () => contractsApi.getEventContract(id),
    enabled: !!id,
  });
};

export const useContractsForEvent = (eventId: number) => {
  return useQuery({
    queryKey: ['eventContracts', 'forEvent', eventId],
    queryFn: () => contractsApi.getContractsForEvent(eventId),
    enabled: !!eventId,
  });
};

export const useCreateEventContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateEventContractData) => contractsApi.createEventContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      showSuccess('Contract Created', 'Event contract has been created successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create event contract'
          : 'Failed to create event contract';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateEventContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventContractData }) =>
      contractsApi.updateEventContract(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      queryClient.invalidateQueries({ queryKey: ['eventContract', id] });
      showSuccess('Contract Updated', 'Event contract has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update event contract'
          : 'Failed to update event contract';
      showError('Update Failed', message);
    },
  });
};

export const useContractsForClient = (clientId: number) => {
  return useQuery({
    queryKey: ['eventContracts', 'forClient', clientId],
    queryFn: () => contractsApi.getContractsForClient(clientId),
    enabled: !!clientId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
};

export const useDeleteEventContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => contractsApi.deleteEventContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      showSuccess('Contract Deleted', 'Event contract has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete event contract'
          : 'Failed to delete event contract';
      showError('Deletion Failed', message);
    },
  });
};
