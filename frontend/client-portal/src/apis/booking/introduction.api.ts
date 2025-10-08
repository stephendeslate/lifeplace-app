// frontend/client-portal/src/apis/booking/introduction.api.ts

import api from '../../utils/api';
import { ErrorHandler } from '../../utils/errorHandler';
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
  ): Promise<Record<string, unknown>> {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted
      }
    );
    return response.data as Record<string, unknown>;
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
   * @deprecated Use ErrorHandler.extractMessage() instead
   */
  static handleApiError(error: unknown): string {
    return ErrorHandler.extractMessage(error);
  }

  /**
   * Extract validation errors from API response
   * @deprecated Use ErrorHandler.extractValidationErrorsAsRecord() instead
   */
  static extractValidationErrors(error: unknown): Record<string, string[]> {
    return ErrorHandler.extractValidationErrorsAsRecord(error);
  }
}

export default IntroductionApi;