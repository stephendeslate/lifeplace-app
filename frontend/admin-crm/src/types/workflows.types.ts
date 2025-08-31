// frontend/admin-crm/src/types/workflows.types.ts

export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  event_type: number | null;
  event_type_name?: string;
  is_active: boolean;
  stages_count: number;
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
  email_template: number | null;
  email_template_name?: string;
  task_description: string;
  progression_condition: string;
  required_tasks_completed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type StageType = 'LEAD' | 'PRODUCTION' | 'POST_PRODUCTION';
export type AutomationType = 'EMAIL' | 'TASK' | 'QUOTE' | 'CONTRACT' | 'REMINDER' | 'NOTIFICATION';

export const STAGE_TYPES = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'POST_PRODUCTION', label: 'Post Production' },
] as const;

export const AUTOMATION_TYPES = [
  { value: 'EMAIL', label: 'Send Email' },
  { value: 'TASK', label: 'Create Task' },
  { value: 'QUOTE', label: 'Generate Quote' },
  { value: 'CONTRACT', label: 'Generate Contract' },
  { value: 'REMINDER', label: 'Send Reminder' },
  { value: 'NOTIFICATION', label: 'Send Notification' },
] as const;

export const TRIGGER_TIMES = [
  { value: 'ON_CREATION', label: 'Immediately' },
  { value: 'AFTER_1_HOUR', label: 'After 1 Hour' },
  { value: 'AFTER_3_HOURS', label: 'After 3 Hours' },
  { value: 'AFTER_6_HOURS', label: 'After 6 Hours' },
  { value: 'AFTER_12_HOURS', label: 'After 12 Hours' },
  { value: 'AFTER_1_DAY', label: 'After 1 Day' },
  { value: 'AFTER_2_DAYS', label: 'After 2 Days' },
  { value: 'AFTER_3_DAYS', label: 'After 3 Days' },
  { value: 'AFTER_1_WEEK', label: 'After 1 Week' },
  { value: 'AFTER_2_WEEKS', label: 'After 2 Weeks' },
] as const;

export const PROGRESSION_CONDITIONS = [
  { value: '', label: 'None (Manual)' },
  { value: 'QUOTE_ACCEPTED', label: 'Quote Accepted' },
  { value: 'CONTRACT_SIGNED', label: 'Contract Signed' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'TASKS_COMPLETED', label: 'All Tasks Completed' },
  { value: 'TIME_ELAPSED', label: 'Time Elapsed' },
] as const;

// Create/Update types
export interface CreateWorkflowTemplateData {
  name: string;
  description?: string;
  event_type?: number | null;
  is_active?: boolean;
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
  email_template?: number | null;
  task_description?: string;
  progression_condition?: string;
  required_tasks_completed?: boolean;
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
  onReorder: (stages: WorkflowStage[]) => void;
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