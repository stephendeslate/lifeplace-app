// frontend/client-portal/src/apis/booking/payment.api.ts

import api from '../../utils/api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  PaymentGateway,
  PaymentGatewayResponse,
} from '../../types/booking';

/**
 * Payment API functions for managing payment gateways and processing
 */
export class PaymentApi {
  
  /**
   * Get available payment gateways for a booking flow
   */
  static async getFlowPaymentGateways(flowId: number): Promise<PaymentGatewayResponse> {
    const response = await api.get<PaymentGatewayResponse>(`/bookingflow/public/flows/${flowId}/payment_gateways/`);
    return response.data;
  }

  /**
   * Get all active payment gateways
   */
  static async getPaymentGateways(): Promise<PaymentGateway[]> {
    const response = await api.get<PaymentGateway[]>('/payments/gateways/', {
      params: { is_active: true }
    });
    return response.data;
  }

  /**
   * Get specific payment gateway details
   */
  static async getPaymentGateway(gatewayId: number): Promise<PaymentGateway> {
    const response = await api.get<PaymentGateway>(`/payments/gateways/${gatewayId}/`);
    return response.data;
  }

  /**
   * Get payment gateway public configuration (safe for client-side)
   */
  static async getGatewayPublicConfig(gatewayCode: string): Promise<Record<string, unknown>> {
    const response = await api.get<Record<string, unknown>>(`/payments/gateways/${gatewayCode}/public-config/`);
    return response.data;
  }

  // Payment processing helpers

  /**
   * Calculate deposit amount based on configuration
   */
  static calculateDepositAmount(
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

  /**
   * Format amount for display
   */
  static formatAmount(amount: string | number, currency: string = 'PHP'): string {
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
  }

  // Gateway-specific helpers

  /**
   * Validate payment method data for different gateways
   */
  static validatePaymentMethod(
    gateway: PaymentGateway,
    paymentData: Record<string, unknown>
  ): { isValid: boolean; errors: Record<string, string[]> } {
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

      case 'manual':
        // Manual payments might not require immediate validation
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
      errors
    };
  }

  /**
   * Get supported payment methods for a gateway
   */
  static getSupportedPaymentMethods(gateway: PaymentGateway): string[] {
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
  }

  /**
   * Get gateway display name with fallback
   */
  static getGatewayDisplayName(gateway: PaymentGateway): string {
    if (gateway.name) {
      return gateway.name;
    }

    // Fallback display names
    const displayNames: Record<string, string> = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      gcash: 'GCash',
      paymaya: 'PayMaya',
      bank_transfer: 'Bank Transfer',
      manual: 'Manual Payment',
    };

    return displayNames[gateway.code] || gateway.code;
  }

  /**
   * Get gateway icon/logo URL or identifier
   */
  static getGatewayIcon(gateway: PaymentGateway): string {
    // Return icon identifiers that can be mapped to actual icons in components
    const iconMap: Record<string, string> = {
      stripe: 'stripe',
      paypal: 'paypal',
      gcash: 'gcash',
      paymaya: 'paymaya',
      bank_transfer: 'bank',
      manual: 'receipt',
    };

    return iconMap[gateway.code] || 'credit-card';
  }

  // Payment data formatting

  /**
   * Format payment data for booking session
   */
  static formatPaymentData(
    gateway: PaymentGateway,
    paymentMethod: string,
    paymentType: 'FULL' | 'DEPOSIT',
    additionalData: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      payment_method: paymentMethod,
      payment_type: paymentType,
      gateway_id: gateway.id,
      gateway_code: gateway.code,
      ...additionalData,
    };

    // Add gateway-specific data
    switch (gateway.code) {
      case 'stripe':
        if (additionalData.payment_method_token) {
          formatted.payment_method_token = additionalData.payment_method_token;
        }
        if (additionalData.payment_method_id) {
          formatted.payment_method_id = additionalData.payment_method_id;
        }
        break;

      case 'paypal':
        if (additionalData.payment_method_token) {
          formatted.payment_method_token = additionalData.payment_method_token;
        }
        break;

      case 'manual':
        formatted.payment_instructions = additionalData.payment_instructions || '';
        break;
    }

    // Add billing address if provided
    if (additionalData.billing_address) {
      formatted.billing_address = additionalData.billing_address;
    }

    return formatted;
  }

  /**
   * Validate amount limits for gateway
   */
  static validateAmountLimits(
    gateway: PaymentGateway,
    amount: number
  ): { isValid: boolean; error?: string } {
    const config = gateway.public_config || {};

    // Check minimum amount
    if (config.min_amount && amount < Number(config.min_amount)) {
      return {
        isValid: false,
        error: `Minimum amount is ${this.formatAmount(Number(config.min_amount))}`
      };
    }

    // Check maximum amount
    if (config.max_amount && amount > Number(config.max_amount)) {
      return {
        isValid: false,
        error: `Maximum amount is ${this.formatAmount(Number(config.max_amount))}`
      };
    }

    return { isValid: true };
  }

  // Environment helpers

  /**
   * Check if gateway is in test mode
   */
  static isTestMode(gateway: PaymentGateway): boolean {
    return gateway.public_config?.environment === 'test' || 
           gateway.public_config?.environment === 'sandbox';
  }

  /**
   * Get gateway environment display
   */
  static getEnvironmentDisplay(gateway: PaymentGateway): string {
    if (this.isTestMode(gateway)) {
      return 'Test Mode';
    }
    return 'Live';
  }

  // Gateway feature detection

  /**
   * Check if gateway supports specific features
   */
  static supportsFeature(gateway: PaymentGateway, feature: string): boolean {
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
  }

  /**
   * Get available features for gateway
   */
  static getAvailableFeatures(gateway: PaymentGateway): string[] {
    const features = [
      'saved_payment_methods',
      'recurring_payments',
      'refunds',
      'partial_payments',
      'apple_pay',
      'google_pay',
    ];

    return features.filter(feature => this.supportsFeature(gateway, feature));
  }
}

export default PaymentApi;