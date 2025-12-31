/**
 * useContactInfo Hook
 *
 * React Query hooks for contact information step.
 * Enhanced with auth prefill and validation states.
 * Adapted from: frontend/client-portal/src/hooks/booking/useContactInfo.tsx
 */

import { useState, useCallback, useMemo } from 'react';
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

// =============================================================================
// UNIFIED CONTACT INFO HOOK
// =============================================================================

/**
 * Unified hook for managing contact info step.
 * Provides auth prefill, validation, and field requirements.
 *
 * @param config Step configuration
 * @returns Contact info management utilities
 */
export function useContactInfoManager(config?: ContactInfoStepConfiguration) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Get initial data based on authentication status
  const getInitialData = useCallback((): ContactInfoStepData => {
    if (isAuthenticated && user) {
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
  }, [isAuthenticated, user]);

  // Validate contact info data client-side
  const validateData = useCallback(
    (data: ContactInfoStepData) => {
      setError(null);
      setValidationErrors({});

      const validation = ContactInfoAPI.validateData(data, config);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
      }

      return validation;
    },
    [config]
  );

  // Update step data on server
  const updateStepData = useCallback(
    async (
      sessionId: string,
      stepId: number,
      stepData: ContactInfoStepData,
      markCompleted: boolean = false
    ) => {
      setLoading(true);
      setError(null);
      setValidationErrors({});

      try {
        const formattedData = ContactInfoAPI.formatStepData(stepData);
        const response = await ContactInfoAPI.updateStepData(
          sessionId,
          stepId,
          formattedData,
          markCompleted
        );
        return response;
      } catch (err) {
        const errorObj = err as { response?: { data?: { detail?: string; errors?: Record<string, string[]> } } };
        const errorMessage = errorObj.response?.data?.detail || 'Failed to update contact info';
        const validationErrs = errorObj.response?.data?.errors || {};

        setError(errorMessage);
        setValidationErrors(validationErrs);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Validate step data on server
  const validateStepData = useCallback(
    async (
      sessionId: string,
      stepId: number,
      stepData: ContactInfoStepData
    ): Promise<StepValidationResult> => {
      try {
        const formattedData = ContactInfoAPI.formatStepData(stepData);
        const result = await ContactInfoAPI.validateStepData(sessionId, stepId, formattedData);

        if (!result.isValid) {
          // Handle both ValidationError[] and Record<string, string[]> error formats
          let errors: Record<string, string[]> = {};
          if (Array.isArray(result.errors)) {
            result.errors.forEach((err: { field: string; message: string }) => {
              if (!errors[err.field]) errors[err.field] = [];
              errors[err.field].push(err.message);
            });
          } else {
            // Already in Record<string, string[]> format
            errors = result.errors as Record<string, string[]>;
          }
          setValidationErrors(errors);
        } else {
          setValidationErrors({});
        }

        return result;
      } catch (err) {
        const errorObj = err as { response?: { data?: { detail?: string } } };
        const errorMessage = errorObj.response?.data?.detail || 'Validation failed';
        setError(errorMessage);
        return { isValid: false, errors: [{ field: 'general', message: errorMessage }] };
      }
    },
    []
  );

  // Check if fields are required based on configuration
  const fieldRequirements = useMemo(
    () => ({
      full_name: config?.required_fields?.includes('full_name') ?? true,
      email: config?.required_fields?.includes('email') ?? true,
      phone: config?.required_fields?.includes('phone') ?? true,
      address: config?.required_fields?.includes('address') ?? false,
      company: config?.required_fields?.includes('company') ?? false,
    }),
    [config]
  );

  // Get field error helper
  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return validationErrors[fieldName]?.[0];
    },
    [validationErrors]
  );

  // Check if field has error helper
  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return !!(validationErrors[fieldName] && validationErrors[fieldName].length > 0);
    },
    [validationErrors]
  );

  // Clear errors
  const clearErrors = useCallback(() => {
    setError(null);
    setValidationErrors({});
  }, []);

  return {
    // Data helpers
    getInitialData,

    // Validation
    validateData,
    validateStepData,

    // API operations
    updateStepData,

    // Configuration
    fieldRequirements,

    // State
    loading,
    error,
    validationErrors,

    // Helpers
    getFieldError,
    hasFieldError,
    clearErrors,

    // User info
    isAuthenticated,
    user,
  };
}

/**
 * Lightweight validation-only hook.
 */
export function useContactInfoValidation(config?: ContactInfoStepConfiguration) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateData = useCallback(
    (data: ContactInfoStepData) => {
      const validation = ContactInfoAPI.validateData(data, config);
      setValidationErrors(validation.errors);
      return validation;
    },
    [config]
  );

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return validationErrors[fieldName]?.[0];
    },
    [validationErrors]
  );

  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return !!(validationErrors[fieldName] && validationErrors[fieldName].length > 0);
    },
    [validationErrors]
  );

  const clearErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    validateData,
    validationErrors,
    getFieldError,
    hasFieldError,
    clearErrors,
  };
}
