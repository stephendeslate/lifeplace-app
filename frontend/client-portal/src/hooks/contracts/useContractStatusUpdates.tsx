// frontend/client-portal/src/hooks/contracts/useContractStatusUpdates.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { contractsApi } from '../../apis/contracts.api';
import type { Contract, DetailedContractStatus, ContractStatus } from '../../types/contracts.types';

interface ContractStatusUpdate {
  contractId: string;
  status: DetailedContractStatus;
  timestamp: string;
}

interface UseContractStatusUpdatesOptions {
  contractId: string;
  enabled?: boolean;
  pollingInterval?: number;
  onStatusChange?: (update: ContractStatusUpdate) => void;
}

export const useContractStatusUpdates = ({
  contractId,
  enabled = true,
  pollingInterval = 5000, // 5 seconds
  onStatusChange,
}: UseContractStatusUpdatesOptions) => {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<DetailedContractStatus | null>(null);

  // Query for contract status with polling
  const {
    data: contractStatus,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contracts', contractId, 'status'],
    queryFn: () => contractsApi.getContractStatus(contractId),
    enabled: enabled && !!contractId,
    refetchInterval: enabled ? pollingInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Detect status changes and trigger callbacks
  useEffect(() => {
    if (!contractStatus || !onStatusChange) return;

    const previousStatus = previousStatusRef.current;
    
    if (previousStatus && previousStatus.status !== contractStatus.status) {
      const update: ContractStatusUpdate = {
        contractId,
        status: {
          ...contractStatus,
          status: contractStatus.status as ContractStatus
        },
        timestamp: new Date().toISOString(),
      };
      
      onStatusChange(update);
      
      // Also invalidate related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }

    previousStatusRef.current = contractStatus;
  }, [contractStatus, contractId, onStatusChange, queryClient]);

  // Manual refresh function
  const refreshStatus = () => {
    return refetch();
  };

  // Connect to real-time updates (placeholder for WebSocket implementation)
  useEffect(() => {
    if (!enabled || !contractId) return;

    // In a real implementation, you would connect to a WebSocket here
    // const ws = new WebSocket(`ws://localhost:8000/ws/contracts/${contractId}/`);
    // 
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.type === 'contract_status_update') {
    //     queryClient.setQueryData(['contracts', contractId, 'status'], data.status);
    //   }
    // };
    //
    // return () => {
    //   ws.close();
    // };

    // For now, we'll just use polling
    console.log(`Real-time updates enabled for contract ${contractId}`);
    
    return () => {
      console.log(`Real-time updates disabled for contract ${contractId}`);
    };
  }, [contractId, enabled, queryClient]);

  return {
    contractStatus,
    isLoading,
    error,
    refreshStatus,
  };
};

// Hook for monitoring multiple contracts
interface UseMultipleContractStatusOptions {
  contractIds: string[];
  enabled?: boolean;
  pollingInterval?: number;
  _onStatusChange?: (updates: ContractStatusUpdate[]) => void;
}

export const useMultipleContractStatus = ({
  contractIds,
  enabled = true,
  pollingInterval = 10000, // 10 seconds for multiple contracts
}: UseMultipleContractStatusOptions) => {
  // const queryClient = useQueryClient();

  // Query for multiple contract statuses
  const queries = useQuery({
    queryKey: ['contracts', 'multiple-status', contractIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        contractIds.map(id => contractsApi.getContractStatus(id))
      );
      
      return results.map((result, index) => ({
        contractId: contractIds[index],
        status: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null,
      }));
    },
    enabled: enabled && contractIds.length > 0,
    refetchInterval: enabled ? pollingInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });

  return {
    contractStatuses: queries.data || [],
    isLoading: queries.isLoading,
    error: queries.error,
    refreshAll: queries.refetch,
  };
};

// Hook for contract signing progress with optimistic updates
export const useContractSigningProgress = (contractId: string) => {
  const queryClient = useQueryClient();

  const optimisticSignatureUpdate = (signatureRole: string) => {
    queryClient.setQueryData(['contracts', contractId], (oldData: Contract | undefined) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        signatures: [
          ...oldData.signatures,
          {
            id: `temp-${Date.now()}`,
            contract: contractId,
            signer: { id: 'current-user', email: '', first_name: '', last_name: '' },
            role: signatureRole as 'CLIENT' | 'WITNESS' | string,
            role_display: signatureRole,
            signature_data: '',
            signed_at: new Date().toISOString(),
            signer_name: '',
            signer_title: '',
            signer_email: '',
            is_verified: false,
            verification_method: 'electronic_signature',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ],
        status: oldData.signatures.length + 1 >= (oldData.template.signature_requirements?.length || 1) 
          ? 'SIGNED' as const 
          : 'PARTIALLY_SIGNED' as const,
      };
    });
  };

  const revertOptimisticUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
  };

  return {
    optimisticSignatureUpdate,
    revertOptimisticUpdate,
  };
};

