// frontend/client-portal/src/services/PaymentFlowManager.ts

import { loadStripe, type Stripe, type ConfirmCardPaymentData } from '@stripe/stripe-js';
import FinancialApi from '../apis/financial.api';

/**
 * Payment configuration for different payment scenarios
 */
export interface PaymentConfig {
  mode: 'booking' | 'save' | 'invoice';
  amount?: number;
  currency?: string;
  eventId?: number;
  invoiceId?: number;
  gatewayCode?: string;
  metadata?: Record<string, unknown>;
  savePaymentMethod?: boolean;
  customerId?: string;
}

/**
 * Payment session represents an active payment flow
 */
export interface PaymentSession {
  sessionId: string;
  gatewayCode: string;
  clientSecret?: string;
  paymentIntentId?: string;
  status: 'initialized' | 'processing' | 'completed' | 'failed' | 'cancelled';
  config: PaymentConfig;
  createdAt: Date;
  error?: PaymentError;
}

/**
 * Payment result after processing
 */
export interface PaymentResult {
  success: boolean;
  paymentId?: number;
  paymentNumber?: string;
  transactionId?: string;
  message: string;
  requiresAction?: boolean;
  nextAction?: unknown;
  error?: PaymentError;
}

/**
 * Payment error details
 */
export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

/**
 * Error recovery options
 */
export interface ErrorRecovery {
  canRetry: boolean;
  suggestedAction: string;
  alternativeGateways?: string[];
}

/**
 * Gateway-specific configuration
 */
interface GatewayConfig {
  code: string;
  name: string;
  isHealthy: boolean;
  supportedFeatures: string[];
  publishableKey?: string;
}

/**
 * Enhanced Payment Flow Manager supporting multiple gateways
 *
 * Phase 3 enhancement that provides:
 * - Multi-gateway support with automatic failover
 * - Enhanced error handling and recovery
 * - Performance optimization with caching
 * - Comprehensive state management
 */
export class PaymentFlowManager {
  private static instance: PaymentFlowManager;
  private gatewayInstances: Map<string, Stripe | unknown> = new Map();
  private activeSessions: Map<string, PaymentSession> = new Map();
  private gatewayConfigs: Map<string, GatewayConfig> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  private constructor() {
    this.initializeGateways();
  }

  public static getInstance(): PaymentFlowManager {
    if (!PaymentFlowManager.instance) {
      PaymentFlowManager.instance = new PaymentFlowManager();
    }
    return PaymentFlowManager.instance;
  }

  /**
   * Initialize payment flow with configuration
   */
  public async initializePayment(config: PaymentConfig): Promise<PaymentSession> {
    try {
      if (import.meta.env.DEV) console.log('🚀 Initializing payment with config:', config);

      // Determine best gateway for this payment
      const gatewayCode = await this.selectOptimalGateway(config);

      // Create payment session
      const session: PaymentSession = {
        sessionId: this.generateSessionId(),
        gatewayCode,
        status: 'initialized',
        config,
        createdAt: new Date()
      };

      // Initialize gateway-specific session
      await this.initializeGatewaySession(session);

      // Store active session
      this.activeSessions.set(session.sessionId, session);

      if (import.meta.env.DEV) console.log('✅ Payment session initialized:', session.sessionId);
      return session;

    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Failed to initialize payment:', error);
      throw this.createPaymentError('initialization_failed', 'Failed to initialize payment', error);
    }
  }

  /**
   * Process payment using the session
   */
  public async processPayment(session: PaymentSession, paymentData?: unknown): Promise<PaymentResult> {
    try {
      if (import.meta.env.DEV) console.log('💳 Processing payment for session:', session.sessionId);

      // Update session status
      session.status = 'processing';
      this.activeSessions.set(session.sessionId, session);

      // Process through appropriate gateway
      const result = await this.processGatewayPayment(session, paymentData);

      // Update session with result
      if (result.success) {
        session.status = 'completed';
      } else {
        session.status = 'failed';
        session.error = result.error;
      }

      this.activeSessions.set(session.sessionId, session);

      return result;

    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Payment processing failed:', error);
      session.status = 'failed';
      session.error = this.createPaymentError('processing_failed', 'Payment processing failed', error);

      return {
        success: false,
        message: 'Payment processing failed',
        error: session.error
      };
    }
  }

