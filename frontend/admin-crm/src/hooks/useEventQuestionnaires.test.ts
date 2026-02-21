// frontend/admin-crm/src/hooks/useEventQuestionnaires.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useEventQuestionnairesForEvent,
  useEventQuestionnaire,
  useEventQuestionnaires,
  useCreateEventQuestionnaire,
  useUpdateEventQuestionnaire,
  useDeleteEventQuestionnaire,
  useSendEventQuestionnaire,
  useSendQuestionnaireReminder,
} from "./useEventQuestionnaires";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useEventQuestionnaires", () => {
  describe("useEventQuestionnaires (list all)", () => {
    it("fetches all event questionnaires successfully", async () => {
      const { result } = renderHook(() => useEventQuestionnaires(), {
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

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/questionnaires/event-questionnaires/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useEventQuestionnaires(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useEventQuestionnairesForEvent", () => {
    it("fetches questionnaires for specific event", async () => {
      const { result } = renderHook(() => useEventQuestionnairesForEvent(1), {
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

    it("does not fetch when eventId is falsy", async () => {
      const { result } = renderHook(() => useEventQuestionnairesForEvent(0), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useEventQuestionnaire (single)", () => {
    it("fetches single event questionnaire by ID", async () => {
      const { result } = renderHook(() => useEventQuestionnaire(1), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe(1);
    });
  });

  describe("useCreateEventQuestionnaire", () => {
    it("creates event questionnaire successfully", async () => {
      const { result } = renderHook(() => useCreateEventQuestionnaire(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        result.current.mutate({ event: 1, questionnaire: 1 });
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.event).toBe(1);
    });
  });

  describe("useSendEventQuestionnaire", () => {
    it("sends questionnaire to client successfully", async () => {
      const { result } = renderHook(() => useSendEventQuestionnaire(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(1);
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.status).toBe("SENT");
    });
  });

  describe("useSendQuestionnaireReminder", () => {
    it("sends reminder for questionnaire", async () => {
      const { result } = renderHook(() => useSendQuestionnaireReminder(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(1);
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("useUpdateEventQuestionnaire", () => {
    it("updates event questionnaire successfully", async () => {
      const { result } = renderHook(() => useUpdateEventQuestionnaire(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { status: "COMPLETED" },
        });
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("useDeleteEventQuestionnaire", () => {
    it("deletes event questionnaire successfully", async () => {
      const { result } = renderHook(() => useDeleteEventQuestionnaire(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });
});
