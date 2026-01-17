// frontend/client-portal/src/contexts/ContractsContext.tsx
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { contractsApi } from '../apis/contracts.api';
import { useGlobalSignatureEvents } from '../hooks/contracts/useContractStatusUpdates';
import { useAuth } from './AuthContext';
import type { Contract, SignatureSubmission, PendingContractsResponse, SignatureRole } from '../types/contracts.types';

interface ContractsContextValue {
  // Data
  contracts: Contract[];
  pendingContracts: Contract[];
  signedContracts: Contract[];
  expiredContracts: Contract[];
  pendingSignatures: PendingContractsResponse | undefined;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Actions
  refreshContracts: () => Promise<void>;
  signContract: (contractId: string, signatureData: SignatureSubmission) => Promise<Contract>;
  
  // Contract operations
  getContract: (contractId: string) => Promise<Contract>;
  downloadContract: (contractId: string) => Promise<Blob>;
  
  // Real-time updates
  simulateSignatureEvent: (contractId: string, eventType: 'signature_added' | 'contract_completed') => void;
}

const ContractsContext = createContext<ContractsContextValue | null>(null);

export const useContracts = () => {
  const context = useContext(ContractsContext);
  if (!context) {
    throw new Error('useContracts must be used within a ContractsProvider');
  }
  return context;
};

interface ContractsProviderProps {
  children: React.ReactNode;
}

