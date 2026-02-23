// frontend/admin-crm/src/hooks/useClients.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClients, useClientInvitations } from './useClients';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useClients', () => {
  describe('Query Operations', () => {
    it('fetches clients successfully', async () => {
      const { result } = renderHook(() => useClients(), {
        wrapper: createTestWrapper(),
      });

      // Initially loading
      expect(result.current.isLoadingClients).toBe(true);

      // Wait for data to load
      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      // Verify data loaded
      expect(result.current.clients.length).toBeGreaterThan(0);
      expect(result.current.totalClients).toBeGreaterThan(0);
      expect(result.current.clients[0]).toHaveProperty('email');
      expect(result.current.clients[0]).toHaveProperty('first_name');
    });

    it('applies search filter', async () => {
      const { result } = renderHook(() => useClients({ search: 'john' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      // If there are results, they should match the search
      if (result.current.clients.length > 0) {
        result.current.clients.forEach((client) => {
          const nameMatches =
            client.first_name.toLowerCase().includes('john') ||
            client.last_name.toLowerCase().includes('john') ||
            client.email.toLowerCase().includes('john');
          expect(nameMatches).toBe(true);
        });
      }
    });

    it('handles pagination parameters', async () => {
      const { result } = renderHook(() => useClients({ page: 1, page_size: 5 }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.clients.length).toBeLessThanOrEqual(5);
    });

    it('handles API error gracefully', async () => {
      // Override handler to return error
      server.use(
        http.get('http://localhost:8000/api/clients/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useClients(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.clientsError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      expect(result.current.isLoadingClients).toBe(false);
    });
  });

  describe('useClient (individual client)', () => {
    it('fetches single client by ID', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      // Wait for initial load
      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      // Now use the nested hook with the same wrapper
      const { result: clientResult } = renderHook(() => result.current.useClient(1), { wrapper });

      await waitFor(
        () => {
          expect(clientResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(clientResult.current.data).toBeDefined();
      expect(clientResult.current.data?.id).toBe(1);
    });

    it('does not fetch when ID is 0', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: clientResult } = renderHook(() => result.current.useClient(0), { wrapper });

      // Query should be disabled when ID is 0
      expect(clientResult.current.data).toBeUndefined();
      // isPending/isLoading should be false because query is disabled
      expect(clientResult.current.fetchStatus).toBe('idle');
    });
  });

  describe('Mutation Operations', () => {
    it('creates a new client', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
          expect(result.current.clients.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const initialCount = result.current.clients.length;

      // Create a new client
      act(() => {
        result.current.createClient({
          email: 'newclient@example.com',
          first_name: 'New',
          last_name: 'Client',
        });
      });

      // Wait for mutation to complete
      await waitFor(
        () => {
          expect(result.current.isCreatingClient).toBe(false);
        },
        { timeout: 5000 },
      );

      // Refetch to get updated list
      await act(async () => {
        await result.current.refetchClients();
      });

      await waitFor(
        () => {
          expect(result.current.clients.length).toBe(initialCount + 1);
        },
        { timeout: 5000 },
      );
    });

    it('handles create client validation error', async () => {
      // Override to return validation error
      server.use(
        http.post('http://localhost:8000/api/clients/', () => {
          return HttpResponse.json(
            { detail: 'A client with this email already exists' },
            { status: 400 },
          );
        }),
      );

      const { result } = renderHook(() => useClients(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createClient({
          email: 'duplicate@example.com',
          first_name: 'Test',
          last_name: 'User',
        });
      });

      await waitFor(
        () => {
          expect(result.current.createError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it('updates an existing client', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
          expect(result.current.clients.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const clientToUpdate = result.current.clients[0];
      expect(clientToUpdate).toBeDefined();

      act(() => {
        result.current.updateClient({
          id: clientToUpdate.id,
          data: { first_name: 'Updated' },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingClient).toBe(false);
        },
        { timeout: 5000 },
      );
    });

    it('deletes a client', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
          expect(result.current.clients.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const initialCount = result.current.clients.length;
      const clientToDelete = result.current.clients[0];
      expect(clientToDelete).toBeDefined();

      act(() => {
        result.current.deleteClient(clientToDelete.id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingClient).toBe(false);
        },
        { timeout: 5000 },
      );

      // Refetch to verify deletion
      await act(async () => {
        await result.current.refetchClients();
      });

      await waitFor(
        () => {
          expect(result.current.clients.length).toBe(initialCount - 1);
        },
        { timeout: 5000 },
      );
    });

    it('sends invitation to client without account', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
          expect(result.current.clients.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      // Find a client without an account (or just use first one)
      const clientWithoutAccount =
        result.current.clients.find((c) => !c.has_account) || result.current.clients[0];
      expect(clientWithoutAccount).toBeDefined();

      act(() => {
        result.current.sendInvitation(clientWithoutAccount.id);
      });

      await waitFor(
        () => {
          expect(result.current.isSendingInvitation).toBe(false);
        },
        { timeout: 5000 },
      );

      // Check there's no error (may have been cleared)
      expect(result.current.sendInvitationError).toBeFalsy();
    });
  });

  describe('Client Events', () => {
    it('fetches client events', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useClients(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingClients).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: eventsResult } = renderHook(() => result.current.useClientEvents(1), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(eventsResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      // Events should be an array (even if empty)
      expect(eventsResult.current.data).toBeDefined();
      expect(Array.isArray(eventsResult.current.data)).toBe(true);
    });
  });
});

describe('useClientInvitations', () => {
  it('fetches invitation by ID', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useClientInvitations(), { wrapper });

    const { result: invitationResult } = renderHook(
      () => result.current.useInvitation('test-invitation-id'),
      { wrapper },
    );

    await waitFor(
      () => {
        expect(invitationResult.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(invitationResult.current.data).toBeDefined();
    expect(invitationResult.current.data?.id).toBe('test-invitation-id');
  });

  it('handles invitation not found', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useClientInvitations(), { wrapper });

    const { result: invitationResult } = renderHook(
      () => result.current.useInvitation('not-found'),
      { wrapper },
    );

    await waitFor(
      () => {
        expect(invitationResult.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('accepts invitation successfully', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useClientInvitations(), { wrapper });

    act(() => {
      result.current.acceptInvitation({
        invitationId: 'valid-invitation',
        data: {
          password: 'SecurePassword123',
          confirm_password: 'SecurePassword123',
        },
      });
    });

    await waitFor(
      () => {
        expect(result.current.isAcceptingInvitation).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.acceptInvitationError).toBeFalsy();
  });

  it('handles expired invitation error', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useClientInvitations(), { wrapper });

    act(() => {
      result.current.acceptInvitation({
        invitationId: 'expired',
        data: {
          password: 'SecurePassword123',
          confirm_password: 'SecurePassword123',
        },
      });
    });

    await waitFor(
      () => {
        expect(result.current.acceptInvitationError).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});
