// frontend/client-portal/src/apis/__tests__/payment.api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentApi } from '../booking/payment.api';
import type { PaymentGateway } from '../../types/booking';

// Mock the api utility
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../utils/api';

describe('PaymentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockGateway = (overrides: Partial<PaymentGateway> = {}): PaymentGateway => ({
    id: 1,
    name: 'Stripe',
    code: 'stripe',
    is_active: true,
    public_config: {},
    ...overrides,
  });

  describe('API Methods', () => {
    describe('getFlowPaymentGateways', () => {
      it('fetches payment gateways for a flow', async () => {
        const mockResponse = {
          data: {
            gateways: [createMockGateway()],
            deposit_required: true,
            deposit_amount: '1000.00',
          },
        };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await PaymentApi.getFlowPaymentGateways(1);

        expect(api.get).toHaveBeenCalledWith('/bookingflow/public/flows/1/payment_gateways/');
        expect(result.gateways).toHaveLength(1);
      });
    });

    describe('getPaymentGateways', () => {
      it('fetches all active payment gateways', async () => {
        const mockResponse = {
          data: [createMockGateway(), createMockGateway({ id: 2, code: 'paypal' })],
        };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await PaymentApi.getPaymentGateways();

        expect(api.get).toHaveBeenCalledWith('/payments/gateways/', {
          params: { is_active: true },
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('getPaymentGateway', () => {
      it('fetches specific gateway by ID', async () => {
        const mockResponse = { data: createMockGateway() };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await PaymentApi.getPaymentGateway(1);

        expect(api.get).toHaveBeenCalledWith('/payments/gateways/1/');
        expect(result.id).toBe(1);
      });
    });

    describe('getGatewayPublicConfig', () => {
      it('fetches public config for gateway', async () => {
        const mockResponse = {
          data: { publishable_key: 'pk_test_123' },
        };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await PaymentApi.getGatewayPublicConfig('stripe');

        expect(api.get).toHaveBeenCalledWith('/payments/gateways/stripe/public-config/');
        expect(result.publishable_key).toBe('pk_test_123');
      });
    });
  });

  describe('calculateDepositAmount', () => {
    it('calculates percentage deposit', () => {
      const result = PaymentApi.calculateDepositAmount(10000, 'PERCENTAGE', 30);
      expect(result).toBe(3000);
    });

    it('calculates percentage deposit with string inputs', () => {
      const result = PaymentApi.calculateDepositAmount('10000', 'PERCENTAGE', '30');
      expect(result).toBe(3000);
    });

    it('returns fixed deposit amount', () => {
      const result = PaymentApi.calculateDepositAmount(10000, 'FIXED', 2500);
      expect(result).toBe(2500);
    });

    it('returns fixed deposit with string input', () => {
      const result = PaymentApi.calculateDepositAmount('10000', 'FIXED', '2500');
      expect(result).toBe(2500);
    });
  });

  describe('calculateRemainingBalance', () => {
    it('calculates remaining balance', () => {
      const result = PaymentApi.calculateRemainingBalance(10000, 3000);
      expect(result).toBe(7000);
    });

    it('calculates with string inputs', () => {
      const result = PaymentApi.calculateRemainingBalance('10000', '3000');
      expect(result).toBe(7000);
    });

    it('returns zero when deposit exceeds total', () => {
      const result = PaymentApi.calculateRemainingBalance(1000, 1500);
      expect(result).toBe(0);
    });
  });

  describe('formatAmount', () => {
    it('formats PHP currency', () => {
      const result = PaymentApi.formatAmount(10000.5, 'PHP');
      expect(result).toContain('10,000.50');
    });

    it('formats USD currency', () => {
      const result = PaymentApi.formatAmount(10000.5, 'USD');
      expect(result).toContain('10,000.50');
    });

    it('handles string input', () => {
      const result = PaymentApi.formatAmount('10000.50', 'PHP');
      expect(result).toContain('10,000.50');
    });

    it('defaults to PHP', () => {
      const result = PaymentApi.formatAmount(1000);
      // PHP currency uses peso symbol ₱
      expect(result).toContain('₱');
    });
  });

  describe('validatePaymentMethod', () => {
    it('validates Stripe gateway requires payment method', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.validatePaymentMethod(gateway, {});

      expect(result.isValid).toBe(false);
      expect(result.errors.payment_method).toContain('Payment method is required');
    });

    it('validates Stripe with payment_method_token', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.validatePaymentMethod(gateway, {
        payment_method_token: 'pm_123',
      });

      expect(result.isValid).toBe(true);
    });

    it('validates Stripe with payment_method_id', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.validatePaymentMethod(gateway, {
        payment_method_id: 'pm_123',
      });

      expect(result.isValid).toBe(true);
    });

    it('validates PayPal requires payment token', () => {
      const gateway = createMockGateway({ code: 'paypal' });
      const result = PaymentApi.validatePaymentMethod(gateway, {});

      expect(result.isValid).toBe(false);
      expect(result.errors.payment_method).toContain('PayPal payment method is required');
    });

    it('validates PayPal with token', () => {
      const gateway = createMockGateway({ code: 'paypal' });
      const result = PaymentApi.validatePaymentMethod(gateway, {
        payment_method_token: 'paypal_token',
      });

      expect(result.isValid).toBe(true);
    });

    it('manual gateway does not require payment method', () => {
      const gateway = createMockGateway({ code: 'manual' });
      const result = PaymentApi.validatePaymentMethod(gateway, {});

      expect(result.isValid).toBe(true);
    });

    it('validates billing address when required', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.validatePaymentMethod(gateway, {
        payment_method_token: 'pm_123',
        billing_address_required: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.billing_address).toContain('Billing address is required');
    });

    it('validates unknown gateway requires payment method', () => {
      const gateway = createMockGateway({ code: 'unknown_gateway' });
      const result = PaymentApi.validatePaymentMethod(gateway, {});

      expect(result.isValid).toBe(false);
    });
  });

  describe('getSupportedPaymentMethods', () => {
    it('returns Stripe methods', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('CREDIT_CARD');
    });

    it('includes Apple Pay for Stripe when supported', () => {
      const gateway = createMockGateway({
        code: 'stripe',
        public_config: { supports_apple_pay: true },
      });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('APPLE_PAY');
    });

    it('includes Google Pay for Stripe when supported', () => {
      const gateway = createMockGateway({
        code: 'stripe',
        public_config: { supports_google_pay: true },
      });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('GOOGLE_PAY');
    });

    it('returns PayPal methods', () => {
      const gateway = createMockGateway({ code: 'paypal' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('DIGITAL_WALLET');
    });

    it('returns GCash methods', () => {
      const gateway = createMockGateway({ code: 'gcash' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('DIGITAL_WALLET');
    });

    it('returns PayMaya methods', () => {
      const gateway = createMockGateway({ code: 'paymaya' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('DIGITAL_WALLET');
    });

    it('returns bank transfer methods', () => {
      const gateway = createMockGateway({ code: 'bank_transfer' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('BANK_TRANSFER');
    });

    it('returns manual methods', () => {
      const gateway = createMockGateway({ code: 'manual' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('MANUAL');
    });

    it('defaults to credit card for unknown gateway', () => {
      const gateway = createMockGateway({ code: 'unknown' });
      const result = PaymentApi.getSupportedPaymentMethods(gateway);

      expect(result).toContain('CREDIT_CARD');
    });
  });

  describe('getGatewayDisplayName', () => {
    it('returns gateway name if set', () => {
      const gateway = createMockGateway({ name: 'Custom Stripe' });
      const result = PaymentApi.getGatewayDisplayName(gateway);

      expect(result).toBe('Custom Stripe');
    });

    it('returns fallback for stripe', () => {
      const gateway = createMockGateway({ name: '', code: 'stripe' });
      const result = PaymentApi.getGatewayDisplayName(gateway);

      expect(result).toBe('Stripe');
    });

    it('returns fallback for paypal', () => {
      const gateway = createMockGateway({ name: '', code: 'paypal' });
      const result = PaymentApi.getGatewayDisplayName(gateway);

      expect(result).toBe('PayPal');
    });

    it('returns code for unknown gateway', () => {
      const gateway = createMockGateway({ name: '', code: 'custom_gateway' });
      const result = PaymentApi.getGatewayDisplayName(gateway);

      expect(result).toBe('custom_gateway');
    });
  });

  describe('getGatewayIcon', () => {
    it('returns stripe icon', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      expect(PaymentApi.getGatewayIcon(gateway)).toBe('stripe');
    });

    it('returns paypal icon', () => {
      const gateway = createMockGateway({ code: 'paypal' });
      expect(PaymentApi.getGatewayIcon(gateway)).toBe('paypal');
    });

    it('returns bank icon for bank_transfer', () => {
      const gateway = createMockGateway({ code: 'bank_transfer' });
      expect(PaymentApi.getGatewayIcon(gateway)).toBe('bank');
    });

    it('returns credit-card for unknown', () => {
      const gateway = createMockGateway({ code: 'unknown' });
      expect(PaymentApi.getGatewayIcon(gateway)).toBe('credit-card');
    });
  });

  describe('formatPaymentData', () => {
    it('formats basic payment data', () => {
      const gateway = createMockGateway();
      const result = PaymentApi.formatPaymentData(gateway, 'CREDIT_CARD', 'FULL');

      expect(result.payment_method).toBe('CREDIT_CARD');
      expect(result.payment_type).toBe('FULL');
      expect(result.gateway_id).toBe(1);
      expect(result.gateway_code).toBe('stripe');
    });

    it('includes Stripe payment method token', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.formatPaymentData(gateway, 'CREDIT_CARD', 'DEPOSIT', {
        payment_method_token: 'pm_123',
      });

      expect(result.payment_method_token).toBe('pm_123');
    });

    it('includes Stripe payment method id', () => {
      const gateway = createMockGateway({ code: 'stripe' });
      const result = PaymentApi.formatPaymentData(gateway, 'CREDIT_CARD', 'FULL', {
        payment_method_id: 'pm_saved_123',
      });

      expect(result.payment_method_id).toBe('pm_saved_123');
    });

    it('includes PayPal token', () => {
      const gateway = createMockGateway({ code: 'paypal' });
      const result = PaymentApi.formatPaymentData(gateway, 'DIGITAL_WALLET', 'FULL', {
        payment_method_token: 'paypal_token',
      });

      expect(result.payment_method_token).toBe('paypal_token');
    });

    it('includes manual payment instructions', () => {
      const gateway = createMockGateway({ code: 'manual' });
      const result = PaymentApi.formatPaymentData(gateway, 'MANUAL', 'FULL', {
        payment_instructions: 'Bank transfer to account XYZ',
      });

      expect(result.payment_instructions).toBe('Bank transfer to account XYZ');
    });

    it('defaults payment instructions for manual', () => {
      const gateway = createMockGateway({ code: 'manual' });
      const result = PaymentApi.formatPaymentData(gateway, 'MANUAL', 'FULL', {});

      expect(result.payment_instructions).toBe('');
    });

    it('includes billing address when provided', () => {
      const gateway = createMockGateway();
      const billingAddress = {
        line1: '123 Main St',
        city: 'Manila',
        country: 'PH',
      };
      const result = PaymentApi.formatPaymentData(gateway, 'CREDIT_CARD', 'FULL', {
        billing_address: billingAddress,
      });

      expect(result.billing_address).toEqual(billingAddress);
    });
  });

  describe('validateAmountLimits', () => {
    it('returns valid when within limits', () => {
      const gateway = createMockGateway({
        public_config: { min_amount: 100, max_amount: 100000 },
      });
      const result = PaymentApi.validateAmountLimits(gateway, 5000);

      expect(result.isValid).toBe(true);
    });

    it('returns error when below minimum', () => {
      const gateway = createMockGateway({
        public_config: { min_amount: 100 },
      });
      const result = PaymentApi.validateAmountLimits(gateway, 50);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimum amount');
    });

    it('returns error when above maximum', () => {
      const gateway = createMockGateway({
        public_config: { max_amount: 100000 },
      });
      const result = PaymentApi.validateAmountLimits(gateway, 150000);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum amount');
    });

    it('returns valid when no limits configured', () => {
      const gateway = createMockGateway({ public_config: {} });
      const result = PaymentApi.validateAmountLimits(gateway, 1000000);

      expect(result.isValid).toBe(true);
    });
  });

  describe('isTestMode', () => {
    it('returns true for test environment', () => {
      const gateway = createMockGateway({
        public_config: { environment: 'test' },
      });
      expect(PaymentApi.isTestMode(gateway)).toBe(true);
    });

    it('returns true for sandbox environment', () => {
      const gateway = createMockGateway({
        public_config: { environment: 'sandbox' },
      });
      expect(PaymentApi.isTestMode(gateway)).toBe(true);
    });

    it('returns false for live environment', () => {
      const gateway = createMockGateway({
        public_config: { environment: 'live' },
      });
      expect(PaymentApi.isTestMode(gateway)).toBe(false);
    });

    it('returns false when no environment set', () => {
      const gateway = createMockGateway({ public_config: {} });
      expect(PaymentApi.isTestMode(gateway)).toBe(false);
    });
  });

  describe('getEnvironmentDisplay', () => {
    it('returns "Test Mode" for test environment', () => {
      const gateway = createMockGateway({
        public_config: { environment: 'test' },
      });
      expect(PaymentApi.getEnvironmentDisplay(gateway)).toBe('Test Mode');
    });

    it('returns "Live" for live environment', () => {
      const gateway = createMockGateway({
        public_config: { environment: 'live' },
      });
      expect(PaymentApi.getEnvironmentDisplay(gateway)).toBe('Live');
    });
  });

  describe('supportsFeature', () => {
    it('detects saved payment methods support', () => {
      const gateway = createMockGateway({
        public_config: { supports_saved_methods: true },
      });
      expect(PaymentApi.supportsFeature(gateway, 'saved_payment_methods')).toBe(true);
    });

    it('detects recurring payments support', () => {
      const gateway = createMockGateway({
        public_config: { supports_recurring: true },
      });
      expect(PaymentApi.supportsFeature(gateway, 'recurring_payments')).toBe(true);
    });

    it('detects refunds support', () => {
      const gateway = createMockGateway({
        public_config: { supports_refunds: true },
      });
      expect(PaymentApi.supportsFeature(gateway, 'refunds')).toBe(true);
    });

    it('detects partial payments support', () => {
      const gateway = createMockGateway({
        public_config: { supports_partial_payments: true },
      });
      expect(PaymentApi.supportsFeature(gateway, 'partial_payments')).toBe(true);
    });

    it('detects apple pay support', () => {
      const gateway = createMockGateway({
        public_config: { supports_apple_pay: true },
      });
      expect(PaymentApi.supportsFeature(gateway, 'apple_pay')).toBe(true);
    });

    it('detects google pay support', () => {
      const gateway = createMockGateway({
        public_config: { supports_google_pay: true },
      });
      expect(PaymentApi.supportsFeature(gateway, 'google_pay')).toBe(true);
    });

    it('returns false for unknown feature', () => {
      const gateway = createMockGateway();
      expect(PaymentApi.supportsFeature(gateway, 'unknown_feature')).toBe(false);
    });

    it('returns false when feature not supported', () => {
      const gateway = createMockGateway({
        public_config: { supports_refunds: false },
      });
      expect(PaymentApi.supportsFeature(gateway, 'refunds')).toBe(false);
    });
  });

  describe('getAvailableFeatures', () => {
    it('returns all supported features', () => {
      const gateway = createMockGateway({
        public_config: {
          supports_saved_methods: true,
          supports_refunds: true,
          supports_apple_pay: true,
        },
      });
      const result = PaymentApi.getAvailableFeatures(gateway);

      expect(result).toContain('saved_payment_methods');
      expect(result).toContain('refunds');
      expect(result).toContain('apple_pay');
      expect(result).not.toContain('recurring_payments');
    });

    it('returns empty array when no features supported', () => {
      const gateway = createMockGateway({ public_config: {} });
      const result = PaymentApi.getAvailableFeatures(gateway);

      expect(result).toEqual([]);
    });
  });
});
