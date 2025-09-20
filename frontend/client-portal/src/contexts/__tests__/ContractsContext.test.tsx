// frontend/client-portal/src/contexts/__tests__/ContractsContext.test.tsx
import React from 'react';
import { render, screen, waitFor } from '../../test/utils';
import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { useContracts, useContract, useOptimisticContractUpdates } from '../ContractsContext';
import { contractsApi } from '../../apis/contracts.api';
import type { Contract } from '../../types/contracts.types';

// Mock the contracts API
vi.mock('../../apis/contracts.api', () => ({
  contractsApi: {
    getContracts: vi.fn(),
    getPendingSignatures: vi.fn(),
    signContract: vi.fn(),
    getContract: vi.fn(),
    downloadContractPdf: vi.fn(),
  },
}));

// Cast the mocked API for type safety
const mockContractsApi = contractsApi as typeof contractsApi & {
  getContracts: ReturnType<typeof vi.fn>;
  getPendingSignatures: ReturnType<typeof vi.fn>;
  signContract: ReturnType<typeof vi.fn>;
  getContract: ReturnType<typeof vi.fn>;
  downloadContractPdf: ReturnType<typeof vi.fn>;
};

// Mock the contract status updates hook
vi.mock('../../hooks/contracts/useContractStatusUpdates', () => ({
  useGlobalSignatureEvents: () => ({
    simulateSignatureEvent: vi.fn(),
  }),
}));

const mockContract: Contract = {
  id: 'contract-1',
  event: {
    id: 'event-1',
    title: 'Test Event',
    date: '2024-06-01',
    status: 'confirmed',
  },
  template: {
    id: 'template-1',
    name: 'Test Template',
    description: 'Test contract template',
    signature_requirements: ['CLIENT'],
  },
  status: 'SENT',
  content: '<p>Contract content</p>',
  sent_at: '2024-05-01T10:00:00Z',
  fully_signed_at: null,
  valid_until: '2024-07-01T10:00:00Z',
  contract_value: '1000.00',
  payment_schedule_reference: 'PS-001',
  currency: 'USD',
  is_amendment: false,
  original_contract: null,
  amendment_number: 0,
  signatures: [],
  is_fully_signed: false,
  missing_signatures: ['CLIENT'],
  signature_progress: {
    total_required: 1,
    signed_count: 0,
    percentage: 0,
    required_roles: ['CLIENT'],
    signed_roles: [],
    missing_roles: ['CLIENT'],
  },
  can_client_sign: true,
  created_at: '2024-05-01T10:00:00Z',
  updated_at: '2024-05-01T10:00:00Z',
};

const signedContract: Contract = {
  ...mockContract,
  id: 'contract-2',
  status: 'SIGNED',
  signatures: [{
    id: 'sig-1',
    contract: 'contract-2',
    signer: {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
    },
    role: 'CLIENT',
    role_display: 'Client',
    signature_data: 'signature-data',
    signed_at: '2024-05-02T10:00:00Z',
    signer_name: 'John Doe',
    signer_title: '',
    signer_email: 'test@example.com',
    is_verified: true,
    verification_method: 'electronic_signature',
    legal_disclosure_accepted: true,
    signature_intent_confirmed: true,
    created_at: '2024-05-02T10:00:00Z',
    updated_at: '2024-05-02T10:00:00Z',
  }],
  is_fully_signed: true,
  missing_signatures: [],
  signature_progress: {
    total_required: 1,
    signed_count: 1,
    percentage: 100,
    required_roles: ['CLIENT'],
    signed_roles: ['CLIENT'],
    missing_roles: [],
  },
  fully_signed_at: '2024-05-02T10:00:00Z',
};

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

// Test component that uses the contracts context
const TestComponent = () => {
  const {
    contracts,
    pendingContracts,
    signedContracts,
    isLoading,
    refreshContracts,
    signContract,
  } = useContracts();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="contracts-count">{contracts.length}</div>
      <div data-testid="pending-count">{pendingContracts.length}</div>
      <div data-testid="signed-count">{signedContracts.length}</div>
      <button onClick={() => refreshContracts()} data-testid="refresh">
        Refresh
      </button>
      <button
        onClick={() =>
          signContract('contract-1', {
            signature_data: 'test-signature-data',
            signer_name: 'Test User',
            signer_email: 'test@example.com',
            signer_title: '',
            verification_method: 'electronic_signature',
            device_fingerprint: 'test-fingerprint',
          })
        }
        data-testid="sign"
      >
        Sign
      </button>
    </div>
  );
};

// Test component for specific contract hook
const ContractTestComponent = ({ contractId }: { contractId: string }) => {
  const { contract, isLoading, updateContract } = useContract(contractId);

  return (
    <div>
      <div data-testid="contract-loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="contract-id">{contract?.id || 'No contract'}</div>
      <button
        onClick={() =>
          updateContract((c) => ({ ...c, status: 'SIGNED' }))
        }
        data-testid="update-contract"
      >
        Update Contract
      </button>
    </div>
  );
};

// Test component for optimistic updates
const OptimisticTestComponent = () => {
  const { optimisticallySignContract, revertOptimisticUpdate } = useOptimisticContractUpdates();

  return (
    <div>
      <button
        onClick={() => optimisticallySignContract('contract-1', 'CLIENT')}
        data-testid="optimistic-sign"
      >
        Optimistic Sign
      </button>
      <button
        onClick={() => revertOptimisticUpdate('contract-1')}
        data-testid="revert-optimistic"
      >
        Revert
      </button>
    </div>
  );
};

