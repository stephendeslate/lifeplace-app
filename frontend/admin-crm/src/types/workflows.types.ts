// frontend/admin-crm/src/types/workflows.types.ts

export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  event_type: number | null;
  event_type_name?: string;
  is_active: boolean;
  lead_stage_auto_stop: boolean; // Stop LEAD automations when entering PRODUCTION
  stages_count: number;
  events_using_count: number;
  stages?: WorkflowStage[]; // Optional in list view, populated in detail view
  created_at: string;
  updated_at: string;
}

export interface WorkflowStage {
  id: number;
  template: number;
  name: string;
  stage: StageType;
  stage_display: string;
  order: number;
  is_automated: boolean;
  automation_type: AutomationType;
  trigger_time: string;
  // Delay after another stage completes (optional)
  trigger_after_stage: number | null;
  trigger_after_stage_name?: string;
  email_template: number | null;
  email_template_name?: string;
  contract_template: number | null;
  contract_template_name?: string;
  questionnaire_template: number | null;
  questionnaire_template_name?: string;
  task_description: string;
  progression_condition: string;
  required_tasks_completed: boolean;
  // Trigger-on flags for conditional automation
  trigger_on_payment_received: boolean;
  trigger_on_quote_accepted: boolean;
  trigger_on_contract_signed: boolean;
  trigger_on_event_created: boolean;
  trigger_on_quote_sent: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type StageType = 'LEAD' | 'PRODUCTION' | 'POST_PRODUCTION';
export type AutomationType = 'EMAIL' | 'TASK' | 'QUOTE' | 'CONTRACT' | 'QUESTIONNAIRE' | 'REMINDER' | 'NOTIFICATION';

export const STAGE_TYPES = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'POST_PRODUCTION', label: 'Post-Production' },
] as const;

export const AUTOMATION_TYPES = [
  { value: 'EMAIL', label: 'Send Email' },
  { value: 'TASK', label: 'Create Task' },
  { value: 'QUOTE', label: 'Generate Quote' },
  { value: 'CONTRACT', label: 'Generate Contract' },
  { value: 'QUESTIONNAIRE', label: 'Send Questionnaire' },
  { value: 'REMINDER', label: 'Send Reminder' },
  { value: 'NOTIFICATION', label: 'Send Notification' },
] as const;

export const TRIGGER_TIMES = [
  // Immediate
  { value: 'ON_CREATION', label: 'Immediately', category: 'immediate' },
  // After delays (relative to stage start)
  { value: 'AFTER_1_HOUR', label: 'After 1 Hour', category: 'after' },
  { value: 'AFTER_3_HOURS', label: 'After 3 Hours', category: 'after' },
  { value: 'AFTER_6_HOURS', label: 'After 6 Hours', category: 'after' },
  { value: 'AFTER_12_HOURS', label: 'After 12 Hours', category: 'after' },
  { value: 'AFTER_1_DAY', label: 'After 1 Day', category: 'after' },
  { value: 'AFTER_2_DAYS', label: 'After 2 Days', category: 'after' },
  { value: 'AFTER_3_DAYS', label: 'After 3 Days', category: 'after' },
  { value: 'AFTER_1_WEEK', label: 'After 1 Week', category: 'after' },
  { value: 'AFTER_2_WEEKS', label: 'After 2 Weeks', category: 'after' },
  // Before event date (relative to event start_date)
  { value: '30_DAYS_BEFORE_EVENT', label: '30 Days Before Event', category: 'before_event' },
  { value: '14_DAYS_BEFORE_EVENT', label: '14 Days Before Event', category: 'before_event' },
  { value: '7_DAYS_BEFORE_EVENT', label: '7 Days Before Event', category: 'before_event' },
  { value: '3_DAYS_BEFORE_EVENT', label: '3 Days Before Event', category: 'before_event' },
  { value: '1_DAY_BEFORE_EVENT', label: '1 Day Before Event', category: 'before_event' },
] as const;

