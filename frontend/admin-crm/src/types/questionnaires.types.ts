// frontend/admin-crm/src/types/questionnaires.types.ts

export interface Questionnaire {
  id: number;
  name: string;
  event_type: number | null;
  event_type_name?: string;
  is_active: boolean;
  order: number;
  fields_count: number;
  fields?: QuestionnaireField[];
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireField {
  id: number;
  questionnaire: number;
  name: string;
  type: QuestionnaireFieldType;
  type_display: string;
  required: boolean;
  order: number;
  options: string[] | null;
  // Phase 1.1: Description and placeholder
  description: string;
  placeholder: string;
  // Phase 1.3: Guest count (deprecated - use 'guests' type)
  is_guest_count: boolean;
  // Phase 2.1: Conditional display
  show_conditions: ShowConditions;
  // Phase 4.1: File upload settings
  max_file_size_mb: number;
  allowed_file_types: string[];
  max_files: number;
  created_at: string;
  updated_at: string;
}

// Conditional display logic
export interface FieldCondition {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface ShowConditions {
  logic?: 'AND' | 'OR';
  conditions?: FieldCondition[];
}

export interface QuestionnaireResponse {
  id: number;
  event: number;
  field: number;
  field_name: string;
  field_type: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// EventQuestionnaire types - for tracking questionnaire assignments to events
export type EventQuestionnaireStatus = 'PENDING' | 'SENT' | 'PARTIAL' | 'COMPLETE';

export interface EventQuestionnaireCompletionStats {
  total_fields: number;
  required_fields: number;
  answered_count: number;
  required_answered: number;
  completion_percentage: number;
  required_completion_percentage: number;
}

export interface EventQuestionnaireActivity {
  id: number;
  action: string;
  action_display: string;
  action_by: number | null;
  action_by_name: string | null;
  notes: string;
  created_at: string;
}

export interface EventQuestionnaire {
  id: number;
  event: number;
  event_name: string | null;
  questionnaire: number;
  questionnaire_name: string;
  questionnaire_fields_count: number;
  questionnaire_detail?: Questionnaire;
  client_name: string | null;
  client_email: string | null;
  status: EventQuestionnaireStatus;
  status_display: string;
  assigned_by: number | null;
  assigned_by_name: string | null;
  sent_at: string | null;
  sent_by: number | null;
  sent_by_name: string | null;
  completed_at: string | null;
  due_date: string | null;
  notes: string;
  workflow_stage: number | null;
  completion_stats: EventQuestionnaireCompletionStats;
  is_overdue: boolean;
  days_until_due: number | null;
  activities: EventQuestionnaireActivity[];
  created_at: string;
  updated_at: string;
}

export interface EventQuestionnaireSummary {
  id: number;
  event: number;
  questionnaire: number;
  questionnaire_name: string;
  status: EventQuestionnaireStatus;
  status_display: string;
  sent_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  is_overdue: boolean;
  completion_stats: EventQuestionnaireCompletionStats;
  created_at: string;
}

export interface CreateEventQuestionnaireData {
  event: number;
  questionnaire: number;
  due_date?: string | null;
  notes?: string;
}

export interface UpdateEventQuestionnaireData {
  due_date?: string | null;
  notes?: string;
}

export type QuestionnaireFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'boolean'
  | 'select'
  | 'multi-select'
  | 'email'
  | 'phone'
  | 'file'
  | 'guests';

export const QUESTIONNAIRE_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Select' },
  { value: 'multi-select', label: 'Multi-Select' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'file', label: 'File Upload' },
  { value: 'guests', label: 'Guest Count' },
] as const;

// Create/Update types
export interface CreateQuestionnaireData {
  name: string;
  event_type?: number | null;
  is_active?: boolean;
  order?: number;
  fields?: CreateQuestionnaireFieldData[];
}

export type UpdateQuestionnaireData = Partial<CreateQuestionnaireData>;

export interface CreateQuestionnaireFieldData {
  questionnaire?: number;
  name: string;
  type: QuestionnaireFieldType;
  required?: boolean;
  order?: number;
  options?: string[] | null;
  // Phase 1.1
  description?: string;
  placeholder?: string;
  // Phase 1.3 (deprecated)
  is_guest_count?: boolean;
  // Phase 2.1
  show_conditions?: ShowConditions;
  // Phase 4.1
  max_file_size_mb?: number;
  allowed_file_types?: string[];
  max_files?: number;
}

export type UpdateQuestionnaireFieldData = Partial<CreateQuestionnaireFieldData>;

// Filter types
export interface QuestionnaireFilters {
  search?: string;
  event_type_id?: number;
  is_active?: boolean;
}

export interface QuestionnaireFieldFilters {
  questionnaire_id?: number;
}

export interface QuestionnaireResponseFilters {
  event_id?: number;
}

// Form data types
export interface QuestionnaireFormData {
  name: string;
  event_type: string;
  is_active: boolean;
  order: string;
  fields: QuestionnaireFieldFormData[];
}

export interface QuestionnaireFieldFormData {
  id: string;
  name: string;
  type: QuestionnaireFieldType;
  required: boolean;
  order: number;
  options: string[];
  // Phase 1.1
  description: string;
  placeholder: string;
  // Phase 1.3 (deprecated)
  is_guest_count: boolean;
  // Phase 2.1
  show_conditions: ShowConditions;
  // Phase 4.1
  max_file_size_mb: number;
  allowed_file_types: string[];
  max_files: number;
}

// Action types
export interface ReorderQuestionnairesData {
  order_mapping: Record<string, number>;
}

export interface ReorderFieldsData {
  questionnaire_id: number;
  order_mapping: Record<string, number>;
}

export interface SaveEventResponsesData {
  event: number;
  responses: Array<{
    field: number;
    value: string;
  }>;
}

// Component prop types
export interface QuestionnaireTableProps {
  questionnaires: Questionnaire[];
  isLoading: boolean;
  onEdit: (questionnaire: Questionnaire) => void;
  onPreview?: (questionnaire: Questionnaire) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (questionnaire: Questionnaire) => void;
  isDeleting: boolean;
}

export interface QuestionnaireFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingQuestionnaire?: Questionnaire | null;
  onSubmit: (data: CreateQuestionnaireData | UpdateQuestionnaireData) => void;
  isLoading: boolean;
}

export interface QuestionnaireFieldTableProps {
  fields: QuestionnaireField[];
  isLoading: boolean;
  onEdit: (field: QuestionnaireField) => void;
  onDelete: (id: number) => void;
  onReorder?: (fields: QuestionnaireField[]) => void;
  isDeleting: boolean;
}

export interface FieldFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingField?: QuestionnaireField | null;
  questionnaireId?: number;
  onSubmit: (data: CreateQuestionnaireFieldData | UpdateQuestionnaireFieldData) => void;
  isLoading: boolean;
}