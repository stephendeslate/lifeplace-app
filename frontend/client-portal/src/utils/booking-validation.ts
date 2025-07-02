// frontend/client-portal/src/utils/booking-validation.ts

import type { 
  BookingFlowStep,
  ContactInfoStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  PaymentInfoStepConfiguration,
  DateTimeStepConfiguration
} from '../types/booking.types';
import type { 
  BookingStepData,
  ContactInfoStepData,
  DateTimeStepData,
  PackageSelectionStepData,
  AddonSelectionStepData,
  PaymentInfoStepData,
  ReviewBookingStepData
} from '../types/booking-session.types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

/**
 * Email validation utility
 * Used by useBookingValidation.validateEmail()
 */
export const validateEmail = (email: string): string[] => {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    return errors; // Let required validation handle empty emails
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push('Please enter a valid email address');
  }
  
  return errors;
};

/**
 * Phone validation utility
 * Used by useBookingValidation.validatePhone()
 */
export const validatePhone = (phone: string): string[] => {
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
};

/**
 * Required field validation utility
 * Used by useBookingValidation.validateRequired()
 */
export const validateRequired = (value: any, fieldName: string): string[] => {
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
};

/**
 * Date validation utility
 * Used by useBookingValidation.validateDate()
 */
export const validateDate = (date: string): string[] => {
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
};

/**
 * Number validation utility
 * Used by useBookingValidation.validateNumber()
 */
export const validateNumber = (value: any, min?: number, max?: number): string[] => {
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
};

/**
 * Contact info step validation
 * Matches useBookingValidation.validateField() for contact_info step
 */
