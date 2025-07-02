// frontend/client-portal/src/hooks/useBookingValidation.ts

import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { bookingSessionAPI } from '../apis/booking-session.api';
import type { 
  BookingFlowStep,
  ContactInfoStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  PaymentInfoStepConfiguration
} from '../types/booking.types';
import type { StepValidationResult } from '../types/booking-steps.types';

interface UseBookingValidationOptions {
  sessionUUID?: string;
  validateOnChange?: boolean;
  debounceMs?: number;
}

interface UseBookingValidationReturn {
  // Validation state
  validationErrors: Record<string, string[]>;
  isValid: boolean;
  isValidating: boolean;
  hasValidated: boolean;
  
  // Validation actions
  validateStep: (stepId: number, stepData: Record<string, any>) => Promise<StepValidationResult>;
  validateField: (fieldName: string, value: any, step: BookingFlowStep) => string[];
  clearValidation: () => void;
  clearFieldError: (fieldName: string) => void;
  
  // Client-side validation
  validateStepData: (step: BookingFlowStep, stepData: Record<string, any>) => StepValidationResult;
  
  // Field validation helpers
  validateEmail: (email: string) => string[];
  validatePhone: (phone: string) => string[];
  validateRequired: (value: any, fieldName: string) => string[];
  validateDate: (date: string) => string[];
  validateNumber: (value: any, min?: number, max?: number) => string[];
}

