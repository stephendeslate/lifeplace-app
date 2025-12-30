/**
 * Questionnaire Step API
 *
 * API functions for dynamic questionnaire step in booking flow.
 */

import api from '@/utils/api';
import * as FileSystem from 'expo-file-system';
import type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireStepData,
  StepValidationResult,
  UploadedFile,
} from '@/types/booking';

// =============================================================================
// QUESTIONNAIRE API
// =============================================================================

export const QuestionnaireAPI = {
  /**
   * Get all questionnaires for an event type.
   *
   * GET /questionnaires/public/
   */
  getQuestionnaires: async (eventTypeId?: number): Promise<Questionnaire[]> => {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<Questionnaire[]>('/questionnaires/public/', { params });
    return response.data;
  },

  /**
   * Get questionnaire by ID.
   *
   * GET /questionnaires/public/:questionnaireId/
   */
  getQuestionnaire: async (questionnaireId: number): Promise<Questionnaire> => {
    const response = await api.get<Questionnaire>(`/questionnaires/public/${questionnaireId}/`);
    return response.data;
  },

  /**
   * Get questionnaire fields.
   *
   * GET /questionnaires/public/:questionnaireId/fields/
   */
  getQuestionnaireFields: async (questionnaireId: number): Promise<QuestionnaireField[]> => {
    const response = await api.get<QuestionnaireField[]>(
      `/questionnaires/public/${questionnaireId}/fields/`
    );
    return response.data;
  },

  /**
   * Validate questionnaire step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: QuestionnaireStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Update questionnaire step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: QuestionnaireStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Upload a file for a questionnaire field.
   *
   * POST /questionnaires/public/upload/
   */
  uploadFile: async (
    sessionId: string,
    fieldId: number,
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<UploadedFile> => {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('field_id', fieldId.toString());
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const response = await api.post<UploadedFile>('/questionnaires/public/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Delete an uploaded file.
   *
   * DELETE /questionnaires/public/upload/:fileId/
   */
  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/questionnaires/public/upload/${fileId}/`);
  },

  /**
   * Format step data for submission.
   */
  formatStepData: (data: QuestionnaireStepData): QuestionnaireStepData => {
    return {
      responses: data.responses || {},
      uploaded_files: data.uploaded_files || {},
    };
  },

  /**
   * Validate data client-side.
   */
  validateData: (
    data: QuestionnaireStepData,
    fields: QuestionnaireField[]
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    for (const field of fields) {
      const fieldKey = `field_${field.id}`;
      const value = data.responses[fieldKey];

      // Check required fields
      if (field.is_required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          errors[fieldKey] = [`${field.label} is required`];
          continue;
        }
      }

      // Skip validation for optional empty fields
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type-specific validation
      const rules = field.validation_rules;

      switch (field.field_type) {
        case 'text':
        case 'textarea':
          if (typeof value === 'string') {
            if (rules?.min_length && value.length < rules.min_length) {
              errors[fieldKey] = [`Must be at least ${rules.min_length} characters`];
            }
            if (rules?.max_length && value.length > rules.max_length) {
              errors[fieldKey] = [`Must be at most ${rules.max_length} characters`];
            }
            if (rules?.pattern) {
              const regex = new RegExp(rules.pattern);
              if (!regex.test(value)) {
                errors[fieldKey] = [rules.pattern_message || 'Invalid format'];
              }
            }
          }
          break;

        case 'email':
          if (typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors[fieldKey] = ['Please enter a valid email address'];
            }
          }
          break;

        case 'phone':
          if (typeof value === 'string') {
            const cleaned = value.replace(/[\s\-()]/g, '');
            const isValidPH =
              /^\+63\d{10}$/.test(cleaned) ||
              /^09\d{9}$/.test(cleaned) ||
              /^9\d{9}$/.test(cleaned);
            if (!isValidPH) {
              errors[fieldKey] = ['Please enter a valid Philippine phone number'];
            }
          }
          break;

        case 'number':
        case 'range':
          if (typeof value === 'number') {
            if (rules?.min_value !== undefined && value < rules.min_value) {
              errors[fieldKey] = [`Must be at least ${rules.min_value}`];
            }
            if (rules?.max_value !== undefined && value > rules.max_value) {
              errors[fieldKey] = [`Must be at most ${rules.max_value}`];
            }
          }
          break;

        case 'rating':
          if (typeof value === 'number') {
            const minRating = rules?.min_rating ?? 1;
            const maxRating = rules?.max_rating ?? 5;
            if (value < minRating || value > maxRating) {
              errors[fieldKey] = [`Rating must be between ${minRating} and ${maxRating}`];
            }
          }
          break;

        case 'multi_select':
          if (Array.isArray(value)) {
            if (rules?.min_selections && value.length < rules.min_selections) {
              errors[fieldKey] = [`Please select at least ${rules.min_selections} option(s)`];
            }
            if (rules?.max_selections && value.length > rules.max_selections) {
              errors[fieldKey] = [`Please select at most ${rules.max_selections} option(s)`];
            }
          }
          break;

        case 'file':
          // File validation is handled separately during upload
          break;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): QuestionnaireStepData => {
    return {
      responses: {},
      uploaded_files: {},
    };
  },

  /**
   * Check if field should be visible based on conditional logic.
   */
  isFieldVisible: (
    field: QuestionnaireField,
    responses: Record<string, unknown>
  ): boolean => {
    if (!field.conditional_logic) {
      return true;
    }

    const { show_when, depends_on, expected_value, comparison } = field.conditional_logic;

    if (!depends_on) {
      return true;
    }

    const dependentValue = responses[`field_${depends_on}`];

    let conditionMet = false;

    switch (comparison) {
      case 'equals':
        conditionMet = dependentValue === expected_value;
        break;
      case 'not_equals':
        conditionMet = dependentValue !== expected_value;
        break;
      case 'contains':
        if (Array.isArray(dependentValue)) {
          conditionMet = dependentValue.includes(expected_value);
        } else if (typeof dependentValue === 'string') {
          conditionMet = dependentValue.includes(String(expected_value));
        }
        break;
      case 'not_contains':
        if (Array.isArray(dependentValue)) {
          conditionMet = !dependentValue.includes(expected_value);
        } else if (typeof dependentValue === 'string') {
          conditionMet = !dependentValue.includes(String(expected_value));
        }
        break;
      case 'greater_than':
        conditionMet = Number(dependentValue) > Number(expected_value);
        break;
      case 'less_than':
        conditionMet = Number(dependentValue) < Number(expected_value);
        break;
      case 'is_empty':
        conditionMet =
          dependentValue === undefined ||
          dependentValue === null ||
          dependentValue === '' ||
          (Array.isArray(dependentValue) && dependentValue.length === 0);
        break;
      case 'is_not_empty':
        conditionMet = !(
          dependentValue === undefined ||
          dependentValue === null ||
          dependentValue === '' ||
          (Array.isArray(dependentValue) && dependentValue.length === 0)
        );
        break;
      default:
        conditionMet = true;
    }

    return show_when === 'show' ? conditionMet : !conditionMet;
  },

  /**
   * Get visible fields based on conditional logic.
   */
  getVisibleFields: (
    fields: QuestionnaireField[],
    responses: Record<string, unknown>
  ): QuestionnaireField[] => {
    return fields.filter((field) => QuestionnaireAPI.isFieldVisible(field, responses));
  },

  /**
   * Group fields by section.
   */
  groupFieldsBySection: (fields: QuestionnaireField[]): Record<string, QuestionnaireField[]> => {
    return fields.reduce(
      (grouped, field) => {
        const section = field.section || 'General';
        if (!grouped[section]) {
          grouped[section] = [];
        }
        grouped[section].push(field);
        return grouped;
      },
      {} as Record<string, QuestionnaireField[]>
    );
  },
};

export default QuestionnaireAPI;