describe('ContractsContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockContractsApi.getContracts.mockResolvedValue([mockContract, signedContract]);
    mockContractsApi.getPendingSignatures.mockResolvedValue({
      contracts: [mockContract],
      count: 1,
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(component, { queryClient });
  };

  describe('ContractsProvider', () => {
    it('provides contract data correctly', async () => {
      renderWithProviders(<TestComponent />);

      // Wait for data to load - auth resolves quickly in tests
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      expect(screen.getByTestId('contracts-count')).toHaveTextContent('2');
      expect(screen.getByTestId('pending-count')).toHaveTextContent('1');
      expect(screen.getByTestId('signed-count')).toHaveTextContent('1');
    });

    it('handles refresh contracts correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const refreshButton = screen.getByTestId('refresh');
      await user.click(refreshButton);

      expect(mockContractsApi.getContracts).toHaveBeenCalledTimes(2);
      expect(mockContractsApi.getPendingSignatures).toHaveBeenCalledTimes(2);
    });

    it('handles contract signing correctly', async () => {
      const user = userEvent.setup();
      const signedContractResult = { ...mockContract, status: 'SIGNED' as const };
      mockContractsApi.signContract.mockResolvedValue(signedContractResult);

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const signButton = screen.getByTestId('sign');
      await user.click(signButton);

      await waitFor(() => {
        expect(mockContractsApi.signContract).toHaveBeenCalledWith('contract-1', {
          signature_data: 'test-signature-data',
          signer_name: 'Test User',
          signer_email: 'test@example.com',
          signer_title: '',
          verification_method: 'electronic_signature',
          device_fingerprint: 'test-fingerprint',
        });
      });
    });

    it('filters contracts by status correctly', async () => {
      const pendingContract1 = { ...mockContract, status: 'SENT' as const };
      const pendingContract2 = { ...mockContract, id: 'contract-3', status: 'PARTIALLY_SIGNED' as const };
      const signedContract1 = { ...mockContract, id: 'contract-4', status: 'SIGNED' as const };

      mockContractsApi.getContracts.mockResolvedValue([
        pendingContract1,
        pendingContract2,
        signedContract1,
      ]);

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('contracts-count')).toHaveTextContent('3');
        expect(screen.getByTestId('pending-count')).toHaveTextContent('2');
        expect(screen.getByTestId('signed-count')).toHaveTextContent('1');
      });
    });

    it('handles API errors gracefully', async () => {
      mockContractsApi.getContracts.mockRejectedValue(new Error('API Error'));
      mockContractsApi.getPendingSignatures.mockRejectedValue(new Error('API Error'));

      renderWithProviders(<TestComponent />);

      // Should eventually stop loading even with errors
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      // Should show empty data on error
      expect(screen.getByTestId('contracts-count')).toHaveTextContent('0');
    });
  });

  describe('useContract hook', () => {
    it('fetches and provides specific contract data', async () => {
      mockContractsApi.getContract.mockResolvedValue(mockContract);

      renderWithProviders(<ContractTestComponent contractId="contract-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('contract-id')).toHaveTextContent('contract-1');
      });

      expect(mockContractsApi.getContract).toHaveBeenCalledWith('contract-1');
    });

    it('allows updating contract data', async () => {
      const user = userEvent.setup();
      mockContractsApi.getContract.mockResolvedValue(mockContract);

      renderWithProviders(<ContractTestComponent contractId="contract-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('contract-id')).toHaveTextContent('contract-1');
      });

      const updateButton = screen.getByTestId('update-contract');
      await user.click(updateButton);

      // The contract should be updated in the cache
      // This is more of an integration test to ensure the update function works
    });

    it('does not fetch when contractId is not provided', () => {
      renderWithProviders(<ContractTestComponent contractId="" />);

      expect(mockContractsApi.getContract).not.toHaveBeenCalled();
      expect(screen.getByTestId('contract-id')).toHaveTextContent('No contract');
    });
  });

  describe('useOptimisticContractUpdates hook', () => {
    it('provides optimistic update functions', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <div>
          <TestComponent />
          <OptimisticTestComponent />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const optimisticButton = screen.getByTestId('optimistic-sign');
      await user.click(optimisticButton);

      // The optimistic update should work without throwing errors
      // This tests that the optimistic update mechanism is functional
    });

    it('provides revert update function', async () => {
      const user = userEvent.setup();

      renderWithProviders(<OptimisticTestComponent />);

      const revertButton = screen.getByTestId('revert-optimistic');
      await user.click(revertButton);

      // Should trigger query invalidation
      // This is more of a smoke test to ensure the function works
    });
  });

  describe('Error handling', () => {
    it('handles sign contract API errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockContractsApi.signContract.mockRejectedValue(new Error('Sign failed'));

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      const signButton = screen.getByTestId('sign');
      await user.click(signButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to sign contract:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Background sync', () => {
    it('sets up visibility change listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      renderWithProviders(<TestComponent />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });

    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderWithProviders(<TestComponent />);
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Health check mechanism', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets up periodic health check', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      renderWithProviders(<TestComponent />);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
      
      setIntervalSpy.mockRestore();
    });

    it('cleans up health check interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { unmount } = renderWithProviders(<TestComponent />);
      
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Context error handling', () => {
    it('throws error when useContracts is used outside provider', () => {
      const TestComponentOutsideProvider = () => {
        useContracts(); // This should throw
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        rtlRender(<TestComponentOutsideProvider />);
      }).toThrow('useContracts must be used within a ContractsProvider');

      consoleSpy.mockRestore();
    });
  });
});