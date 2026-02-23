// frontend/client-portal/src/types/questionnaires.types.ts

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
  help_text?: string; // Alias for description (backwards compat)
  // Phase 1.3: Guest count (deprecated - use 'guests' type)
  is_guest_count: boolean;
  // Phase 2.1: Conditional display
  show_conditions: Record<string, unknown>;
  // Phase 4.1: File upload settings
  max_file_size_mb: number;
  allowed_file_types: string[];
  max_files: number;
  created_at: string;
  updated_at: string;
}

export interface Questionnaire {
  id: number;
  name: string;
  event_type: number | null;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  fields_count: number;
  fields: QuestionnaireField[];
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

export interface SaveEventResponsesData {
  event_id: number;
  responses: Array<{
    field_id: number;
    value: string;
  }>;
}

export interface QuestionnaireFilters {
  event_type?: number;
  is_active?: boolean;
}

export interface ResponseFilters {
  event?: number;
  field?: number;
  field_type?: string;
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
