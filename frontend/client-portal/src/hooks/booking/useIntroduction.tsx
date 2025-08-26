// frontend/client-portal/src/hooks/booking/useIntroduction.ts

import { useState, useCallback } from 'react';
import { IntroductionApi } from '../../apis/booking/introduction.api';
import type {
  IntroductionStepData,
} from '../../types/booking';

// Hook for managing introduction step data and interactions
export const useIntroduction = (
  sessionId?: string,
  stepId?: number,
  initialData?: IntroductionStepData
) => {
  const [data, setData] = useState<IntroductionStepData>(
    initialData || IntroductionApi.getDefaultData()
  );
  const [loading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Update step data locally
  const updateData = useCallback((newData: Partial<IntroductionStepData>) => {
    setData(prev => ({ ...prev, ...newData }));
    
    // Clear validation errors when data changes
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
    
    // Clear general error
    if (error) {
      setError(null);
    }
  }, [validationErrors, error]);

  // Validate data client-side
  const validateClientSide = useCallback(() => {
    const validation = IntroductionApi.validateData(data);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [data]);

  // Validate data server-side
  const validateServerSide = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !stepId) {
      setError('Session or step information missing');
      return false;
    }

    setValidating(true);
    setError(null);
    setValidationErrors({});

    try {
      const result = await IntroductionApi.validateStepData(sessionId, stepId, data);
      
      if (!result.isValid) {
        const errors: Record<string, string[]> = {};
        result.errors.forEach(error => {
          errors[error.field] = [error.message];
        });
        setValidationErrors(errors);
      }
      
      return result.isValid;
    } catch (err) {
      const errorMessage = IntroductionApi.handleApiError(err);
      const apiErrors = IntroductionApi.extractValidationErrors(err);
      
      setError(errorMessage);
      setValidationErrors(apiErrors);
      return false;
    } finally {
      setValidating(false);
    }
  }, [sessionId, stepId, data]);

  // Save data to server
  const saveData = useCallback(async (markCompleted: boolean = false): Promise<boolean> => {
    if (!sessionId || !stepId) {
      setError('Session or step information missing');
      return false;
    }

    setSaving(true);
    setError(null);
    setValidationErrors({});

    try {
      const formattedData = IntroductionApi.formatStepData(data);
      const result = await IntroductionApi.updateStepData(
        sessionId,
        stepId,
        formattedData,
        markCompleted
      );
      
      // Handle any validation errors from the response
      if (result.validation_errors && Object.keys(result.validation_errors).length > 0) {
        setValidationErrors(result.validation_errors);
        return false;
      }
      
      return true;
    } catch (err) {
      const errorMessage = IntroductionApi.handleApiError(err);
      const apiErrors = IntroductionApi.extractValidationErrors(err);
      
      setError(errorMessage);
      setValidationErrors(apiErrors);
      return false;
    } finally {
      setSaving(false);
    }
  }, [sessionId, stepId, data]);

  // Handle acknowledgment change
  const handleAcknowledgment = useCallback((acknowledged: boolean) => {
    updateData({ acknowledged });
  }, [updateData]);

  // Check if step is complete/valid
  const isValid = useCallback(() => {
    return validateClientSide();
  }, [validateClientSide]);

  // Get field error
  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  // Check if field has error
  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);

  // Reset data to default
  const resetData = useCallback(() => {
    setData(IntroductionApi.getDefaultData());
    setValidationErrors({});
    setError(null);
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setError(null);
    setValidationErrors({});
  }, []);

  return {
    // Data
    data,
    
    // Actions
    updateData,
    handleAcknowledgment,
    saveData,
    validateClientSide,
    validateServerSide,
    resetData,
    clearErrors,
    
    // State
    loading,
    validating,
    saving,
    error,
    validationErrors,
    
    // Utilities
    isValid,
    getFieldError,
    hasFieldError,
    
    // Status checks
    isComplete: data.acknowledged === true,
    hasChanges: data.acknowledged !== (initialData?.acknowledged || false),
  };
};

// Hook for managing introduction step in isolation (without session)
export const useIntroductionData = (initialData?: IntroductionStepData) => {
  const [data, setData] = useState<IntroductionStepData>(
    initialData || IntroductionApi.getDefaultData()
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const updateData = useCallback((newData: Partial<IntroductionStepData>) => {
    setData(prev => ({ ...prev, ...newData }));
    setValidationErrors({});
  }, []);

  const validate = useCallback(() => {
    const validation = IntroductionApi.validateData(data);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [data]);

  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);

  return {
    data,
    updateData,
    validate,
    validationErrors,
    getFieldError,
    hasFieldError,
    isValid: validate,
    isComplete: data.acknowledged === true,
  };
};