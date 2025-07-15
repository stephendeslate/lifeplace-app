// frontend/client-portal/src/apis/booking/confirmation.api.ts

import api from '../../utils/api';
import type {
  BookingCompletionResult,
  BookingSession,
} from '../../types/booking';

/**
 * Confirmation step API functions
 */
export class ConfirmationApi {
  
  /**
   * Complete the booking
   */
  static async completeBooking(sessionId: string): Promise<BookingCompletionResult> {
    const response = await api.post<BookingCompletionResult>(
      `/bookingflow/public/flows/session/${sessionId}/complete/`
    );
    return response.data;
  }

  /**
   * Get session details for confirmation display
   */
  static async getSessionDetails(sessionId: string): Promise<any> {
    const response = await api.get(
      `/bookingflow/public/flows/session/${sessionId}/`
    );
    return response.data;
  }

  /**
   * Send confirmation email (if supported)
   */
  static async sendConfirmationEmail(sessionId: string): Promise<void> {
    try {
      await api.post(`/bookingflow/public/flows/session/${sessionId}/send-confirmation/`);
    } catch (error) {
      // Email sending is optional, log but don't throw
      console.warn('Failed to send confirmation email:', error);
    }
  }

  /**
   * Generate booking reference number
   */
  static generateBookingReference(sessionId: string): string {
    // Extract last 8 characters of session ID and convert to uppercase
    return sessionId.slice(-8).toUpperCase();
  }

  /**
   * Format confirmation data for display
   */
  static formatConfirmationData(session: any): {
    bookingReference: string;
    eventDetails: {
      date?: string;
      time?: string;
      duration?: number;
      venue?: string;
    };
    contactInfo: {
      name?: string;
      email?: string;
      phone?: string;
    };
    packages: Array<{
      name: string;
      price: string;
      quantity: number;
    }>;
    addons: Array<{
      name: string;
      price: string;
      quantity: number;
    }>;
    totalPrice: string;
  } {
    const bookingData = session.booking_data || {};
    
    // Extract event details from various steps
    let eventDetails: any = {};
    let contactInfo: any = {};
    let packages: any[] = [];
    let addons: any[] = [];

    // Parse booking data from different steps
    Object.values(bookingData).forEach((stepData: any) => {
      if (typeof stepData === 'object' && stepData !== null) {
        // Extract event date/time info
        if (stepData.start_date) {
          eventDetails.date = stepData.start_date;
        }
        if (stepData.start_time) {
          eventDetails.time = stepData.start_time;
        }
        if (stepData.duration) {
          eventDetails.duration = stepData.duration;
        }
        if (stepData.venue_preference) {
          eventDetails.venue = stepData.venue_preference;
        }

        // Extract contact info
        if (stepData.full_name) {
          contactInfo.name = stepData.full_name;
        }
        if (stepData.email) {
          contactInfo.email = stepData.email;
        }
        if (stepData.phone) {
          contactInfo.phone = stepData.phone;
        }

        // Extract packages
        if (stepData.selected_packages) {
          packages = stepData.selected_packages;
        }

        // Extract addons
        if (stepData.selected_addons) {
          addons = stepData.selected_addons;
        }
      }
    });

    return {
      bookingReference: this.generateBookingReference(session.session_id),
      eventDetails,
      contactInfo,
      packages: packages.map((pkg: any) => ({
        name: pkg.name || 'Package',
        price: this.formatPrice(pkg.price || '0'),
        quantity: pkg.quantity || 1,
      })),
      addons: addons.map((addon: any) => ({
        name: addon.name || 'Add-on',
        price: this.formatPrice(addon.price || '0'),
        quantity: addon.quantity || 1,
      })),
      totalPrice: this.formatPrice(session.total_price || '0'),
    };
  }

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
   * Format date for display
   */
  static formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format time for display
   */
  static formatTime(timeString: string): string {
    if (!timeString) return '';
    
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      
      return date.toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  }

  /**
   * Get next steps content based on configuration
   */
  static getNextStepsContent(config: any): Array<{
    title: string;
    description: string;
    icon: string;
  }> {
    const defaultSteps = [
      {
        title: 'Confirmation Email',
        description: "You'll receive a detailed confirmation email within the next few minutes.",
        icon: 'email'
      },
      {
        title: 'Personal Contact',
        description: 'Our event coordinator will contact you within 24 hours to finalize arrangements.',
        icon: 'phone'
      },
      {
        title: 'Event Preparation',
        description: "We'll work with you to ensure every detail is perfect for your special day.",
        icon: 'calendar'
      }
    ];

    // If config has custom next steps content, try to parse it
    if (config?.next_steps_content) {
      try {
        const customSteps = JSON.parse(config.next_steps_content);
        if (Array.isArray(customSteps)) {
          return customSteps;
        }
      } catch {
        // If parsing fails, fall back to default
      }
    }

    return defaultSteps;
  }

  /**
   * Get contact information for support
   */
  static getSupportContact(): {
    phone: string;
    email: string;
    message: string;
  } {
    return {
      phone: '(02) 123-4567',
      email: 'info@lifeplacealfonso.com',
      message: "We're here to help make your event unforgettable!"
    };
  }

  /**
   * Handle API errors
   */
  static handleApiError(error: any): string {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.response?.status === 400) {
      return 'Unable to complete booking. Please check your information.';
    }

    if (error.response?.status === 409) {
      return 'Booking completion failed due to a conflict. Please try again.';
    }

    if (error.response?.status === 422) {
      return 'Booking validation failed. Please review your information.';
    }

    if (error.message) {
      return error.message;
    }

    return 'An error occurred while completing your booking.';
  }

  /**
   * Extract validation errors from API response
   */
  static extractValidationErrors(error: any): Record<string, string[]> {
    const validationErrors: Record<string, string[]> = {};

    if (error.response?.data?.validation_errors) {
      return error.response.data.validation_errors;
    }

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      
      if (typeof errors === 'object') {
        Object.keys(errors).forEach(field => {
          const fieldErrors = errors[field];
          
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

export default ConfirmationApi;