// frontend/admin-crm/src/hooks/useEvents.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useEvents, useEventTypes } from "./useEvents";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

describe("useEventTypes", () => {
  describe("Query Operations", () => {
    it("fetches event types successfully", async () => {
      const { result } = renderHook(() => useEventTypes(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.isLoadingEventTypes).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.eventTypes.length).toBeGreaterThan(0);
      expect(result.current.eventTypes[0]).toHaveProperty("name");
      expect(result.current.eventTypes[0]).toHaveProperty("is_active");
    });

    it("filters by active status", async () => {
      const { result } = renderHook(() => useEventTypes({ is_active: true }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      // All returned types should be active
      result.current.eventTypes.forEach((et) => {
        expect(et.is_active).toBe(true);
      });
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get("http://localhost:8000/api/events/event-types/", () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useEventTypes(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.eventTypesError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Nested Hooks", () => {
    it("fetches single event type by ID", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEventTypes(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: singleResult } = renderHook(
        () => result.current.useEventType(1),
        {
          wrapper,
        },
      );

      await waitFor(
        () => {
          expect(singleResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(singleResult.current.data).toBeDefined();
      expect(singleResult.current.data?.id).toBe(1);
    });

    it("fetches active event types only", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEventTypes(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: activeResult } = renderHook(
        () => result.current.useActiveEventTypes(),
        {
          wrapper,
        },
      );

      await waitFor(
        () => {
          expect(activeResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(activeResult.current.data).toBeDefined();
      activeResult.current.data?.forEach((et) => {
        expect(et.is_active).toBe(true);
      });
    });
  });

  describe("Mutation Operations", () => {
    it("creates a new event type", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEventTypes(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      const initialCount = result.current.eventTypes.length;

      act(() => {
        result.current.createEventType({
          data: {
            name: "New Event Type",
            description: "A new type of event",
            color: "#FF5733",
          },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingEventType).toBe(false);
        },
        { timeout: 5000 },
      );

      // Refetch to verify
      await act(async () => {
        await result.current.refetchEventTypes();
      });

      await waitFor(
        () => {
          expect(result.current.eventTypes.length).toBe(initialCount + 1);
        },
        { timeout: 5000 },
      );
    });

    it("updates an event type", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEventTypes(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      const typeToUpdate = result.current.eventTypes[0];

      act(() => {
        result.current.updateEventType({
          id: typeToUpdate.id,
          data: { name: "Updated Name" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingEventType).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateError).toBeFalsy();
    });

    it("deletes an event type without events", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEventTypes(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEventTypes).toBe(false);
        },
        { timeout: 5000 },
      );

      // Type 4 has no events associated
      act(() => {
        result.current.deleteEventType(4);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingEventType).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.deleteError).toBeFalsy();
    });
  });
});

describe("useEvents", () => {
  describe("Query Operations", () => {
    it("fetches events with pagination", async () => {
      const { result } = renderHook(() => useEvents(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.isLoadingEvents).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.events.length).toBeGreaterThan(0);
      expect(result.current.totalEvents).toBeGreaterThan(0);
      expect(result.current.currentPage).toBe(1);
    });

    it("filters events by status", async () => {
      const { result } = renderHook(() => useEvents({ status: "CONFIRMED" }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      result.current.events.forEach((event) => {
        expect(event.status).toBe("CONFIRMED");
      });
    });

    it("searches events by name", async () => {
      const { result } = renderHook(() => useEvents({ search: "Smith" }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      if (result.current.events.length > 0) {
        const hasMatch = result.current.events.some(
          (e) =>
            e.name.toLowerCase().includes("smith") ||
            e.client_name.toLowerCase().includes("smith"),
        );
        expect(hasMatch).toBe(true);
      }
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get("http://localhost:8000/api/events/events/", () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useEvents(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.eventsError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Nested Hooks", () => {
    it("fetches single event by ID", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: singleResult } = renderHook(
        () => result.current.useEvent(1),
        {
          wrapper,
        },
      );

      await waitFor(
        () => {
          expect(singleResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(singleResult.current.data).toBeDefined();
      expect(singleResult.current.data?.id).toBe(1);
    });
  });

  describe("Mutation Operations", () => {
    it("creates a new event", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      const initialCount = result.current.events.length;

      act(() => {
        result.current.createEvent({
          name: "New Test Event",
          event_type: 1,
          status: "LEAD",
          start_date: "2024-08-01T10:00:00Z",
          client: 1,
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingEvent).toBe(false);
        },
        { timeout: 5000 },
      );

      // Refetch to verify
      await act(async () => {
        await result.current.refetchEvents();
      });

      await waitFor(
        () => {
          expect(result.current.events.length).toBe(initialCount + 1);
        },
        { timeout: 5000 },
      );
    });

    it("updates an event", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      const eventToUpdate = result.current.events[0];

      act(() => {
        result.current.updateEvent({
          id: eventToUpdate.id,
          data: { name: "Updated Event Name" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingEvent).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateEventError).toBeFalsy();
    });

    it("deletes an event", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      const initialCount = result.current.events.length;
      const eventToDelete = result.current.events[0];

      act(() => {
        result.current.deleteEvent(eventToDelete.id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingEvent).toBe(false);
        },
        { timeout: 5000 },
      );

      // Refetch to verify deletion
      await act(async () => {
        await result.current.refetchEvents();
      });

      await waitFor(
        () => {
          expect(result.current.events.length).toBe(initialCount - 1);
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Pagination", () => {
    it("provides pagination metadata", async () => {
      const { result } = renderHook(
        () => useEvents({ page: 1, page_size: 25 }),
        {
          wrapper: createTestWrapper(),
        },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingEvents).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.currentPage).toBeDefined();
      expect(result.current.pageCount).toBeDefined();
      expect(result.current.pageSize).toBeDefined();
      expect(typeof result.current.hasNext).toBe("boolean");
      expect(typeof result.current.hasPrevious).toBe("boolean");
    });
  });
});
