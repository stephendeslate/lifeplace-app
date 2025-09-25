// frontend/client-portal/src/components/payments/__tests__/PaymentStep.integration.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { PaymentStep } from '../../booking/steps/PaymentStep';
import type {
  PaymentStepData,
  PaymentInfoStepConfiguration,
  StepValidationResult,
} from '../../../types/booking';
import type { PaymentGateway } from '../../../types/financial.types';

// ===========================
// Mock Setup
// ===========================

// Mock all payment hooks
vi.mock('../../../hooks/booking/usePayment', () => ({
  useFlowPaymentGateways: vi.fn(),
  useGatewaySelection: vi.fn(),
}));

// Mock currency hook
vi.mock('../../../hooks/useCurrency', () => ({
  useCurrentCurrency: vi.fn(() => ({
    currentCurrency: 'USD',
    formatAmount: vi.fn((amount: number) => `$${amount.toFixed(2)}`),
  })),
}));

// Mock UnifiedStripePaymentFlow
vi.mock('../UnifiedStripePaymentFlow', () => ({
  UnifiedStripePaymentFlow: ({ onSuccess, onError, config, gateway, ...props }: any) => (
    <div data-testid="unified-stripe-payment-flow">
      <div data-testid="payment-flow-config">{JSON.stringify(config)}</div>
      <div data-testid="payment-flow-gateway">{JSON.stringify({ id: gateway.id, code: gateway.code })}</div>
      <button
        onClick={() => onSuccess({
          mode: 'booking',
          success: true,
          message: 'Payment method created successfully',
          bookingResult: {
            payment_method_saved: true,
            payment_method: {
              id: 1,
              type: 'CREDIT_CARD',
              last_four: '4242',
              gateway_details: { code: 'stripe' }
            },
            payment_intent_id: 'pi_test_123',
            client_secret: 'pi_test_123_secret',
            status: 'requires_payment_method',
          }
        })}
        data-testid="payment-flow-success"
      >
        Complete Payment
      </button>
      <button
        onClick={() => onError({
          type: 'stripe',
          message: 'Your card was declined.',
          stripe_error: { code: 'card_declined', message: 'Your card was declined.' }
        })}
        data-testid="payment-flow-error"
      >
        Trigger Error
      </button>
    </div>
  ),
}));

// ===========================
// Test Utilities
// ===========================

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// ===========================
// Mock Data
// ===========================

