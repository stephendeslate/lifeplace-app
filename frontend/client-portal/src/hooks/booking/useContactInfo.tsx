// frontend/client-portal/src/hooks/booking/useContactInfo.ts

import { useState, useCallback, useMemo } from 'react';
import { ContactInfoApi } from '../../apis/booking/contact_info.api';
import { useAuth } from '../useAuth';
import type {
  ContactInfoStepData,
  ContactInfoStepConfiguration,
  StepValidationResult,
} from '../../types/booking';

// Hook for managing contact info step
export const useContactInfo = (config?: ContactInfoStepConfiguration) => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Get initial data based on authentication status
  const getInitialData = useCallback((): ContactInfoStepData => {
    if (isAuthenticated && user) {
      return ContactInfoApi.getDefaultDataFromUser(user);
    }
    return ContactInfoApi.getDefaultData();
  }, [isAuthenticated, user]);

  // Validate contact info data
  const validateData = useCallback((data: ContactInfoStepData) => {
    setError(null);
    setValidationErrors({});

    const validation = ContactInfoApi.validateData(data, config);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
    }

    return validation;
  }, [config]);

  // Update step data on server
  const updateStepData = useCallback(async (
    sessionId: string,
    stepId: number,
    stepData: ContactInfoStepData,
    markCompleted: boolean = false
  ) => {
    setLoading(true);
    setError(null);
    setValidationErrors({});
    
    try {
      const formattedData = ContactInfoApi.formatStepData(stepData);
      const response = await ContactInfoApi.updateStepData(
        sessionId,
        stepId,
        formattedData,
        markCompleted
      );
      return response;
    } catch (err) {
      const errorMessage = ContactInfoApi.handleApiError(err);
      const validationErrs = ContactInfoApi.extractValidationErrors(err);
      
      setError(errorMessage);
      setValidationErrors(validationErrs);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate step data on server
  const validateStepData = useCallback(async (
    sessionId: string,
    stepId: number,
    stepData: ContactInfoStepData
  ): Promise<StepValidationResult> => {
    try {
      const formattedData = ContactInfoApi.formatStepData(stepData);
      const result = await ContactInfoApi.validateStepData(
        sessionId,
        stepId,
        formattedData
      );
      
      if (!result.isValid) {
        const errors: Record<string, string[]> = {};
        result.errors.forEach(error => {
          errors[error.field] = [error.message];
        });
        setValidationErrors(errors);
      } else {
        setValidationErrors({});
      }
      
      return result;
    } catch (err) {
      const errorMessage = ContactInfoApi.handleApiError(err);
      setError(errorMessage);
      return { isValid: false, errors: [{ field: 'general', message: errorMessage }] };
    }
  }, []);

  // Check if fields are required based on configuration
  const fieldRequirements = useMemo(() => ({
    full_name: config?.require_full_name ?? true,
    email: config?.require_email ?? true,
    phone: config?.require_phone ?? true,
    address: config?.require_address ?? false,
    company: config?.require_company ?? false,
  }), [config]);

  // Check if account creation is available
  const accountCreationOptions = useMemo(() => ({
    canCreateAccount: !isAuthenticated && config?.offer_account_creation,
    mustCreateAccount: !isAuthenticated && config?.require_account_creation,
    isAlreadyAuthenticated: isAuthenticated,
  }), [isAuthenticated, config]);

  // Get field error helper
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  // Check if field has error helper
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!(validationErrors[fieldName] && validationErrors[fieldName].length > 0);
  }, [validationErrors]);

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
    accountCreationOptions,
    
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
};

// Hook for contact info validation only (lightweight)
export const useContactInfoValidation = (config?: ContactInfoStepConfiguration) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateData = useCallback((data: ContactInfoStepData) => {
    const validation = ContactInfoApi.validateData(data, config);
    setValidationErrors(validation.errors);
    return validation;
  }, [config]);

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!(validationErrors[fieldName] && validationErrors[fieldName].length > 0);
  }, [validationErrors]);

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
};