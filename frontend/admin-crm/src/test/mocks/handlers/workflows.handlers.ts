// frontend/admin-crm/src/test/mocks/handlers/workflows.handlers.ts

import { http, HttpResponse, delay } from "msw";
import {
  mockWorkflowTemplates,
  mockWorkflowStages,
  mockWorkflowWebhooks,
  createMockWorkflowTemplate,
  createMockWorkflowStage,
  createMockWorkflowWebhook,
} from "../data/workflows.mock";
import type {
  CreateWorkflowTemplateData,
  UpdateWorkflowTemplateData,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  CreateWorkflowWebhookData,
  UpdateWorkflowWebhookData,
  WorkflowTrigger,
  EventWorkflowOverride,
  WebhookEventType,
} from "../../../types/workflows.types";

const BASE_URL = "http://localhost:8000/api";

// Mutable stores for testing mutations
let templatesStore = [...mockWorkflowTemplates];
let stagesStore = [...mockWorkflowStages];
let webhooksStore = [...mockWorkflowWebhooks];
const triggersStore: WorkflowTrigger[] = [
  {
    id: 1,
    event: 1,
    event_name: "Smith Wedding",
    stage: 1,
    stage_name: "Send Welcome Email",
    trigger_type: "EVENT_CREATED",
    trigger_type_display: "Event Created",
    details: "Event created trigger",
    result_data: {},
    processed: false,
    processed_at: null,
    created_at: "2024-06-15T10:00:00Z",
  },
];
const overridesStore: EventWorkflowOverride[] = [
  {
    id: 1,
    event: 1,
    event_name: "Smith Wedding",
    stage: 1,
    stage_name: "Send Welcome Email",
    override_type: "SKIP",
    override_type_display: "Skip Stage",
    custom_trigger_time: "",
    custom_stage_name: "",
    custom_stage_category: "",
    custom_order: null,
    custom_is_automated: false,
    custom_automation_type: "",
    custom_email_template: null,
    custom_task_description: "",
    reason: "Client already contacted",
    executed: false,
    executed_at: null,
    created_by: 1,
    created_by_name: "Admin User",
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
];

export const resetWorkflowsStore = () => {
  templatesStore = [...mockWorkflowTemplates];
  stagesStore = [...mockWorkflowStages];
  webhooksStore = [...mockWorkflowWebhooks];
};

export const workflowsHandlers = [
  // === Workflow Templates ===

  // GET /api/workflows/templates/
  http.get(`${BASE_URL}/workflows/templates/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const eventType = url.searchParams.get("event_type");
    const isActive = url.searchParams.get("is_active");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "25");

    let filtered = [...templatesStore];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower),
      );
    }
    if (eventType) {
      filtered = filtered.filter((t) => t.event_type === parseInt(eventType));
    }
    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === "true";
      filtered = filtered.filter((t) => t.is_active === isActiveBool);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedResults = filtered.slice(start, end);

    return HttpResponse.json({
      count: filtered.length,
      next:
        end < filtered.length
          ? `${BASE_URL}/workflows/templates/?page=${page + 1}`
          : null,
      previous:
        page > 1 ? `${BASE_URL}/workflows/templates/?page=${page - 1}` : null,
      results: paginatedResults,
    });
  }),

  // GET /api/workflows/templates/active/
  http.get(`${BASE_URL}/workflows/templates/active/`, async () => {
    await delay(30);
    const activeTemplates = templatesStore.filter((t) => t.is_active);
    return HttpResponse.json(activeTemplates);
  }),

  // GET /api/workflows/templates/:id/
  http.get(`${BASE_URL}/workflows/templates/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const template = templatesStore.find((t) => t.id === id);

    if (!template) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(template);
  }),

  // POST /api/workflows/templates/
  http.post(`${BASE_URL}/workflows/templates/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateWorkflowTemplateData;
    const newTemplate = createMockWorkflowTemplate({
      id: templatesStore.length + 1,
      name: body.name,
      description: body.description || "",
      event_type: body.event_type,
      is_active: body.is_active ?? true,
    });

    templatesStore.push(newTemplate);
    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  // PATCH /api/workflows/templates/:id/
  http.patch(
    `${BASE_URL}/workflows/templates/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = templatesStore.findIndex((t) => t.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateWorkflowTemplateData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      templatesStore[idx] = { ...templatesStore[idx], ...(updates as any) };
      return HttpResponse.json(templatesStore[idx]);
    },
  ),

  // DELETE /api/workflows/templates/:id/
  http.delete(`${BASE_URL}/workflows/templates/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = templatesStore.findIndex((t) => t.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    templatesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/workflows/templates/:id/duplicate/
  http.post(
    `${BASE_URL}/workflows/templates/:id/duplicate/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const original = templatesStore.find((t) => t.id === id);

      if (!original) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { name?: string };
      const duplicated = createMockWorkflowTemplate({
        ...original,
        id: templatesStore.length + 1,
        name: body.name || `${original.name} (Copy)`,
      });

      templatesStore.push(duplicated);
      return HttpResponse.json(duplicated, { status: 201 });
    },
  ),

  // GET /api/workflows/templates/:id/stages/
  http.get(
    `${BASE_URL}/workflows/templates/:templateId/stages/`,
    async ({ params }) => {
      await delay(30);

      const templateId = parseInt(params.templateId as string);
      const stages = stagesStore.filter((s) => s.template === templateId);
      return HttpResponse.json(stages);
    },
  ),

  // === Workflow Stages ===

  // GET /api/workflows/stages/
  http.get(`${BASE_URL}/workflows/stages/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const templateId = url.searchParams.get("template_id");
    const stage = url.searchParams.get("stage");

    let filtered = [...stagesStore];

    if (templateId) {
      filtered = filtered.filter((s) => s.template === parseInt(templateId));
    }
    if (stage) {
      filtered = filtered.filter((s) => s.stage === stage);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/workflows/stages/:id/
  http.get(`${BASE_URL}/workflows/stages/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const stage = stagesStore.find((s) => s.id === id);

    if (!stage) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(stage);
  }),

  // POST /api/workflows/stages/
  http.post(`${BASE_URL}/workflows/stages/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateWorkflowStageData;
    const newStage = createMockWorkflowStage({
      id: stagesStore.length + 1,
      template: body.template,
      name: body.name,
      stage: body.stage,
      order: body.order || stagesStore.length + 1,
      automation_type: body.automation_type,
    });

    stagesStore.push(newStage);
    return HttpResponse.json(newStage, { status: 201 });
  }),

  // PATCH /api/workflows/stages/:id/
  http.patch(
    `${BASE_URL}/workflows/stages/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = stagesStore.findIndex((s) => s.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateWorkflowStageData;
      stagesStore[idx] = { ...stagesStore[idx], ...updates };
      return HttpResponse.json(stagesStore[idx]);
    },
  ),

  // DELETE /api/workflows/stages/:id/
  http.delete(`${BASE_URL}/workflows/stages/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = stagesStore.findIndex((s) => s.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    stagesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/workflows/stages/reorder/
  http.post(`${BASE_URL}/workflows/stages/reorder/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as { stage_ids: number[] };
    body.stage_ids.forEach((stageId, index) => {
      const stage = stagesStore.find((s) => s.id === stageId);
      if (stage) {
        stage.order = index + 1;
      }
    });

    return HttpResponse.json(stagesStore.sort((a, b) => a.order - b.order));
  }),

  // POST /api/workflows/stages/:id/trigger/
  http.post(
    `${BASE_URL}/workflows/stages/:id/trigger/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const stage = stagesStore.find((s) => s.id === id);

      if (!stage) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { event_id: number };
      return HttpResponse.json({
        success: true,
        message: `Stage "${stage.name}" triggered for event ${body.event_id}`,
        trigger_id: triggersStore.length + 1,
      });
    },
  ),

  // === Workflow Triggers ===

  // GET /api/workflows/triggers/
  http.get(`${BASE_URL}/workflows/triggers/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const eventId = url.searchParams.get("event_id");
    const templateId = url.searchParams.get("template_id");
    const triggerType = url.searchParams.get("trigger_type");
    const processed = url.searchParams.get("processed");

    let filtered = [...triggersStore];

    if (eventId) {
      filtered = filtered.filter((t) => t.event === parseInt(eventId));
    }
    if (templateId) {
      // Filter by stage (template_id is used as a query param, but we filter by stage presence)
      filtered = filtered.filter((t) => t.stage !== null);
    }
    if (triggerType) {
      filtered = filtered.filter((t) => t.trigger_type === triggerType);
    }
    if (processed !== null && processed !== undefined) {
      const processedBool = processed === "true";
      filtered = filtered.filter((t) => t.processed === processedBool);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/workflows/triggers/:id/
  http.get(`${BASE_URL}/workflows/triggers/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const trigger = triggersStore.find((t) => t.id === id);

    if (!trigger) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(trigger);
  }),

  // === Event Workflow Overrides ===

  // GET /api/workflows/overrides/
  http.get(`${BASE_URL}/workflows/overrides/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const eventId = url.searchParams.get("event_id");
    const stageId = url.searchParams.get("stage_id");
    const overrideType = url.searchParams.get("override_type");
    const executed = url.searchParams.get("executed");

    let filtered = [...overridesStore];

    if (eventId) {
      filtered = filtered.filter((o) => o.event === parseInt(eventId));
    }
    if (stageId) {
      filtered = filtered.filter((o) => o.stage === parseInt(stageId));
    }
    if (overrideType) {
      filtered = filtered.filter((o) => o.override_type === overrideType);
    }
    if (executed !== null && executed !== undefined) {
      const executedBool = executed === "true";
      filtered = filtered.filter((o) => o.executed === executedBool);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/workflows/overrides/for_event/
  http.get(
    `${BASE_URL}/workflows/overrides/for_event/`,
    async ({ request }) => {
      await delay(30);

      const url = new URL(request.url);
      const eventId = url.searchParams.get("event_id");

      const filtered = eventId
        ? overridesStore.filter((o) => o.event === parseInt(eventId))
        : overridesStore;

      return HttpResponse.json(filtered);
    },
  ),

  // GET /api/workflows/overrides/:id/
  http.get(`${BASE_URL}/workflows/overrides/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const override = overridesStore.find((o) => o.id === id);

    if (!override) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(override);
  }),

  // POST /api/workflows/overrides/
  http.post(`${BASE_URL}/workflows/overrides/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newOverride: EventWorkflowOverride = {
      id: overridesStore.length + 1,
      event: body.event as number,
      event_name: "Event",
      stage: body.stage as number,
      stage_name: "Stage",
      override_type: ((body.override_type as string) || "SKIP") as "SKIP" | "DISABLE_AUTOMATION" | "CUSTOM_TIMING" | "ADD_STAGE",
      override_type_display: "",
      custom_trigger_time: "",
      custom_stage_name: "",
      custom_stage_category: "" as const,
      custom_order: null,
      custom_is_automated: false,
      custom_automation_type: "",
      custom_email_template: null,
      custom_task_description: "",
      reason: (body.reason as string) || "",
      executed: false,
      executed_at: null,
      created_by: 1,
      created_by_name: "Admin User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    overridesStore.push(newOverride);
    return HttpResponse.json(newOverride, { status: 201 });
  }),

  // PATCH /api/workflows/overrides/:id/
  http.patch(
    `${BASE_URL}/workflows/overrides/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = overridesStore.findIndex((o) => o.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      overridesStore[idx] = {
        ...overridesStore[idx],
        ...updates,
      } as EventWorkflowOverride;
      return HttpResponse.json(overridesStore[idx]);
    },
  ),

  // DELETE /api/workflows/overrides/:id/
  http.delete(`${BASE_URL}/workflows/overrides/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = overridesStore.findIndex((o) => o.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    overridesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/workflows/overrides/skip_stage/
  http.post(
    `${BASE_URL}/workflows/overrides/skip_stage/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as {
        event_id: number;
        stage_id: number;
        reason?: string;
      };
      const newOverride: EventWorkflowOverride = {
        id: overridesStore.length + 1,
        event: body.event_id,
        event_name: "Event",
        stage: body.stage_id,
        stage_name: "Stage",
        override_type: "SKIP",
        override_type_display: "Skip Stage",
        custom_trigger_time: "",
        custom_stage_name: "",
        custom_stage_category: "",
        custom_order: null,
        custom_is_automated: false,
        custom_automation_type: "",
        custom_email_template: null,
        custom_task_description: "",
        reason: body.reason || "",
        executed: false,
        executed_at: null,
        created_by: 1,
        created_by_name: "Admin User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      overridesStore.push(newOverride);
      return HttpResponse.json(newOverride, { status: 201 });
    },
  ),

  // POST /api/workflows/overrides/disable_automation/
  http.post(
    `${BASE_URL}/workflows/overrides/disable_automation/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as {
        event_id: number;
        stage_id: number;
        reason?: string;
      };
      const newOverride: EventWorkflowOverride = {
        id: overridesStore.length + 1,
        event: body.event_id,
        event_name: "Event",
        stage: body.stage_id,
        stage_name: "Stage",
        override_type: "DISABLE_AUTOMATION",
        override_type_display: "Disable Automation",
        custom_trigger_time: "",
        custom_stage_name: "",
        custom_stage_category: "",
        custom_order: null,
        custom_is_automated: false,
        custom_automation_type: "",
        custom_email_template: null,
        custom_task_description: "",
        reason: body.reason || "",
        executed: false,
        executed_at: null,
        created_by: 1,
        created_by_name: "Admin User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      overridesStore.push(newOverride);
      return HttpResponse.json(newOverride, { status: 201 });
    },
  ),

  // === Workflow Webhooks ===

  // GET /api/workflows/webhooks/
  http.get(`${BASE_URL}/workflows/webhooks/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const templateId = url.searchParams.get("workflow_template_id");
    const isActive = url.searchParams.get("is_active");

    let filtered = [...webhooksStore];

    if (templateId) {
      filtered = filtered.filter(
        (w) => w.workflow_template === parseInt(templateId),
      );
    }
    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === "true";
      filtered = filtered.filter((w) => w.is_active === isActiveBool);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/workflows/webhooks/event_types/
  http.get(`${BASE_URL}/workflows/webhooks/event_types/`, async () => {
    await delay(30);
    return HttpResponse.json([
      { value: "STAGE_ENTERED", label: "Stage Entered" },
      { value: "STAGE_COMPLETED", label: "Stage Completed" },
      { value: "AUTOMATION_EXECUTED", label: "Automation Executed" },
      { value: "WORKFLOW_COMPLETED", label: "Workflow Completed" },
    ]);
  }),

  // GET /api/workflows/webhooks/:id/
  http.get(`${BASE_URL}/workflows/webhooks/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const webhook = webhooksStore.find((w) => w.id === id);

    if (!webhook) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(webhook);
  }),

  // POST /api/workflows/webhooks/
  http.post(`${BASE_URL}/workflows/webhooks/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateWorkflowWebhookData;
    const newWebhook = createMockWorkflowWebhook({
      id: webhooksStore.length + 1,
      name: body.name,
      url: body.url,
      events: body.events as WebhookEventType[],
      workflow_template: body.workflow_template,
      is_active: body.is_active ?? true,
      headers: body.headers || {},
    });

    webhooksStore.push(newWebhook);
    return HttpResponse.json(newWebhook, { status: 201 });
  }),

  // PATCH /api/workflows/webhooks/:id/
  http.patch(
    `${BASE_URL}/workflows/webhooks/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = webhooksStore.findIndex((w) => w.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateWorkflowWebhookData;
      webhooksStore[idx] = { ...webhooksStore[idx], ...updates };
      return HttpResponse.json(webhooksStore[idx]);
    },
  ),

  // DELETE /api/workflows/webhooks/:id/
  http.delete(`${BASE_URL}/workflows/webhooks/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = webhooksStore.findIndex((w) => w.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    webhooksStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/workflows/webhooks/:id/test/
  http.post(`${BASE_URL}/workflows/webhooks/:id/test/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const webhook = webhooksStore.find((w) => w.id === id);

    if (!webhook) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json({
      message: "Test delivery sent successfully",
      delivery: {
        id: 1,
        webhook: id,
        event_type: "STAGE_COMPLETED",
        payload: { test: true },
        response_status: 200,
        response_body: '{"ok": true}',
        status: "SUCCESS",
        attempted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 150,
        created_at: new Date().toISOString(),
      },
    });
  }),

  // GET /api/workflows/webhooks/:id/deliveries/
  http.get(
    `${BASE_URL}/workflows/webhooks/:webhookId/deliveries/`,
    async ({ request }) => {
      await delay(30);

      const url = new URL(request.url);
      const status = url.searchParams.get("status");
      const eventType = url.searchParams.get("event_type");

      let deliveries = [
        {
          id: 1,
          webhook: 1,
          event_type: "STAGE_COMPLETED" as const,
          payload: { stage_id: 1, event_id: 1 },
          response_status: 200,
          response_body: '{"ok": true}',
          status: "SUCCESS" as const,
          attempted_at: "2024-06-15T10:00:00Z",
          completed_at: "2024-06-15T10:00:01Z",
          duration_ms: 150,
          created_at: "2024-06-15T10:00:00Z",
        },
        {
          id: 2,
          webhook: 1,
          event_type: "STAGE_ENTERED" as const,
          payload: { stage_id: 2, event_id: 1 },
          response_status: 500,
          response_body: "Internal Server Error",
          status: "FAILED" as const,
          attempted_at: "2024-06-15T11:00:00Z",
          completed_at: "2024-06-15T11:00:02Z",
          duration_ms: 2000,
          created_at: "2024-06-15T11:00:00Z",
        },
      ];

      if (status) {
        deliveries = deliveries.filter((d) => d.status === status);
      }
      if (eventType) {
        deliveries = deliveries.filter((d) => d.event_type === eventType);
      }

      return HttpResponse.json(deliveries);
    },
  ),
];
