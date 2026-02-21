import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { workflowsApi } from "./workflows.api";

vi.mock("../utils/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("workflowsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Templates
  describe("getWorkflowTemplates", () => {
    it("builds query params for search, event_type, is_active, page, page_size, ordering", async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await workflowsApi.getWorkflowTemplates({
        search: "wedding",
        event_type: 2,
        is_active: true,
        page: 1,
        page_size: 10,
        ordering: "-name",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/workflows/templates/?");
      expect(url).toContain("search=wedding");
      expect(url).toContain("event_type=2");
      expect(url).toContain("is_active=true");
      expect(url).toContain("page=1");
      expect(url).toContain("page_size=10");
      expect(url).toContain("ordering=-name");
    });
  });

  describe("getWorkflowTemplate", () => {
    it("calls GET with template id", async () => {
      mockApi.get.mockResolvedValue({ data: { id: 3 } });

      const result = await workflowsApi.getWorkflowTemplate(3);

      expect(mockApi.get).toHaveBeenCalledWith("/workflows/templates/3/");
      expect(result).toEqual({ id: 3 });
    });
  });

  describe("createWorkflowTemplate", () => {
    it("calls POST with template data", async () => {
      const data = { name: "New Workflow" };
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      const result = await workflowsApi.createWorkflowTemplate(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/workflows/templates/", data);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe("duplicateWorkflowTemplate", () => {
    it("sends name when provided", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 10 } });

      await workflowsApi.duplicateWorkflowTemplate(5, "Copy");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/workflows/templates/5/duplicate/",
        { name: "Copy" },
      );
    });

    it("sends empty object when no name provided", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 10 } });

      await workflowsApi.duplicateWorkflowTemplate(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/workflows/templates/5/duplicate/",
        {},
      );
    });
  });

  describe("deleteWorkflowTemplate", () => {
    it("calls DELETE with template id", async () => {
      mockApi.delete.mockResolvedValue({});

      await workflowsApi.deleteWorkflowTemplate(3);

      expect(mockApi.delete).toHaveBeenCalledWith("/workflows/templates/3/");
    });
  });

  // Stages
  describe("getWorkflowStages", () => {
    it("builds query params with template_id and stage (mapped from stage_type)", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await workflowsApi.getWorkflowStages({
        template_id: 5,
        stage_type: "confirmation",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/workflows/stages/");
      expect(url).toContain("template_id=5");
      expect(url).toContain("stage=confirmation");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("reorderWorkflowStages", () => {
    it("calls POST with reorder data", async () => {
      const data = { template_id: 1, order: [3, 1, 2] };
      mockApi.post.mockResolvedValue({ data: [] });

      await workflowsApi.reorderWorkflowStages(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/workflows/stages/reorder/",
        data,
      );
    });
  });

  describe("getStagesForTemplate", () => {
    it("calls GET on template stages endpoint", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await workflowsApi.getStagesForTemplate(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/workflows/templates/5/stages/",
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // Triggers
  describe("getWorkflowTriggers", () => {
    it("builds query params for all trigger filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      await workflowsApi.getWorkflowTriggers({
        event_id: 10,
        template_id: 5,
        trigger_type: "manual",
        processed: false,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("event_id=10");
      expect(url).toContain("template_id=5");
      expect(url).toContain("trigger_type=manual");
      expect(url).toContain("processed=false");
    });
  });

  describe("manuallyTriggerStage", () => {
    it("calls POST with event_id in body", async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      const result = await workflowsApi.manuallyTriggerStage(3, 10);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/workflows/stages/3/trigger/",
        { event_id: 10 },
      );
      expect(result).toEqual({ success: true });
    });
  });

  // Overrides
  describe("getWorkflowOverrides", () => {
    it("builds query params for all override filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      await workflowsApi.getWorkflowOverrides({
        event_id: 10,
        stage_id: 5,
        override_type: "skip",
        executed: true,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("event_id=10");
      expect(url).toContain("stage_id=5");
      expect(url).toContain("override_type=skip");
      expect(url).toContain("executed=true");
    });
  });

  describe("skipStageForEvent", () => {
    it("calls POST to skip_stage with event, stage, and reason", async () => {
      mockApi.post.mockResolvedValue({
        data: { id: 1, override_type: "skip" },
      });

      const result = await workflowsApi.skipStageForEvent(10, 5, "Not needed");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/workflows/overrides/skip_stage/",
        {
          event_id: 10,
          stage_id: 5,
          reason: "Not needed",
        },
      );
      expect(result).toEqual({ id: 1, override_type: "skip" });
    });
  });

  describe("disableAutomationForEvent", () => {
    it("calls POST to disable_automation endpoint", async () => {
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      await workflowsApi.disableAutomationForEvent(10, 5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/workflows/overrides/disable_automation/",
        {
          event_id: 10,
          stage_id: 5,
          reason: "",
        },
      );
    });
  });

  // Webhooks
  describe("getWorkflowWebhooks", () => {
    it("builds query params for webhook filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      await workflowsApi.getWorkflowWebhooks({
        workflow_template_id: 3,
        is_active: true,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("workflow_template_id=3");
      expect(url).toContain("is_active=true");
    });
  });

  describe("testWorkflowWebhook", () => {
    it("calls POST and returns delivery from nested response", async () => {
      const delivery = { id: 1, status: "success" };
      mockApi.post.mockResolvedValue({ data: { message: "ok", delivery } });

      const result = await workflowsApi.testWorkflowWebhook(5);

      expect(mockApi.post).toHaveBeenCalledWith("/workflows/webhooks/5/test/");
      expect(result).toEqual(delivery);
    });
  });

  describe("getWebhookDeliveries", () => {
    it("calls GET with webhook id and filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      await workflowsApi.getWebhookDeliveries(5, {
        status: "failed",
        event_type: "event.created",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/workflows/webhooks/5/deliveries/");
      expect(url).toContain("status=failed");
      expect(url).toContain("event_type=event.created");
    });
  });

  describe("getWebhookEventTypes", () => {
    it("calls GET on event_types endpoint", async () => {
      mockApi.get.mockResolvedValue({
        data: [{ value: "event.created", label: "Event Created" }],
      });

      const result = await workflowsApi.getWebhookEventTypes();

      expect(mockApi.get).toHaveBeenCalledWith(
        "/workflows/webhooks/event_types/",
      );
      expect(result).toEqual([
        { value: "event.created", label: "Event Created" },
      ]);
    });
  });
});
