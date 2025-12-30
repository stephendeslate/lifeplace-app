/**
 * Contact Info Step API
 *
 * API functions for contact information step in booking flow.
 */

import api from '@/utils/api';
import { validateEmail, validatePhone, formatPhoneNumber } from '@/utils/security';
import type {
  ContactInfoStepData,
  StepValidationResult,
  ContactInfoStepConfiguration,
} from '@/types/booking';

// =============================================================================
// CONTACT INFO API
// =============================================================================

export const ContactInfoAPI = {
  /**
   * Validate contact info step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: ContactInfoStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Update contact info step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: ContactInfoStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Check if email is already registered.
   *
   * POST /users/check-email/
   */
  checkEmailExists: async (email: string): Promise<{ exists: boolean }> => {
    try {
      const response = await api.post<{ exists: boolean }>('/users/check-email/', { email });
      return response.data;
    } catch {
      return { exists: false };
    }
  },

  /**
   * Format step data for submission.
   */
  formatStepData: (data: ContactInfoStepData): ContactInfoStepData => {
    return {
      full_name: data.full_name?.trim() || '',
      email: data.email?.trim().toLowerCase() || '',
      phone: data.phone ? formatPhoneNumber(data.phone) : undefined,
      address: data.address?.trim(),
      city: data.city?.trim(),
      state: data.state?.trim(),
      postal_code: data.postal_code?.trim(),
      country: data.country?.trim(),
      company: data.company?.trim(),
      job_title: data.job_title?.trim(),
      create_account: data.create_account,
      password: data.password,
      custom_fields: data.custom_fields,
    };
  },

  /**
   * Validate data client-side.
   */
  validateData: (
    data: ContactInfoStepData,
    config?: ContactInfoStepConfiguration
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    // Full name validation
    if (config?.require_full_name !== false) {
      if (!data.full_name || data.full_name.trim().length < 2) {
        errors.full_name = ['Please enter your full name (at least 2 characters)'];
      }
    }

    // Email validation
    if (config?.require_email !== false) {
      if (!data.email) {
        errors.email = ['Email is required'];
      } else if (!validateEmail(data.email)) {
        errors.email = ['Please enter a valid email address'];
      }
    }

    // Phone validation
    if (config?.require_phone) {
      if (!data.phone) {
        errors.phone = ['Phone number is required'];
      } else if (!validatePhone(data.phone)) {
        errors.phone = ['Please enter a valid Philippine phone number'];
      }
    } else if (data.phone && !validatePhone(data.phone)) {
      errors.phone = ['Please enter a valid Philippine phone number'];
    }

    // Address validation
    if (config?.require_address && !data.address?.trim()) {
      errors.address = ['Address is required'];
    }

    // City validation
    if (config?.require_city && !data.city?.trim()) {
      errors.city = ['City is required'];
    }

    // Postal code validation
    if (config?.require_postal_code && !data.postal_code?.trim()) {
      errors.postal_code = ['Postal code is required'];
    }

    // Country validation
    if (config?.require_country && !data.country?.trim()) {
      errors.country = ['Country is required'];
    }

    // Company validation
    if (config?.require_company && !data.company?.trim()) {
      errors.company = ['Company is required'];
    }

    // Password validation (if creating account)
    if (data.create_account || config?.require_account_creation) {
      if (!data.password) {
        errors.password = ['Password is required'];
      } else {
        const pwdReqs = config?.password_requirements;
        const passwordErrors: string[] = [];

        const minLength = pwdReqs?.min_length || 8;
        if (data.password.length < minLength) {
          passwordErrors.push(`Password must be at least ${minLength} characters`);
        }

        if (pwdReqs?.require_uppercase && !/[A-Z]/.test(data.password)) {
          passwordErrors.push('Password must contain an uppercase letter');
        }

        if (pwdReqs?.require_lowercase && !/[a-z]/.test(data.password)) {
          passwordErrors.push('Password must contain a lowercase letter');
        }

        if (pwdReqs?.require_number && !/\d/.test(data.password)) {
          passwordErrors.push('Password must contain a number');
        }

        if (pwdReqs?.require_special && !/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
          passwordErrors.push('Password must contain a special character');
        }

        if (passwordErrors.length > 0) {
          errors.password = passwordErrors;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): ContactInfoStepData => {
    return {
      full_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'Philippines',
      create_account: false,
    };
  },

  /**
   * Get default data from authenticated user.
   */
  getDefaultDataFromUser: (user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    company?: string;
    job_title?: string;
  }): ContactInfoStepData => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

    return {
      full_name: fullName,
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      postal_code: user.postal_code || '',
      country: user.country || 'Philippines',
      company: user.company || '',
      job_title: user.job_title || '',
      create_account: false,
    };
  },

  /**
   * Get required field labels for display.
   */
  getRequiredFieldLabels: (config?: ContactInfoStepConfiguration): string[] => {
    const labels: string[] = [];

    if (config?.require_full_name !== false) labels.push('Full Name');
    if (config?.require_email !== false) labels.push('Email');
    if (config?.require_phone) labels.push('Phone');
    if (config?.require_address) labels.push('Address');
    if (config?.require_city) labels.push('City');
    if (config?.require_postal_code) labels.push('Postal Code');
    if (config?.require_country) labels.push('Country');
    if (config?.require_company) labels.push('Company');
    if (config?.require_account_creation) labels.push('Password');

    return labels;
  },

  /**
   * Mask email for privacy display.
   */
  maskEmail: (email: string): string => {
    if (!email) return '';

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;

    const maskedLocal =
      localPart.length > 2
        ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`
        : localPart;

    return `${maskedLocal}@${domain}`;
  },

  /**
   * Mask phone for privacy display.
   */
  maskPhone: (phone: string): string => {
    if (!phone) return '';

    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.length < 4) return phone;

    return `${'*'.repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
  },
};

export default ContactInfoAPI;