export const ContractsProvider: React.FC<ContractsProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  
  // Initialize global signature events only when authenticated
  const { simulateSignatureEvent } = useGlobalSignatureEvents();

  // Only run queries when user is authenticated
  const isAuthenticated = !!user && !authLoading;

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) console.log('ContractsProvider auth state:', { user: !!user, authLoading, isAuthenticated });
  }, [user, authLoading, isAuthenticated]);

  // Query for all contracts
  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.getContracts,
    enabled: isAuthenticated,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: isAuthenticated ? 60000 : false, // Only refetch when authenticated
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (authentication issues)
      if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { status?: number };
        if (response.status === 401) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });

  // Query for pending signatures
  const pendingQuery = useQuery({
    queryKey: ['contracts', 'pending'],
    queryFn: contractsApi.getPendingSignatures,
    enabled: isAuthenticated,
    staleTime: 15000, // More frequent updates for pending signatures
    refetchInterval: isAuthenticated ? 30000 : false, // Only refetch when authenticated
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (authentication issues)
      if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { status?: number };
        if (response.status === 401) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });

  // Mutation for signing contracts
  const signContractMutation = useMutation({
    mutationFn: ({ contractId, signatureData }: { contractId: string; signatureData: SignatureSubmission }) =>
      contractsApi.signContract(contractId, signatureData),
    onSuccess: (signedContract, { contractId }) => {
      // Update the specific contract in cache
      queryClient.setQueryData(['contracts', contractId], signedContract);

      // Update the contracts list
      queryClient.setQueryData(['contracts'], (oldData: Contract[] | undefined) => {
        if (!oldData) return [signedContract];
        return oldData.map(contract =>
          contract.id === contractId ? signedContract : contract
        );
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contracts', 'pending'] });

      // Contract signing (when fully signed) triggers backend workflow automation
      // that may create tasks, send notifications, progress workflow stages
      // Invalidate events to reflect any workflow-triggered changes
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Trigger signature event
      simulateSignatureEvent(contractId, 'signature_added');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to sign contract:', error);
    },
  });

  // Derived data
  const contracts = contractsQuery.data || [];
  const pendingContracts = contracts.filter(contract =>
    ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status)
  );
  const signedContracts = contracts.filter(contract =>
    contract.status === 'SIGNED'
  );
  const expiredContracts = contracts.filter(contract =>
    contract.status === 'EXPIRED' || contract.is_expired === true
  );

  // Actions
  const refreshContracts = useCallback(async () => {
    await Promise.all([
      contractsQuery.refetch(),
      pendingQuery.refetch(),
    ]);
  }, [contractsQuery, pendingQuery]);

  const signContract = useCallback(async (contractId: string, signatureData: SignatureSubmission) => {
    return signContractMutation.mutateAsync({ contractId, signatureData });
  }, [signContractMutation]);

  const getContract = useCallback(async (contractId: string) => {
    // Try to get from cache first
    const cachedContract = queryClient.getQueryData<Contract>(['contracts', contractId]);
    if (cachedContract) {
      return cachedContract;
    }
    
    // Otherwise fetch from API
    return contractsApi.getContract(contractId);
  }, [queryClient]);

  const downloadContract = useCallback(async (contractId: string) => {
    return contractsApi.downloadContractPdf(contractId);
  }, []);

  // Background data sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh data when tab becomes visible
        refreshContracts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshContracts]);

  // Periodic health check
  useEffect(() => {
    const healthCheck = setInterval(() => {
      // Check if we have stale data and refresh if needed
      const lastUpdate = contractsQuery.dataUpdatedAt;
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      if (lastUpdate && now - lastUpdate > staleThreshold) {
        if (import.meta.env.DEV) console.log('Data is stale, refreshing...');
        refreshContracts();
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(healthCheck);
    };
  }, [contractsQuery.dataUpdatedAt, refreshContracts]);

  const contextValue: ContractsContextValue = {
    // Data
    contracts,
    pendingContracts,
    signedContracts,
    expiredContracts,
    pendingSignatures: pendingQuery.data,
    
    // Loading states
    isLoading: contractsQuery.isLoading || pendingQuery.isLoading,
    isRefreshing: contractsQuery.isFetching || pendingQuery.isFetching || signContractMutation.isPending,
    
    // Actions
    refreshContracts,
    signContract,
    getContract,
    downloadContract,
    simulateSignatureEvent,
  };

  return (
    <ContractsContext.Provider value={contextValue}>
      {children}
    </ContractsContext.Provider>
  );
};

// Hook for contract-specific operations
export const useContract = (contractId: string) => {
  const { getContract } = useContracts();
  const queryClient = useQueryClient();

  const contractQuery = useQuery({
    queryKey: ['contracts', contractId],
    queryFn: () => getContract(contractId),
    enabled: !!contractId,
    staleTime: 30000,
  });

  const updateContract = useCallback((updater: (contract: Contract) => Contract) => {
    queryClient.setQueryData(['contracts', contractId], (oldData: Contract | undefined) => {
      return oldData ? updater(oldData) : undefined;
    });
  }, [contractId, queryClient]);

  return {
    contract: contractQuery.data,
    isLoading: contractQuery.isLoading,
    error: contractQuery.error,
    refetch: contractQuery.refetch,
    updateContract,
  };
};

// Hook for optimistic UI updates
export const useOptimisticContractUpdates = () => {
  const queryClient = useQueryClient();

  const optimisticallySignContract = useCallback((contractId: string, role: string) => {
    // Optimistically update the contract
    queryClient.setQueryData(['contracts', contractId], (oldData: Contract | undefined) => {
      if (!oldData) return oldData;

      const newSignature = {
        id: `temp-${Date.now()}`,
        contract: contractId,
        signer: { id: 'current-user', email: '', first_name: '', last_name: '' },
        role: role as SignatureRole,
        role_display: role,
        signature_data: '',
        signed_at: new Date().toISOString(),
        signer_name: '',
        signer_title: '',
        signer_email: '',
        is_verified: false,
        verification_method: 'electronic_signature',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newContract = {
        ...oldData,
        signatures: [...oldData.signatures, newSignature],
        status: oldData.signatures.length + 1 >= (oldData.template.signature_requirements?.length || 1) 
          ? 'SIGNED' as const 
          : 'PARTIALLY_SIGNED' as const,
      };

      return newContract;
    });

    // Also update the contracts list
    queryClient.setQueryData(['contracts'], (oldData: Contract[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(contract => {
        if (contract.id === contractId) {
          const updatedContract = queryClient.getQueryData<Contract>(['contracts', contractId]);
          return updatedContract || contract;
        }
        return contract;
      });
    });
  }, [queryClient]);

  const revertOptimisticUpdate = useCallback((contractId: string) => {
    queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  }, [queryClient]);

  return {
    optimisticallySignContract,
    revertOptimisticUpdate,
  };
};