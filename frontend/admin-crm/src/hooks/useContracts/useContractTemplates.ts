import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { contractsApi, type ContractTemplateQueryParams } from '../../apis/contracts.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateContractTemplateData,
  UpdateContractTemplateData,
} from '../../types/contracts.types';

// Contract Templates
export const useContractTemplates = (params?: ContractTemplateQueryParams) => {
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contractTemplates', params],
    queryFn: () => contractsApi.getContractTemplates(params),
    placeholderData: keepPreviousData,
  });

  const items = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageCount = paginatedData?.page_count || 1;

  return { data: items, isLoading, error, refetch, totalCount, pageCount };
};

export const useContractTemplate = (id: number) => {
  return useQuery({
    queryKey: ['contractTemplate', id],
    queryFn: () => contractsApi.getContractTemplate(id),
    enabled: !!id,
  });
};

export const useCreateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateContractTemplateData) => contractsApi.createContractTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      showSuccess('Template Created', 'Contract template has been created successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create contract template'
          : 'Failed to create contract template';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContractTemplateData }) =>
      contractsApi.updateContractTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['contractTemplate', id] });
      showSuccess('Template Updated', 'Contract template has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update contract template'
          : 'Failed to update contract template';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteContractTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => contractsApi.deleteContractTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      showSuccess('Template Deleted', 'Contract template has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete contract template'
          : 'Failed to delete contract template';
      showError('Deletion Failed', message);
    },
  });
};
