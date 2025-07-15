// frontend/client-portal/src/apis/booking/questionnaire.api.ts

import api from '../../utils/api';
import type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireDetailResponse,
} from '../../types/booking';

/**
 * Questionnaire API functions for managing questionnaires and responses
 */
export class QuestionnaireApi {
  
  /**
   * Get all active questionnaires
   */
  static async getQuestionnaires(): Promise<Questionnaire[]> {
    const response = await api.get<Questionnaire[]>('/questionnaires/questionnaires/', {
      params: { is_active: true }
    });
    return response.data;
  }

  /**
   * Get questionnaires for a specific event type
   */
  static async getQuestionnairesByEventType(eventTypeId: number): Promise<Questionnaire[]> {
    const response = await api.get<Questionnaire[]>('/questionnaires/questionnaires/', {
      params: { 
        event_type: eventTypeId,
        is_active: true 
      }
    });
    return response.data;
  }

  /**
   * Get detailed questionnaire with fields
   */
  static async getQuestionnaireDetail(questionnaireId: number): Promise<QuestionnaireDetailResponse> {
    const response = await api.get<QuestionnaireDetailResponse>(`/questionnaires/questionnaires/${questionnaireId}/`);
    return response.data;
  }

  /**
   * Get questionnaire fields for a specific questionnaire
   */
  static async getQuestionnaireFields(questionnaireId: number): Promise<QuestionnaireField[]> {
    const response = await api.get<QuestionnaireField[]>(`/questionnaires/questionnaires/${questionnaireId}/fields/`);
    return response.data;
  }

  // Response validation helpers

