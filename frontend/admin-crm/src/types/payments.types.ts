// frontend/admin-crm/src/types/payments.types.ts

export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  config: Record<string, any>;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentGatewayFormData {
  name: string;
  code: string;
  is_active: boolean;
  config: Record<string, any>;
  description: string;
}

export interface CreatePaymentGatewayData {
  name: string;
  code: string;
  is_active?: boolean;
  config?: Record<string, any>;
  description?: string;
}

export interface UpdatePaymentGatewayData {
  name?: string;
  is_active?: boolean;
  config?: Record<string, any>;
  description?: string;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: string;
  region: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRateFormData {
  name: string;
  rate: string;
  region: string;
  is_default: boolean;
}

export interface CreateTaxRateData {
  name: string;
  rate: string;
  region?: string;
  is_default?: boolean;
}

export interface UpdateTaxRateData {
  name?: string;
  rate?: string;
  region?: string;
  is_default?: boolean;
}

export interface PaymentMethod {
  id: number;
  user: number;
  user_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  type: string;
  type_display: string;
  is_default: boolean;
  nickname: string;
  instructions: string;
  gateway: number | null;
  gateway_details?: PaymentGateway;
  last_four: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

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

export const PAYMENT_METHOD_TYPES = [
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CASH', label: 'Cash' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet' },
] as const;

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