// frontend/admin-crm/src/hooks/useWorkflows.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useWorkflowTemplates,
  useWorkflowStages,
  useWorkflowTriggers,
  useWorkflowWebhooks,
} from "./useWorkflows";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useWorkflowTemplates", () => {
  describe("Query Operations", () => {
    it("fetches workflow templates successfully", async () => {
      const { result } = renderHook(() => useWorkflowTemplates(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.isLoadingTemplates).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoadingTemplates).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.templates.length).toBeGreaterThan(0);
      expect(result.current.totalCount).toBeGreaterThan(0);
      expect(result.current.templates[0]).toHaveProperty("name");
      expect(result.current.templates[0]).toHaveProperty("is_active");
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/workflows/templates/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useWorkflowTemplates(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.templatesError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      expect(result.current.isLoadingTemplates).toBe(false);
    });

    it("returns pagination metadata", async () => {
      const { result } = renderHook(() => useWorkflowTemplates(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingTemplates).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(typeof result.current.totalCount).toBe("number");
      expect(typeof result.current.pageCount).toBe("number");
    });
  });

  describe("Mutation Operations", () => {
    it("creates a template", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingTemplates).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createTemplate({
          name: "New Workflow",
          description: "Test workflow",
          event_type: 1,
          is_active: true,
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingTemplate).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.createError).toBeFalsy();
    });

    it("updates a template", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingTemplates).toBe(false);
          expect(result.current.templates.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const template = result.current.templates[0];

      act(() => {
        result.current.updateTemplate({
          id: template.id,
          data: { name: "Updated Workflow" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingTemplate).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateError).toBeFalsy();
    });

    it("deletes a template", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingTemplates).toBe(false);
          expect(result.current.templates.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.deleteTemplate(result.current.templates[0].id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingTemplate).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.deleteError).toBeFalsy();
    });

    it("duplicates a template", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingTemplates).toBe(false);
          expect(result.current.templates.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.duplicateTemplate({
          id: result.current.templates[0].id,
          newName: "Duplicated Workflow",
        });
      });

      await waitFor(
        () => {
          expect(result.current.isDuplicatingTemplate).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.duplicateError).toBeFalsy();
    });
  });
});

describe("useWorkflowStages", () => {
  it("fetches stages successfully", async () => {
    const { result } = renderHook(() => useWorkflowStages(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingStages).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingStages).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.stages)).toBe(true);
  });

  it("handles stages API error", async () => {
    server.use(
      http.get(`${BASE_URL}/workflows/stages/`, () => {
        return HttpResponse.json({ detail: "Server error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useWorkflowStages(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.stagesError).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("creates a stage", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorkflowStages(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingStages).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createStage({
        template: 1,
        name: "New Stage",
        stage: "INQUIRY",
        order: 1,
        automation_type: "SEND_EMAIL",
      });
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingStage).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.createStageError).toBeFalsy();
  });

  it("deletes a stage", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorkflowStages(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingStages).toBe(false);
        expect(result.current.stages.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.deleteStage(result.current.stages[0].id);
    });

    await waitFor(
      () => {
        expect(result.current.isDeletingStage).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.deleteStageError).toBeFalsy();
  });
});

describe("useWorkflowTriggers", () => {
  it("fetches triggers successfully", async () => {
    const { result } = renderHook(() => useWorkflowTriggers(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingTriggers).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingTriggers).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.triggers)).toBe(true);
    expect(result.current.triggersError).toBeFalsy();
  });

  it("triggers a stage manually", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorkflowTriggers(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingTriggers).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.manualTrigger({ stageId: 1, eventId: 1 });
    });

    await waitFor(
      () => {
        expect(result.current.isTriggering).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.triggerError).toBeFalsy();
  });
});

describe("useWorkflowWebhooks", () => {
  it("fetches webhooks successfully", async () => {
    const { result } = renderHook(() => useWorkflowWebhooks(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingWebhooks).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingWebhooks).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.webhooks)).toBe(true);
    expect(result.current.webhooksError).toBeFalsy();
  });

  it("creates a webhook", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorkflowWebhooks(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingWebhooks).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createWebhook({
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["STAGE_COMPLETED"],
        workflow_template: 1,
        is_active: true,
        headers: {},
      });
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingWebhook).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.createWebhookError).toBeFalsy();
  });

  it("deletes a webhook", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorkflowWebhooks(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingWebhooks).toBe(false);
        expect(result.current.webhooks.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.deleteWebhook(result.current.webhooks[0].id);
    });

    await waitFor(
      () => {
        expect(result.current.isDeletingWebhook).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.deleteWebhookError).toBeFalsy();
  });

  it("tests a webhook", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorkflowWebhooks(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingWebhooks).toBe(false);
        expect(result.current.webhooks.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.testWebhook(result.current.webhooks[0].id);
    });

    await waitFor(
      () => {
        expect(result.current.isTestingWebhook).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.testWebhookError).toBeFalsy();
  });
});