  /**
   * Validate questionnaire responses
   */
  static validateResponses(
    fields: QuestionnaireField[], 
    responses: Record<string, any>
  ): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};

    fields.forEach(field => {
      const response = responses[field.id.toString()];
      const fieldErrors: string[] = [];

      // Check required fields
      if (field.required && this.isEmptyResponse(response, field.type)) {
        fieldErrors.push(`${field.name} is required`);
      }

      // Type-specific validation
      if (response !== undefined && response !== null && response !== '') {
        switch (field.type) {
          case 'email':
            if (!this.isValidEmail(response)) {
              fieldErrors.push('Please enter a valid email address');
            }
            break;

          case 'phone':
            if (!this.isValidPhone(response)) {
              fieldErrors.push('Please enter a valid phone number');
            }
            break;

          case 'number':
            if (isNaN(Number(response))) {
              fieldErrors.push('Please enter a valid number');
            }
            break;

          case 'date':
            if (!this.isValidDate(response)) {
              fieldErrors.push('Please enter a valid date');
            }
            break;

          case 'time':
            if (!this.isValidTime(response)) {
              fieldErrors.push('Please enter a valid time');
            }
            break;

          case 'select':
          case 'multi-select':
            if (field.options && !this.isValidOption(response, field.options, field.type === 'multi-select')) {
              fieldErrors.push('Please select a valid option');
            }
            break;

          case 'file':
            if (!this.isValidFile(response)) {
              fieldErrors.push('Please upload a valid file');
            }
            break;
        }
      }

      if (fieldErrors.length > 0) {
        errors[field.id.toString()] = fieldErrors;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Format questionnaire responses for submission
   */
  static formatResponses(
    fields: QuestionnaireField[],
    responses: Record<string, any>
  ): Record<string, any> {
    const formatted: Record<string, any> = {};

    fields.forEach(field => {
      const response = responses[field.id.toString()];
      
      if (response !== undefined && response !== null) {
        switch (field.type) {
          case 'number':
            formatted[field.id.toString()] = Number(response) || null;
            break;

          case 'boolean':
            formatted[field.id.toString()] = Boolean(response);
            break;

          case 'multi-select':
            // Ensure it's an array
            formatted[field.id.toString()] = Array.isArray(response) ? response : [response];
            break;

          case 'file':
            // File handling would be done separately
            formatted[field.id.toString()] = response;
            break;

          default:
            // Text, email, phone, date, time, select
            formatted[field.id.toString()] = String(response).trim();
            break;
        }
      }
    });

    return formatted;
  }

  // Validation helper methods

  private static isEmptyResponse(response: any, fieldType: string): boolean {
    if (response === undefined || response === null) {
      return true;
    }

    if (fieldType === 'boolean') {
      return false; // Boolean fields are never "empty"
    }

    if (fieldType === 'multi-select') {
      return !Array.isArray(response) || response.length === 0;
    }

    if (typeof response === 'string') {
      return response.trim() === '';
    }

    if (fieldType === 'file') {
      return !response || (Array.isArray(response) && response.length === 0);
    }

    return false;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Basic Philippine phone number validation
    const phoneRegex = /^(\+63|0)?[9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  }

  private static isValidDate(date: string): boolean {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime()) && date !== '';
  }

  private static isValidTime(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  private static isValidOption(
    response: any, 
    options: string[], 
    isMultiSelect: boolean
  ): boolean {
    if (isMultiSelect) {
      if (!Array.isArray(response)) {
        return false;
      }
      return response.every(item => options.includes(item));
    } else {
      return options.includes(response);
    }
  }

  private static isValidFile(file: any): boolean {
    // Basic file validation
    if (file instanceof File) {
      return true;
    }
    
    if (Array.isArray(file)) {
      return file.every(f => f instanceof File);
    }
    
    return false;
  }

  // Response processing helpers

  /**
   * Process file uploads for questionnaire responses
   */
  static async processFileUploads(
    questionnaireId: number,
    fieldId: number,
    files: File[]
  ): Promise<string[]> {
    const uploadedFiles: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionnaire', questionnaireId.toString());
      formData.append('field', fieldId.toString());

      try {
        const response = await api.post('/questionnaires/upload/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const data = response.data as { file_url?: string; file_id?: string };
        if (data.file_url) {
          uploadedFiles.push(data.file_url);
        } else if (data.file_id) {
          uploadedFiles.push(data.file_id);
        } else {
          uploadedFiles.push('unknown_file');
        }
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    return uploadedFiles;
  }

  /**
   * Get response display value for different field types
   */
  static getResponseDisplayValue(
    field: QuestionnaireField, 
    response: any
  ): string {
    if (response === undefined || response === null) {
      return 'No response';
    }

    switch (field.type) {
      case 'boolean':
        return response ? 'Yes' : 'No';

      case 'multi-select':
        if (Array.isArray(response)) {
          return response.join(', ');
        }
        return String(response);

      case 'file':
        if (Array.isArray(response)) {
          return `${response.length} file(s) uploaded`;
        }
        return '1 file uploaded';

      case 'date':
        try {
          return new Date(response).toLocaleDateString();
        } catch {
          return String(response);
        }

      case 'time':
        return String(response);

      default:
        return String(response);
    }
  }

  /**
   * Generate questionnaire summary for review
   */
  static generateResponseSummary(
    questionnaires: QuestionnaireDetailResponse[],
    responses: Record<string, any>
  ): Array<{
    questionnaireName: string;
    responses: Array<{
      fieldName: string;
      value: string;
      required: boolean;
    }>;
  }> {
    return questionnaires.map(questionnaire => ({
      questionnaireName: questionnaire.name,
      responses: questionnaire.fields.map(field => ({
        fieldName: field.name,
        value: this.getResponseDisplayValue(field, responses[field.id.toString()]),
        required: field.required,
      })),
    }));
  }

  // Error handling

  /**
   * Handle questionnaire API errors
   */
  static handleQuestionnaireError(error: any): string {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }

    if (error.response?.status === 404) {
      return 'Questionnaire not found.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to access this questionnaire.';
    }

    if (error.message) {
      return error.message;
    }

    return 'An error occurred while loading the questionnaire.';
  }

  /**
   * Extract field validation errors
   */
  static extractFieldErrors(error: any): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};

    if (error.response?.data?.field_errors) {
      return error.response.data.field_errors;
    }

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      
      Object.keys(errors).forEach(fieldId => {
        const fieldError = errors[fieldId];
        
        if (Array.isArray(fieldError)) {
          fieldErrors[fieldId] = fieldError;
        } else if (typeof fieldError === 'string') {
          fieldErrors[fieldId] = [fieldError];
        }
      });
    }

    return fieldErrors;
  }
}

export default QuestionnaireApi;