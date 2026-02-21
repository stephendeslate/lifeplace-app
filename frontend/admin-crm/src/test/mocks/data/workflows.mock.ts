import type {
  WorkflowTemplate,
  WorkflowStage,
  WorkflowWebhook,
  StageType,
  AutomationType,
  WebhookEventType,
} from "../../../types/workflows.types";

export function createMockWorkflowTemplate(
  overrides: Partial<WorkflowTemplate> = {},
): WorkflowTemplate {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Workflow Template ${id}`,
    description: `Workflow template description ${id}`,
    event_type: 1,
    event_type_name: "Wedding",
    is_active: true,
    lead_stage_auto_stop: true,
    stages_count: 5,
    events_using_count: 3,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockWorkflowTemplates(count: number): WorkflowTemplate[] {
  const names = [
    "Wedding Full Pipeline",
    "Corporate Event Flow",
    "Quick Booking Flow",
    "VIP Client Pipeline",
    "Team Building Workflow",
  ];
  return Array.from({ length: count }, (_, i) =>
    createMockWorkflowTemplate({
      id: i + 1,
      name: names[i % names.length],
      is_active: i % 4 !== 0,
      stages_count: 3 + (i % 5),
      events_using_count: i * 2,
    }),
  );
}

export const mockWorkflowTemplates = createMockWorkflowTemplates(5);

export function createMockWorkflowStage(
  overrides: Partial<WorkflowStage> = {},
): WorkflowStage {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const stage: StageType = overrides.stage || "LEAD";
  const stageDisplayMap: Record<StageType, string> = {
    LEAD: "Lead",
    PRODUCTION: "Production",
    POST_PRODUCTION: "Post-Production",
  };
  const automationType: AutomationType = overrides.automation_type || "EMAIL";
  return {
    id,
    template: 1,
    name: `Stage ${id}`,
    stage,
    stage_display: stageDisplayMap[stage],
    order: overrides.order || 1,
    is_automated: true,
    automation_type: automationType,
    trigger_time: "ON_CREATION",
    trigger_after_stage: null,
    email_template: automationType === "EMAIL" ? 1 : null,
    contract_template: automationType === "CONTRACT" ? 1 : null,
    questionnaire_template: automationType === "QUESTIONNAIRE" ? 1 : null,
    task_description: automationType === "TASK" ? "Complete this task" : "",
    progression_condition: "",
    required_tasks_completed: false,
    trigger_on_payment_received: false,
    trigger_on_quote_accepted: false,
    trigger_on_contract_signed: false,
    trigger_on_event_created: false,
    trigger_on_quote_sent: false,
    metadata: {},
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockWorkflowStages(count: number): WorkflowStage[] {
  const stageConfigs: Array<{
    name: string;
    stage: StageType;
    automationType: AutomationType;
  }> = [
    { name: "Send Welcome Email", stage: "LEAD", automationType: "EMAIL" },
    { name: "Generate Quote", stage: "LEAD", automationType: "QUOTE" },
    {
      name: "Send Contract",
      stage: "PRODUCTION",
      automationType: "CONTRACT",
    },
    {
      name: "Send Questionnaire",
      stage: "PRODUCTION",
      automationType: "QUESTIONNAIRE",
    },
    {
      name: "Thank You Email",
      stage: "POST_PRODUCTION",
      automationType: "EMAIL",
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = stageConfigs[i % stageConfigs.length];
    return createMockWorkflowStage({
      id: i + 1,
      name: config.name,
      stage: config.stage,
      automation_type: config.automationType,
      order: i + 1,
    });
  });
}

export const mockWorkflowStages = createMockWorkflowStages(5);

export function createMockWorkflowWebhook(
  overrides: Partial<WorkflowWebhook> = {},
): WorkflowWebhook {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Webhook ${id}`,
    url: `https://example.com/webhooks/${id}`,
    secret: "whsec_test_secret_key",
    is_active: true,
    events: ["STAGE_COMPLETED"] as WebhookEventType[],
    workflow_template: 1,
    workflow_template_name: "Wedding Full Pipeline",
    headers: { "Content-Type": "application/json" },
    last_triggered_at: "2024-06-15T10:00:00Z",
    failure_count: 0,
    delivery_count: 25,
    success_rate: 100,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockWorkflowWebhooks(count: number): WorkflowWebhook[] {
  const webhookEvents: WebhookEventType[][] = [
    ["STAGE_ENTERED", "STAGE_COMPLETED"],
    ["AUTOMATION_EXECUTED"],
    ["WORKFLOW_COMPLETED"],
    ["STAGE_COMPLETED", "WORKFLOW_COMPLETED"],
    ["STAGE_ENTERED"],
  ];
  return Array.from({ length: count }, (_, i) =>
    createMockWorkflowWebhook({
      id: i + 1,
      name: `Webhook ${i + 1}`,
      events: webhookEvents[i % webhookEvents.length],
      is_active: i % 3 !== 0,
      failure_count: i % 4 === 0 ? 3 : 0,
    }),
  );
}

export const mockWorkflowWebhooks = createMockWorkflowWebhooks(5);