// Hook for real-time contract updates simulation
interface UseRealTimeContractUpdatesOptions {
  contractId: string;
  onUpdate?: (eventType: string, data: unknown) => void;
  autoConnect?: boolean;
}

export const useRealTimeContractUpdates = ({
  contractId,
  onUpdate,
  autoConnect = false,
}: UseRealTimeContractUpdatesOptions) => {
  const [isConnected, setIsConnected] = useState(false);

  const startListening = () => {
    setIsConnected(true);
    console.log(`Started listening for real-time updates on contract ${contractId}`);
  };

  const stopListening = () => {
    setIsConnected(false);
    console.log(`Stopped listening for real-time updates on contract ${contractId}`);
  };

  const simulateUpdate = (eventType: string, data: unknown) => {
    if (onUpdate) {
      onUpdate(eventType, data);
    }
  };

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect) {
      startListening();
    }

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        stopListening();
      }
    };
  }, [autoConnect, contractId, isConnected]); // Add isConnected to dependencies

  return {
    isConnected,
    startListening,
    stopListening,
    simulateUpdate,
  };
};

// Hook for listening to signature events across all contracts
export const useGlobalSignatureEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // In a real implementation, this would connect to a global WebSocket
    // that listens for any signature events across all user contracts
    
    // const globalWs = new WebSocket('ws://localhost:8000/ws/signatures/');
    // 
    // globalWs.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   
    //   switch (data.type) {
    //     case 'signature_added':
    //       // Invalidate contract-specific queries
    //       queryClient.invalidateQueries({ queryKey: ['contracts', data.contractId] });
    //       // Update contracts list
    //       queryClient.invalidateQueries({ queryKey: ['contracts'] });
    //       break;
    //     
    //     case 'contract_completed':
    //       // Show notification and refresh all contract data
    //       queryClient.invalidateQueries({ queryKey: ['contracts'] });
    //       break;
    //   }
    // };
    
    // return () => {
    //   globalWs.close();
    // };

    console.log('Global signature event listener initialized');
    return () => {
      console.log('Global signature event listener cleaned up');
    };
  }, []); // Remove queryClient dependency - queryClient is stable in React Query

  // Manual trigger for testing
  const simulateSignatureEvent = (contractId: string, eventType: 'signature_added' | 'contract_completed') => {
    switch (eventType) {
      case 'signature_added':
        queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
        break;
      case 'contract_completed':
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        break;
    }
  };

  // Event listener management for testing
  const eventListeners = useRef<{ [key: string]: ((event: unknown) => void)[] }>({});

  const addEventListener = (eventType: string, callback: (event: unknown) => void) => {
    if (!eventListeners.current[eventType]) {
      eventListeners.current[eventType] = [];
    }
    eventListeners.current[eventType].push(callback);
  };

  const removeEventListener = (eventType: string, callback: (event: unknown) => void) => {
    if (!eventListeners.current[eventType]) return;
    eventListeners.current[eventType] = eventListeners.current[eventType].filter(cb => cb !== callback);
  };

  return {
    simulateSignatureEvent,
    addEventListener,
    removeEventListener,
  };
};