const mockPaymentGateways: PaymentGateway[] = [
  {
    id: 1,
    name: 'Stripe',
    code: 'stripe',
    is_active: true,
    is_default: true,
    provider: 'stripe',
    display_name: 'Credit Card',
    public_config: {
      publishable_key: 'pk_test_123',
    },
    private_config: {},
    payment_method_types: ['CREDIT_CARD'],
    supported_currencies: ['USD', 'PHP'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'PayPal',
    code: 'paypal',
    is_active: true,
    is_default: false,
    provider: 'paypal',
    display_name: 'PayPal',
    public_config: {},
    private_config: {},
    payment_method_types: ['DIGITAL_WALLET'],
    supported_currencies: ['USD'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

const mockPaymentConfig: PaymentInfoStepConfiguration = {
  type: 'payment_info',
  title: 'Payment Information',
  accept_deposit: true,
  deposit_type: 'PERCENTAGE',
  deposit_amount: '25',
  balance_due_days: 30,
  allow_quote_request: false,
  quote_request_button_text: 'Get Custom Quote',
  quote_request_description: 'Perfect for unique celebrations',
  allow_refunds: true,
  refund_percentage: 100,
  refund_deadline_days: 24,
  payment_methods: ['CREDIT_CARD', 'DIGITAL_WALLET'],
  manual_payment_instructions: 'Please contact us for manual payment options.',
};

const mockPaymentConfigWithQuotes: PaymentInfoStepConfiguration = {
  ...mockPaymentConfig,
  allow_quote_request: true,
};

// ===========================
// Test Suite
// ===========================

describe('PaymentStep Integration', () => {
  const mockOnDataChange = vi.fn();
  const mockOnValidate = vi.fn();
  const mockUseFlowPaymentGateways = vi.fn();
  const mockUseGatewaySelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default hook mocks
    mockUseFlowPaymentGateways.mockReturnValue({
      gateways: mockPaymentGateways,
      loading: false,
      error: null,
    });

    mockUseGatewaySelection.mockReturnValue({
      selectedGateway: null,
      setSelectedGateway: vi.fn(),
      filteredGateways: mockPaymentGateways,
    });

    require('../../../hooks/booking/usePayment').useFlowPaymentGateways.mockImplementation(
      mockUseFlowPaymentGateways
    );
    require('../../../hooks/booking/usePayment').useGatewaySelection.mockImplementation(
      mockUseGatewaySelection
    );

    mockOnValidate.mockResolvedValue({ valid: true, errors: [] });
  });

  const defaultProps = {
    stepData: { payment_method: '', payment_type: 'FULL' } as PaymentStepData,
    config: mockPaymentConfig,
    onDataChange: mockOnDataChange,
    validationErrors: {},
    isValidating: false,
    totalAmount: '100.00',
    flowId: 1,
    onValidate: mockOnValidate,
  };

  // ===========================
  // Basic Rendering Tests
  // ===========================

  describe('Basic Rendering', () => {
    it('should render payment step with payment gateways', async () => {
      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Secure Your Booking')).toBeInTheDocument();
        expect(screen.getByText('Event Total:')).toBeInTheDocument();
        expect(screen.getByText('$100.00')).toBeInTheDocument();
      });

      // Check gateway options
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
    });

    it('should show loading state when gateways are loading', () => {
      mockUseFlowPaymentGateways.mockReturnValue({
        gateways: [],
        loading: true,
        error: null,
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error state when gateways fail to load', () => {
      mockUseFlowPaymentGateways.mockReturnValue({
        gateways: [],
        loading: false,
        error: 'Failed to load gateways',
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      expect(screen.getByText('Failed to load gateways')).toBeInTheDocument();
    });
  });

  // ===========================
  // Payment Options Tests
  // ===========================

  describe('Payment Options', () => {
    it('should show deposit payment option when configured', async () => {
      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/pay deposit.*\$25\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/pay full amount.*\$100\.00/i)).toBeInTheDocument();
      });
    });

    it('should calculate deposit correctly for percentage', async () => {
      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('$25.00')).toBeInTheDocument(); // 25% of $100
      });
    });

    it('should calculate deposit correctly for fixed amount', async () => {
      const fixedAmountConfig = {
        ...mockPaymentConfig,
        deposit_type: 'FIXED' as const,
        deposit_amount: '50',
      };

      renderWithProviders(
        <PaymentStep {...defaultProps} config={fixedAmountConfig} />
      );

      await waitFor(() => {
        expect(screen.getByText('$50.00')).toBeInTheDocument();
      });
    });

    it('should update payment type when user selects deposit', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/pay deposit.*\$25\.00/i)).toBeInTheDocument();
      });

      const depositRadio = screen.getByLabelText(/pay deposit/i);
      await user.click(depositRadio);

      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_type: 'DEPOSIT',
        })
      );
    });
  });

  // ===========================
  // Quote Request Tests
  // ===========================

  describe('Quote Request Flow', () => {
    it('should show completion choice when quote requests enabled', () => {
      renderWithProviders(
        <PaymentStep {...defaultProps} config={mockPaymentConfigWithQuotes} />
      );

      expect(screen.getByText('Secure Your Booking')).toBeInTheDocument();
      expect(screen.getByText('🔒 Secure My Booking')).toBeInTheDocument();
      expect(screen.getByText('Get Custom Quote')).toBeInTheDocument();
    });

    it('should handle secure booking selection', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <PaymentStep {...defaultProps} config={mockPaymentConfigWithQuotes} />
      );

      const secureButton = screen.getByText('🔒 Secure My Booking');
      await user.click(secureButton);

      await waitFor(() => {
        expect(screen.getByText('Complete Payment')).toBeInTheDocument();
        expect(mockOnDataChange).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_type: 'DEPOSIT',
          })
        );
      });
    });

    it('should handle quote request selection', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <PaymentStep {...defaultProps} config={mockPaymentConfigWithQuotes} />
      );

      const quoteButton = screen.getByText('Get Custom Quote');
      await user.click(quoteButton);

      await waitFor(() => {
        expect(screen.getByText('Quote Request Submitted')).toBeInTheDocument();
        expect(mockOnDataChange).toHaveBeenCalledWith(
          expect.objectContaining({
            completion_type: 'quote',
          })
        );
      });
    });

    it('should allow going back from quote confirmation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <PaymentStep {...defaultProps} config={mockPaymentConfigWithQuotes} />
      );

      // Select quote
      const quoteButton = screen.getByText('Get Custom Quote');
      await user.click(quoteButton);

      // Go back
      const backButton = screen.getByText('Back to Options');
      await user.click(backButton);

      expect(screen.getByText('🔒 Secure My Booking')).toBeInTheDocument();
    });
  });

  // ===========================
  // Gateway Selection Tests
  // ===========================

  describe('Gateway Selection', () => {
    it('should handle gateway selection', async () => {
      const user = userEvent.setup();
      const mockSetSelectedGateway = vi.fn();

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: null,
        setSelectedGateway: mockSetSelectedGateway,
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Method')).toBeInTheDocument();
      });

      const stripeRadio = screen.getByLabelText(/stripe/i);
      await user.click(stripeRadio);

      expect(mockSetSelectedGateway).toHaveBeenCalledWith(mockPaymentGateways[0]);
      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_gateway_id: 1,
          payment_method: 'CREDIT_CARD',
        })
      );
    });

    it('should set correct payment method based on gateway type', async () => {
      const user = userEvent.setup();
      const mockSetSelectedGateway = vi.fn();

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: null,
        setSelectedGateway: mockSetSelectedGateway,
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Method')).toBeInTheDocument();
      });

      // Select PayPal
      const paypalRadio = screen.getByLabelText(/paypal/i);
      await user.click(paypalRadio);

      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_gateway_id: 2,
          payment_method: 'DIGITAL_WALLET',
        })
      );
    });
  });

  // ===========================
  // UnifiedStripePaymentFlow Integration Tests
  // ===========================

  describe('UnifiedStripePaymentFlow Integration', () => {
    it('should render unified payment flow when Stripe is selected', async () => {
      const user = userEvent.setup();
      const mockSetSelectedGateway = vi.fn();

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: mockPaymentGateways[0], // Stripe gateway selected
        setSelectedGateway: mockSetSelectedGateway,
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
      });

      // Check that correct configuration is passed
      const configElement = screen.getByTestId('payment-flow-config');
      const config = JSON.parse(configElement.textContent || '{}');

      expect(config).toEqual(
        expect.objectContaining({
          mode: 'booking',
          total_amount: 100, // $100.00 converted to cents
          currency: 'usd',
          create_payment_intent: true,
          save_payment_method: true,
          booking_session_id: '1',
        })
      );
    });

    it('should handle payment flow success', async () => {
      const user = userEvent.setup();

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: mockPaymentGateways[0],
        setSelectedGateway: vi.fn(),
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
      });

      const successButton = screen.getByTestId('payment-flow-success');
      await user.click(successButton);

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_method_id: '1',
            payment_method: 'CREDIT_CARD',
          })
        );

        expect(screen.getByText('Payment Method Secured! 🎉')).toBeInTheDocument();
        expect(screen.getByText('✅ Ready to Complete Your Booking')).toBeInTheDocument();
      });
    });

    it('should handle payment flow error', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: mockPaymentGateways[0],
        setSelectedGateway: vi.fn(),
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
      });

      const errorButton = screen.getByTestId('payment-flow-error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Payment flow error:',
          expect.objectContaining({
            type: 'stripe',
            message: 'Your card was declined.',
          })
        );
      });

      consoleSpy.mockRestore();
    });

    it('should not render payment flow when payment method is already created', () => {
      const stepDataWithPaymentMethod: PaymentStepData = {
        payment_method: 'CREDIT_CARD',
        payment_type: 'FULL',
        payment_method_id: 'pm_123',
      };

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: mockPaymentGateways[0],
        setSelectedGateway: vi.fn(),
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(
        <PaymentStep {...defaultProps} stepData={stepDataWithPaymentMethod} />
      );

      expect(screen.queryByTestId('unified-stripe-payment-flow')).not.toBeInTheDocument();
      expect(screen.getByText('Payment Method Secured! 🎉')).toBeInTheDocument();
    });

    it('should allow changing payment method when already set', async () => {
      const user = userEvent.setup();
      const stepDataWithPaymentMethod: PaymentStepData = {
        payment_method: 'CREDIT_CARD',
        payment_type: 'FULL',
        payment_method_id: 'pm_123',
      };

      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: mockPaymentGateways[0],
        setSelectedGateway: vi.fn(),
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(
        <PaymentStep {...defaultProps} stepData={stepDataWithPaymentMethod} />
      );

      expect(screen.getByText('Payment Method Secured! 🎉')).toBeInTheDocument();

      const changeButton = screen.getByText('Use Different Payment Method');
      await user.click(changeButton);

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_method_id: '',
            payment_method_token: '',
          })
        );
      });
    });
  });

  // ===========================
  // Validation Tests
  // ===========================

  describe('Validation', () => {
    it('should display validation errors', () => {
      const validationErrors = {
        payment_method: ['Payment method is required'],
        payment_gateway_id: ['Please select a payment gateway'],
      };

      renderWithProviders(
        <PaymentStep {...defaultProps} validationErrors={validationErrors} />
      );

      expect(screen.getByText('payment_method: Payment method is required')).toBeInTheDocument();
      expect(screen.getByText('payment_gateway_id: Please select a payment gateway')).toBeInTheDocument();
    });

    it('should call validation when data changes', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentStep {...defaultProps} />);

      // Trigger a data change by selecting full payment
      await waitFor(() => {
        const fullPaymentRadio = screen.getByLabelText(/pay full amount/i);
        expect(fullPaymentRadio).toBeInTheDocument();
      });

      const fullPaymentRadio = screen.getByLabelText(/pay full amount/i);
      await user.click(fullPaymentRadio);

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_type: 'FULL',
          })
        );
      });
    });

    it('should handle validation failures gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockOnValidate.mockRejectedValue(new Error('Validation failed'));

      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        const fullPaymentRadio = screen.getByLabelText(/pay full amount/i);
        expect(fullPaymentRadio).toBeInTheDocument();
      });

      const fullPaymentRadio = screen.getByLabelText(/pay full amount/i);
      await user.click(fullPaymentRadio);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Validation failed:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  // ===========================
  // Edge Cases Tests
  // ===========================

  describe('Edge Cases', () => {
    it('should handle empty stepData gracefully', () => {
      renderWithProviders(<PaymentStep {...defaultProps} stepData={undefined} />);

      // Should use default values
      expect(screen.getByText('Secure Your Booking')).toBeInTheDocument();
    });

    it('should handle null config gracefully', () => {
      renderWithProviders(<PaymentStep {...defaultProps} config={null} />);

      expect(screen.getByText('Secure Your Booking')).toBeInTheDocument();
      // Should not show deposit options when no config
      expect(screen.queryByText(/pay deposit/i)).not.toBeInTheDocument();
    });

    it('should handle zero total amount', () => {
      renderWithProviders(<PaymentStep {...defaultProps} totalAmount="0" />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
      // Payment flow should not render for zero amount
      expect(screen.queryByTestId('unified-stripe-payment-flow')).not.toBeInTheDocument();
    });

    it('should disable form when isValidating is true', () => {
      mockUseGatewaySelection.mockReturnValue({
        selectedGateway: mockPaymentGateways[0],
        setSelectedGateway: vi.fn(),
        filteredGateways: mockPaymentGateways,
      });

      renderWithProviders(<PaymentStep {...defaultProps} isValidating={true} />);

      // Radio buttons should be disabled
      const stripeRadio = screen.getByLabelText(/stripe/i);
      expect(stripeRadio).toBeDisabled();
    });
  });

  // ===========================
  // Accessibility Tests
  // ===========================

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<PaymentStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      });

      const paymentOptionsGroup = screen.getAllByRole('radiogroup')[0];
      expect(paymentOptionsGroup).toBeInTheDocument();

      const gatewayOptionsGroup = screen.getAllByRole('radiogroup')[1];
      expect(gatewayOptionsGroup).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithProviders(<PaymentStep {...defaultProps} />);

      const mainHeading = screen.getByRole('heading', { level: 5, name: /secure your booking/i });
      expect(mainHeading).toBeInTheDocument();

      const paymentMethodHeading = screen.getByRole('heading', { level: 6, name: /payment method/i });
      expect(paymentMethodHeading).toBeInTheDocument();
    });
  });
});