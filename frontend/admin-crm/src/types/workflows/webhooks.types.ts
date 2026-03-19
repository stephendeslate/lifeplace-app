// frontend/admin-crm/src/types/workflows/webhooks.types.ts
// Webhook types and delivery status

// Webhook Types
export type WebhookEventType =
  | 'STAGE_ENTERED'
  | 'STAGE_COMPLETED'
  | 'AUTOMATION_EXECUTED'
  | 'WORKFLOW_COMPLETED';

export const WEBHOOK_EVENT_TYPES = [
  {
    value: 'STAGE_ENTERED',
    label: 'Stage Entered',
    description: 'Triggered when a workflow enters a new stage',
  },
  {
    value: 'STAGE_COMPLETED',
    label: 'Stage Completed',
    description: 'Triggered when a workflow stage is completed',
  },
  {
    value: 'AUTOMATION_EXECUTED',
    label: 'Automation Executed',
    description: 'Triggered when a stage automation runs',
  },
  {
    value: 'WORKFLOW_COMPLETED',
    label: 'Workflow Completed',
    description: 'Triggered when an entire workflow completes',
  },
] as const;

export type WebhookDeliveryStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';

export interface WorkflowWebhook {
  id: number;
  name: string;
  url: string;
  secret: string;
  is_active: boolean;
  events: WebhookEventType[];
  workflow_template: number | null;
  workflow_template_name?: string;
  headers: Record<string, string>;
  last_triggered_at: string | null;
  failure_count: number;
  delivery_count?: number;
  success_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWebhookDelivery {
  id: number;
  webhook: number;
  webhook_name?: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  response_status_code: number | null;
  response_body: string;
  error_message: string;
  attempt_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowWebhookData {
  name: string;
  url: string;
  secret?: string;
  is_active?: boolean;
  events: WebhookEventType[];
  workflow_template?: number | null;
  headers?: Record<string, string>;
}

export type UpdateWorkflowWebhookData = Partial<CreateWorkflowWebhookData>;

export interface WorkflowWebhookFilters {
  workflow_template_id?: number;
  is_active?: boolean;
}

export interface WebhookDeliveryFilters {
  webhook_id?: number;
  status?: WebhookDeliveryStatus;
  event_type?: WebhookEventType;
}
