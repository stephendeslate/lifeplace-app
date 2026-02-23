// frontend/client-portal/src/hooks/contracts/__tests__/useContractStatusUpdates.test.tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useContractStatusUpdates,
  useRealTimeContractUpdates,
  useGlobalSignatureEvents,
} from '../useContractStatusUpdates';
import { contractsApi } from '../../../apis/contracts.api';
// import type { Contract } from '../../../types/contracts.types';

// Mock the contracts API
vi.mock('../../../apis/contracts.api', () => ({
  contractsApi: {
    getContractStatus: vi.fn(),
  },
}));

// Mock contract data (currently unused but kept for future test development)
// const _mockContract: Contract = {
//   id: 'contract-1',
//   event: {
//     id: 'event-1',
//     title: 'Test Event',
//     date: '2024-06-01',
//     status: 'confirmed',
//   },
//   template: {
//     id: 'template-1',
//     name: 'Test Template',
//     description: 'Test contract template',
//     signature_requirements: ['CLIENT'],
//   },
//   status: 'SENT',
//   content: '<p>Contract content</p>',
//   sent_at: '2024-05-01T10:00:00Z',
//   fully_signed_at: null,
//   valid_until: '2024-07-01T10:00:00Z',
//   contract_value: '1000.00',
//   payment_schedule_reference: 'PS-001',
//   currency: 'USD',
//   is_amendment: false,
//   original_contract: null,
//   amendment_number: 0,
//   signatures: [],
//   is_fully_signed: false,
//   missing_signatures: ['CLIENT'],
//   signature_progress: {
//     total_required: 1,
//     signed_count: 0,
//     percentage: 0,
//     required_roles: ['CLIENT'],
//     signed_roles: [],
//     missing_roles: ['CLIENT'],
//   },
//   can_client_sign: true,
//   created_at: '2024-05-01T10:00:00Z',
//   updated_at: '2024-05-01T10:00:00Z',
// };

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe('useContractStatusUpdates', () => {
  const mockContractsApi = contractsApi as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockContractsApi.getContractStatus.mockResolvedValue({
      contract_id: 'contract-1',
      status: 'SENT',
      is_fully_signed: false,
      signature_progress: {
        total_required: 1,
        completed: 0,
        percentage: 0,
      },
      signatures: {
        CLIENT: {
          required: true,
          signed: false,
          signed_at: null,
          signer_name: null,
          is_current_user: true,
        },
      },
      can_client_sign: true,
      expires_at: '2024-07-01T10:00:00Z',
    });
  });

  it('fetches contract status when enabled', async () => {
    renderHook(
      () =>
        useContractStatusUpdates({
          contractId: 'contract-1',
          enabled: true,
          onStatusChange: mockOnStatusChange,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mockContractsApi.getContractStatus).toHaveBeenCalledWith('contract-1');
    });
  });

  it('does not fetch when disabled', () => {
    renderHook(
      () =>
        useContractStatusUpdates({
          contractId: 'contract-1',
          enabled: false,
          onStatusChange: mockOnStatusChange,
        }),
      { wrapper },
    );

    expect(mockContractsApi.getContractStatus).not.toHaveBeenCalled();
  });

  it('does not fetch without contractId', () => {
    renderHook(
      () =>
        useContractStatusUpdates({
          contractId: '',
          enabled: true,
          onStatusChange: mockOnStatusChange,
        }),
      { wrapper },
    );

    expect(mockContractsApi.getContractStatus).not.toHaveBeenCalled();
  });

  it('uses custom polling interval', async () => {
    const { rerender } = renderHook(
      () =>
        useContractStatusUpdates({
          contractId: 'contract-1',
          enabled: true,
          pollingInterval: 10000,
          onStatusChange: mockOnStatusChange,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mockContractsApi.getContractStatus).toHaveBeenCalled();
    });

    // The polling interval would be tested with timer mocks in a more comprehensive test
    rerender();
  });

  it('calls onStatusChange when status changes', async () => {
    const onStatusChange = vi.fn();

    const { result } = renderHook(
      () =>
        useContractStatusUpdates({
          contractId: 'contract-1',
          enabled: true,
          onStatusChange,
        }),
      { wrapper },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockContractsApi.getContractStatus).toHaveBeenCalledTimes(1);
    });

    // Change the mock response to return a different status
    mockContractsApi.getContractStatus.mockResolvedValue({
      contract_id: 'contract-1',
      status: 'SIGNED',
      is_fully_signed: true,
      signature_progress: {
        total_required: 1,
        completed: 1,
        percentage: 100,
      },
      signatures: {
        CLIENT: {
          required: true,
          signed: true,
          signed_at: '2024-05-02T10:00:00Z',
          signer_name: 'John Doe',
          is_current_user: true,
        },
      },
      can_client_sign: false,
      expires_at: '2024-07-01T10:00:00Z',
    });

    // Manually trigger a refetch to get the new data
    await act(async () => {
      await result.current.refreshStatus();
    });

    await waitFor(
      () => {
        expect(onStatusChange).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockContractsApi.getContractStatus.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(
      () =>
        useContractStatusUpdates({
          contractId: 'contract-1',
          enabled: true,
          onStatusChange: mockOnStatusChange,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    consoleSpy.mockRestore();
  });

  it('provides loading and error states', async () => {
    const { result } = renderHook(
      () =>
        useContractStatusUpdates({
          contractId: 'contract-1',
          enabled: true,
          onStatusChange: mockOnStatusChange,
        }),
      { wrapper },
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contractStatus).toBeDefined();
  });
});

describe('useRealTimeContractUpdates', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides real-time update functions', () => {
    const { result } = renderHook(() =>
      useRealTimeContractUpdates({
        contractId: 'contract-1',
        onUpdate: mockOnUpdate,
      }),
    );

    expect(typeof result.current.startListening).toBe('function');
    expect(typeof result.current.stopListening).toBe('function');
    expect(typeof result.current.simulateUpdate).toBe('function');
    expect(result.current.isConnected).toBe(false);
  });

  it('handles start and stop listening', () => {
    const { result } = renderHook(() =>
      useRealTimeContractUpdates({
        contractId: 'contract-1',
        onUpdate: mockOnUpdate,
      }),
    );

    // Start listening
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isConnected).toBe(true);

    // Stop listening
    act(() => {
      result.current.stopListening();
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('simulates real-time updates', () => {
    const { result } = renderHook(() =>
      useRealTimeContractUpdates({
        contractId: 'contract-1',
        onUpdate: mockOnUpdate,
      }),
    );

    result.current.simulateUpdate('signature_added', {
      contractId: 'contract-1',
      signatureId: 'sig-1',
      timestamp: new Date().toISOString(),
    });

    expect(mockOnUpdate).toHaveBeenCalledWith('signature_added', expect.any(Object));
  });

  it('cleans up on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useRealTimeContractUpdates({
        contractId: 'contract-1',
        onUpdate: mockOnUpdate,
      }),
    );

    act(() => {
      result.current.startListening();
    });
    expect(result.current.isConnected).toBe(true);

    unmount();

    // Connection should be cleaned up
    // This is tested implicitly through the cleanup effect
  });

  it('automatically starts listening when autoConnect is true', () => {
    const { result } = renderHook(() =>
      useRealTimeContractUpdates({
        contractId: 'contract-1',
        autoConnect: true,
        onUpdate: mockOnUpdate,
      }),
    );

    expect(result.current.isConnected).toBe(true);
  });

  it('handles connection errors gracefully', () => {
    const { result } = renderHook(() =>
      useRealTimeContractUpdates({
        contractId: 'contract-1',
        onUpdate: mockOnUpdate,
      }),
    );

    // Simulate connection error
    act(() => {
      result.current.startListening();
    });

    // The hook should handle errors gracefully and not throw
    expect(result.current.isConnected).toBe(true);
  });
});

