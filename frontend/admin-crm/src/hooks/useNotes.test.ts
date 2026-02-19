import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useNotes } from "./useNotes";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

describe("useNotes", () => {
  describe("Query Operations", () => {
    it("fetches notes with filters", async () => {
      const { result } = renderHook(
        () => useNotes({ content_type: "client", object_id: 1 }),
        { wrapper: createTestWrapper() },
      );

      expect(result.current.isLoadingNotes).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.notes.length).toBeGreaterThan(0);
      expect(result.current.notesCount).toBeGreaterThan(0);
    });

    it("query is disabled when no filters are provided", async () => {
      const { result } = renderHook(() => useNotes(), {
        wrapper: createTestWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.notes).toEqual([]);
      expect(result.current.notesCount).toBe(0);
    });

    it("handles API error", async () => {
      server.use(
        http.get("http://localhost:8000/api/notes/", () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper: createTestWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.notesError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Mutation Operations", () => {
    it("creates a note", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createNote({
          content: "New note content",
          content_type_model: "client",
          object_id: 1,
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingNote).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.createError).toBeFalsy();
    });

    it("updates a note", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
          expect(result.current.notes.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const noteToUpdate = result.current.notes[0];

      act(() => {
        result.current.updateNote({
          id: noteToUpdate.id,
          data: { content: "Updated content" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingNote).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateError).toBeFalsy();
    });

    it("deletes a note", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
          expect(result.current.notes.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const noteToDelete = result.current.notes[0];

      act(() => {
        result.current.deleteNote(noteToDelete.id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingNote).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.deleteError).toBeFalsy();
    });

    it("handles create error", async () => {
      server.use(
        http.post("http://localhost:8000/api/notes/", () => {
          return HttpResponse.json(
            { detail: "Validation error" },
            { status: 400 },
          );
        }),
      );

      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createNote({
          content: "Will fail",
          content_type_model: "client",
          object_id: 1,
        });
      });

      await waitFor(
        () => {
          expect(result.current.createError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Nested Hooks", () => {
    it("useNote fetches single note by ID", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: noteResult } = renderHook(
        () => result.current.useNote(1),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(noteResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(noteResult.current.data).toBeDefined();
      expect(noteResult.current.data?.id).toBe(1);
    });

    it("useNote does not fetch when ID is 0", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: noteResult } = renderHook(
        () => result.current.useNote(0),
        { wrapper },
      );

      expect(noteResult.current.data).toBeUndefined();
      expect(noteResult.current.fetchStatus).toBe("idle");
    });

    it("useNotesForObject fetches notes for a specific object", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(
        () => useNotes({ content_type: "client" }),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(result.current.isLoadingNotes).toBe(false);
        },
        { timeout: 5000 },
      );

      const { result: objectNotesResult } = renderHook(
        () => result.current.useNotesForObject("client", 1),
        { wrapper },
      );

      await waitFor(
        () => {
          expect(objectNotesResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(objectNotesResult.current.data).toBeDefined();
      expect(Array.isArray(objectNotesResult.current.data)).toBe(true);
    });
  });
});