export const validateContactInfo = (data: ContactInfoStepData, config?: ContactInfoStepConfiguration): ValidationResult => {
  const errors: Record<string, string[]> = {};

  if (config) {
    if (config.require_full_name) {
      const fullNameErrors = validateRequired(data.full_name, 'Full name');
      if (fullNameErrors.length > 0) {
        errors.full_name = fullNameErrors;
      }
    }

    if (config.require_email) {
      const emailRequiredErrors = validateRequired(data.email, 'Email');
      const emailFormatErrors = validateEmail(data.email);
      const allEmailErrors = [...emailRequiredErrors, ...emailFormatErrors];
      if (allEmailErrors.length > 0) {
        errors.email = allEmailErrors;
      }
    }

    if (config.require_phone && data.phone) {
      const phoneRequiredErrors = validateRequired(data.phone, 'Phone');
      const phoneFormatErrors = validatePhone(data.phone);
      const allPhoneErrors = [...phoneRequiredErrors, ...phoneFormatErrors];
      if (allPhoneErrors.length > 0) {
        errors.phone = allPhoneErrors;
      }
    }

    if (config.require_address) {
      const addressErrors = validateRequired(data.address, 'Address');
      if (addressErrors.length > 0) {
        errors.address = addressErrors;
      }
    }

    if (config.require_company) {
      const companyErrors = validateRequired(data.company, 'Company');
      if (companyErrors.length > 0) {
        errors.company = companyErrors;
      }
    }
  }

  // Account creation validation
  if (data.create_account) {
    if (!data.password) {
      errors.password = ['Password is required for account creation'];
    } else if (data.password.length < 8) {
      errors.password = ['Password must be at least 8 characters'];
    }

    if (!data.password_confirm) {
      errors.password_confirm = ['Please confirm your password'];
    } else if (data.password !== data.password_confirm) {
      errors.password_confirm = ['Passwords do not match'];
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Date/time step validation
 * Matches useBookingValidation.validateField() for date_time step
 */
export const validateDateTime = (data: DateTimeStepData, config?: DateTimeStepConfiguration): ValidationResult => {
  const errors: Record<string, string[]> = {};

  // Required start date
  const startDateErrors = validateRequired(data.start_date, 'Start date');
  const startDateFormatErrors = validateDate(data.start_date);
  const allStartDateErrors = [...startDateErrors, ...startDateFormatErrors];
  if (allStartDateErrors.length > 0) {
    errors.start_date = allStartDateErrors;
  }

  // Guest count validation
  if (data.guest_count !== undefined) {
    const guestCountErrors = validateNumber(data.guest_count, 1, 1000);
    if (guestCountErrors.length > 0) {
      errors.guest_count = guestCountErrors;
    }
  }

  // End date validation (if provided)
  if (data.end_date) {
    const endDateErrors = validateDate(data.end_date);
    if (endDateErrors.length > 0) {
      errors.end_date = endDateErrors;
    }

    // Check that end date is after start date
    if (data.start_date && !errors.start_date && !errors.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate <= startDate) {
        errors.end_date = ['End date must be after start date'];
      }
    }
  }

  // Duration validation based on config
  if (config && data.duration) {
    const durationErrors = validateNumber(
      data.duration, 
      config.min_duration_hours, 
      config.max_duration_hours
    );
    if (durationErrors.length > 0) {
      errors.duration = durationErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Package selection step validation
 * Matches useBookingValidation.validateField() for package_selection step
 */
export const validatePackageSelection = (data: PackageSelectionStepData, config?: PackageSelectionStepConfiguration): ValidationResult => {
  const errors: Record<string, string[]> = {};

  if (config) {
    const packages = data.selected_packages || [];
    
    if (packages.length < config.min_selection) {
      errors.selected_packages = [`You must select at least ${config.min_selection} package(s)`];
    }
    
    if (config.max_selection > 0 && packages.length > config.max_selection) {
      errors.selected_packages = [`You cannot select more than ${config.max_selection} package(s)`];
    }

    // Validate individual package selections
    packages.forEach((pkg, index) => {
      if (!pkg.id) {
        errors[`package_${index}_id`] = ['Package ID is required'];
      }
      if (!pkg.quantity || pkg.quantity < 1) {
        errors[`package_${index}_quantity`] = ['Package quantity must be at least 1'];
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Addon selection step validation
 * Matches useBookingValidation.validateField() for addon_selection step
 */
export const validateAddonSelection = (data: AddonSelectionStepData, config?: AddonSelectionStepConfiguration): ValidationResult => {
  const errors: Record<string, string[]> = {};

  if (config) {
    const addons = data.selected_addons || [];
    
    if (addons.length < config.min_selection) {
      errors.selected_addons = [`You must select at least ${config.min_selection} add-on(s)`];
    }
    
    if (config.max_selection > 0 && addons.length > config.max_selection) {
      errors.selected_addons = [`You cannot select more than ${config.max_selection} add-on(s)`];
    }

    // Validate individual addon selections
    addons.forEach((addon, index) => {
      if (!addon.id) {
        errors[`addon_${index}_id`] = ['Add-on ID is required'];
      }
      if (!addon.quantity || addon.quantity < 1) {
        errors[`addon_${index}_quantity`] = ['Add-on quantity must be at least 1'];
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Payment info step validation
 * Matches useBookingValidation.validateField() for payment_info step
 */
export const validatePaymentInfo = (data: PaymentInfoStepData, config?: PaymentInfoStepConfiguration): ValidationResult => {
  const errors: Record<string, string[]> = {};

  if (config && config.require_immediate_payment) {
    const gatewayErrors = validateRequired(data.gateway_id, 'Payment method');
    if (gatewayErrors.length > 0) {
      errors.gateway_id = gatewayErrors;
    }

    // Either payment method token or payment method ID is required
    if (!data.payment_method_token && !data.payment_method_id) {
      errors.payment_method = ['Payment method details are required'];
    }
  }

  // Billing address validation if provided
  if (data.billing_address) {
    const { billing_address } = data;
    
    if (!billing_address.line1) {
      errors.billing_line1 = ['Address line 1 is required'];
    }
    
    if (!billing_address.city) {
      errors.billing_city = ['City is required'];
    }
    
    if (!billing_address.state) {
      errors.billing_state = ['State is required'];
    }
    
    if (!billing_address.postal_code) {
      errors.billing_postal_code = ['Postal code is required'];
    }
    
    if (!billing_address.country) {
      errors.billing_country = ['Country is required'];
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Review booking step validation
 * Matches useBookingValidation.validateStepData() for review_booking step
 */
export const validateReviewBooking = (data: ReviewBookingStepData): ValidationResult => {
  const errors: Record<string, string[]> = {};

  if (!data.terms_accepted) {
    errors.terms_accepted = ['You must accept the terms and conditions'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Generic step validation function
 * Matches useBookingValidation.validateStepData() logic
 */
export const validateStepData = (step: BookingFlowStep, stepData: BookingStepData): ValidationResult => {
  switch (step.step_type) {
    case 'contact_info':
      return validateContactInfo(
        stepData as ContactInfoStepData,
        step.configuration_data as ContactInfoStepConfiguration
      );
    
    case 'date_time':
      return validateDateTime(
        stepData as DateTimeStepData,
        step.configuration_data as DateTimeStepConfiguration
      );
    
    case 'package_selection':
      return validatePackageSelection(
        stepData as PackageSelectionStepData,
        step.configuration_data as PackageSelectionStepConfiguration
      );
    
    case 'addon_selection':
      return validateAddonSelection(
        stepData as AddonSelectionStepData,
        step.configuration_data as AddonSelectionStepConfiguration
      );
    
    case 'payment_info':
      return validatePaymentInfo(
        stepData as PaymentInfoStepData,
        step.configuration_data as PaymentInfoStepConfiguration
      );
    
    case 'review_booking':
      return validateReviewBooking(stepData as ReviewBookingStepData);
    
    default:
      // For steps without specific validation (introduction, questionnaire, pricing_summary, confirmation)
      return {
        isValid: true,
        errors: {}
      };
  }
};

/**
 * Validate custom field rules from step configuration
 * Used by useBookingValidation.validateField() for custom validation rules
 */
export const validateCustomFieldRules = (
  fieldName: string, 
  value: any, 
  fieldRules: Record<string, any>
): string[] => {
  const errors: string[] = [];

  if (fieldRules.min_length && typeof value === 'string' && value.length < fieldRules.min_length) {
    errors.push(`Must be at least ${fieldRules.min_length} characters`);
  }
  
  if (fieldRules.max_length && typeof value === 'string' && value.length > fieldRules.max_length) {
    errors.push(`Cannot exceed ${fieldRules.max_length} characters`);
  }
  
  if (fieldRules.pattern && typeof value === 'string' && !new RegExp(fieldRules.pattern).test(value)) {
    errors.push(fieldRules.pattern_message || 'Invalid format');
  }

  return errors;
};

/**
 * Get required fields for a step based on configuration
 * Used to determine which fields are required for validation
 */
export const getRequiredFields = (step: BookingFlowStep): string[] => {
  const requiredFields: string[] = [];
  
  // Add fields from validation rules
  if (step.validation_rules?.required_fields) {
    requiredFields.push(...step.validation_rules.required_fields);
  }

  // Add step-specific required fields based on configuration
  switch (step.step_type) {
    case 'contact_info':
      const contactConfig = step.configuration_data as ContactInfoStepConfiguration;
      if (contactConfig) {
        if (contactConfig.require_full_name) requiredFields.push('full_name');
        if (contactConfig.require_email) requiredFields.push('email');
        if (contactConfig.require_phone) requiredFields.push('phone');
        if (contactConfig.require_address) requiredFields.push('address');
        if (contactConfig.require_company) requiredFields.push('company');
      }
      break;
    
    case 'date_time':
      requiredFields.push('start_date');
      break;
    
    case 'payment_info':
      const paymentConfig = step.configuration_data as PaymentInfoStepConfiguration;
      if (paymentConfig && paymentConfig.require_immediate_payment) {
        requiredFields.push('gateway_id', 'payment_method');
      }
      break;
    
    case 'review_booking':
      requiredFields.push('terms_accepted');
      break;
  }

  return [...new Set(requiredFields)]; // Remove duplicates
};