// frontend/client-portal/src/utils/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
  validatePhone,
  validateName,
  validateLoginForm,
  validateRegisterForm,
  validateChangePasswordForm,
  getPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  PASSWORD_RULES,
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('returns null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });

    it('returns null for email with subdomain', () => {
      expect(validateEmail('test@sub.example.com')).toBeNull();
    });

    it('returns null for email with plus sign', () => {
      expect(validateEmail('test+tag@example.com')).toBeNull();
    });

    it('returns error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
    });

    it('returns error for email without @', () => {
      expect(validateEmail('testexample.com')).toBe('Please enter a valid email address');
    });

    it('returns error for email without domain', () => {
      expect(validateEmail('test@')).toBe('Please enter a valid email address');
    });

    it('returns error for email without TLD', () => {
      expect(validateEmail('test@example')).toBe('Please enter a valid email address');
    });

    it('returns error for email with spaces', () => {
      expect(validateEmail('test @example.com')).toBe('Please enter a valid email address');
    });
  });

  describe('validatePassword', () => {
    it('returns null for valid password', () => {
      // Password meets: 8+ chars, lowercase, number
      expect(validatePassword('password123')).toBeNull();
    });

    it('returns error for empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('returns error for short password', () => {
      expect(validatePassword('pass1')).toBe(
        `Password must be at least ${PASSWORD_RULES.minLength} characters long`
      );
    });

    it('returns error for password without lowercase when required', () => {
      // Only numbers and uppercase
      expect(validatePassword('PASSWORD1')).toBe(
        'Password must contain at least one lowercase letter'
      );
    });

    it('returns error for password without numbers when required', () => {
      // Only letters
      expect(validatePassword('passwordonly')).toBe(
        'Password must contain at least one number'
      );
    });

    it('accepts password with minimum requirements', () => {
      // 8 chars + lowercase + number (based on PASSWORD_RULES)
      expect(validatePassword('abcdefg1')).toBeNull();
    });
  });

  describe('validatePasswordConfirmation', () => {
    it('returns null when passwords match', () => {
      expect(validatePasswordConfirmation('Password123', 'Password123')).toBeNull();
    });

    it('returns error for empty confirmation', () => {
      expect(validatePasswordConfirmation('Password123', '')).toBe(
        'Please confirm your password'
      );
    });

    it('returns error when passwords do not match', () => {
      expect(validatePasswordConfirmation('Password123', 'Password456')).toBe(
        'Passwords do not match'
      );
    });

    it('is case sensitive', () => {
      expect(validatePasswordConfirmation('Password123', 'password123')).toBe(
        'Passwords do not match'
      );
    });
  });

  describe('validateRequired', () => {
    it('returns null for non-empty string', () => {
      expect(validateRequired('value', 'Field')).toBeNull();
    });

    it('returns error for empty string', () => {
      expect(validateRequired('', 'Field Name')).toBe('Field Name is required');
    });

    it('returns error for whitespace only', () => {
      expect(validateRequired('   ', 'Field Name')).toBe('Field Name is required');
    });

    it('uses custom field name in error message', () => {
      expect(validateRequired('', 'Email')).toBe('Email is required');
    });
  });

  describe('validatePhone', () => {
    it('returns null for empty phone (optional field)', () => {
      expect(validatePhone('')).toBeNull();
    });

    it('returns null for valid international format', () => {
      expect(validatePhone('+19123456789')).toBeNull();
    });

    it('returns null for phone with country code', () => {
      expect(validatePhone('+639123456789')).toBeNull();
    });

    it('returns error for invalid phone format', () => {
      expect(validatePhone('abc')).toBe('Please enter a valid phone number');
    });

    it('handles phone with spaces', () => {
      // Spaces are removed before validation
      expect(validatePhone('+1 912 345 6789')).toBeNull();
    });
  });

  describe('validateName', () => {
    it('returns null for valid name', () => {
      expect(validateName('John', 'First name')).toBeNull();
    });

    it('returns null for name with spaces', () => {
      expect(validateName('John Doe', 'Name')).toBeNull();
    });

    it('returns null for name with hyphen', () => {
      expect(validateName('Mary-Jane', 'First name')).toBeNull();
    });

    it('returns null for name with apostrophe', () => {
      expect(validateName("O'Brien", 'Last name')).toBeNull();
    });

    it('returns error for empty name', () => {
      expect(validateName('', 'First name')).toBe('First name is required');
    });

    it('returns error for whitespace only', () => {
      expect(validateName('   ', 'First name')).toBe('First name is required');
    });

    it('returns error for single character', () => {
      expect(validateName('J', 'First name')).toBe(
        'First name must be at least 2 characters long'
      );
    });

    it('returns error for name with numbers', () => {
      expect(validateName('John123', 'First name')).toBe(
        'First name can only contain letters, spaces, hyphens, and apostrophes'
      );
    });

    it('returns error for name with special characters', () => {
      expect(validateName('John@Doe', 'Name')).toBe(
        'Name can only contain letters, spaces, hyphens, and apostrophes'
      );
    });
  });

  describe('validateLoginForm', () => {
    it('returns valid for correct credentials', () => {
      const result = validateLoginForm({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('returns invalid for empty email', () => {
      const result = validateLoginForm({
        email: '',
        password: 'password123',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });

    it('returns invalid for empty password', () => {
      const result = validateLoginForm({
        email: 'test@example.com',
        password: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password is required');
    });

    it('returns multiple errors for invalid form', () => {
      const result = validateLoginForm({
        email: '',
        password: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });

    it('validates email format', () => {
      const result = validateLoginForm({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });
  });

  describe('validateRegisterForm', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      confirm_password: 'password123',
      first_name: 'John',
      last_name: 'Doe',
    };

    it('returns valid for correct data', () => {
      const result = validateRegisterForm(validData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('validates all required fields', () => {
      const result = validateRegisterForm({
        email: '',
        password: '',
        confirm_password: '',
        first_name: '',
        last_name: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.first_name).toBeDefined();
      expect(result.errors.last_name).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.confirm_password).toBeDefined();
    });

    it('validates password confirmation match', () => {
      const result = validateRegisterForm({
        ...validData,
        confirm_password: 'different123',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.confirm_password).toBe('Passwords do not match');
    });

    it('validates password strength', () => {
      const result = validateRegisterForm({
        ...validData,
        password: 'weak',
        confirm_password: 'weak',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBeDefined();
    });

    it('validates name format', () => {
      const result = validateRegisterForm({
        ...validData,
        first_name: 'John123',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.first_name).toBeDefined();
    });

    it('validates optional phone when provided', () => {
      const result = validateRegisterForm({
        ...validData,
        profile: {
          phone: 'invalid-phone',
        },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors['profile.phone']).toBe('Please enter a valid phone number');
    });

    it('passes with valid optional phone', () => {
      const result = validateRegisterForm({
        ...validData,
        profile: {
          phone: '+639123456789',
        },
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateChangePasswordForm', () => {
    const validData = {
      current_password: 'oldpassword1',
      new_password: 'newpassword1',
      confirm_password: 'newpassword1',
    };

    it('returns valid for correct data', () => {
      const result = validateChangePasswordForm(validData);
      expect(result.isValid).toBe(true);
    });

    it('validates current password is required', () => {
      const result = validateChangePasswordForm({
        ...validData,
        current_password: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.current_password).toBe('Current password is required');
    });

    it('validates new password strength', () => {
      const result = validateChangePasswordForm({
        ...validData,
        new_password: 'weak',
        confirm_password: 'weak',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.new_password).toBeDefined();
    });

    it('validates password confirmation', () => {
      const result = validateChangePasswordForm({
        ...validData,
        confirm_password: 'different123',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.confirm_password).toBe('Passwords do not match');
    });

    it('prevents same password as current', () => {
      const result = validateChangePasswordForm({
        current_password: 'samepassword1',
        new_password: 'samepassword1',
        confirm_password: 'samepassword1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.new_password).toBe(
        'New password must be different from current password'
      );
    });
  });

  describe('getPasswordStrength', () => {
    it('returns 0 for empty password', () => {
      expect(getPasswordStrength('')).toBe(0);
    });

    it('returns 1 for just length requirement', () => {
      expect(getPasswordStrength('12345678')).toBe(2); // length + numbers
    });

    it('returns higher score for lowercase', () => {
      expect(getPasswordStrength('abcdefgh')).toBe(2); // length + lowercase
    });

    it('returns higher score for uppercase', () => {
      expect(getPasswordStrength('ABCDEFGH')).toBe(2); // length + uppercase
    });

    it('returns higher score for mixed case and numbers', () => {
      expect(getPasswordStrength('Abcdefg1')).toBe(4); // length + lower + upper + number
    });

    it('returns 5 for password meeting all criteria', () => {
      expect(getPasswordStrength('Abcdefg1!')).toBe(5);
    });

    it('returns lower score for short password even with complexity', () => {
      expect(getPasswordStrength('Aa1!')).toBe(4); // No length point
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('returns "Very Weak" for score 0', () => {
      expect(getPasswordStrengthLabel(0)).toBe('Very Weak');
    });

    it('returns "Very Weak" for score 1', () => {
      expect(getPasswordStrengthLabel(1)).toBe('Very Weak');
    });

    it('returns "Weak" for score 2', () => {
      expect(getPasswordStrengthLabel(2)).toBe('Weak');
    });

    it('returns "Good" for score 3', () => {
      expect(getPasswordStrengthLabel(3)).toBe('Good');
    });

    it('returns "Strong" for score 4', () => {
      expect(getPasswordStrengthLabel(4)).toBe('Strong');
    });

    it('returns "Very Strong" for score 5', () => {
      expect(getPasswordStrengthLabel(5)).toBe('Very Strong');
    });

    it('returns "Very Weak" for invalid score', () => {
      expect(getPasswordStrengthLabel(-1)).toBe('Very Weak');
      expect(getPasswordStrengthLabel(6)).toBe('Very Weak');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('returns "error" for score 0', () => {
      expect(getPasswordStrengthColor(0)).toBe('error');
    });

    it('returns "error" for score 1', () => {
      expect(getPasswordStrengthColor(1)).toBe('error');
    });

    it('returns "warning" for score 2', () => {
      expect(getPasswordStrengthColor(2)).toBe('warning');
    });

    it('returns "info" for score 3', () => {
      expect(getPasswordStrengthColor(3)).toBe('info');
    });

    it('returns "success" for score 4', () => {
      expect(getPasswordStrengthColor(4)).toBe('success');
    });

    it('returns "success" for score 5', () => {
      expect(getPasswordStrengthColor(5)).toBe('success');
    });

    it('returns "error" for invalid score', () => {
      expect(getPasswordStrengthColor(-1)).toBe('error');
    });
  });

  describe('PASSWORD_RULES', () => {
    it('has minLength of 8', () => {
      expect(PASSWORD_RULES.minLength).toBe(8);
    });

    it('requires lowercase', () => {
      expect(PASSWORD_RULES.requireLowercase).toBe(true);
    });

    it('does not require uppercase', () => {
      expect(PASSWORD_RULES.requireUppercase).toBe(false);
    });

    it('requires numbers', () => {
      expect(PASSWORD_RULES.requireNumbers).toBe(true);
    });

    it('does not require special characters', () => {
      expect(PASSWORD_RULES.requireSpecialChars).toBe(false);
    });
  });
});
