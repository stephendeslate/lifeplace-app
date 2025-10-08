// frontend/client-portal/src/hooks/booking/useDateTime.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { DateTimeApi } from '../../apis/booking/datetime.api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  DateTimeStepData,
  DateTimeStepConfiguration,
} from '../../types/booking';

// Hook for managing date/time step data and interactions
export const useDateTime = (
  sessionId?: string,
  stepId?: number,
  initialData?: DateTimeStepData,
  config?: DateTimeStepConfiguration | null
) => {
  const [data, setData] = useState<DateTimeStepData>(
    initialData || DateTimeApi.getDefaultData()
  );
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
  const updateData = useCallback((newData: Partial<DateTimeStepData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      
      // Auto-calculate end date/time if start date/time and duration change
      if ((newData.start_date || newData.start_time || newData.duration) && 
          updated.start_date && updated.duration) {
        const endDateTime = DateTimeApi.calculateEndDateTime(
          updated.start_date,
          updated.start_time || '',
          updated.duration
        );
        updated.end_date = endDateTime.end_date;
        updated.end_time = endDateTime.end_time;
      }
      
      return updated;
    });
    
    // Clear validation errors when data changes
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
    
    // Clear general error
    if (error) {
      setError(null);
    }

    // Clear availability status when date/time changes
    if (newData.start_date || newData.start_time) {
      setAvailabilityStatus(null);
    }
  }, [validationErrors, error]);

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
        result.errors.forEach(error => {
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
        message: errorMessage
      });
      return false;
    } finally {
      setCheckingAvailability(false);
    }
  }, [sessionId, data]);

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
      const formattedData = DateTimeApi.formatStepData(data);
      const result = await DateTimeApi.updateStepData(
        sessionId,
        stepId,
        formattedData,
        markCompleted
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
  }, [sessionId, stepId, data]);

  // Handle date change
  const handleDateChange = useCallback((date: Date | null) => {
    const dateString = date ? date.toISOString().split('T')[0] : '';
    updateData({ start_date: dateString });
  }, [updateData]);

  // Handle time change
  const handleTimeChange = useCallback((time: Date | null) => {
    const timeString = time ? time.toTimeString().split(' ')[0].slice(0, 5) : '';
    updateData({ start_time: timeString });
  }, [updateData]);

  // Handle duration change
  const handleDurationChange = useCallback((duration: number) => {
    updateData({ duration });
  }, [updateData]);

  // Handle resource requirements change
  const handleResourceRequirementsChange = useCallback((requirements: string[]) => {
    updateData({ resource_requirements: requirements });
  }, [updateData]);

  // Auto-check availability when date/time changes (if enabled)
  useEffect(() => {
    if (config?.enable_real_time_availability && 
        config?.auto_check_conflicts && 
        data.start_date && 
        sessionId) {
      const timeoutId = setTimeout(() => {
        checkAvailability();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [data.start_date, data.start_time, config, sessionId, checkAvailability]);

  // Check if step is complete/valid
  const isValid = useCallback(() => {
    return validateClientSide();
  }, [validateClientSide]);

  // Get minimum date based on configuration
  const minDate = useMemo(() => {
    const today = new Date();
    const minDays = config?.min_duration_hours || 1;
    today.setDate(today.getDate() + Math.floor(minDays / 24));
    return today;
  }, [config]);

  // Get field error
  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  // Check if field has error
  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);

  // Format display values
  const formattedValues = useMemo(() => ({
    startDate: DateTimeApi.formatDate(data.start_date),
    startTime: DateTimeApi.formatTime(data.start_time || ''),
    endDate: DateTimeApi.formatDate(data.end_date || ''),
    endTime: DateTimeApi.formatTime(data.end_time || ''),
  }), [data]);

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
    handleTimeChange,
    handleDurationChange,
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
    isComplete: !!(data.start_date && data.duration),
    hasChanges: JSON.stringify(data) !== JSON.stringify(initialData || DateTimeApi.getDefaultData()),
    isAvailable: availabilityStatus?.available,
    showAvailabilityStatus: config?.show_availability_status && !!availabilityStatus,
  };
};

// Hook for managing date/time step in isolation (without session)
export const useDateTimeData = (
  initialData?: DateTimeStepData
) => {
  const [data, setData] = useState<DateTimeStepData>(
    initialData || DateTimeApi.getDefaultData()
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const updateData = useCallback((newData: Partial<DateTimeStepData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      
      // Auto-calculate end date/time
      if ((newData.start_date || newData.start_time || newData.duration) && 
          updated.start_date && updated.duration) {
        const endDateTime = DateTimeApi.calculateEndDateTime(
          updated.start_date,
          updated.start_time || '',
          updated.duration
        );
        updated.end_date = endDateTime.end_date;
        updated.end_time = endDateTime.end_time;
      }
      
      return updated;
    });
    setValidationErrors({});
  }, []);

  const validate = useCallback(() => {
    const validation = DateTimeApi.validateData(data);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [data]);

  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);

  const formattedValues = useMemo(() => ({
    startDate: DateTimeApi.formatDate(data.start_date),
    startTime: DateTimeApi.formatTime(data.start_time || ''),
    endDate: DateTimeApi.formatDate(data.end_date || ''),
    endTime: DateTimeApi.formatTime(data.end_time || ''),
  }), [data]);

  return {
    data,
    updateData,
    validate,
    validationErrors,
    getFieldError,
    hasFieldError,
    formattedValues,
    isValid: validate,
    isComplete: !!(data.start_date && data.duration),
  };
};