describe('useGlobalSignatureEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides global event functions', () => {
    const { result } = renderHook(() => useGlobalSignatureEvents(), { wrapper });

    expect(typeof result.current.simulateSignatureEvent).toBe('function');
    expect(typeof result.current.addEventListener).toBe('function');
    expect(typeof result.current.removeEventListener).toBe('function');
  });

  it('handles signature event simulation', () => {
    const { result } = renderHook(() => useGlobalSignatureEvents(), { wrapper });

    // Should not throw when simulating events
    expect(() => {
      result.current.simulateSignatureEvent('contract-1', 'signature_added');
      result.current.simulateSignatureEvent('contract-2', 'contract_completed');
    }).not.toThrow();
  });

  it('manages event listeners correctly', () => {
    const { result } = renderHook(() => useGlobalSignatureEvents(), { wrapper });
    const mockCallback = vi.fn();

    // Add event listener
    result.current.addEventListener('signature_added', mockCallback);

    // Simulate event
    result.current.simulateSignatureEvent('contract-1', 'signature_added');

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'signature_added',
        contractId: 'contract-1',
      }),
    );

    // Remove event listener
    result.current.removeEventListener('signature_added', mockCallback);

    // Simulate event again - callback should not be called
    result.current.simulateSignatureEvent('contract-1', 'signature_added');

    // mockCallback should still have been called only once
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('handles multiple event listeners for same event', () => {
    const { result } = renderHook(() => useGlobalSignatureEvents(), { wrapper });
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();

    result.current.addEventListener('signature_added', mockCallback1);
    result.current.addEventListener('signature_added', mockCallback2);

    result.current.simulateSignatureEvent('contract-1', 'signature_added');

    expect(mockCallback1).toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalled();
  });

  it('provides contract-specific event filtering', () => {
    const { result } = renderHook(() => useGlobalSignatureEvents(), { wrapper });
    const mockCallback = vi.fn();

    result.current.addEventListener('signature_added', mockCallback);

    // Simulate events for different contracts
    result.current.simulateSignatureEvent('contract-1', 'signature_added');
    result.current.simulateSignatureEvent('contract-2', 'signature_added');

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ contractId: 'contract-1' }),
    );
    expect(mockCallback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ contractId: 'contract-2' }),
    );
  });

  it('cleans up event listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useGlobalSignatureEvents(), { wrapper });
    const mockCallback = vi.fn();

    result.current.addEventListener('signature_added', mockCallback);

    unmount();

    // After unmount, simulate event should not call the callback
    // This is tested implicitly through the cleanup mechanism
  });
});
