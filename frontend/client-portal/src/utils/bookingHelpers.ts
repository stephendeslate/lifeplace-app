// frontend/client-portal/src/utils/bookingHelpers.ts

import type { 
  BookingFlowStep, 
  StepData, 
  ValidationError,
  BookingSession 
} from '../types/booking';

/**
 * Validation helpers for booking steps
 */
export class BookingValidationHelpers {
  /**
   * Validate required fields for a step
   */
  static validateRequiredFields(
    data: Record<string, any>, 
    requiredFields: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    requiredFields.forEach(field => {
      const value = data[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
          field,
          message: `${field.replace('_', ' ')} is required`
        });
      }
    });
    
    return errors;
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (Philippines)
   */
  static validatePhone(phone: string): boolean {
    // Basic Philippine phone number validation
    const phoneRegex = /^(\+63|0)?[9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  }

  /**
   * Validate date is in the future
   */
  static validateFutureDate(dateString: string, minDaysAdvance: number = 1): boolean {
    const selectedDate = new Date(dateString);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + minDaysAdvance);
    
    return selectedDate >= minDate;
  }

  /**
   * Validate step-specific data
   */
  static validateStepData(step: BookingFlowStep, data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    switch (step.step_type) {
      case 'introduction':
        if (step.is_required && !data.acknowledged) {
          errors.push({
            field: 'acknowledged',
            message: 'Please acknowledge to continue'
          });
        }
        break;
        
      case 'date_time':
        if (!data.start_date) {
          errors.push({
            field: 'start_date',
            message: 'Event date is required'
          });
        } else if (!this.validateFutureDate(data.start_date)) {
          errors.push({
            field: 'start_date',
            message: 'Event date must be in the future'
          });
        }
        
        // Use type assertion to access allow_time_selection if it exists
        if ((step.configuration_data as any)?.allow_time_selection && !data.start_time) {
          errors.push({
            field: 'start_time',
            message: 'Event time is required'
          });
        }
        break;
        
      case 'contact_info':
        const config = step.configuration_data as any;
        
        if (config?.require_full_name && !data.full_name) {
          errors.push({
            field: 'full_name',
            message: 'Full name is required'
          });
        }
        
        if (config?.require_email) {
          if (!data.email) {
            errors.push({
              field: 'email',
              message: 'Email address is required'
            });
          } else if (!this.validateEmail(data.email)) {
            errors.push({
              field: 'email',
              message: 'Please enter a valid email address'
            });
          }
        }
        
        if (config?.require_phone) {
          if (!data.phone) {
            errors.push({
              field: 'phone',
              message: 'Phone number is required'
            });
          } else if (!this.validatePhone(data.phone)) {
            errors.push({
              field: 'phone',
              message: 'Please enter a valid phone number'
            });
          }
        }
        
        if (data.create_account && !data.password) {
          errors.push({
            field: 'password',
            message: 'Password is required for account creation'
          });
        }
        
        if (data.password && data.password.length < 8) {
          errors.push({
            field: 'password',
            message: 'Password must be at least 8 characters long'
          });
        }
        break;
        
      case 'payment_info':
        if (!data.payment_method) {
          errors.push({
            field: 'payment_method',
            message: 'Please select a payment method'
          });
        }
        break;
        
      case 'review_booking':
        if (!data.terms_accepted) {
          errors.push({
            field: 'terms_accepted',
            message: 'Please accept the terms and conditions to continue'
          });
        }
        break;
    }
    
    return errors;
  }
}

/**
 * Step navigation helpers
 */
export class BookingNavigationHelpers {
  /**
   * Check if a step can be skipped
   */
  static canSkipStep(step: BookingFlowStep): boolean {
    return step.is_skippable && !step.is_required;
  }

  /**
   * Check if user can go back to a step
   */
  static canGoBackToStep(
    currentStepIndex: number, 
    targetStepIndex: number,
    completedSteps: number[]
  ): boolean {
    return targetStepIndex < currentStepIndex;
  }