  /**
   * Handle payment errors with recovery options
   */
  public async handlePaymentError(error: PaymentError, session?: PaymentSession): Promise<ErrorRecovery> {
    try {
      if (import.meta.env.DEV) console.log('🔧 Handling payment error:', error);

      const recovery: ErrorRecovery = {
        canRetry: false,
        suggestedAction: 'Please try again later'
      };

      // Determine if error is retryable
      if (this.isRetryableError(error)) {
        const sessionId = session?.sessionId || 'unknown';
        const currentAttempts = this.retryAttempts.get(sessionId) || 0;

        if (currentAttempts < 3) {
          recovery.canRetry = true;
          recovery.suggestedAction = 'Please try again';
          this.retryAttempts.set(sessionId, currentAttempts + 1);
        }
      }

      // Check for alternative gateways
      if (session && this.shouldSuggestAlternativeGateway(error)) {
        recovery.alternativeGateways = await this.getAlternativeGateways(session.gatewayCode);
        if (recovery.alternativeGateways.length > 0) {
          recovery.suggestedAction = 'Try using an alternative payment method';
        }
      }

      return recovery;

    } catch (recoveryError) {
      if (import.meta.env.DEV) console.error('❌ Error handling failed:', recoveryError);
      return {
        canRetry: false,
        suggestedAction: 'Please contact support for assistance'
      };
    }
  }

  /**
   * Retry payment with same or different gateway
   */
  public async retryPayment(session: PaymentSession, useAlternativeGateway?: boolean): Promise<PaymentResult> {
    try {
      if (import.meta.env.DEV) console.log('🔄 Retrying payment for session:', session.sessionId);

      if (useAlternativeGateway) {
        // Switch to alternative gateway
        const alternativeGateways = await this.getAlternativeGateways(session.gatewayCode);
        if (alternativeGateways.length > 0) {
          session.gatewayCode = alternativeGateways[0];
          await this.initializeGatewaySession(session);
        }
      }

      // Reset session status
      session.status = 'initialized';
      session.error = undefined;

      // Process payment again
      return await this.processPayment(session);

    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Payment retry failed:', error);
      return {
        success: false,
        message: 'Payment retry failed',
        error: this.createPaymentError('retry_failed', 'Payment retry failed', error)
      };
    }
  }

  /**
   * Get available payment gateways
   */
  public async getAvailableGateways(): Promise<GatewayConfig[]> {
    try {
      const response = await FinancialApi.getAvailableGateways();

      if (response.success && response.data && Array.isArray(response.data)) {
        // Update local gateway configs
        const gatewayConfigs = response.data as GatewayConfig[];
        gatewayConfigs.forEach((config: GatewayConfig) => {
          this.gatewayConfigs.set(config.code, config);
        });

        return gatewayConfigs;
      }

      return [];

    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Failed to get available gateways:', error);
      return [];
    }
  }

  /**
   * Initialize gateway instances
   */
  private async initializeGateways(): Promise<void> {
    try {
      if (import.meta.env.DEV) console.log('🔧 Initializing payment gateways...');

      // Get available gateways from backend
      const gateways = await this.getAvailableGateways();

      for (const gateway of gateways) {
        try {
          await this.initializeGateway(gateway);
        } catch (error) {
          if (import.meta.env.DEV) console.warn(`⚠️ Failed to initialize gateway ${gateway.code}:`, error);
        }
      }

      if (import.meta.env.DEV) console.log('✅ Payment gateways initialized');

    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Failed to initialize gateways:', error);
    }
  }

