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

      case 'pricing_summary':
        // Fixed: Pricing summary validation
        // No required fields - only optional discount code
        // The backend will validate the discount code if provided
        if (data.applied_discount_code && typeof data.applied_discount_code !== 'string') {
          errors.push({
            field: 'applied_discount_code',
            message: 'Invalid discount code format'
          });
        }
        break;
        
      case 'contact_info':
        if (!data.full_name) {
          errors.push({
            field: 'full_name',
            message: 'Full name is required'
          });
        }
        
        if (!data.email) {
          errors.push({
            field: 'email',
            message: 'Email is required'
          });
        } else if (!this.validateEmail(data.email)) {
          errors.push({
            field: 'email',
            message: 'Please enter a valid email address'
          });
        }
        
        if ((step.configuration_data as any)?.require_phone && !data.phone) {
          errors.push({
            field: 'phone',
            message: 'Phone number is required'
          });
        } else if (data.phone && !this.validatePhone(data.phone)) {
          errors.push({
            field: 'phone',
            message: 'Please enter a valid phone number'
          });
        }
        break;
        
      case 'payment_info':
        if (!data.payment_method) {
          errors.push({
            field: 'payment_method',
            message: 'Payment method is required'
          });
        }
        
        if (!data.payment_type) {
          errors.push({
            field: 'payment_type',
            message: 'Payment type is required'
          });
        }
        
        if (data.payment_method === 'CREDIT_CARD' && !data.payment_method_id) {
          errors.push({
            field: 'payment_method_id',
            message: 'Payment method selection is required'
          });
        }
        break;
        
      case 'review_booking':
        if (!data.terms_accepted) {
          errors.push({
            field: 'terms_accepted',
            message: 'You must accept the terms and conditions'
          });
        }
        break;
        
      case 'package_selection':
        const packages = data.selected_packages || [];
        const config = step.configuration_data as any;
        
        if (config?.min_selection && packages.length < config.min_selection) {
          errors.push({
            field: 'selected_packages',
            message: `Please select at least ${config.min_selection} package(s)`
          });
        }
        
        if (config?.max_selection && packages.length > config.max_selection) {
          errors.push({
            field: 'selected_packages',
            message: `You can select maximum ${config.max_selection} package(s)`
          });
        }
        break;
        
      case 'addon_selection':
        const addons = data.selected_addons || [];
        const addonConfig = step.configuration_data as any;
        
        if (addonConfig?.min_selection && addons.length < addonConfig.min_selection) {
          errors.push({
            field: 'selected_addons',
            message: `Please select at least ${addonConfig.min_selection} add-on(s)`
          });
        }
        
        if (addonConfig?.max_selection && addons.length > addonConfig.max_selection) {
          errors.push({
            field: 'selected_addons',
            message: `You can select maximum ${addonConfig.max_selection} add-on(s)`
          });
        }
        break;
    }
    
    return errors;
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    
    errors.forEach(error => {
      if (!formatted[error.field]) {
        formatted[error.field] = [];
      }
      formatted[error.field].push(error.message);
    });
    
    return formatted;
  }

  /**
   * Check if a step can be skipped
   */
  static canSkipStep(step: BookingFlowStep, stepData: StepData): boolean {
    // Can't skip required steps unless they have valid data
    if (step.is_required && !step.is_skippable) {
      const errors = this.validateStepData(step, stepData[step.step_type] || {});
      return errors.length === 0;
    }
    
    return step.is_skippable;
  }

  /**
   * Get completion percentage
   */
  static getCompletionPercentage(
    completedSteps: number,
    totalSteps: number
  ): number {
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: string | number, currency: string = 'PHP'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Parse duration string to hours
   */
  static parseDuration(duration: string): number {
    const match = duration.match(/(\d+)\s*hours?/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Format date for display
   */
  static formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }

  /**
   * Format time for display
   */
  static formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  /**
   * Calculate booking end time
   */
  static calculateEndTime(startTime: string, durationHours: number): string {
    const [hours, minutes] = startTime.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    date.setHours(date.getHours() + durationHours);
    
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(session: BookingSession): boolean {
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    return now > expiresAt;
  }

  /**
   * Get remaining time for session
   */
  static getSessionRemainingTime(session: BookingSession): string {
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  }
}