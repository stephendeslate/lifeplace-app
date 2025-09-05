// frontend/client-portal/src/apis/booking/contact_info.api.ts

import api from '../../utils/api';
import type {
  ContactInfoStepData,
  StepValidationResult,
} from '../../types/booking';

/**
 * Contact Info step API functions
 */
export class ContactInfoApi {
  
  /**
   * Validate contact info step data
   */
  static async validateStepData(
    sessionId: string,
    stepId: number,
    stepData: ContactInfoStepData
  ): Promise<StepValidationResult> {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData
      }
    );
    return response.data;
  }

  /**
   * Update contact info step data
   */
  static async updateStepData(
    sessionId: string,
    stepId: number,
    stepData: ContactInfoStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted
      }
    );
    return response.data as Record<string, unknown>;
  }

  /**
   * Format contact info step data for submission
   */
  static formatStepData(data: ContactInfoStepData): ContactInfoStepData {
    return {
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      company: data.company || '',
      create_account: Boolean(data.create_account),
      password: data.password || '',
      custom_fields: data.custom_fields || {},
    };
  }

  /**
   * Validate contact info data client-side
   */
  static validateData(
    data: ContactInfoStepData,
    config: Record<string, unknown>
  ): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};

    // Required full name
    if (config?.require_full_name && !data.full_name?.trim()) {
      errors.full_name = ['Full name is required'];
    }

    // Required email
    if (config?.require_email) {
      if (!data.email?.trim()) {
        errors.email = ['Email address is required'];
      } else if (!this.isValidEmail(data.email)) {
        errors.email = ['Please enter a valid email address'];
      }
    }

    // Required phone
    if (config?.require_phone) {
      if (!data.phone?.trim()) {
        errors.phone = ['Phone number is required'];
      } else if (!this.isValidPhone(data.phone)) {
        errors.phone = ['Please enter a valid phone number'];
      }
    }

    // Required address
    if (config?.require_address && !data.address?.trim()) {
      errors.address = ['Address is required'];
    }

    // Required company
    if (config?.require_company && !data.company?.trim()) {
      errors.company = ['Company is required'];
    }

    // Password validation for account creation
    if (data.create_account) {
      if (!data.password?.trim()) {
        errors.password = ['Password is required for account creation'];
      } else if (data.password.length < 8) {
        errors.password = ['Password must be at least 8 characters long'];
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (Philippines)
   */
  static isValidPhone(phone: string): boolean {
    // Basic Philippine phone number validation
    const phoneRegex = /^(\+63|0)?[9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  }

  /**
   * Get default contact info data from current user if authenticated
   */
  static getDefaultDataFromUser(user: Record<string, unknown> | null): ContactInfoStepData {
    if (!user) {
      return this.getDefaultData();
    }

    return {
      full_name: (user.first_name as string) && (user.last_name as string) 
        ? `${user.first_name} ${user.last_name}` 
        : (user.first_name as string) || '',
      email: (user.email as string) || '',
      phone: ((user.profile as Record<string, unknown>)?.phone as string) || '',
      address: '',
      company: ((user.profile as Record<string, unknown>)?.company as string) || '',
      create_account: false, // Already has account
      password: '',
      custom_fields: {},
    };
  }

  /**
   * Get default contact info data for non-authenticated users
   */
  static getDefaultData(): ContactInfoStepData {
    return {
      full_name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      create_account: false,
      password: '',
      custom_fields: {},
    };
  }

  /**
   * Handle API errors
   */
  static handleApiError(error: unknown): string {
    // Error objects from axios have dynamic structure requiring any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorObj = error as any;
    if (errorObj.response?.data?.detail) {
      return errorObj.response.data.detail;
    }

    if (errorObj.response?.data?.message) {
      return errorObj.response.data.message;
    }

    if (errorObj.response?.status === 400) {
      return 'Invalid contact information provided.';
    }

    if (errorObj.response?.status === 409) {
      return 'Email address is already in use.';
    }

    if (errorObj.message) {
      return errorObj.message;
    }

    return 'An error occurred while processing contact information.';
  }

  /**
   * Extract validation errors from API response
   */
  static extractValidationErrors(error: unknown): Record<string, string[]> {
    const validationErrors: Record<string, string[]> = {};

    // Error objects from axios have dynamic structure requiring any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorObj = error as any;
    if (errorObj.response?.data?.validation_errors) {
      return errorObj.response.data.validation_errors;
    }

    if (errorObj.response?.data?.errors) {
      const errors = errorObj.response.data.errors;
      
      if (typeof errors === 'object') {
        Object.keys(errors).forEach(field => {
          const fieldErrors = (errors as Record<string, unknown>)[field];
          
          if (Array.isArray(fieldErrors)) {
            validationErrors[field] = fieldErrors;
          } else if (typeof fieldErrors === 'string') {
            validationErrors[field] = [fieldErrors];
          }
        });
      }
    }

    return validationErrors;
  }
}

export default ContactInfoApi;