// frontend/client-portal/src/utils/payment-helpers.ts

import type { 
  PaymentGatewayConfig,
  SavedPaymentMethod,
  BookingFlowPaymentGateways
} from '../types/booking.types';
import type { 
  PaymentInfoStepData,
  BillingAddress
} from '../types/booking-session.types';

/**
 * Payment method display information
 */
export interface PaymentMethodDisplay {
  type: string;
  brand: string;
  lastFour: string;
  expiryDisplay: string;
  icon: string;
  isExpired: boolean;
}

/**
 * Payment amount calculation result
 */
export interface PaymentCalculation {
  subtotal: number;
  deposit: number;
  fullAmount: number;
  isDeposit: boolean;
  depositPercentage?: number;
}

/**
 * Format payment method for display
 * Used by payment step components to show saved payment methods
 */
export const formatPaymentMethodDisplay = (method: SavedPaymentMethod): PaymentMethodDisplay => {
  const expiryDate = new Date(method.expires_at);
  const now = new Date();
  const isExpired = expiryDate <= now;
  
  // Format expiry as MM/YY
  const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
  const year = String(expiryDate.getFullYear()).slice(-2);
  const expiryDisplay = `${month}/${year}`;

  // Map card brands to display names and icons
  const brandMap: Record<string, { display: string; icon: string }> = {
    visa: { display: 'Visa', icon: 'visa' },
    mastercard: { display: 'Mastercard', icon: 'mastercard' },
    amex: { display: 'American Express', icon: 'amex' },
    discover: { display: 'Discover', icon: 'discover' },
    diners: { display: 'Diners Club', icon: 'diners' },
    jcb: { display: 'JCB', icon: 'jcb' },
    unionpay: { display: 'UnionPay', icon: 'unionpay' },
  };

  const brandInfo = brandMap[method.brand.toLowerCase()] || { 
    display: method.brand, 
    icon: 'card' 
  };

  return {
    type: method.type,
    brand: brandInfo.display,
    lastFour: method.last_four,
    expiryDisplay,
    icon: brandInfo.icon,
    isExpired,
  };
};

/**
 * Calculate payment amounts based on configuration
 * Used by usePaymentProcessing and pricing components
 */
export const calculatePaymentAmounts = (
  totalAmount: string,
  acceptsDeposit: boolean,
  depositAmount?: string,
  depositType?: 'PERCENTAGE' | 'FIXED'
): PaymentCalculation => {
  const total = parseFloat(totalAmount) || 0;
  let deposit = 0;
  let depositPercentage: number | undefined;

  if (acceptsDeposit && depositAmount) {
    const depositValue = parseFloat(depositAmount) || 0;
    
    if (depositType === 'PERCENTAGE') {
      depositPercentage = depositValue;
      deposit = (total * depositValue) / 100;
    } else {
      deposit = depositValue;
    }
    
    // Ensure deposit doesn't exceed total
    deposit = Math.min(deposit, total);
  }

  return {
    subtotal: total,
    deposit: Math.round(deposit * 100) / 100, // Round to 2 decimal places
    fullAmount: total,
    isDeposit: acceptsDeposit && deposit > 0,
    depositPercentage,
  };
};

/**
 * Format currency amount for display
 * Used throughout payment components for consistent formatting
 */
export const formatCurrency = (amount: number | string, currency: string = 'USD'): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Validate billing address
 * Used by payment step validation
 */
export const validateBillingAddress = (address: BillingAddress): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  if (!address.line1?.trim()) {
    errors.line1 = ['Address line 1 is required'];
  }

  if (!address.city?.trim()) {
    errors.city = ['City is required'];
  }

  if (!address.state?.trim()) {
    errors.state = ['State is required'];
  }

  if (!address.postal_code?.trim()) {
    errors.postal_code = ['Postal code is required'];
  } else {
    // Basic postal code validation (US format)
    const postalCodeRegex = /^\d{5}(-\d{4})?$/;
    if (!postalCodeRegex.test(address.postal_code.trim())) {
      errors.postal_code = ['Please enter a valid postal code (e.g., 12345 or 12345-6789)'];
    }
  }

  if (!address.country?.trim()) {
    errors.country = ['Country is required'];
  }

  return errors;
};

/**
 * Get supported payment methods for a gateway
 * Used by payment step to display available options
 */
export const getSupportedPaymentMethods = (gateway: PaymentGatewayConfig): string[] => {
  // Return supported methods from gateway config, with fallbacks
  if (gateway.supported_methods && gateway.supported_methods.length > 0) {
    return gateway.supported_methods;
  }

  // Default supported methods based on gateway code
  switch (gateway.code.toLowerCase()) {
    case 'stripe':
      return ['CREDIT_CARD', 'DIGITAL_WALLET'];
    case 'paypal':
      return ['DIGITAL_WALLET'];
    case 'square':
      return ['CREDIT_CARD'];
    default:
      return ['CREDIT_CARD'];
  }
};

/**
 * Check if gateway supports a specific payment method
 * Used for conditional rendering of payment options
 */
export const gatewaySupportsMethod = (gateway: PaymentGatewayConfig, method: string): boolean => {
  const supportedMethods = getSupportedPaymentMethods(gateway);
  return supportedMethods.includes(method);
};

/**
 * Get gateway public configuration for frontend
 * Used by payment step to initialize gateway SDKs
 */
