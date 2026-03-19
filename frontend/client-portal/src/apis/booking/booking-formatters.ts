// frontend/client-portal/src/apis/booking/booking-formatters.ts

/**
 * Data formatting and error handling helpers for booking API
 */
export class BookingFormatters {
  /**
   * Format step data according to backend expectations
   */
  static formatStepData(stepType: string, data: Record<string, unknown>): Record<string, unknown> {
    // Ensure required fields are present and properly formatted
    const formatted = { ...data };

    switch (stepType) {
      case 'introduction':
        return {
          acknowledged: Boolean(formatted.acknowledged),
        };

      case 'date_time':
        return {
          start_date: formatted.start_date || '',
          start_time: formatted.start_time || '',
          end_date: formatted.end_date || '',
          end_time: formatted.end_time || '',
          duration: Number(formatted.duration) || 0,
          venue_preference: formatted.venue_preference || '',
          resource_requirements: Array.isArray(formatted.resource_requirements)
            ? formatted.resource_requirements
            : [],
        };

      case 'questionnaire':
        return {
          responses: formatted.responses || {},
          uploaded_files: formatted.uploaded_files || {},
        };

      case 'package_selection':
        return {
          selected_packages: Array.isArray(formatted.selected_packages)
            ? formatted.selected_packages
            : [],
        };

      case 'addon_selection':
        return {
          selected_addons: Array.isArray(formatted.selected_addons)
            ? formatted.selected_addons
            : [],
        };

      case 'pricing_summary':
        // ADD THIS CASE - Format pricing summary data
        return {
          subtotal: String(formatted.subtotal || '0.00'),
          tax: String(formatted.tax || '0.00'),
          discount: String(formatted.discount || '0.00'),
          total: String(formatted.total || '0.00'),
          applied_discount: formatted.applied_discount || null,
        };

      case 'contact_info':
        return {
          full_name: formatted.full_name || '',
          email: formatted.email || '',
          phone: formatted.phone || '',
          address: formatted.address || '',
          company: formatted.company || '',
          create_account: Boolean(formatted.create_account),
          password: formatted.password || '',
          custom_fields: formatted.custom_fields || {},
        };

      case 'payment_info':
        return {
          payment_method: formatted.payment_method || '',
          payment_type: formatted.payment_type || 'FULL',
          payment_gateway_id: formatted.payment_gateway_id || null,
          billing_address: formatted.billing_address || null,
          save_payment_method: Boolean(formatted.save_payment_method),
        };

      default:
        return formatted;
    }
  }

  /**
   * Handle API errors and extract user-friendly message
   */
  static handleApiError(error: unknown): string {
    if (error instanceof Error) {
      // Check for Axios error structure
      const axiosError = error as {
        response?: { data?: { detail?: string; message?: string } };
      };
      if (axiosError.response?.data?.detail) {
        return axiosError.response.data.detail;
      }
      if (axiosError.response?.data?.message) {
        return axiosError.response.data.message;
      }
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}
