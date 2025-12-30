/**
 * Introduction Step API
 *
 * API functions for the introduction/acknowledgment step.
 */

import api from '@/utils/api';
import type { IntroductionStepData, StepValidationResult } from '@/types/booking';

// =============================================================================
// INTRODUCTION API
// =============================================================================

export const IntroductionAPI = {
  /**
   * Validate introduction step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: IntroductionStepData
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
   * Update introduction step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: IntroductionStepData,
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
   * Format step data for submission.
   */
  formatStepData: (data: IntroductionStepData): IntroductionStepData => {
    return {
      acknowledged: Boolean(data.acknowledged),
    };
  },

  /**
   * Validate data client-side.
   */
  validateData: (
    data: IntroductionStepData
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (!data.acknowledged) {
      errors.acknowledged = ['Please acknowledge to continue'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): IntroductionStepData => {
    return {
      acknowledged: false,
    };
  },
};

export default IntroductionAPI;
