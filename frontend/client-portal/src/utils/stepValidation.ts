// frontend/client-portal/src/utils/stepValidation.ts

import type {
  BookingFlowStep,
  SessionStepData,
  StepValidationResult,
  IntroductionStepConfig,
  EventDetailsStepConfig,
  DateTimeStepConfig,
  ContactInfoStepConfig,
  PaymentInfoStepConfig,
  ConfirmationStepConfig,
} from '../types/bookingflow.types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (international format)
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Validation utilities
class StepValidationUtility {
  /**
   * Validate a step based on its type and configuration
   */
  validateStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};

    // Skip validation for non-required steps if no data provided
    if (!step.is_required && (!data || Object.keys(data).length === 0)) {
      return { isValid: true, errors: {} };
    }

    // Validate based on step type
    switch (step.step_type) {
      case 'introduction':
        return this.validateIntroductionStep(step, data);
      case 'event_details':
        return this.validateEventDetailsStep(step, data);
      case 'date_time':
        return this.validateDateTimeStep(step, data);
      case 'questionnaire':
        return this.validateQuestionnaireStep(step, data);
      case 'package_selection':
        return this.validatePackageSelectionStep(step, data);
      case 'addon_selection':
        return this.validateAddonSelectionStep(step, data);
      case 'availability_check':
        return this.validateAvailabilityCheckStep(step, data);
      case 'pricing_summary':
        return this.validatePricingSummaryStep(step, data);
      case 'contact_info':
        return this.validateContactInfoStep(step, data);
      case 'payment_info':
        return this.validatePaymentInfoStep(step, data);
      case 'review_booking':
        return this.validateReviewBookingStep(step, data);
      case 'confirmation':
        return this.validateConfirmationStep(step, data);
      default:
        // Unknown step type, assume valid
        return { isValid: true, errors: {} };
    }
  }

  /**
   * Validate introduction step
   */
  private validateIntroductionStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as IntroductionStepConfig | undefined;

    // Introduction step typically just needs acknowledgment
    if (step.is_required && !data.introduction_viewed) {
      errors.introduction_viewed = ['Please review the introduction information'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate event details step
   */
  private validateEventDetailsStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as EventDetailsStepConfig | undefined;

    // Event name validation
    if (config?.require_event_name && !data.event_name?.trim()) {
      errors.event_name = ['Event name is required'];
    } else if (data.event_name && data.event_name.length > 200) {
      errors.event_name = ['Event name must be 200 characters or less'];
    }

    // Description validation
    if (config?.require_description && !data.description?.trim()) {
      errors.description = ['Event description is required'];
    } else if (data.description && data.description.length > 1000) {
      errors.description = ['Description must be 1000 characters or less'];
    }

    // Guest count validation
    if (config?.require_guest_count) {
      if (!data.guest_count || data.guest_count <= 0) {
        errors.guest_count = ['Number of guests is required'];
      } else if (config.max_guest_count && data.guest_count > config.max_guest_count) {
        errors.guest_count = [`Maximum ${config.max_guest_count} guests allowed`];
      }
    }

    // Venue preference validation
    if (config?.require_venue_preference && !data.venue_preference?.trim()) {
      errors.venue_preference = ['Venue preference is required'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate date/time step
   */
  private validateDateTimeStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as DateTimeStepConfig | undefined;

    // Start date validation
    if (!data.start_date) {
      if (step.is_required) {
        errors.start_date = ['Start date is required'];
      }
    } else {
      const startDate = new Date(data.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if date is in the past
      if (startDate < today) {
        errors.start_date = ['Start date cannot be in the past'];
      }

      // Check minimum advance booking (buffer_before_hours)
      if (config?.buffer_before_hours) {
        const minDate = new Date(today.getTime() + config.buffer_before_hours * 60 * 60 * 1000);
        if (startDate < minDate) {
          errors.start_date = [`Booking must be at least ${config.buffer_before_hours} hours in advance`];
        }
      }

      // Check blocked dates
      if (config?.blocked_dates?.includes(data.start_date)) {
        errors.start_date = ['This date is not available'];
      }

      // Check available days of week
      if (config?.available_days_of_week?.length) {
        const dayOfWeek = startDate.getDay();
        if (!config.available_days_of_week.includes(dayOfWeek)) {
          errors.start_date = ['This day of the week is not available'];
        }
      }
    }

    // Start time validation
    if (config?.allow_time_selection) {
      if (!data.start_time && step.is_required) {
        errors.start_time = ['Start time is required'];
      } else if (data.start_time && config.available_time_slots?.length) {
        // Check if selected time is in available slots
        const isValidTime = config.available_time_slots.some(slot => 
          slot.start <= data.start_time! && data.start_time! <= slot.end
        );
        if (!isValidTime) {
          errors.start_time = ['Selected time is not available'];
        }
      }
    }

    // End date validation (for multi-day events)
    if (config?.allow_multi_day && data.end_date) {
      const startDate = new Date(data.start_date || '');
      const endDate = new Date(data.end_date);

      if (endDate <= startDate) {
        errors.end_date = ['End date must be after start date'];
      }
    }

    // Duration validation
    if (data.duration_hours) {
      if (config?.min_duration_hours && data.duration_hours < config.min_duration_hours) {
        errors.duration_hours = [`Minimum duration is ${config.min_duration_hours} hours`];
      }
      if (config?.max_duration_hours && data.duration_hours > config.max_duration_hours) {
        errors.duration_hours = [`Maximum duration is ${config.max_duration_hours} hours`];
      }
    } else if (step.is_required && config?.min_duration_hours) {
      errors.duration_hours = ['Duration is required'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate questionnaire step
   */
  private validateQuestionnaireStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};

    // Questionnaire responses validation would depend on the specific questionnaire configuration
    // This would typically be handled by the questionnaire component itself
    // For now, just check if required responses are provided
    if (step.is_required && !data.questionnaire_responses) {
      errors.questionnaire_responses = ['Please complete the questionnaire'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate package selection step
   */
  private validatePackageSelectionStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as any; // Package selection config

    if (step.is_required && (!data.selected_packages || data.selected_packages.length === 0)) {
      errors.selected_packages = ['Please select at least one package'];
    }

    if (data.selected_packages?.length) {
      // Check minimum selection
      if (config?.min_selection && data.selected_packages.length < config.min_selection) {
        errors.selected_packages = [`Please select at least ${config.min_selection} package(s)`];
      }

      // Check maximum selection
      if (config?.max_selection && data.selected_packages.length > config.max_selection) {
        errors.selected_packages = [`Please select no more than ${config.max_selection} package(s)`];
      }

      // Validate individual package selections
      data.selected_packages.forEach((pkg, index) => {
        if (!pkg.id) {
          errors[`package_${index}_id`] = ['Invalid package selection'];
        }
        if (!pkg.quantity || pkg.quantity <= 0) {
          errors[`package_${index}_quantity`] = ['Quantity must be greater than 0'];
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate addon selection step
   */
  private validateAddonSelectionStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};

    // Addon selection is typically optional, but validate structure if provided
    if (data.selected_addons?.length) {
      data.selected_addons.forEach((addon, index) => {
        if (!addon.id) {
          errors[`addon_${index}_id`] = ['Invalid addon selection'];
        }
        if (!addon.quantity || addon.quantity <= 0) {
          errors[`addon_${index}_quantity`] = ['Quantity must be greater than 0'];
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate availability check step
   */
  private validateAvailabilityCheckStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};

    // Availability check typically validates that the selected date/time is available
    if (step.is_required && !data.availability_confirmed) {
      errors.availability_confirmed = ['Please confirm availability for your selected date and time'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate pricing summary step
   */
  private validatePricingSummaryStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};

    // Pricing summary typically just requires acknowledgment
    if (step.is_required && !data.pricing_acknowledged) {
      errors.pricing_acknowledged = ['Please review and acknowledge the pricing'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate contact info step
   */
  private validateContactInfoStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as ContactInfoStepConfig | undefined;

    // Full name validation
    if (config?.require_full_name && !data.full_name?.trim()) {
      errors.full_name = ['Full name is required'];
    } else if (data.full_name && data.full_name.length > 100) {
      errors.full_name = ['Full name must be 100 characters or less'];
    }

    // Email validation
    if (config?.require_email) {
      if (!data.email?.trim()) {
        errors.email = ['Email address is required'];
      } else if (!EMAIL_REGEX.test(data.email)) {
        errors.email = ['Please enter a valid email address'];
      }
    }

    // Phone validation
    if (config?.require_phone) {
      if (!data.phone?.trim()) {
        errors.phone = ['Phone number is required'];
      } else {
        const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, '');
        if (!PHONE_REGEX.test(cleanPhone)) {
          errors.phone = ['Please enter a valid phone number'];
        }
      }
    }

    // Address validation
    if (config?.require_address && !data.address?.trim()) {
      errors.address = ['Address is required'];
    }

    // Company validation
    if (config?.require_company && !data.company?.trim()) {
      errors.company = ['Company name is required'];
    }

    // Custom fields validation
    if (config?.custom_fields?.length) {
      config.custom_fields.forEach(field => {
        if (field.required && !data[field.key]?.trim()) {
          errors[field.key] = [`${field.label} is required`];
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate payment info step
   */
  private validatePaymentInfoStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as PaymentInfoStepConfig | undefined;

    // Payment gateway selection
    if (!data.gateway_id) {
      errors.gateway_id = ['Please select a payment method'];
    }

    // Payment method validation
    if (config?.require_immediate_payment && !data.payment_method_token && !data.payment_method_id) {
      errors.payment_method = ['Please provide payment method details'];
    }

    // Billing address validation (if required by gateway)
    if (data.billing_address) {
      const addr = data.billing_address;
      if (!addr.street?.trim()) {
        errors.billing_street = ['Street address is required'];
      }
      if (!addr.city?.trim()) {
        errors.billing_city = ['City is required'];
      }
      if (!addr.state?.trim()) {
        errors.billing_state = ['State is required'];
      }
      if (!addr.postal_code?.trim()) {
        errors.billing_postal_code = ['Postal code is required'];
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate review booking step
   */
  private validateReviewBookingStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};

    // Review step typically requires confirmation that user has reviewed everything
    if (step.is_required && !data.booking_reviewed) {
      errors.booking_reviewed = ['Please review your booking details'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate confirmation step
   */
  private validateConfirmationStep(step: BookingFlowStep, data: SessionStepData): StepValidationResult {
    const errors: Record<string, string[]> = {};
    const config = step.configuration_data as ConfirmationStepConfig | undefined;

    // Confirmation step is typically the final step and doesn't require validation
    // It's usually just displaying the results of the completed booking

    return {
      isValid: true,
      errors: {},
    };
  }

  /**
   * Validate multiple steps at once
   */
  validateMultipleSteps(steps: BookingFlowStep[], stepDataMap: Record<number, SessionStepData>): Record<number, StepValidationResult> {
    const results: Record<number, StepValidationResult> = {};

    steps.forEach((step, index) => {
      const stepData = stepDataMap[index] || {};
      results[index] = this.validateStep(step, stepData);
    });

    return results;
  }

  /**
   * Check if all required steps are valid
   */
  areAllRequiredStepsValid(steps: BookingFlowStep[], stepDataMap: Record<number, SessionStepData>): boolean {
    const requiredSteps = steps.filter(step => step.is_required);
    
    return requiredSteps.every((step, index) => {
      const stepData = stepDataMap[index] || {};
      const validation = this.validateStep(step, stepData);
      return validation.isValid;
    });
  }

  /**
   * Get validation summary for all steps
   */
  getValidationSummary(steps: BookingFlowStep[], stepDataMap: Record<number, SessionStepData>): {
    totalSteps: number;
    validSteps: number;
    invalidSteps: number;
    requiredSteps: number;
    validRequiredSteps: number;
    overallValid: boolean;
  } {
    const results = this.validateMultipleSteps(steps, stepDataMap);
    const requiredSteps = steps.filter(step => step.is_required);

    const validSteps = Object.values(results).filter(result => result.isValid).length;
    const invalidSteps = Object.values(results).filter(result => !result.isValid).length;
    
    const validRequiredSteps = requiredSteps.filter((step, index) => {
      const result = results[index];
      return result?.isValid || false;
    }).length;

    return {
      totalSteps: steps.length,
      validSteps,
      invalidSteps,
      requiredSteps: requiredSteps.length,
      validRequiredSteps,
      overallValid: this.areAllRequiredStepsValid(steps, stepDataMap),
    };
  }

  /**
   * Sanitize form data to prevent XSS
   */
  sanitizeStepData(data: SessionStepData): SessionStepData {
    const sanitized: SessionStepData = {};

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Basic XSS prevention - strip script tags and encode HTML
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/[<>]/g, match => match === '<' ? '&lt;' : '&gt;');
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}

// Export singleton instance
export const stepValidation = new StepValidationUtility();