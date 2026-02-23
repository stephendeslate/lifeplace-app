// frontend/client-portal/src/hooks/booking/useDateTime.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { DateTimeApi } from '../../apis/booking/datetime.api';
import { ErrorHandler } from '../../utils/errorHandler';
import type { DateTimeStepData, DateTimeStepConfiguration } from '../../types/booking';

// Hook for managing date/time step data and interactions
export const useDateTime = (
  sessionId?: string,
  stepId?: number,
  initialData?: DateTimeStepData,
  config?: DateTimeStepConfiguration | null,
) => {
  const [data, setData] = useState<DateTimeStepData>(initialData || DateTimeApi.getDefaultData());
  const [loading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available: boolean;
    message: string;
  } | null>(null);

  // Update step data locally
  const updateData = useCallback(
    (newData: Partial<DateTimeStepData>) => {
      setData((prev) => ({ ...prev, ...newData }));

      // Clear validation errors when data changes
      if (Object.keys(validationErrors).length > 0) {
        setValidationErrors({});
      }

      // Clear general error
      if (error) {
        setError(null);
      }

      // Clear availability status when date changes
      if (newData.start_date) {
        setAvailabilityStatus(null);
      }
    },
    [validationErrors, error],
  );

  // Validate data client-side
  const validateClientSide = useCallback(() => {
    const validation = DateTimeApi.validateData(data);
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
      const result = await DateTimeApi.validateStepData(sessionId, stepId, data);

      if (!result.isValid) {
        const errors: Record<string, string[]> = {};
        result.errors.forEach((error) => {
          errors[error.field] = [error.message];
        });
        setValidationErrors(errors);
      }

      return result.isValid;
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      const apiErrors = ErrorHandler.extractValidationErrorsAsRecord(err);

      setError(errorMessage);
      setValidationErrors(apiErrors);
      return false;
    } finally {
      setValidating(false);
    }
  }, [sessionId, stepId, data]);

  // Check availability
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !data.start_date) {
      return false;
    }

    setCheckingAvailability(true);

    try {
      const result = await DateTimeApi.checkAvailability(sessionId, data);
      setAvailabilityStatus(result);
      return result.available;
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setAvailabilityStatus({
        available: false,
        message: errorMessage,
      });
      return false;
    } finally {
      setCheckingAvailability(false);
    }
  }, [sessionId, data]);

  // Save data to server
  const saveData = useCallback(
    async (markCompleted: boolean = false): Promise<boolean> => {
      if (!sessionId || !stepId) {
        setError('Session or step information missing');
        return false;
      }

      setSaving(true);
      setError(null);
      setValidationErrors({});

      try {
        const formattedData = DateTimeApi.formatStepData(data);
        const result = await DateTimeApi.updateStepData(
          sessionId,
          stepId,
          formattedData,
          markCompleted,
        );

        // Handle any validation errors from the response
        if (result.validation_errors && Object.keys(result.validation_errors).length > 0) {
          setValidationErrors(result.validation_errors as Record<string, string[]>);
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage = ErrorHandler.extractMessage(err);
        const apiErrors = ErrorHandler.extractValidationErrorsAsRecord(err);

        setError(errorMessage);
        setValidationErrors(apiErrors);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [sessionId, stepId, data],
  );

  // Handle date change
  const handleDateChange = useCallback(
    (date: Date | null) => {
      const dateString = date ? date.toISOString().split('T')[0] : '';
      updateData({ start_date: dateString });
    },
    [updateData],
  );

  // Handle end date change (for multi-day events)
  const handleEndDateChange = useCallback(
    (date: Date | null) => {
      const dateString = date ? date.toISOString().split('T')[0] : undefined;
      updateData({ end_date: dateString });
    },
    [updateData],
  );

  // Handle resource requirements change
  const handleResourceRequirementsChange = useCallback(
    (requirements: string[]) => {
      updateData({ resource_requirements: requirements });
    },
    [updateData],
  );

  // Auto-check availability when date changes (if enabled)
  useEffect(() => {
    if (
      config?.enable_real_time_availability &&
      config?.auto_check_conflicts &&
      data.start_date &&
      sessionId
    ) {
      const timeoutId = setTimeout(() => {
        checkAvailability();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [data.start_date, config, sessionId, checkAvailability]);

  // Check if step is complete/valid
  const isValid = useCallback(() => {
    return validateClientSide();
  }, [validateClientSide]);

  // Get minimum date based on configuration
  const minDate = useMemo(() => {
    const today = new Date();
    const bufferDays = config?.buffer_before_hours ? Math.ceil(config.buffer_before_hours / 24) : 0;
    today.setDate(today.getDate() + bufferDays);
    return today;
  }, [config]);

  // Get field error
  const getFieldError = useCallback(
    (fieldName: string) => {
      return validationErrors[fieldName]?.[0];
    },
    [validationErrors],
  );

  // Check if field has error
  const hasFieldError = useCallback(
    (fieldName: string) => {
      return !!(validationErrors[fieldName]?.length > 0);
    },
    [validationErrors],
  );

  // Format display values
  const formattedValues = useMemo(
    () => ({
      startDate: DateTimeApi.formatDate(data.start_date),
      endDate: data.end_date ? DateTimeApi.formatDate(data.end_date) : '',
    }),
    [data],
  );

  // Reset data to default
  const resetData = useCallback(() => {
    setData(DateTimeApi.getDefaultData());
    setValidationErrors({});
    setError(null);
    setAvailabilityStatus(null);
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setError(null);
    setValidationErrors({});
    setAvailabilityStatus(null);
  }, []);

  return {
    // Data
    data,

    // Actions
    updateData,
    handleDateChange,
    handleEndDateChange,
    handleResourceRequirementsChange,
    saveData,
    validateClientSide,
    validateServerSide,
    checkAvailability,
    resetData,
    clearErrors,

    // State
    loading,
    validating,
    saving,
    checkingAvailability,
    error,
    validationErrors,
    availabilityStatus,

    // Utilities
    isValid,
    getFieldError,
    hasFieldError,
    formattedValues,
    minDate,

    // Status checks
    isComplete: !!data.start_date,
    hasChanges:
      JSON.stringify(data) !== JSON.stringify(initialData || DateTimeApi.getDefaultData()),
    isAvailable: availabilityStatus?.available,
    showAvailabilityStatus: config?.show_availability_status && !!availabilityStatus,
  };
};

// Hook for managing date/time step in isolation (without session)
export const useDateTimeData = (initialData?: DateTimeStepData) => {
  const [data, setData] = useState<DateTimeStepData>(initialData || DateTimeApi.getDefaultData());
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const updateData = useCallback((newData: Partial<DateTimeStepData>) => {
    setData((prev) => ({ ...prev, ...newData }));
    setValidationErrors({});
  }, []);

  const validate = useCallback(() => {
    const validation = DateTimeApi.validateData(data);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [data]);

  const getFieldError = useCallback(
    (fieldName: string) => {
      return validationErrors[fieldName]?.[0];
    },
    [validationErrors],
  );

  const hasFieldError = useCallback(
    (fieldName: string) => {
      return !!(validationErrors[fieldName]?.length > 0);
    },
    [validationErrors],
  );

  const formattedValues = useMemo(
    () => ({
      startDate: DateTimeApi.formatDate(data.start_date),
      endDate: data.end_date ? DateTimeApi.formatDate(data.end_date) : '',
    }),
    [data],
  );

  return {
    data,
    updateData,
    validate,
    validationErrors,
    getFieldError,
    hasFieldError,
    formattedValues,
    isValid: validate,
    isComplete: !!data.start_date,
  };
};
