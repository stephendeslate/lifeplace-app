// frontend/client-portal/src/types/booking/questionnaire.types.ts

// Questionnaire types from questionnaires domain - Enhanced based on backend models

export interface Questionnaire {
  id: number;
  name: string;
  event_type: number | null;
  event_type_details?: EventTypeBasic;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  fields?: QuestionnaireField[];
  fields_count?: number;
}

export interface QuestionnaireField {
  id: number;
  questionnaire: number;
  name: string;
  label?: string;
  type: QuestionnaireFieldType;
  required: boolean;
  order: number;
  options: string[] | null;
  placeholder?: string;
  // Phase 1.1: Description (sent from backend as 'description')
  description?: string;
  help_text?: string; // Legacy alias for description
  // Phase 1.3: Guest count (deprecated - use 'guests' type)
  is_guest_count?: boolean;
  // Phase 2.1: Conditional display
  show_conditions?: Record<string, unknown>;
  validation_rules?: Record<string, string | number | boolean>;
  display_conditions?: Record<string, string | number | boolean>;
  // Phase 4.1: File upload settings (field-level)
  max_file_size_mb?: number;
  allowed_file_types?: string[];
  max_files?: number;
  created_at: string;
  updated_at: string;
}

export type QuestionnaireFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multi-select'
  | 'radio'
  | 'checkbox'
  | 'email'
  | 'phone'
  | 'url'
  | 'file'
  | 'range'
  | 'rating'
  | 'guests';

export interface QuestionnaireStepItem {
  id: number;
  configuration: number;
  questionnaire: number;
  questionnaire_details: Questionnaire;
  order: number;
  is_conditional: boolean;
  show_conditions: Record<string, string | number | boolean>;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireDetailResponse {
  id: number;
  name: string;
  event_type: number | null;
  event_type_details?: EventTypeBasic;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  fields_count: number;
  fields: QuestionnaireField[];
}

// Basic Event Type interface for questionnaire context
export interface EventTypeBasic {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

// Response data structures for questionnaire submissions
export interface QuestionnaireResponse {
  field_id: number;
  field_name: string;
  field_type: QuestionnaireFieldType;
  value: string | number | boolean | string[] | number[];
  display_value?: string;
}

export interface QuestionnaireSubmission {
  questionnaire_id: number;
  questionnaire_name: string;
  responses: QuestionnaireResponse[];
  completed_at: string;
  is_complete: boolean;
}

// Validation types for questionnaire fields
export interface QuestionnaireFieldValidation {
  field_id: number;
  is_valid: boolean;
  error_message?: string;
  warnings?: string[];
}

export interface QuestionnaireValidationResult {
  questionnaire_id: number;
  is_valid: boolean;
  field_validations: QuestionnaireFieldValidation[];
  completion_percentage: number;
}

// Field option types for dynamic fields
export interface QuestionnaireFieldOption {
  value: string | number;
  label: string;
  description?: string;
  is_default?: boolean;
  display_order?: number;
}

// File upload types for file fields
export interface QuestionnaireFileUpload {
  field_id: number;
  file: File;
  upload_progress?: number;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
  file_url?: string;
  error_message?: string;
}

// API request/response types for questionnaire operations
export interface QuestionnaireListRequest {
  event_type_id?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
}

export interface QuestionnaireListResponse {
  results: Questionnaire[];
  count: number;
  next?: string;
  previous?: string;
}

export interface QuestionnaireSubmissionRequest {
  questionnaire_id: number;
  responses: Record<number, string | number | boolean | string[] | File[]>; // field_id -> value
  files?: Record<number, File[]>; // field_id -> files
  partial_save?: boolean;
}

export interface QuestionnaireSubmissionResponse {
  id: number;
  questionnaire: number;
  responses: QuestionnaireResponse[];
  is_complete: boolean;
  validation_errors?: Record<string, string[]>;
  submitted_at: string;
}

// Utility types for form rendering
export interface QuestionnaireFieldProps {
  field: QuestionnaireField;
  value: string | number | boolean | string[] | number[] | null;
  onChange: (value: string | number | boolean | string[] | number[] | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface QuestionnaireRenderOptions {
  show_labels: boolean;
  show_help_text: boolean;
  show_required_indicators: boolean;
  enable_conditional_logic: boolean;
  auto_save: boolean;
  validation_mode: 'on_blur' | 'on_change' | 'on_submit';
}

// Configuration types for questionnaire step
export interface QuestionnaireStepConfiguration {
  id: number;
  step: number;
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
  questionnaire_items: QuestionnaireStepItem[];
  render_options?: QuestionnaireRenderOptions;
  created_at: string;
  updated_at: string;
}

// Data storage types for questionnaire step
export interface QuestionnaireStepData {
  responses?: Record<string, Record<string, string | number | boolean | string[]>>; // questionnaire_id -> responses
  uploaded_files?: Record<string, File[]>; // questionnaire_id -> field_id -> files
  validation_errors?: Record<string, Record<string, string[]>>; // questionnaire_id -> field_id -> errors
  completion_status?: Record<string, boolean>; // questionnaire_id -> is_complete
  last_saved?: Record<string, string>; // questionnaire_id -> timestamp
}

// Conditional logic types
export interface ConditionalRule {
  field_id: number;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean | string[] | number[];
  logic?: 'AND' | 'OR';
}

export interface ConditionalLogic {
  show_if: ConditionalRule[];
  hide_if?: ConditionalRule[];
}

// Extended field types with conditional logic
export interface QuestionnaireFieldExtended extends QuestionnaireField {
  conditional_logic?: ConditionalLogic;
  field_options?: QuestionnaireFieldOption[];
  file_constraints?: {
    max_files: number;
    allowed_extensions: string[];
    max_file_size_mb: number;
  };
  validation_constraints?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    pattern?: string;
    custom_validation?: string;
  };
}

// Export for convenience - common field type mappings
export const QUESTIONNAIRE_FIELD_TYPE_LABELS: Record<QuestionnaireFieldType, string> = {
  text: 'Text Input',
  textarea: 'Text Area',
  number: 'Number Input',
  date: 'Date Picker',
  time: 'Time Picker',
  datetime: 'Date & Time Picker',
  boolean: 'Yes/No',
  select: 'Dropdown',
  'multi-select': 'Multiple Selection',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  email: 'Email Address',
  phone: 'Phone Number',
  url: 'URL/Website',
  file: 'File Upload',
  range: 'Range Slider',
  rating: 'Rating Scale',
  guests: 'Guest Count',
};

// HTML input type mappings for form rendering
export const QUESTIONNAIRE_FIELD_INPUT_TYPES: Record<QuestionnaireFieldType, string> = {
  text: 'text',
  textarea: 'textarea',
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
  boolean: 'checkbox',
  select: 'select',
  'multi-select': 'select',
  radio: 'radio',
  checkbox: 'checkbox',
  email: 'email',
  phone: 'tel',
  url: 'url',
  file: 'file',
  range: 'range',
  rating: 'number',
  guests: 'number',
};