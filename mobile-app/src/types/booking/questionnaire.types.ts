/**
 * Questionnaire Types for Booking Flow
 * Adapted from: frontend/client-portal/src/types/booking/questionnaire.types.ts
 */

/**
 * Available questionnaire field types
 * Note: React Native requires different input implementations than web
 */
export type QuestionnaireFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'checkbox'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'file'
  | 'rating'
  | 'range';

/**
 * Field type labels for display
 */
export const QUESTIONNAIRE_FIELD_TYPE_LABELS: Record<QuestionnaireFieldType, string> = {
  text: 'Text',
  textarea: 'Long Text',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  date: 'Date',
  time: 'Time',
  datetime: 'Date & Time',
  boolean: 'Yes/No',
  checkbox: 'Checkbox',
  select: 'Dropdown',
  multi_select: 'Multiple Choice',
  radio: 'Single Choice',
  file: 'File Upload',
  rating: 'Rating',
  range: 'Range Slider',
};

/**
 * Option for select/radio/multi_select fields
 */
export interface FieldOption {
  value: string;
  label: string;
  description?: string;
  is_default?: boolean;
  order?: number;
}

/**
 * Validation rules for a questionnaire field
 */
export interface QuestionnaireValidationRules {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  min_selections?: number;
  max_selections?: number;
  pattern?: string;
  pattern_message?: string;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  max_files?: number;
  min_rating?: number;
  max_rating?: number;
  custom_validation?: string;
}

/**
 * Conditional rule for field display
 */
export interface ConditionalRule {
  field_id: number;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value?: unknown;
}

/**
 * Conditional logic for field visibility
 */
export interface ConditionalLogic {
  rules: ConditionalRule[];
  logic_type: 'all' | 'any';
}

/**
 * Individual questionnaire field definition
 */
export interface QuestionnaireField {
  id: number;
  field_type: QuestionnaireFieldType;
  label: string;
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  order: number;
  options?: FieldOption[];
  validation_rules?: QuestionnaireValidationRules;
  conditional_display?: ConditionalLogic;
  default_value?: unknown;
  width?: 'full' | 'half' | 'third';
  section?: string;
}

/**
 * Questionnaire definition
 */
export interface Questionnaire {
  id: number;
  name: string;
  title: string;
  description?: string;
  is_active: boolean;
  fields: QuestionnaireField[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Questionnaire assignment within a step configuration
 */
export interface QuestionnaireStepItem {
  questionnaire_id: number;
  questionnaire_name: string;
  questionnaire_title?: string;
  is_required: boolean;
  order: number;
  conditional_display?: {
    show_when_event_type?: number;
    show_when_package_selected?: number;
    show_when_addon_selected?: number;
  };
}

/**
 * File upload info for React Native
 * Different from web File API - uses document picker response
 */
export interface UploadedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  field_id: number;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
  upload_progress?: number;
  error?: string;
  server_url?: string; // URL after upload completes
}

/**
 * Questionnaire step data - user responses
 */
export interface QuestionnaireStepData {
  responses: Record<string, unknown>; // field_${fieldId}: value
  uploaded_files?: UploadedFile[];
  completion_percentage?: number;
}

/**
 * Formatted response for display
 */
export interface FormattedQuestionnaireResponse {
  questionnaire_id: number;
  questionnaire_name: string;
  fields: Array<{
    field_id: number;
    label: string;
    value: string | string[];
    field_type: QuestionnaireFieldType;
  }>;
}

/**
 * Questionnaire step configuration
 */
export interface QuestionnaireStepConfiguration {
  questionnaires: QuestionnaireStepItem[];
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_file_types?: string[];
  show_progress_bar: boolean;
  group_by_section: boolean;
}