export const PROGRESSION_CONDITIONS = [
  { value: '', label: 'None (Manual)', category: 'manual' },
  { value: 'QUOTE_ACCEPTED', label: 'Quote Accepted', category: 'event' },
  { value: 'CONTRACT_SIGNED', label: 'Contract Signed', category: 'event' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received', category: 'event' },
  { value: 'TASKS_COMPLETED', label: 'All Tasks Completed', category: 'event' },
  // Time-based progression conditions
  { value: 'TIME_ELAPSED_1_HOURS', label: 'After 1 Hour', category: 'time' },
  { value: 'TIME_ELAPSED_6_HOURS', label: 'After 6 Hours', category: 'time' },
  { value: 'TIME_ELAPSED_12_HOURS', label: 'After 12 Hours', category: 'time' },
  { value: 'TIME_ELAPSED_1_DAYS', label: 'After 1 Day', category: 'time' },
  { value: 'TIME_ELAPSED_2_DAYS', label: 'After 2 Days', category: 'time' },
  { value: 'TIME_ELAPSED_3_DAYS', label: 'After 3 Days', category: 'time' },
  { value: 'TIME_ELAPSED_1_WEEKS', label: 'After 1 Week', category: 'time' },
  { value: 'TIME_ELAPSED_2_WEEKS', label: 'After 2 Weeks', category: 'time' },
] as const;

// Create/Update types
export interface CreateWorkflowTemplateData {
  name: string;
  description?: string;
  event_type?: number | null;
  is_active?: boolean;
  lead_stage_auto_stop?: boolean;
  stages?: CreateWorkflowStageData[];
}

export type UpdateWorkflowTemplateData = Partial<CreateWorkflowTemplateData>;

export interface CreateWorkflowStageData {
  template?: number;
  name: string;
  stage: StageType;
  order?: number;
  is_automated?: boolean;
  automation_type?: AutomationType;
  trigger_time?: string;
  trigger_after_stage?: number | null; // Delay after another stage completes
  email_template?: number | null;
  contract_template?: number | null;
  questionnaire_template?: number | null;
  task_description?: string;
  progression_condition?: string;
  required_tasks_completed?: boolean;
  // Trigger-on flags for conditional automation
  trigger_on_payment_received?: boolean;
  trigger_on_quote_accepted?: boolean;
  trigger_on_contract_signed?: boolean;
  trigger_on_event_created?: boolean;
  trigger_on_quote_sent?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateWorkflowStageData = Partial<CreateWorkflowStageData>;

// Filter types
export interface WorkflowTemplateFilters {
  search?: string;
  event_type?: number;
  is_active?: boolean;
}

export interface WorkflowStageFilters {
  template_id?: number;
  stage_type?: StageType;
}

// Form data types
export interface WorkflowTemplateFormData {
  name: string;
  description: string;
  event_type: string;
  is_active: boolean;
  stages: WorkflowStageFormData[];
}

export interface WorkflowStageFormData {
  name: string;
  stage: StageType;
  order: string;
  is_automated: boolean;
  automation_type: AutomationType;
  trigger_time: string;
  email_template: string;
  contract_template: string;
  questionnaire_template: string;
  task_description: string;
  progression_condition: string;
  required_tasks_completed: boolean;
  metadata: Record<string, unknown>;
}

// Action types
export interface ReorderStagesData {
  template_id: number;
  stage_type: StageType;
  order_mapping: Record<string, number>;
}

// Component prop types
export interface WorkflowTemplateTableProps {
  templates: WorkflowTemplate[];
  isLoading: boolean;
  onEdit: (template: WorkflowTemplate) => void;
  onView: (template: WorkflowTemplate) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (template: WorkflowTemplate) => void;
  isDeleting: boolean;
}

export interface WorkflowTemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingTemplate?: WorkflowTemplate | null;
  onSubmit: (data: CreateWorkflowTemplateData | UpdateWorkflowTemplateData) => void;
  isLoading: boolean;
}

export interface WorkflowStageTableProps {
  stages: WorkflowStage[];
  isLoading: boolean;
  onEdit: (stage: WorkflowStage) => void;
  onDelete: (id: number) => void;
  onTrigger?: (stage: WorkflowStage) => void;
  isDeleting: boolean;
}

export interface WorkflowStageFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingStage?: WorkflowStage | null;
  templateId?: number;
  onSubmit: (data: CreateWorkflowStageData | UpdateWorkflowStageData) => void;
  isLoading: boolean;
}

export interface WorkflowVisualizationProps {
  template: WorkflowTemplate;
}

// Workflow Trigger types
export type TriggerType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_PLAN_CREATED'
  | 'PAYMENT_OVERDUE'
  | 'QUOTE_ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'EVENT_CREATED'
  | 'EVENT_COMPLETED'
  | 'TASK_COMPLETED'
  | 'DATE_TRIGGER'
  | 'MANUAL_TRIGGER';

