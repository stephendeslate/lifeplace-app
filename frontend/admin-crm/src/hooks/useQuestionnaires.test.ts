// frontend/admin-crm/src/hooks/useQuestionnaires.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useQuestionnaires,
  useQuestionnaireFields,
  useQuestionnaireResponses,
} from "./useQuestionnaires";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useQuestionnaires", () => {
  describe("Query Operations", () => {
    it("fetches questionnaires successfully", async () => {
      const { result } = renderHook(() => useQuestionnaires(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.isLoadingQuestionnaires).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoadingQuestionnaires).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.questionnaires.length).toBeGreaterThan(0);
      expect(result.current.totalCount).toBeGreaterThan(0);
      expect(result.current.questionnaires[0]).toHaveProperty("name");
      expect(result.current.questionnaires[0]).toHaveProperty("is_active");
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/questionnaires/questionnaires/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useQuestionnaires(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.questionnairesError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      expect(result.current.isLoadingQuestionnaires).toBe(false);
    });

    it("returns pagination metadata", async () => {
      const { result } = renderHook(() => useQuestionnaires(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingQuestionnaires).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(typeof result.current.totalCount).toBe("number");
      expect(typeof result.current.pageCount).toBe("number");
      expect(result.current.pageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Mutation Operations", () => {
    it("creates a questionnaire", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useQuestionnaires(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingQuestionnaires).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createQuestionnaire({
          name: "New Questionnaire",
          event_type: 1,
          is_active: true,
          order: 1,
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingQuestionnaire).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.createError).toBeFalsy();
    });

    it("updates a questionnaire", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useQuestionnaires(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingQuestionnaires).toBe(false);
          expect(result.current.questionnaires.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const questionnaire = result.current.questionnaires[0];

      act(() => {
        result.current.updateQuestionnaire({
          id: questionnaire.id,
          data: { name: "Updated Questionnaire" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingQuestionnaire).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateError).toBeFalsy();
    });

    it("deletes a questionnaire", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useQuestionnaires(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingQuestionnaires).toBe(false);
          expect(result.current.questionnaires.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.deleteQuestionnaire(result.current.questionnaires[0].id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingQuestionnaire).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.deleteError).toBeFalsy();
    });

    it("reorders questionnaires", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useQuestionnaires(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingQuestionnaires).toBe(false);
          expect(result.current.questionnaires.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const ids = result.current.questionnaires.map((q) => q.id).reverse();

      act(() => {
        result.current.reorderQuestionnaires({ questionnaire_ids: ids });
      });

      await waitFor(
        () => {
          expect(result.current.isReorderingQuestionnaires).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.reorderError).toBeFalsy();
    });
  });
});

describe("useQuestionnaireFields", () => {
  it("fetches fields successfully", async () => {
    const { result } = renderHook(() => useQuestionnaireFields(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingFields).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingFields).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.fields)).toBe(true);
    expect(result.current.fieldsError).toBeFalsy();
  });

  it("creates a field", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useQuestionnaireFields(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingFields).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createField({
        questionnaire: 1,
        name: "New Field",
        type: "text",
        required: true,
        order: 1,
      });
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingField).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.createFieldError).toBeFalsy();
  });

  it("deletes a field", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useQuestionnaireFields(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingFields).toBe(false);
        expect(result.current.fields.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.deleteField(result.current.fields[0].id);
    });

    await waitFor(
      () => {
        expect(result.current.isDeletingField).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.deleteFieldError).toBeFalsy();
  });
});

describe("useQuestionnaireResponses", () => {
  it("fetches responses successfully", async () => {
    const { result } = renderHook(() => useQuestionnaireResponses(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingResponses).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingResponses).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.responses)).toBe(true);
    expect(result.current.responsesError).toBeFalsy();
  });

  it("handles responses API error", async () => {
    server.use(
      http.get(`${BASE_URL}/questionnaires/responses/`, () => {
        return HttpResponse.json({ detail: "Server error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useQuestionnaireResponses(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.responsesError).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("saves event responses", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useQuestionnaireResponses(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingResponses).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.saveEventResponses({
        event_id: 1,
        responses: [
          { field: 1, value: "Answer 1" },
          { field: 2, value: "Answer 2" },
        ],
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSavingEventResponses).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.saveEventResponsesError).toBeFalsy();
  });
});
