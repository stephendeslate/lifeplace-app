/**
 * useContactInfo Hook
 *
 * React Query hooks for contact information step.
 */

import { useMutation } from '@tanstack/react-query';
import { ContactInfoAPI } from '@/apis/booking';
import { useAuthStore } from '@/stores/authStore';
import type {
  ContactInfoStepData,
  ContactInfoStepConfiguration,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Check if email already exists.
 */
export function useCheckEmailExists() {
  return useMutation({
    mutationFn: (email: string) => ContactInfoAPI.checkEmailExists(email),
  });
}

/**
 * Validate contact info step data.
 */
export function useValidateContactInfo() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: ContactInfoStepData;
    }) => ContactInfoAPI.validateStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update contact info step data.
 */
export function useUpdateContactInfo() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: ContactInfoStepData;
      markCompleted?: boolean;
    }) => ContactInfoAPI.updateStepData(sessionId, stepId, stepData, markCompleted),
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Get default contact info from authenticated user.
 */
export function useDefaultContactInfo(): ContactInfoStepData {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return ContactInfoAPI.getDefaultDataFromUser({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      postal_code: user.postal_code,
      country: user.country,
      company: user.company,
      job_title: user.job_title,
    });
  }

  return ContactInfoAPI.getDefaultData();
}

/**
 * Validate contact info data client-side.
 */
export function useValidateContactInfoData(
  data: ContactInfoStepData,
  config?: ContactInfoStepConfiguration
): { isValid: boolean; errors: Record<string, string[]> } {
  return ContactInfoAPI.validateData(data, config);
}

/**
 * Get required field labels for display.
 */
export function useRequiredFieldLabels(config?: ContactInfoStepConfiguration): string[] {
  return ContactInfoAPI.getRequiredFieldLabels(config);
}

/**
 * Format contact info data for submission.
 */
export function useFormatContactInfo(data: ContactInfoStepData): ContactInfoStepData {
  return ContactInfoAPI.formatStepData(data);
}

/**
 * Mask email for privacy display.
 */
export function useMaskEmail(email: string): string {
  return ContactInfoAPI.maskEmail(email);
}

/**
 * Mask phone for privacy display.
 */
export function useMaskPhone(phone: string): string {
  return ContactInfoAPI.maskPhone(phone);
}
