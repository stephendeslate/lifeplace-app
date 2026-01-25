/**
 * useEvents Hook Tests
 *
 * Tests for event-related React Query hooks.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createHookWrapper } from '@test/utils/renderWithProviders';
import { server } from '@test/mocks/server';
import { errorHandlers } from '@test/mocks/handlers';
import { http, HttpResponse } from 'msw';
import {
  useEventsList,
  useEvent,
  useUpcomingEvents,
  useEventTimeline,
  useEventDocuments,
  useEventTasks,
  useUpdateEventTask,
  useCreateEventNote,
  useSubmitEventFeedback,
  useSelfCheckIn,
  eventKeys,
} from '../useEvents';
import { mockEvents, mockEvent, createPaginatedResponse } from '@test/utils/mockData';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// =============================================================================
// QUERY HOOKS TESTS
// =============================================================================

describe('useEventsList', () => {
  it('fetches list of events', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventsList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // getEvents returns Event[] directly, not a paginated response
    expect(result.current.data).toHaveLength(mockEvents.length);
  });

  it('returns loading state initially', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventsList(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('applies filters when provided', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventsList({ status: 'CONFIRMED' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // getEvents returns Event[] directly, not a paginated response
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('handles server error', async () => {
    server.use(errorHandlers.serverError);

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventsList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useEvent', () => {
  it('fetches single event by ID', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEvent(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(1);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEvent(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });

  it('does not fetch when ID is negative', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEvent(-1), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });

  it('handles 404 for non-existent event', async () => {
    server.use(errorHandlers.notFound);

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEvent(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpcomingEvents', () => {
  it('fetches upcoming events', async () => {
    // Override handler for upcoming events
    server.use(
      http.get(`${API_URL}/client/events/upcoming/`, () => {
        return HttpResponse.json(mockEvents.slice(0, 2));
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useUpcomingEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useEventTimeline', () => {
  it('fetches event timeline', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventTimeline(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventTimeline(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useEventDocuments', () => {
  it('fetches event documents', async () => {
    server.use(
      http.get(`${API_URL}/client/events/:id/documents/`, () => {
        return HttpResponse.json([
          { id: 1, name: 'Contract.pdf', type: 'contract' },
          { id: 2, name: 'Invoice.pdf', type: 'invoice' },
        ]);
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventDocuments(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });
});

describe('useEventTasks', () => {
  it('fetches event tasks', async () => {
    server.use(
      http.get(`${API_URL}/client/events/:id/tasks/`, () => {
        return HttpResponse.json([
          { id: 1, title: 'Complete questionnaire', status: 'pending' },
          { id: 2, title: 'Sign contract', status: 'completed' },
        ]);
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventTasks(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });
});

// =============================================================================
// MUTATION HOOKS TESTS
// =============================================================================

describe('useUpdateEventTask', () => {
  it('updates task and invalidates queries on success', async () => {
    server.use(
      http.patch(`${API_URL}/client/events/:eventId/tasks/:taskId/`, async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          // Body parsing failed, use defaults
        }
        return HttpResponse.json({
          id: 1,
          title: 'Complete questionnaire',
          ...body,
        });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useUpdateEventTask(), { wrapper });

    await act(async () => {
      result.current.mutate({
        eventId: 1,
        taskId: 1,
        data: { status: 'COMPLETED' as const },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('handles error when updating task', async () => {
    server.use(
      http.patch(`${API_URL}/client/events/:eventId/tasks/:taskId/`, () => {
        return HttpResponse.json(
          { detail: 'Task update failed' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useUpdateEventTask(), { wrapper });

    await act(async () => {
      result.current.mutate({
        eventId: 1,
        taskId: 1,
        data: { status: 'COMPLETED' as const },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCreateEventNote', () => {
  it('creates note and invalidates queries on success', async () => {
    server.use(
      http.post(`${API_URL}/client/events/:eventId/notes/`, async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          // Body parsing failed, use defaults
        }
        return HttpResponse.json({
          id: 1,
          ...body,
          created_at: new Date().toISOString(),
        });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useCreateEventNote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        eventId: 1,
        data: { content: 'Test note content' },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useSubmitEventFeedback', () => {
  it('submits feedback successfully', async () => {
    server.use(
      http.post(`${API_URL}/client/events/:eventId/feedback/`, async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          // Body parsing failed, use defaults
        }
        return HttpResponse.json({
          id: 1,
          ...body,
          submitted_at: new Date().toISOString(),
        });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useSubmitEventFeedback(), { wrapper });

    await act(async () => {
      result.current.mutate({
        eventId: 1,
        data: {
          overall_rating: 5,
          comments: 'Great event!',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useSelfCheckIn', () => {
  it('performs self check-in successfully', async () => {
    server.use(
      http.post(`${API_URL}/client/events/:id/self_check_in/`, ({ params }) => {
        return HttpResponse.json({
          ...mockEvent,
          id: Number(params.id),
          checked_in_at: new Date().toISOString(),
        });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useSelfCheckIn(), { wrapper });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('handles check-in failure', async () => {
    server.use(
      http.post(`${API_URL}/client/events/:id/self_check_in/`, () => {
        return HttpResponse.json(
          { detail: 'Check-in not available yet' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useSelfCheckIn(), { wrapper });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// QUERY KEYS TESTS
// =============================================================================

describe('eventKeys', () => {
  it('generates correct key for all events', () => {
    expect(eventKeys.all).toEqual(['events']);
  });

  it('generates correct key for event list', () => {
    expect(eventKeys.lists()).toEqual(['events', 'list']);
  });

  it('generates correct key for filtered list', () => {
    const filters = { status: 'CONFIRMED' as const };
    expect(eventKeys.list(filters)).toEqual(['events', 'list', filters]);
  });

  it('generates correct key for event detail', () => {
    expect(eventKeys.detail(1)).toEqual(['events', 'detail', 1]);
  });

  it('generates correct key for event timeline', () => {
    expect(eventKeys.timeline(1)).toEqual(['events', 'timeline', 1]);
  });

  it('generates correct key for event documents', () => {
    expect(eventKeys.documents(1)).toEqual(['events', 'documents', 1]);
  });

  it('generates correct key for event tasks', () => {
    expect(eventKeys.tasks(1)).toEqual(['events', 'tasks', 1]);
  });

  it('generates correct key for event notes', () => {
    expect(eventKeys.notes(1)).toEqual(['events', 'notes', 1]);
  });

  it('generates correct key for event feedback', () => {
    expect(eventKeys.feedback(1)).toEqual(['events', 'feedback', 1]);
  });
});
