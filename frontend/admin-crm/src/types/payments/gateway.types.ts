// frontend/admin-crm/src/types/payments/gateway.types.ts
// Gateway configurations, templates, payment methods, and health status

// Stripe Configuration
export interface StripeConfig {
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  test_mode: boolean;
}

// PayMongo Configuration
export interface PayMongoConfig {
  public_key: string;
  secret_key: string;
  webhook_secret: string;
  test_mode: boolean;
}

// Gateway Constants
export const STRIPE_GATEWAY_CODE = 'stripe';
export const STRIPE_GATEWAY_NAME = 'Stripe';
export const PAYMONGO_GATEWAY_CODE = 'paymongo';
export const PAYMONGO_GATEWAY_NAME = 'PayMongo';

// Gateway Templates for Quick Setup
export const GATEWAY_TEMPLATES = {
  stripe: {
    name: STRIPE_GATEWAY_NAME,
    code: STRIPE_GATEWAY_CODE,
    description: 'Stripe payment processing for global and Philippine businesses',
    config: {
      publishable_key: '',
      secret_key: '',
      webhook_secret: '',
      test_mode: true,
    } as StripeConfig,
  },
  paymongo: {
    name: PAYMONGO_GATEWAY_NAME,
    code: PAYMONGO_GATEWAY_CODE,
    description: 'PayMongo payment gateway for Philippines',
    config: {
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      test_mode: true,
    } as PayMongoConfig,
  },
} as const;

// Payment Method Types supported by gateways
export interface PaymentMethodInfo {
  code: string;
  name: string;
  icon: string; // MUI icon name or emoji
  description: string;
}

// Gateway to Payment Methods Mapping
export const GATEWAY_PAYMENT_METHODS: Record<string, PaymentMethodInfo[]> = {
  stripe: [
    {
      code: 'card',
      name: 'Credit/Debit Card',
      icon: 'CreditCard',
      description: 'Visa, Mastercard, Amex, Discover',
    },
    {
      code: 'apple_pay',
      name: 'Apple Pay',
      icon: '🍎',
      description: 'Pay with Apple Pay on supported devices',
    },
    {
      code: 'google_pay',
      name: 'Google Pay',
      icon: '🔵',
      description: 'Pay with Google Pay on supported devices',
    },
    { code: 'link', name: 'Link', icon: 'Link', description: "Stripe's express checkout" },
  ],
  paymongo: [
    {
      code: 'card',
      name: 'Credit/Debit Card',
      icon: 'CreditCard',
      description: 'Visa, Mastercard',
    },
    { code: 'gcash', name: 'GCash', icon: '💚', description: 'Pay with GCash e-wallet' },
    { code: 'grab_pay', name: 'GrabPay', icon: '💳', description: 'Pay with GrabPay e-wallet' },
    { code: 'maya', name: 'Maya', icon: '💜', description: 'Pay with Maya (PayMaya) e-wallet' },
    {
      code: 'bank_transfer',
      name: 'Bank Transfer',
      icon: 'AccountBalance',
      description: 'Direct bank transfer',
    },
  ],
  paypal: [
    { code: 'paypal', name: 'PayPal', icon: '💙', description: 'Pay with PayPal account' },
    {
      code: 'card',
      name: 'Credit/Debit Card',
      icon: 'CreditCard',
      description: 'Pay with card via PayPal',
    },
  ],
  manual: [
    { code: 'cash', name: 'Cash', icon: 'Payments', description: 'Pay in cash' },
    {
      code: 'bank_transfer',
      name: 'Bank Transfer',
      icon: 'AccountBalance',
      description: 'Manual bank transfer',
    },
    { code: 'check', name: 'Check', icon: 'Receipt', description: 'Pay by check' },
  ],
};

// Gateway Health Status
export type GatewayHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface GatewayHealth {
  gateway_id: number;
  gateway_code: string;
  status: GatewayHealthStatus;
  last_checked: string | null;
  last_successful_transaction: string | null;
  error_message: string | null;
  is_configured: boolean;
  test_mode: boolean;
}

// Helper to get payment methods for a gateway
export const getGatewayPaymentMethods = (gatewayCode: string): PaymentMethodInfo[] => {
  return GATEWAY_PAYMENT_METHODS[gatewayCode.toLowerCase()] || [];
};

// Helper to get gateway health color
export const getHealthStatusColor = (
  status: GatewayHealthStatus,
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'unhealthy':
      return 'error';
    default:
      return 'default';
  }
};

// Helper to get gateway health label
export const getHealthStatusLabel = (status: GatewayHealthStatus): string => {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'unhealthy':
      return 'Unhealthy';
    default:
      return 'Unknown';
  }
};
