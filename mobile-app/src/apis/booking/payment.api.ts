/**
 * Payment Step API
 *
 * API functions for payment processing in booking flow.
 * Supports: Stripe, PayPal, GCash, PayMaya, Bank Transfer, Manual
 *
 * Adapted from: frontend/client-portal/src/apis/booking/payment.api.ts
 */

import api from '@/utils/api';
import type {
  PaymentGateway,
  PaymentGatewayResponse,
  PaymentGatewayCode,
  PaymentStepData,
  StepValidationResult,
  PaymentType,
  PaymentPlanSettings,
  PAYMENT_GATEWAY_LABELS,
  PAYMENT_GATEWAY_ICONS,
} from '@/types/booking';

// =============================================================================
// PAYMENT API
// =============================================================================

export const PaymentAPI = {
  /**
   * Get payment plan settings (deposit percentage, balance due days, refund policy, etc.)
   * CONSOLIDATED: Single source of truth for payment plan configuration.
   * Uses public endpoint (no authentication required) for booking flows.
   *
   * GET /payments/public/settings/1/
   */
  getPaymentPlanSettings: async (): Promise<PaymentPlanSettings> => {
    const response = await api.get<PaymentPlanSettings>('/payments/public/settings/1/');
    return response.data;
  },

  /**
   * Get available payment gateways for a booking flow.
   *
   * GET /bookingflow/public/flows/:flowId/payment_gateways/
   */
  getFlowPaymentGateways: async (flowId: number): Promise<PaymentGatewayResponse> => {
    const response = await api.get<PaymentGatewayResponse>(
      `/bookingflow/public/flows/${flowId}/payment_gateways/`
    );
    return response.data;
  },

  /**
   * Get all active payment gateways.
   *
   * GET /payments/gateways/
   */
  getPaymentGateways: async (): Promise<PaymentGateway[]> => {
    const response = await api.get<PaymentGateway[]>('/payments/gateways/', {
      params: { is_active: true },
    });
    return response.data;
  },

  /**
   * Get specific payment gateway details.
   *
   * GET /payments/gateways/:gatewayId/
   */
  getPaymentGateway: async (gatewayId: number): Promise<PaymentGateway> => {
    const response = await api.get<PaymentGateway>(`/payments/gateways/${gatewayId}/`);
    return response.data;
  },

  /**
   * Get payment gateway public configuration.
   *
   * GET /payments/gateways/:gatewayCode/public-config/
   */
  getGatewayPublicConfig: async (gatewayCode: string): Promise<Record<string, unknown>> => {
    const response = await api.get<Record<string, unknown>>(
      `/payments/gateways/${gatewayCode}/public-config/`
    );
    return response.data;
  },

  /**
   * Validate payment step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: PaymentStepData
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
   * Update payment step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: PaymentStepData,
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

  // ===========================================================================
  // PAYMENT CALCULATION HELPERS
  // ===========================================================================

  /**
   * Calculate deposit amount based on configuration.
   */
  calculateDepositAmount: (
    totalAmount: string | number,
    depositType: 'PERCENTAGE' | 'FIXED',
    depositValue: string | number
  ): number => {
    const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    const value = typeof depositValue === 'string' ? parseFloat(depositValue) : depositValue;

    if (depositType === 'PERCENTAGE') {
      return (total * value) / 100;
    }

    return value;
  },

  /**
   * Calculate remaining balance after deposit.
   */
  calculateRemainingBalance: (
    totalAmount: string | number,
    depositAmount: string | number
  ): number => {
    const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    const deposit = typeof depositAmount === 'string' ? parseFloat(depositAmount) : depositAmount;

    return Math.max(0, total - deposit);
  },

  /**
   * Format amount for display.
   */
  formatAmount: (amount: string | number, currency: string = 'PHP'): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (currency === 'PHP') {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
      }).format(num);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  },

  // ===========================================================================
  // GATEWAY HELPERS
  // ===========================================================================

  /**
   * Validate payment method data for different gateways.
   */
  validatePaymentMethod: (
    gateway: PaymentGateway,
    paymentData: Record<string, unknown>
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    switch (gateway.code) {
      case 'stripe':
        if (!paymentData.payment_method_token && !paymentData.payment_method_id) {
          errors.payment_method = ['Payment method is required'];
        }
        break;

      case 'paypal':
        if (!paymentData.payment_method_token) {
          errors.payment_method = ['PayPal payment method is required'];
        }
        break;

      case 'gcash':
      case 'paymaya':
        if (!paymentData.payment_method_token) {
          errors.payment_method = ['Please complete the payment authorization'];
        }
        break;

      case 'bank_transfer':
        // Bank transfer may not require immediate validation
        break;

      case 'manual':
        // Manual payments don't require immediate validation
        break;

      default:
        if (!paymentData.payment_method_token && !paymentData.payment_method_id) {
          errors.payment_method = ['Payment method is required'];
        }
        break;
    }

    // Validate billing address if required
    if (paymentData.billing_address_required && !paymentData.billing_address) {
      errors.billing_address = ['Billing address is required'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get supported payment methods for a gateway.
   */
  getSupportedPaymentMethods: (gateway: PaymentGateway): string[] => {
    const methods: string[] = [];

    switch (gateway.code) {
      case 'stripe':
        methods.push('CREDIT_CARD');
        if (gateway.public_config?.supports_apple_pay) {
          methods.push('APPLE_PAY');
        }
        if (gateway.public_config?.supports_google_pay) {
          methods.push('GOOGLE_PAY');
        }
        break;

      case 'paypal':
        methods.push('DIGITAL_WALLET');
        break;

      case 'gcash':
        methods.push('DIGITAL_WALLET');
        break;

      case 'paymaya':
        methods.push('DIGITAL_WALLET');
        break;

      case 'bank_transfer':
        methods.push('BANK_TRANSFER');
        break;

      case 'manual':
        methods.push('MANUAL');
        break;

      default:
        methods.push('CREDIT_CARD');
        break;
    }

    return methods;
  },

  /**
   * Get gateway display name with fallback.
   */
  getGatewayDisplayName: (gateway: PaymentGateway): string => {
    if (gateway.name) {
      return gateway.name;
    }

    const displayNames: Record<string, string> = {
      stripe: 'Credit/Debit Card',
      paypal: 'PayPal',
      gcash: 'GCash',
      paymaya: 'PayMaya',
      bank_transfer: 'Bank Transfer',
      manual: 'Manual Payment',
    };

    return displayNames[gateway.code] || gateway.code;
  },

  /**
   * Get gateway icon identifier.
   */
  getGatewayIcon: (gateway: PaymentGateway): string => {
    const iconMap: Record<string, string> = {
      stripe: 'CreditCard',
      paypal: 'PaypalLogo',
      gcash: 'Wallet',
      paymaya: 'Wallet',
      bank_transfer: 'Bank',
      manual: 'Receipt',
    };

    return iconMap[gateway.code] || 'CreditCard';
  },

  // ===========================================================================
  // DATA FORMATTING
  // ===========================================================================

  /**
   * Format payment data for booking session.
   */
  formatPaymentData: (
    gateway: PaymentGateway,
    paymentMethod: string,
    paymentType: PaymentType,
    additionalData: Record<string, unknown> = {}
  ): PaymentStepData => {
    const formatted: PaymentStepData = {
      payment_method: paymentMethod,
      payment_type: paymentType,
      payment_gateway_id: gateway.id,
      payment_gateway_code: gateway.code,
      ...additionalData,
    };

    // Add gateway-specific data
    switch (gateway.code) {
      case 'stripe':
        if (additionalData.payment_method_token) {
          formatted.payment_method_token = additionalData.payment_method_token as string;
        }
        if (additionalData.payment_method_id) {
          formatted.payment_method_id = additionalData.payment_method_id as string;
        }
        break;

      case 'paypal':
        if (additionalData.payment_method_token) {
          formatted.payment_method_token = additionalData.payment_method_token as string;
        }
        break;

      case 'manual':
        // Manual payments may include instructions
        break;
    }

    // Add billing address if provided
    if (additionalData.billing_address) {
      formatted.billing_address = additionalData.billing_address as string;
    }

    return formatted;
  },

  /**
   * Validate amount limits for gateway.
   */
  validateAmountLimits: (
    gateway: PaymentGateway,
    amount: number
  ): { isValid: boolean; error?: string } => {
    const config = gateway.public_config || {};

    // Check minimum amount
    if (config.min_amount && amount < Number(config.min_amount)) {
      return {
        isValid: false,
        error: `Minimum amount is ${PaymentAPI.formatAmount(Number(config.min_amount))}`,
      };
    }

    // Check maximum amount
    if (config.max_amount && amount > Number(config.max_amount)) {
      return {
        isValid: false,
        error: `Maximum amount is ${PaymentAPI.formatAmount(Number(config.max_amount))}`,
      };
    }

    return { isValid: true };
  },

  // ===========================================================================
  // ENVIRONMENT HELPERS
  // ===========================================================================

  /**
   * Check if gateway is in test mode.
   */
  isTestMode: (gateway: PaymentGateway): boolean => {
    return (
      gateway.public_config?.environment === 'test' ||
      gateway.public_config?.environment === 'sandbox'
    );
  },

  /**
   * Get gateway environment display.
   */
  getEnvironmentDisplay: (gateway: PaymentGateway): string => {
    if (PaymentAPI.isTestMode(gateway)) {
      return 'Test Mode';
    }
    return 'Live';
  },

  // ===========================================================================
  // FEATURE DETECTION
  // ===========================================================================

  /**
   * Check if gateway supports specific features.
   */
  supportsFeature: (gateway: PaymentGateway, feature: string): boolean => {
    const config = gateway.public_config || {};

    switch (feature) {
      case 'saved_payment_methods':
        return config.supports_saved_methods === true;

      case 'recurring_payments':
        return config.supports_recurring === true;

      case 'refunds':
        return config.supports_refunds === true;

      case 'partial_payments':
        return config.supports_partial_payments === true;

      case 'apple_pay':
        return config.supports_apple_pay === true;

      case 'google_pay':
        return config.supports_google_pay === true;

      default:
        return false;
    }
  },

  /**
   * Get available features for gateway.
   */
  getAvailableFeatures: (gateway: PaymentGateway): string[] => {
    const features = [
      'saved_payment_methods',
      'recurring_payments',
      'refunds',
      'partial_payments',
      'apple_pay',
      'google_pay',
    ];

    return features.filter((feature) => PaymentAPI.supportsFeature(gateway, feature));
  },

  // ===========================================================================
  // VALIDATION & DEFAULTS
  // ===========================================================================

  /**
   * Validate data client-side.
   */
  validateData: (
    data: PaymentStepData
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (!data.payment_method) {
      errors.payment_method = ['Please select a payment method'];
    }

    if (!data.payment_type) {
      errors.payment_type = ['Please select payment type'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): PaymentStepData => {
    return {
      payment_method: '',
      payment_type: 'FULL',
    };
  },
};

export default PaymentAPI;
