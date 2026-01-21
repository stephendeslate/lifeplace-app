// frontend/admin-crm/src/hooks/useFormHandlers.ts
// Centralized form handler hooks to eliminate duplicate handlers across booking flow configs

import { useCallback } from 'react';
import type { SelectChangeEvent } from '@mui/material';

/**
 * Generic form handlers for common form patterns
 * Replaces 30+ duplicate handler implementations across booking flow configs
 */
export const useFormHandlers = <T extends object>(
  setFormData: React.Dispatch<React.SetStateAction<T>>,
  errors: Record<string, string>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
) => {
  /**
   * Handle text input changes with automatic error clearing
   */
  const handleInputChange = useCallback(
    (field: keyof T) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));

        // Clear error when user starts typing
        if (errors[field as string]) {
          setErrors((prev) => ({
            ...prev,
            [field]: '',
          }));
        }
      },
    [errors, setErrors, setFormData]
  );

  /**
   * Handle switch/checkbox changes
   */
  const handleSwitchChange = useCallback(
    (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    },
    [setFormData]
  );

  /**
   * Handle select/dropdown changes
   */
  const handleSelectChange = useCallback(
    (field: keyof T) => (event: SelectChangeEvent<unknown>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));

      // Clear error when user makes selection
      if (errors[field as string]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    },
    [errors, setErrors, setFormData]
  );

  /**
   * Handle numeric input changes
   */
  const handleNumberChange = useCallback(
    (field: keyof T) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        const numValue = value === '' ? 0 : parseFloat(value);

        setFormData((prev) => ({
          ...prev,
          [field]: isNaN(numValue) ? 0 : numValue,
        }));

        if (errors[field as string]) {
          setErrors((prev) => ({
            ...prev,
            [field]: '',
          }));
        }
      },
    [errors, setErrors, setFormData]
  );

  /**
   * Handle direct value changes (for custom components)
   */
  const handleValueChange = useCallback(
    (field: keyof T) => (value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (errors[field as string]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    },
    [errors, setErrors, setFormData]
  );

  /**
   * Set a specific field value directly
   */
  const setFieldValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [setFormData]
  );

  /**
   * Set a specific field error
   */
  const setFieldError = useCallback(
    (field: keyof T, error: string) => {
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    },
    [setErrors]
  );

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, [setErrors]);

  /**
   * Clear a specific field error
   */
  const clearFieldError = useCallback(
    (field: keyof T) => {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    },
    [setErrors]
  );

  return {
    handleInputChange,
    handleSwitchChange,
    handleSelectChange,
    handleNumberChange,
    handleValueChange,
    setFieldValue,
    setFieldError,
    clearErrors,
    clearFieldError,
  };
};

/**
 * Simplified form handlers without error management
 * For simple forms that don't need validation
 */
export const useSimpleFormHandlers = <T extends object>(
  setFormData: React.Dispatch<React.SetStateAction<T>>
) => {
  const handleInputChange = useCallback(
    (field: keyof T) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({
          ...prev,
          [field]: event.target.value,
        }));
      },
    [setFormData]
  );

  const handleSwitchChange = useCallback(
    (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    },
    [setFormData]
  );

  const handleSelectChange = useCallback(
    (field: keyof T) => (event: SelectChangeEvent<unknown>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    },
    [setFormData]
  );

  const handleValueChange = useCallback(
    (field: keyof T) => (value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [setFormData]
  );

  return {
    handleInputChange,
    handleSwitchChange,
    handleSelectChange,
    handleValueChange,
  };
};