export const useBookingValidation = (options: UseBookingValidationOptions = {}): UseBookingValidationReturn => {
  // @ts-ignore
  const { sessionUUID, validateOnChange = false, debounceMs = 300 } = options;
  
  // Local state
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [hasValidated, setHasValidated] = useState(false);

  // Server-side validation mutation
  const validateMutation = useMutation({
    mutationFn: ({ stepId, stepData }: { stepId: number; stepData: Record<string, any> }) => {
      if (!sessionUUID) throw new Error('No session UUID provided');
      return bookingSessionAPI.validateStepData(sessionUUID, stepId, stepData);
    },
    onSuccess: (result) => {
      setValidationErrors(result.errors);
      setHasValidated(true);
    },
    // @ts-ignore
    onError: (error: any) => {
      setValidationErrors({ general: ['Validation failed'] });
      setHasValidated(true);
    },
  });

  // Computed validation state
  const isValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  // Client-side field validation helpers
  const validateEmail = useCallback((email: string): string[] => {
    const errors: string[] = [];
    
    if (!email || email.trim() === '') {
      return errors; // Let required validation handle empty emails
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please enter a valid email address');
    }
    
    return errors;
  }, []);

  const validatePhone = useCallback((phone: string): string[] => {
    const errors: string[] = [];
    
    if (!phone || phone.trim() === '') {
      return errors; // Let required validation handle empty phones
    }
    
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 10) {
      errors.push('Phone number must be at least 10 digits');
    }
    
    if (digitsOnly.length > 15) {
      errors.push('Phone number cannot exceed 15 digits');
    }
    
    return errors;
  }, []);

  const validateRequired = useCallback((value: any, fieldName: string): string[] => {
    const errors: string[] = [];
    
    if (value === null || value === undefined) {
      errors.push(`${fieldName} is required`);
      return errors;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      errors.push(`${fieldName} is required`);
      return errors;
    }
    
    if (Array.isArray(value) && value.length === 0) {
      errors.push(`${fieldName} is required`);
      return errors;
    }
    
    return errors;
  }, []);

  const validateDate = useCallback((date: string): string[] => {
    const errors: string[] = [];
    
    if (!date || date.trim() === '') {
      return errors; // Let required validation handle empty dates
    }
    
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      errors.push('Please enter a valid date');
      return errors;
    }
    
    // Check if date is in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (dateObj < now) {
      errors.push('Date cannot be in the past');
    }
    
    return errors;
  }, []);

  const validateNumber = useCallback((value: any, min?: number, max?: number): string[] => {
    const errors: string[] = [];
    
    if (value === null || value === undefined || value === '') {
      return errors; // Let required validation handle empty numbers
    }
    
    const num = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(num)) {
      errors.push('Please enter a valid number');
      return errors;
    }
    
    if (min !== undefined && num < min) {
      errors.push(`Value must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      errors.push(`Value cannot exceed ${max}`);
    }
    
    return errors;
  }, []);

  // Field-level validation
  const validateField = useCallback((fieldName: string, value: any, step: BookingFlowStep): string[] => {
    const errors: string[] = [];
    const config = step.configuration_data;

    // Common required field validation
    if (step.validation_rules?.required_fields?.includes(fieldName)) {
      errors.push(...validateRequired(value, fieldName.replace('_', ' ')));
    }

    // Step-specific validations
    switch (step.step_type) {
      case 'contact_info':
        const contactConfig = config as ContactInfoStepConfiguration;
        if (contactConfig) {
          if (fieldName === 'email' && contactConfig.require_email) {
            errors.push(...validateRequired(value, 'Email'));
            errors.push(...validateEmail(value));
          }
          if (fieldName === 'phone' && contactConfig.require_phone) {
            errors.push(...validateRequired(value, 'Phone'));
            errors.push(...validatePhone(value));
          }
          if (fieldName === 'full_name' && contactConfig.require_full_name) {
            errors.push(...validateRequired(value, 'Full name'));
          }
        }
        break;

      case 'date_time':
        if (fieldName === 'start_date') {
          errors.push(...validateRequired(value, 'Start date'));
          errors.push(...validateDate(value));
        }
        if (fieldName === 'guest_count') {
          errors.push(...validateNumber(value, 1, 1000));
        }
        break;

      case 'package_selection':
        const packageConfig = config as PackageSelectionStepConfiguration;
        if (packageConfig && fieldName === 'selected_packages') {
          const packages = Array.isArray(value) ? value : [];
          if (packages.length < packageConfig.min_selection) {
            errors.push(`You must select at least ${packageConfig.min_selection} package(s)`);
          }
          if (packageConfig.max_selection > 0 && packages.length > packageConfig.max_selection) {
            errors.push(`You cannot select more than ${packageConfig.max_selection} package(s)`);
          }
        }
        break;

      case 'addon_selection':
        const addonConfig = config as AddonSelectionStepConfiguration;
        if (addonConfig && fieldName === 'selected_addons') {
          const addons = Array.isArray(value) ? value : [];
          if (addons.length < addonConfig.min_selection) {
            errors.push(`You must select at least ${addonConfig.min_selection} add-on(s)`);
          }
          if (addonConfig.max_selection > 0 && addons.length > addonConfig.max_selection) {
            errors.push(`You cannot select more than ${addonConfig.max_selection} add-on(s)`);
          }
        }
        break;

      case 'payment_info':
        const paymentConfig = config as PaymentInfoStepConfiguration;
        if (paymentConfig && paymentConfig.require_immediate_payment) {
          if (fieldName === 'gateway_id') {
            errors.push(...validateRequired(value, 'Payment method'));
          }
        }
        break;
    }

    // Custom validation rules from step configuration
    if (step.validation_rules?.field_rules?.[fieldName]) {
      const fieldRules = step.validation_rules.field_rules[fieldName];
      
      if (fieldRules.min_length && typeof value === 'string' && value.length < fieldRules.min_length) {
        errors.push(`Must be at least ${fieldRules.min_length} characters`);
      }
      
      if (fieldRules.max_length && typeof value === 'string' && value.length > fieldRules.max_length) {
        errors.push(`Cannot exceed ${fieldRules.max_length} characters`);
      }
      
      if (fieldRules.pattern && typeof value === 'string' && !new RegExp(fieldRules.pattern).test(value)) {
        errors.push(fieldRules.pattern_message || 'Invalid format');
      }
    }

    return errors;
  }, [validateRequired, validateEmail, validatePhone, validateDate, validateNumber]);

  // Full step validation (client-side)
  const validateStepData = useCallback((step: BookingFlowStep, stepData: Record<string, any>): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    // Validate each field in the step data
    Object.keys(stepData).forEach(fieldName => {
      const fieldErrors = validateField(fieldName, stepData[fieldName], step);
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    });

    // Additional step-level validations
    switch (step.step_type) {
      case 'review_booking':
        if (!stepData.terms_accepted) {
          errors.terms_accepted = ['You must accept the terms and conditions'];
        }
        break;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [validateField]);

  // Server-side step validation
  const validateStep = useCallback(async (stepId: number, stepData: Record<string, any>): Promise<StepValidationResult> => {
    try {
      const result = await validateMutation.mutateAsync({ stepId, stepData });
      return result;
    } catch (error) {
      return {
        isValid: false,
        errors: { general: ['Validation failed'] }
      };
    }
  }, [validateMutation]);

  // Clear validation errors
  const clearValidation = useCallback(() => {
    setValidationErrors({});
    setHasValidated(false);
    validateMutation.reset();
  }, [validateMutation]);

  // Clear specific field error
  const clearFieldError = useCallback((fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    // Validation state
    validationErrors,
    isValid,
    isValidating: validateMutation.isPending,
    hasValidated,
    
    // Validation actions
    validateStep,
    validateField,
    clearValidation,
    clearFieldError,
    
    // Client-side validation
    validateStepData,
    
    // Field validation helpers
    validateEmail,
    validatePhone,
    validateRequired,
    validateDate,
    validateNumber,
  };
};