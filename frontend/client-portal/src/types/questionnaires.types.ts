// frontend/client-portal/src/types/questionnaires.types.ts

export interface QuestionnaireField {
  id: number;
  questionnaire: number;
  name: string;
  type: string;
  type_display: string;
  required: boolean;
  order: number;
  options: string[];
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