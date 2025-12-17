// frontend/client-portal/src/apis/booking/confirmation.api.ts

import api from '../../utils/api';

/**
 * Confirmation step API functions
 *
 * Note: The completeBooking method has been consolidated into BookingCoreApi to avoid duplication.
 * All booking completion should use BookingCoreApi.completeBooking() instead.
 *
 * This API class now focuses on confirmation-specific utilities like session details,
 * email sending, and data formatting.
 */
export class ConfirmationApi {

  /**
   * Get session details for confirmation display
   */
  static async getSessionDetails(sessionId: string): Promise<Record<string, unknown>> {
    const response = await api.get(
      `/bookingflow/public/flows/session/${sessionId}/`
    );
    return response.data as Record<string, unknown>;
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
  static formatConfirmationData(session: Record<string, unknown>): {
    bookingReference: string;
    eventDetails: {
      date?: string;
      time?: string;
      duration?: number;
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
    const eventDetails: Record<string, unknown> = {};
    const contactInfo: Record<string, unknown> = {};
    let packages: Record<string, unknown>[] = [];
    let addons: Record<string, unknown>[] = [];

    // Parse booking data from different steps
    Object.values(bookingData).forEach((stepData: unknown) => {
      if (typeof stepData === 'object' && stepData !== null) {
        const data = stepData as Record<string, unknown>;
        // Extract event date/time info
        if (data.start_date) {
          eventDetails.date = data.start_date;
        }
        if (data.start_time) {
          eventDetails.time = data.start_time;
        }
        if (data.duration) {
          eventDetails.duration = data.duration;
        }
        // Extract contact info
        if (data.full_name) {
          contactInfo.name = data.full_name;
        }
        if (data.email) {
          contactInfo.email = data.email;
        }
        if (data.phone) {
          contactInfo.phone = data.phone;
        }

        // Extract packages
        if (data.selected_packages) {
          packages = data.selected_packages as unknown as Record<string, unknown>[];
        }

        // Extract addons
        if (data.selected_addons) {
          addons = data.selected_addons as unknown as Record<string, unknown>[];
        }
      }
    });

    return {
      bookingReference: this.generateBookingReference((session.session_id as string)),
      eventDetails,
      contactInfo,
      packages: packages.map((pkg: Record<string, unknown>) => ({
        name: (pkg.name as string) || 'Package',
        price: this.formatPrice((pkg.price as string | number) || '0'),
        quantity: (pkg.quantity as number) || 1,
      })),
      addons: addons.map((addon: Record<string, unknown>) => ({
        name: (addon.name as string) || 'Add-on',
        price: this.formatPrice((addon.price as string | number) || '0'),
        quantity: (addon.quantity as number) || 1,
      })),
      // API returns total_price at root level, not nested in session
      totalPrice: this.formatPrice((session.total_price as string | number) || '0'),
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
  static getNextStepsContent(config: Record<string, unknown>): Array<{
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
        description: "We'll work with you to ensure every detail is perfect for your event.",
        icon: 'calendar'
      }
    ];

    // If config has custom next steps content, try to parse it
    if (config?.next_steps_content) {
      try {
        const customSteps = JSON.parse(config.next_steps_content as string);
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
}

export default ConfirmationApi;