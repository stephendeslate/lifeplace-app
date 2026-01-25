/**
 * useContracts Hook Tests
 *
 * Tests for contract-related React Query hooks.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createHookWrapper } from '@test/utils/renderWithProviders';
import { server } from '@test/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  usePendingContracts,
  useAllContracts,
  useEventContracts,
  useContract,
  useContracts,
  useSignContract,
  contractKeys,
  getContractUrgency,
  canSignContract,
} from '../useContracts';
import { mockContracts, createPaginatedResponse } from '@test/utils/mockData';
import type { PendingContract } from '@/types/dashboard.types';
import type { Contract } from '@/apis/contracts.api';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// =============================================================================
// QUERY HOOKS TESTS
// =============================================================================

describe('usePendingContracts', () => {
  it('fetches contracts needing signature', async () => {
    // The hook calls getContracts with status=SENT and filters by can_client_sign
    server.use(
      http.get(`${API_URL}/contracts/client/contracts/`, () => {
        return HttpResponse.json(createPaginatedResponse([{
          ...mockContracts[0],
          status: 'SENT',
          can_client_sign: true,
        }]));
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePendingContracts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('transforms contracts to PendingContract format', async () => {
    server.use(
      http.get(`${API_URL}/contracts/client/contracts/`, () => {
        return HttpResponse.json(createPaginatedResponse([{
          id: 1,
          event: { id: 1, title: 'Test Event' },
          template: { id: 1, name: 'Standard Contract' },
          status: 'SENT',
          content: '<p>Contract</p>',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          signed_at: null,
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          can_client_sign: true,
          signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
          signatures: [],
        }]));
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePendingContracts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const contract = result.current.data?.[0];
    expect(contract?.event_name).toBe('Test Event');
    expect(contract?.template_name).toBe('Standard Contract');
    expect(typeof contract?.days_until_expiry).toBe('number');
  });
});

describe('useAllContracts', () => {
  it('fetches all contracts', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useAllContracts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useEventContracts', () => {
  it('filters contracts for specific event', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventContracts(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return contracts filtered by event ID
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('returns empty array when no contracts for event', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventContracts(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('useContract', () => {
  it('fetches single contract by ID', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useContract(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(1);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useContract(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });

  it('handles 404 for non-existent contract', async () => {
    server.use(
      http.get(`${API_URL}/contracts/client/contracts/:id/`, () => {
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useContract(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useContracts', () => {
  it('fetches contracts with pagination', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useContracts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.results).toBeDefined();
  });

  it('applies filters when provided', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useContracts({ status: 'SIGNED' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// =============================================================================
// MUTATION HOOKS TESTS
// =============================================================================

describe('useSignContract', () => {
  it('signs contract successfully', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useSignContract(), { wrapper });

    await act(async () => {
      result.current.mutate({
        contractId: 1,
        data: {
          signature_data: 'data:image/png;base64,SIGNATURE_DATA',
          signer_name: 'John Doe',
          agreed_to_terms: true,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('SIGNED');
  });

  it('handles signing error', async () => {
    server.use(
      http.post(`${API_URL}/contracts/client/contracts/:id/sign/`, () => {
        return HttpResponse.json(
          { detail: 'Contract already signed' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useSignContract(), { wrapper });

    await act(async () => {
      result.current.mutate({
        contractId: 1,
        data: {
          signature_data: 'data:image/png;base64,SIGNATURE_DATA',
          signer_name: 'John Doe',
          agreed_to_terms: true,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// QUERY KEYS TESTS
// =============================================================================

describe('contractKeys', () => {
  it('generates correct key for all contracts', () => {
    expect(contractKeys.all).toEqual(['contracts']);
  });

  it('generates correct key for contract list', () => {
    expect(contractKeys.lists()).toEqual(['contracts', 'list']);
  });

  it('generates correct key for filtered list', () => {
    const filters = { status: 'SIGNED' };
    expect(contractKeys.list(filters)).toEqual(['contracts', 'list', filters]);
  });

  it('generates correct key for pending contracts', () => {
    expect(contractKeys.pending()).toEqual(['contracts', 'pending']);
  });

  it('generates correct key for contract detail', () => {
    expect(contractKeys.detail(1)).toEqual(['contracts', 'detail', 1]);
  });

  it('generates correct key for event contracts', () => {
    expect(contractKeys.event(1)).toEqual(['contracts', 'event', 1]);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('getContractUrgency', () => {
  it('returns critical for expired contract', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: new Date(Date.now() - 86400000).toISOString(),
      days_until_expiry: -1,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('critical');
  });

  it('returns critical for contract expiring today', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: new Date().toISOString(),
      days_until_expiry: 0,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('critical');
  });

  it('returns critical for contract expiring in 2 days', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: null,
      days_until_expiry: 2,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('critical');
  });

  it('returns high for contract expiring in 5 days', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: null,
      days_until_expiry: 5,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('high');
  });

  it('returns medium for contract expiring in 10 days', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: null,
      days_until_expiry: 10,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('medium');
  });

  it('returns low for contract expiring in 15+ days', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: null,
      days_until_expiry: 15,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('low');
  });

  it('returns low when no expiry date', () => {
    const contract: PendingContract = {
      id: '1',
      event_id: 1,
      event_name: 'Test',
      template_name: 'Standard',
      status: 'SENT',
      expires_at: null,
      days_until_expiry: null,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
    };

    expect(getContractUrgency(contract)).toBe('low');
  });
});

describe('canSignContract', () => {
  it('returns true for signable SENT contract', () => {
    const contract: Contract = {
      id: 1,
      event: { id: 1, title: 'Test' },
      template: { id: 1, name: 'Standard' },
      status: 'SENT',
      content: '<p>Content</p>',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      signed_at: null,
      expires_at: null,
      can_client_sign: true,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
      signatures: [],
    };

    expect(canSignContract(contract)).toBe(true);
  });

  it('returns true for PARTIALLY_SIGNED contract', () => {
    const contract: Contract = {
      id: 1,
      event: { id: 1, title: 'Test' },
      template: { id: 1, name: 'Standard' },
      status: 'PARTIALLY_SIGNED',
      content: '<p>Content</p>',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      signed_at: null,
      expires_at: null,
      can_client_sign: true,
      signature_progress: { total_required: 2, signed_count: 1, percentage: 50 },
      signatures: [],
    };

    expect(canSignContract(contract)).toBe(true);
  });

  it('returns false when can_client_sign is false', () => {
    const contract: Contract = {
      id: 1,
      event: { id: 1, title: 'Test' },
      template: { id: 1, name: 'Standard' },
      status: 'SENT',
      content: '<p>Content</p>',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      signed_at: null,
      expires_at: null,
      can_client_sign: false,
      signature_progress: { total_required: 1, signed_count: 0, percentage: 0 },
      signatures: [],
    };

    expect(canSignContract(contract)).toBe(false);
  });

  it('returns false for SIGNED contract', () => {
    const contract: Contract = {
      id: 1,
      event: { id: 1, title: 'Test' },
      template: { id: 1, name: 'Standard' },
      status: 'SIGNED',
      content: '<p>Content</p>',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      signed_at: new Date().toISOString(),
      expires_at: null,
      can_client_sign: true,
      signature_progress: { total_required: 1, signed_count: 1, percentage: 100 },
      signatures: [],
    };

    expect(canSignContract(contract)).toBe(false);
  });

  it('returns false when all signatures collected', () => {
    const contract: Contract = {
      id: 1,
      event: { id: 1, title: 'Test' },
      template: { id: 1, name: 'Standard' },
      status: 'PARTIALLY_SIGNED',
      content: '<p>Content</p>',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      signed_at: null,
      expires_at: null,
      can_client_sign: true,
      signature_progress: { total_required: 2, signed_count: 2, percentage: 100 },
      signatures: [],
    };

    expect(canSignContract(contract)).toBe(false);
  });
});