export const TRIGGER_TYPES = [
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'PAYMENT_PLAN_CREATED', label: 'Payment Plan Created' },
  { value: 'PAYMENT_OVERDUE', label: 'Payment Overdue' },
  { value: 'QUOTE_ACCEPTED', label: 'Quote Accepted' },
  { value: 'CONTRACT_SIGNED', label: 'Contract Signed' },
  { value: 'EVENT_CREATED', label: 'Event Created' },
  { value: 'EVENT_COMPLETED', label: 'Event Completed' },
  { value: 'TASK_COMPLETED', label: 'Task Completed' },
  { value: 'DATE_TRIGGER', label: 'Date/Time Trigger' },
  { value: 'MANUAL_TRIGGER', label: 'Manual Trigger' },
] as const;

export interface WorkflowTrigger {
  id: number;
  event: number;
  event_name: string;
  stage: number | null;
  stage_name: string | null;
  trigger_type: TriggerType;
  trigger_type_display: string;
  details: string;
  result_data: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface WorkflowTriggerFilters {
  event_id?: number;
  template_id?: number;
  trigger_type?: TriggerType;
  processed?: boolean;
}

export interface ManualTriggerResponse {
  message: string;
  trigger_id: number;
}

// Event Workflow Override types (per-event workflow customization)
export type OverrideType = 'SKIP' | 'DISABLE_AUTOMATION' | 'CUSTOM_TIMING' | 'ADD_STAGE';

export const OVERRIDE_TYPES = [
  { value: 'SKIP', label: 'Skip Stage', description: 'Completely skip this stage for this event' },
  { value: 'DISABLE_AUTOMATION', label: 'Disable Automation', description: 'Run stage but skip automation' },
  { value: 'CUSTOM_TIMING', label: 'Custom Timing', description: 'Use different trigger timing' },
  { value: 'ADD_STAGE', label: 'Add Custom Stage', description: 'Add a one-off stage for this event' },
] as const;

export interface EventWorkflowOverride {
  id: number;
  event: number;
  event_name?: string;
  stage: number | null;
  stage_name?: string;
  override_type: OverrideType;
  override_type_display?: string;
  custom_trigger_time: string;
  custom_stage_name: string;
  custom_stage_category: StageType | '';
  custom_order: number | null;
  custom_is_automated: boolean;
  custom_automation_type: string;
  custom_email_template: number | null;
  custom_task_description: string;
  reason: string;
  created_by: number | null;
  created_by_name?: string;
  executed: boolean;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventWorkflowOverrideData {
  event: number;
  stage?: number | null;
  override_type: OverrideType;
  custom_trigger_time?: string;
  custom_stage_name?: string;
  custom_stage_category?: StageType;
  custom_order?: number;
  custom_is_automated?: boolean;
  custom_automation_type?: string;
  custom_email_template?: number | null;
  custom_task_description?: string;
  reason?: string;
}

export type UpdateEventWorkflowOverrideData = Partial<CreateEventWorkflowOverrideData>;

export interface EventWorkflowOverrideFilters {
  event_id?: number;
  stage_id?: number;
  override_type?: OverrideType;
  executed?: boolean;
}

// Custom Timing Types for flexible timing input
export type TimingUnit = 'HOURS' | 'DAYS' | 'WEEKS';
export type TimingType = 'immediate' | 'after' | 'before_event';

export interface CustomTiming {
  type: TimingType;
  value?: number;
  unit?: TimingUnit;
}

/**
 * Convert CustomTiming object to trigger_time string format
 * @example { type: 'after', value: 3, unit: 'DAYS' } => 'AFTER_3_DAYS'
 */
export function customTimingToString(timing: CustomTiming): string {
  if (timing.type === 'immediate') {
    return 'ON_CREATION';
  }

  if (timing.type === 'after' && timing.value && timing.unit) {
    return `AFTER_${timing.value}_${timing.unit}`;
  }

  if (timing.type === 'before_event' && timing.value) {
    return `${timing.value}_DAYS_BEFORE_EVENT`;
  }

  return 'ON_CREATION';
}

/**
 * Parse trigger_time string to CustomTiming object
 * @example 'AFTER_3_DAYS' => { type: 'after', value: 3, unit: 'DAYS' }
 */
export function stringToCustomTiming(str: string): CustomTiming {
  if (!str || str === 'ON_CREATION') {
    return { type: 'immediate' };
  }

  // Match AFTER_X_UNIT pattern
  const afterMatch = str.match(/^AFTER_(\d+)_(HOURS?|DAYS?|WEEKS?)$/i);
  if (afterMatch) {
    const value = parseInt(afterMatch[1], 10);
    const rawUnit = afterMatch[2].toUpperCase();
    // Normalize unit (HOUR -> HOURS, DAY -> DAYS, WEEK -> WEEKS)
    const unit = rawUnit.endsWith('S') ? rawUnit : `${rawUnit}S`;
    return {
      type: 'after',
      value,
      unit: unit as TimingUnit,
    };
  }

  // Match X_DAYS_BEFORE_EVENT pattern
  const beforeMatch = str.match(/^(\d+)_DAYS?_BEFORE_EVENT$/i);
  if (beforeMatch) {
    return {
      type: 'before_event',
      value: parseInt(beforeMatch[1], 10),
      unit: 'DAYS',
    };
  }

  // Fallback to immediate for unrecognized formats
  return { type: 'immediate' };
}

/**
 * Get human-readable label for trigger time string
 */
export function getTriggerTimeLabel(triggerTime: string): string {
  const timing = stringToCustomTiming(triggerTime);

  if (timing.type === 'immediate') {
    return 'Immediately';
  }

  if (timing.type === 'after' && timing.value && timing.unit) {
    const unitLabel = timing.unit.toLowerCase().slice(0, -1); // Remove 's'
    const plural = timing.value === 1 ? '' : 's';
    return `After ${timing.value} ${unitLabel}${plural}`;
  }

  if (timing.type === 'before_event' && timing.value) {
    const plural = timing.value === 1 ? '' : 's';
    return `${timing.value} day${plural} before event`;
  }

  return triggerTime;
}

// Progression condition timing types (for TIME_ELAPSED patterns)
export interface ProgressionTiming {
  type: 'manual' | 'event' | 'time';
  condition?: string;
  value?: number;
  unit?: TimingUnit;
}

/**
 * Parse progression_condition string to ProgressionTiming object
 */
export function stringToProgressionTiming(str: string): ProgressionTiming {
  if (!str) {
    return { type: 'manual' };
  }

  // Event-based conditions
  const eventConditions = ['QUOTE_ACCEPTED', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED', 'TASKS_COMPLETED'];
  if (eventConditions.includes(str)) {
    return { type: 'event', condition: str };
  }

  // Time-elapsed pattern
  const timeMatch = str.match(/^TIME_ELAPSED_(\d+)_(HOURS?|DAYS?|WEEKS?)$/i);
  if (timeMatch) {
    const value = parseInt(timeMatch[1], 10);
    const rawUnit = timeMatch[2].toUpperCase();
    const unit = rawUnit.endsWith('S') ? rawUnit : `${rawUnit}S`;
    return {
      type: 'time',
      value,
      unit: unit as TimingUnit,
    };
  }

  return { type: 'manual' };
}

/**
 * Convert ProgressionTiming to progression_condition string
 */
export function progressionTimingToString(timing: ProgressionTiming): string {
  if (timing.type === 'manual') {
    return '';
  }

  if (timing.type === 'event' && timing.condition) {
    return timing.condition;
  }

  if (timing.type === 'time' && timing.value && timing.unit) {
    return `TIME_ELAPSED_${timing.value}_${timing.unit}`;
  }

  return '';
}

// Webhook Types
export type WebhookEventType =
  | 'STAGE_ENTERED'
  | 'STAGE_COMPLETED'
  | 'AUTOMATION_EXECUTED'
  | 'WORKFLOW_COMPLETED';

export const WEBHOOK_EVENT_TYPES = [
  { value: 'STAGE_ENTERED', label: 'Stage Entered', description: 'Triggered when a workflow enters a new stage' },
  { value: 'STAGE_COMPLETED', label: 'Stage Completed', description: 'Triggered when a workflow stage is completed' },
  { value: 'AUTOMATION_EXECUTED', label: 'Automation Executed', description: 'Triggered when a stage automation runs' },
  { value: 'WORKFLOW_COMPLETED', label: 'Workflow Completed', description: 'Triggered when an entire workflow completes' },
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