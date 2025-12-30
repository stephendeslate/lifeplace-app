/**
 * Questionnaire Types for Booking Flow
 * Adapted from: frontend/client-portal/src/types/booking/questionnaire.types.ts
 */

/**
 * Available questionnaire field types
 * Note: React Native requires different input implementations than web
 */
export type QuestionnaireFieldType =
  // Lowercase variants
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
  | 'range'
  // Uppercase variants (for API compatibility)
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'CHECKBOX'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'MULTISELECT'
  | 'RADIO'
  | 'FILE'
  | 'RATING'
  | 'RANGE';

/**
 * Field type labels for display
 */
export const QUESTIONNAIRE_FIELD_TYPE_LABELS: Partial<Record<QuestionnaireFieldType, string>> = {
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
  // Uppercase variants
  TEXT: 'Text',
  TEXTAREA: 'Long Text',
  NUMBER: 'Number',
  EMAIL: 'Email',
  PHONE: 'Phone',
  URL: 'URL',
  DATE: 'Date',
  TIME: 'Time',
  DATETIME: 'Date & Time',
  BOOLEAN: 'Yes/No',
  CHECKBOX: 'Checkbox',
  SELECT: 'Dropdown',
  MULTI_SELECT: 'Multiple Choice',
  MULTISELECT: 'Multiple Choice',
  RADIO: 'Single Choice',
  FILE: 'File Upload',
  RATING: 'Rating',
  RANGE: 'Range Slider',
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
  max_file_size?: number; // Alias for max_file_size_mb (bytes)
  max_files?: number;
  min_rating?: number;
  max_rating?: number;
  custom_validation?: string;
  // Date/time specific
  min_date?: string;
  max_date?: string;
  time_interval?: number; // minutes
  // Number/slider specific
  step?: number;
  unit?: string;
  // Address field specific
  show_address_line2?: boolean;
  show_province?: boolean;
  show_postal_code?: boolean;
  show_country?: boolean;
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
  // Alternative format for simple conditions
  show_when?: boolean;
  depends_on?: number | string; // field_id or field name
  expected_value?: unknown;
  comparison?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
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
  conditional_logic?: ConditionalLogic;
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
 * Possible values for questionnaire field responses
 * Maps to the QuestionnaireFieldType discriminated union
 */
export type QuestionnaireFieldValue =
  | string // text, textarea, email, phone, url, date, time, datetime
  | number // number, rating, range
  | boolean // boolean, checkbox
  | string[] // multi_select
  | null; // cleared/empty

/**
 * Type-safe questionnaire field responses
 * Keys are in format `field_${fieldId}` where fieldId is a number
 * Using string index for dynamic field IDs while providing type safety for values
 */
export interface QuestionnaireFieldValues {
  [key: string]: QuestionnaireFieldValue;
}

/**
 * Questionnaire step data - user responses
 */
export interface QuestionnaireStepData {
  responses: QuestionnaireFieldValues;
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

/**
 * Individual field response from questionnaire fields
 */
export interface QuestionnaireFieldResponse {
  field_id: number;
  field_type: QuestionnaireFieldType;
  value: unknown;
}

/**
 * Complete questionnaire response
 */
export interface QuestionnaireResponse {
  questionnaire_id: number;
  responses: QuestionnaireFieldResponse[];
  completed_at?: string;
}