  /**
   * Initialize specific gateway
   */
  private async initializeGateway(config: GatewayConfig): Promise<void> {
    switch (config.code) {
      case 'stripe':
        await this.initializeStripe(config);
        break;
      case 'paypal':
        await this.initializePayPal(config);
        break;
      default:
        if (import.meta.env.DEV) console.warn(`⚠️ Unknown gateway: ${config.code}`);
    }
  }

  /**
   * Initialize Stripe gateway
   */
  private async initializeStripe(config: GatewayConfig): Promise<void> {
    if (!config.publishableKey) {
      throw new Error('Stripe publishable key not configured');
    }

    const stripe = await loadStripe(config.publishableKey);
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }

    this.gatewayInstances.set('stripe', stripe);
    if (import.meta.env.DEV) console.log('✅ Stripe initialized');
  }

  /**
   * Initialize PayPal gateway (placeholder)
   */
  private async initializePayPal(_config: GatewayConfig): Promise<void> {
    // TODO: Implement PayPal initialization
    if (import.meta.env.DEV) console.log('⚠️ PayPal gateway not yet implemented');
  }

  /**
   * Select optimal gateway for payment
   */
  private async selectOptimalGateway(config: PaymentConfig): Promise<string> {
    // If gateway is explicitly specified, use it
    if (config.gatewayCode) {
      const gatewayConfig = this.gatewayConfigs.get(config.gatewayCode);
      if (gatewayConfig && gatewayConfig.isHealthy) {
        return config.gatewayCode;
      }
    }

    // Get healthy gateways
    const healthyGateways = Array.from(this.gatewayConfigs.values())
      .filter(gateway => gateway.isHealthy);

    if (healthyGateways.length === 0) {
      throw new Error('No healthy payment gateways available');
    }

    // For now, return the first healthy gateway
    // This can be enhanced with more sophisticated selection logic
    return healthyGateways[0].code;
  }

  /**
   * Initialize gateway-specific session
   */
  private async initializeGatewaySession(session: PaymentSession): Promise<void> {
    switch (session.gatewayCode) {
      case 'stripe':
        await this.initializeStripeSession(session);
        break;
      case 'paypal':
        await this.initializePayPalSession(session);
        break;
      default:
        throw new Error(`Unsupported gateway: ${session.gatewayCode}`);
    }
  }

  /**
   * Initialize Stripe session
   */
  private async initializeStripeSession(session: PaymentSession): Promise<void> {
    const { config } = session;

    if (config.mode === 'save') {
      // For saving payment methods, no payment intent needed
      return;
    }

    if (!config.amount || config.amount <= 0) {
      throw new Error('Amount is required for payment');
    }

    try {
      // Create payment intent
      const response = await FinancialApi.createPaymentIntent({
        amount: config.amount,
        currency: config.currency || 'PHP',
        gatewayCode: 'stripe',
        eventId: config.eventId,
        invoiceId: config.invoiceId,
        metadata: config.metadata,
        savePaymentMethod: config.savePaymentMethod
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to create payment intent');
      }

      const responseData = response.data as { client_secret?: string; payment_intent_id?: string } | undefined;
      session.clientSecret = responseData?.client_secret;
      session.paymentIntentId = responseData?.payment_intent_id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize Stripe session: ${errorMessage}`);
    }
  }

  /**
   * Initialize PayPal session (placeholder)
   */
  private async initializePayPalSession(_session: PaymentSession): Promise<void> {
    throw new Error('PayPal gateway not yet implemented');
  }

  /**
   * Process payment through gateway
   */
  private async processGatewayPayment(session: PaymentSession, paymentData?: unknown): Promise<PaymentResult> {
    switch (session.gatewayCode) {
      case 'stripe':
        return await this.processStripePayment(session, paymentData);
      case 'paypal':
        return await this.processPayPalPayment(session, paymentData);
      default:
        throw new Error(`Unsupported gateway: ${session.gatewayCode}`);
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(session: PaymentSession, paymentData?: unknown): Promise<PaymentResult> {
    const stripe = this.gatewayInstances.get('stripe') as Stripe;

    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      if (session.config.mode === 'save') {
        // Save payment method
        return await this.processStripePaymentMethodSave(stripe, session, paymentData);
      } else {
        // Process payment
        return await this.processStripePaymentIntent(stripe, session, paymentData);
      }

    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Stripe payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      const errorCode = (error && typeof error === 'object' && 'code' in error) ? String(error.code) : 'stripe_error';

      return {
        success: false,
        message: errorMessage,
        error: this.createPaymentError(
          errorCode,
          errorMessage,
          error
        )
      };
    }
  }

  /**
   * Process Stripe payment intent
   */
  private async processStripePaymentIntent(stripe: Stripe, session: PaymentSession, paymentData?: unknown): Promise<PaymentResult> {
    if (!session.clientSecret) {
      throw new Error('Client secret not available');
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      session.clientSecret,
      paymentData as ConfirmCardPaymentData | undefined
    );

    if (error) {
      return {
        success: false,
        message: error.message || 'Payment failed',
        error: this.createPaymentError(
          error.code || 'card_error',
          error.message || 'Card payment failed',
          error
        )
      };
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      return {
        success: true,
        transactionId: paymentIntent.id,
        message: 'Payment completed successfully'
      };
    }

    return {
      success: false,
      message: 'Payment was not completed',
      error: this.createPaymentError('payment_incomplete', 'Payment was not completed')
    };
  }

  /**
   * Process Stripe payment method save
   */
  private async processStripePaymentMethodSave(_stripe: Stripe, _session: PaymentSession, _paymentData?: unknown): Promise<PaymentResult> {
    // Implementation for saving payment methods
    // This would involve setup intents and customer creation
    throw new Error('Payment method save not yet implemented');
  }

  /**
   * Process PayPal payment (placeholder)
   */
  private async processPayPalPayment(_session: PaymentSession, _paymentData?: unknown): Promise<PaymentResult> {
    throw new Error('PayPal payment processing not yet implemented');
  }

  /**
   * Get alternative gateways
   */
  private async getAlternativeGateways(excludeGateway: string): Promise<string[]> {
    const alternatives: string[] = [];

    for (const [code, config] of this.gatewayConfigs) {
      if (code !== excludeGateway && config.isHealthy) {
        alternatives.push(code);
      }
    }

    return alternatives;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: PaymentError): boolean {
    const retryableCodes = [
      'network_error',
      'processing_error',
      'temporary_failure',
      'rate_limit_error'
    ];

    return retryableCodes.includes(error.code) || error.retryable === true;
  }

  /**
   * Check if should suggest alternative gateway
   */
  private shouldSuggestAlternativeGateway(error: PaymentError): boolean {
    const gatewaySpecificErrors = [
      'gateway_timeout',
      'gateway_unavailable',
      'gateway_maintenance'
    ];

    return gatewaySpecificErrors.includes(error.code);
  }

  /**
   * Create standardized payment error
   */
  private createPaymentError(code: string, message: string, originalError?: unknown): PaymentError {
    return {
      code,
      message,
      details: originalError ? { originalError: originalError.toString() } : undefined,
      retryable: this.isRetryableError({ code, message })
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.activeSessions) {
      if (now.getTime() - session.createdAt.getTime() > expiredThreshold) {
        this.activeSessions.delete(sessionId);
        this.retryAttempts.delete(sessionId);
      }
    }
  }

  /**
   * Get session status
   */
  public getSession(sessionId: string): PaymentSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Cancel payment session
   */
  public cancelSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'cancelled';
      this.activeSessions.set(sessionId, session);
    }
  }
}