// frontend/client-portal/src/apis/booking/introduction.api.ts

import api from '../../utils/api';
import type {
  IntroductionStepData,
  StepValidationResult,
} from '../../types/booking';

/**
 * Introduction step API functions
 */
export class IntroductionApi {
  
  /**
   * Validate introduction step data
   */
  static async validateStepData(
    sessionId: string,
    stepId: number,
    stepData: IntroductionStepData
  ): Promise<StepValidationResult> {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData
      }
    );
    return response.data;
  }

  /**
   * Update introduction step data
   */
  static async updateStepData(
    sessionId: string,
    stepId: number,
    stepData: IntroductionStepData,
    markCompleted: boolean = false
  ): Promise<any> {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted
      }
    );
    return response.data;
  }

  /**
   * Format introduction step data for submission
   */
  static formatStepData(data: IntroductionStepData): IntroductionStepData {
    return {
      acknowledged: Boolean(data.acknowledged),
    };
  }

  /**
   * Validate introduction data client-side
   */
  static validateData(data: IntroductionStepData): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};

    // For introduction step, acknowledgment is typically required
    if (!data.acknowledged) {
      errors.acknowledged = ['Please acknowledge to continue'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Get default introduction data
   */
  static getDefaultData(): IntroductionStepData {
    return {
      acknowledged: false,
    };
  }

  /**
   * Handle API errors
   */
  static handleApiError(error: any): string {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.response?.status === 400) {
      return 'Invalid introduction data provided.';
    }

    if (error.response?.status === 404) {
      return 'Step not found.';
    }

    if (error.message) {
      return error.message;
    }

    return 'An error occurred while processing the introduction step.';
  }

  /**
   * Extract validation errors from API response
   */
  static extractValidationErrors(error: any): Record<string, string[]> {
    const validationErrors: Record<string, string[]> = {};

    if (error.response?.data?.validation_errors) {
      return error.response.data.validation_errors;
    }

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      
      if (typeof errors === 'object') {
        Object.keys(errors).forEach(field => {
          const fieldErrors = errors[field];
          
          if (Array.isArray(fieldErrors)) {
            validationErrors[field] = fieldErrors;
          } else if (typeof fieldErrors === 'string') {
            validationErrors[field] = [fieldErrors];
          }
        });
      }
    }

    return validationErrors;
  }
}

export default IntroductionApi;