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
  created_at: string;
  updated_at: string;
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
  | 'file';

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