  /**
   * Check if step should be visible based on conditions
   */
  static isStepVisible(step: BookingFlowStep, allStepData: StepData): boolean {
    if (!step.display_conditions || Object.keys(step.display_conditions).length === 0) {
      return true;
    }

    // Simple condition checking - can be expanded
    for (const [key, expectedValue] of Object.entries(step.display_conditions)) {
      const actualValue = this.getNestedValue(allStepData, key);
      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get next available step
   */
  static getNextStep(
    steps: BookingFlowStep[], 
    currentIndex: number, 
    allStepData: StepData
  ): BookingFlowStep | null {
    for (let i = currentIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      if (step.is_enabled && this.isStepVisible(step, allStepData)) {
        return step;
      }
    }
    return null;
  }
}

/**
 * Price calculation helpers
 */
export class BookingPriceHelpers {
  /**
   * Format price for display
   */
  static formatPrice(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Calculate deposit amount
   */
  static calculateDeposit(
    totalAmount: string | number,
    depositType: 'PERCENTAGE' | 'FIXED',
    depositValue: string | number
  ): number {
    const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    const value = typeof depositValue === 'string' ? parseFloat(depositValue) : depositValue;

    if (depositType === 'PERCENTAGE') {
      return (total * value) / 100;
    }
    
    return value;
  }

  /**
   * Calculate remaining balance after deposit
   */
  static calculateRemainingBalance(
    totalAmount: string | number,
    depositAmount: string | number
  ): number {
    const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    const deposit = typeof depositAmount === 'string' ? parseFloat(depositAmount) : depositAmount;
    
    return Math.max(0, total - deposit);
  }
}

/**
 * Session management helpers
 */
export class BookingSessionHelpers {
  /**
   * Check if session is expiring soon
   */
  static isSessionExpiringSoon(session: BookingSession, warningMinutes: number = 15): boolean {
    if (!session.expires_at) return false;
    
    const expiryTime = new Date(session.expires_at).getTime();
    const currentTime = new Date().getTime();
    const warningTime = warningMinutes * 60 * 1000; // Convert to milliseconds
    
    return (expiryTime - currentTime) <= warningTime;
  }

  /**
   * Get session time remaining in readable format
   */
  static getTimeRemaining(session: BookingSession): string {
    if (!session.expires_at) return '';
    
    const expiryTime = new Date(session.expires_at).getTime();
    const currentTime = new Date().getTime();
    const diffMs = expiryTime - currentTime;
    
    if (diffMs <= 0) return 'Expired';
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  }

  /**
   * Generate session recovery data for local storage
   */
  static generateRecoveryData(session: BookingSession, stepData: StepData): any {
    return {
      sessionId: session.session_id,
      flowId: session.booking_flow,
      currentStep: session.current_step,
      stepData: stepData,
      progress: session.progress_percentage,
      expiresAt: session.expires_at,
      lastSaved: new Date().toISOString(),
    };
  }

  /**
   * Validate recovery data
   */
  static isValidRecoveryData(data: any): boolean {
    return (
      data &&
      data.sessionId &&
      data.flowId &&
      data.expiresAt &&
      new Date(data.expiresAt) > new Date()
    );
  }
}

/**
 * Form helpers
 */
export class BookingFormHelpers {
  /**
   * Debounce function for form inputs
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('63')) {
      // +63 format
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    } else if (cleaned.startsWith('0')) {
      // 0 format
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone; // Return as-is if format is unclear
  }

  /**
   * Extract validation errors by field
   */
  static getFieldError(
    validationErrors: Record<string, string[]>,
    fieldName: string
  ): string | undefined {
    return validationErrors[fieldName]?.[0];
  }

  /**
   * Check if field has validation error
   */
  static hasFieldError(
    validationErrors: Record<string, string[]>,
    fieldName: string
  ): boolean {
    return !!(validationErrors[fieldName] && validationErrors[fieldName].length > 0);
  }
}

/**
 * Date and time helpers
 */
export class BookingDateHelpers {
  /**
   * Format date for display
   */
  static formatDate(dateString: string): string {
    if (!dateString) return '';
    
    return new Date(dateString).toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time for display
   */
  static formatTime(timeString: string): string {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Check if date falls on blocked dates
   */
  static isDateBlocked(dateString: string, blockedDates: string[]): boolean {
    return blockedDates.includes(dateString);
  }

  /**
   * Check if day of week is available
   */
  static isDayOfWeekAvailable(dateString: string, availableDays: number[]): boolean {
    if (!availableDays || availableDays.length === 0) return true;
    
    const dayOfWeek = new Date(dateString).getDay();
    // Convert Sunday (0) to Monday-based (6)
    const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    return availableDays.includes(mondayBasedDay);
  }
}

/**
 * Main booking helpers export
 */
export const BookingHelpers = {
  validation: BookingValidationHelpers,
  navigation: BookingNavigationHelpers,
  pricing: BookingPriceHelpers,
  session: BookingSessionHelpers,
  form: BookingFormHelpers,
  date: BookingDateHelpers,
};