export const getGatewayPublicConfig = (gateway: PaymentGatewayConfig): Record<string, any> => {
  return gateway.public_config || {};
};

/**
 * Create payment data structure for session update
 * Used by payment step to structure data for API calls
 */
export const createPaymentData = (
  gatewayId: number,
  paymentType: 'FULL' | 'DEPOSIT',
  amount: string,
  options: {
    paymentMethodToken?: string;
    paymentMethodId?: string;
    billingAddress?: BillingAddress;
    savePaymentMethod?: boolean;
  } = {}
): PaymentInfoStepData => {
  return {
    gateway_id: gatewayId,
    payment_type: paymentType,
    amount,
    payment_method_token: options.paymentMethodToken,
    payment_method_id: options.paymentMethodId,
    billing_address: options.billingAddress,
    save_payment_method: options.savePaymentMethod,
  };
};

/**
 * Check if payment processing is required
 * Used to determine if payment step should be shown
 */
export const isPaymentRequired = (
  paymentGateways: BookingFlowPaymentGateways | null,
  totalAmount: string
): boolean => {
  if (!paymentGateways) {
    return false;
  }

  const amount = parseFloat(totalAmount) || 0;
  
  // Payment required if there's a positive amount and immediate payment is required
  return amount > 0 && paymentGateways.require_immediate_payment;
};

/**
 * Get default payment gateway
 * Used to pre-select payment method
 */
export const getDefaultGateway = (
  paymentGateways: BookingFlowPaymentGateways
): PaymentGatewayConfig | null => {
  if (paymentGateways.default_gateway) {
    const found = paymentGateways.available_gateways.find(
      (g: any) => g.id === paymentGateways.default_gateway
    );
    return found && 'supported_methods' in found
      ? (found as PaymentGatewayConfig)
      : null;
  }

  // Fallback to first available gateway
  const first = paymentGateways.available_gateways[0];
  return first && 'supported_methods' in first
    ? (first as PaymentGatewayConfig)
    : null;
};

/**
 * Format payment method type for display
 * Used in payment selection UI
 */
export const formatPaymentMethodType = (type: string): string => {
  const typeMap: Record<string, string> = {
    CREDIT_CARD: 'Credit Card',
    DEBIT_CARD: 'Debit Card',
    DIGITAL_WALLET: 'Digital Wallet',
    BANK_TRANSFER: 'Bank Transfer',
    PAYMENT_PLAN: 'Payment Plan',
  };

  return typeMap[type] || type;
};

/**
 * Mask credit card number for display
 * Used when showing card numbers in UI
 */
export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber || cardNumber.length < 4) {
    return cardNumber;
  }

  const lastFour = cardNumber.slice(-4);
  const maskedPortion = '*'.repeat(Math.max(0, cardNumber.length - 4));
  
  return `${maskedPortion}${lastFour}`;
};

/**
 * Validate card expiry date
 * Used for card form validation
 */
export const validateCardExpiry = (month: string, year: string): string[] => {
  const errors: string[] = [];
  
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    errors.push('Invalid expiry month');
    return errors;
  }
  
  if (isNaN(yearNum)) {
    errors.push('Invalid expiry year');
    return errors;
  }
  
  // Convert 2-digit year to 4-digit
  const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (fullYear < currentYear || (fullYear === currentYear && monthNum < currentMonth)) {
    errors.push('Card has expired');
  }
  
  return errors;
};

/**
 * Format card expiry for API submission
 * Used when submitting payment data
 */
export const formatCardExpiry = (month: string, year: string): string => {
  const monthPadded = month.padStart(2, '0');
  const yearTwoDigit = year.length === 4 ? year.slice(-2) : year.padStart(2, '0');
  
  return `${monthPadded}/${yearTwoDigit}`;
};

/**
 * Get payment method icon name
 * Used for displaying appropriate icons in payment UI
 */
export const getPaymentMethodIcon = (method: string, brand?: string): string => {
  if (brand) {
    return brand.toLowerCase();
  }
  
  switch (method.toUpperCase()) {
    case 'CREDIT_CARD':
    case 'DEBIT_CARD':
      return 'card';
    case 'DIGITAL_WALLET':
      return 'wallet';
    case 'BANK_TRANSFER':
      return 'bank';
    case 'PAYMENT_PLAN':
      return 'calendar';
    default:
      return 'payment';
  }
};

/**
 * Check if saved payment method is valid/usable
 * Used to filter out expired or invalid saved methods
 */
export const isSavedMethodValid = (method: SavedPaymentMethod): boolean => {
  const expiryDate = new Date(method.expires_at);
  const now = new Date();
  
  return expiryDate > now;
};

/**
 * Sort payment methods by preference
 * Used to order payment methods in selection UI
 */
export const sortPaymentMethods = (methods: SavedPaymentMethod[]): SavedPaymentMethod[] => {
  return [...methods].sort((a, b) => {
    // Default methods first
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    
    // Valid methods before expired
    const aValid = isSavedMethodValid(a);
    const bValid = isSavedMethodValid(b);
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    
    // Sort by expiry date (furthest expiry first)
    const aExpiry = new Date(a.expires_at).getTime();
    const bExpiry = new Date(b.expires_at).getTime();
    return bExpiry - aExpiry;
  });
};