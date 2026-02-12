// frontend/client-portal/src/utils/validation.ts

/**
 * Consolidated validation utilities for the client-portal
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// Core Validation Patterns
// ============================================================================

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import { validatePhoneNumber as _validatePhone } from "@shared/utils/phoneValidation";

// ============================================================================
// Simple Validation Functions (Boolean Returns)
// ============================================================================

/**
 * Check if email is valid format
 */
export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validate phone number (PH default, accepts international with country code)
 */
export const isValidPhone = (phone: string): boolean => {
  return _validatePhone(phone);
};

/**
 * Validate phone number (Philippines format)
 * @deprecated Use isValidPhone instead
 */
export const isValidPhilippinePhone = (phone: string): boolean => {
  return _validatePhone(phone);
};

/**
 * Check if a required field has a value
 */
export const isRequired = (value: string | undefined | null): boolean => {
  return value !== undefined && value !== null && value.trim().length > 0;
};

/**
 * Check if value meets minimum length requirement
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

/**
 * Check if date is valid
 */
export const isValidDate = (date: Date | string | null): boolean => {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return !isNaN(d.getTime());
};

/**
 * Check if date is in the future
 */
export const isFutureDate = (date: Date | string | null): boolean => {
  if (!date || !isValidDate(date)) return false;
  const d = date instanceof Date ? date : new Date(date);
  return d > new Date();
};

/**
 * Check if date is at least minDaysAdvance days in the future
 */
export const isFutureDateWithAdvance = (
  date: Date | string | null,
  minDaysAdvance: number = 1,
): boolean => {
  if (!date || !isValidDate(date)) return false;
  const selectedDate = date instanceof Date ? date : new Date(date);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + minDaysAdvance);
  return selectedDate >= minDate;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate time format (HH:MM)
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

// ============================================================================
// Consolidated Validators Object
// ============================================================================

/**
 * Consolidated validators object for convenient import
 */
export const validators = {
  email: isValidEmail,
  phone: isValidPhone,
  required: isRequired,
  minLength: hasMinLength,
  date: isValidDate,
  futureDate: isFutureDate,
  futureDateWithAdvance: isFutureDateWithAdvance,
  url: isValidUrl,
  time: isValidTime,
};

// ============================================================================
// Message-Returning Validation Functions (For Forms)
// ============================================================================

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: false,
  requireNumbers: true,
  requireSpecialChars: false,
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return "Email is required";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return "Password is required";
  }

  if (password.length < PASSWORD_RULES.minLength) {
    return `Password must be at least ${PASSWORD_RULES.minLength} characters long`;
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    return "Password must contain at least one number";
  }

  if (
    PASSWORD_RULES.requireSpecialChars &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    return "Password must contain at least one special character";
  }

  return null;
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string,
): string | null => {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
};

/**
 * Validate required field
 */
export const validateRequired = (
  value: string,
  fieldName: string,
): string | null => {
  if (!value?.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate phone number (optional but if provided, should be valid)
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return null; // Phone is optional
  }
  if (!_validatePhone(phone)) {
    return "Please enter a valid phone number";
  }
  return null;
};

/**
 * Validate name (no numbers or special characters)
 */
export const validateName = (
  name: string,
  fieldName: string,
): string | null => {
  if (!name?.trim()) {
    return `${fieldName} is required`;
  }

  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }

  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }

  return null;
};

/**
 * Comprehensive form validation for login
 */
export const validateLoginForm = (data: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validateRequired(data.password, "Password");
  if (passwordError) errors.password = passwordError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Comprehensive form validation for registration
 */
export const validateRegisterForm = (data: {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  profile?: {
    phone?: string;
    company?: string;
  };
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Email validation
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  // Name validation
  const firstNameError = validateName(data.first_name, "First name");
  if (firstNameError) errors.first_name = firstNameError;

  const lastNameError = validateName(data.last_name, "Last name");
  if (lastNameError) errors.last_name = lastNameError;

  // Password validation
  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  // Confirm password validation
  const confirmPasswordError = validatePasswordConfirmation(
    data.password,
    data.confirm_password,
  );
  if (confirmPasswordError) errors.confirm_password = confirmPasswordError;

  // Optional phone validation
  if (data.profile?.phone) {
    const phoneError = validatePhone(data.profile.phone);
    if (phoneError) errors["profile.phone"] = phoneError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validation for change password form
 */
export const validateChangePasswordForm = (data: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  const currentPasswordError = validateRequired(
    data.current_password,
    "Current password",
  );
  if (currentPasswordError) errors.current_password = currentPasswordError;

  const newPasswordError = validatePassword(data.new_password);
  if (newPasswordError) errors.new_password = newPasswordError;

  const confirmPasswordError = validatePasswordConfirmation(
    data.new_password,
    data.confirm_password,
  );
  if (confirmPasswordError) errors.confirm_password = confirmPasswordError;

  // Check if new password is different from current
  if (
    data.current_password &&
    data.new_password &&
    data.current_password === data.new_password
  ) {
    errors.new_password =
      "New password must be different from current password";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get password strength score (0-4)
 */
export const getPasswordStrength = (password: string): number => {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  return score;
};

/**
 * Get password strength label
 */
export const getPasswordStrengthLabel = (strength: number): string => {
  switch (strength) {
    case 0:
    case 1:
      return "Very Weak";
    case 2:
      return "Weak";
    case 3:
      return "Good";
    case 4:
      return "Strong";
    case 5:
      return "Very Strong";
    default:
      return "Very Weak";
  }
};

/**
 * Get password strength color
 */
export const getPasswordStrengthColor = (strength: number): string => {
  switch (strength) {
    case 0:
    case 1:
      return "error";
    case 2:
      return "warning";
    case 3:
      return "info";
    case 4:
    case 5:
      return "success";
    default:
      return "error";
  }
};

// ============================================================================
// Default Export
// ============================================================================

export default validators;
