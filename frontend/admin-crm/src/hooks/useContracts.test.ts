import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useContractTemplates,
  useCreateContractTemplate,
  useUpdateContractTemplate,
  useDeleteContractTemplate,
  useEventContracts,
  useCreateEventContract,
  useUpdateEventContract,
  useDeleteEventContract,
  useContractsForEvent,
  useContractsForClient,
  useAddContractSignature,
  useVoidContract,
  useRequestAmendment,
  useApproveAmendment,
  useRejectAmendment,
  useSendContract,
} from './useContracts';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Contract Templates', () => {
  it('fetches contract templates', async () => {
    const { result } = renderHook(() => useContractTemplates(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });

  it('creates a contract template', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCreateContractTemplate(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        name: 'New Contract Template',
        content: '<p>Contract content</p>',
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('updates a contract template', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useUpdateContractTemplate(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ id: 1, data: { name: 'Updated' } } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('deletes a contract template', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useDeleteContractTemplate(), {
      wrapper,
    });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('handles create error', async () => {
    server.use(
      http.post('http://localhost:8000/api/contracts/templates/', () => {
        return HttpResponse.json({ detail: 'Validation error' }, { status: 400 });
      }),
    );

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCreateContractTemplate(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ name: 'Bad Template' } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe('Event Contracts', () => {
  it('fetches event contracts', async () => {
    const { result } = renderHook(() => useEventContracts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('creates an event contract', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCreateEventContract(), { wrapper });

    act(() => {
      result.current.mutate({
        event: 1,
        template: 1,
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('updates an event contract', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useUpdateEventContract(), { wrapper });

    act(() => {
      result.current.mutate({
        id: 1,
        data: { content: '<p>Updated</p>' },
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('deletes an event contract', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useDeleteEventContract(), { wrapper });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('fetches contracts for a specific event', async () => {
    const { result } = renderHook(() => useContractsForEvent(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('fetches contracts for a specific client', async () => {
    const { result } = renderHook(() => useContractsForClient(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });
});

describe('Contract Operations', () => {
  it('adds a signature to a contract', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useAddContractSignature(), { wrapper });

    act(() => {
      result.current.mutate({
        contractId: 1,
        data: {
          signer: 1,
          role: 'CLIENT',
          signature_data: 'base64data',
          signer_name: 'John Doe',
          signer_email: 'john@example.com',
        },
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('voids a contract', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useVoidContract(), { wrapper });

    act(() => {
      result.current.mutate({ id: 1, reason: 'Test void' } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('sends a contract', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useSendContract(), { wrapper });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe('Contract Amendments', () => {
  it('requests an amendment', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useRequestAmendment(), { wrapper });

    act(() => {
      result.current.mutate({
        contractId: 1,
        data: {
          amendment_reason: 'Date change',
          changes_description: 'Changed date',
        },
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('approves an amendment', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useApproveAmendment(), { wrapper });

    act(() => {
      result.current.mutate({ id: 1 } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('rejects an amendment', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useRejectAmendment(), { wrapper });

    act(() => {
      result.current.mutate({ id: 1, reviewNotes: 'Not approved' } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});
