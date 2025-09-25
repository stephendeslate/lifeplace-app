// frontend/client-portal/src/components/payments/__tests__/UnifiedStripePaymentFlow.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { UnifiedStripePaymentFlow } from '../UnifiedStripePaymentFlow';
import FinancialApi from '../../../apis/financial.api';
import type {
  PaymentFlowResult,
  PaymentFlowError,
  BookingModeConfig,
  SaveModeConfig,
  InvoiceModeConfig,
  PaymentGateway,
} from '../../../types/unified-payment-flow.types';

// ===========================
// Mock Setup
// ===========================

// Mock Stripe
const mockStripe = {
  confirmCardPayment: vi.fn(),
  confirmCardSetup: vi.fn(),
  createPaymentMethod: vi.fn(),
  elements: vi.fn(() => ({
    create: vi.fn(() => mockCardElement),
  })),
};

const mockCardElement = {
  mount: vi.fn(),
  unmount: vi.fn(),
  on: vi.fn((event, callback) => {
    if (event === 'change') {
      // Store callback for manual triggering
      mockCardElement._changeCallback = callback;
    }
  }),
  destroy: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  clear: vi.fn(),
  update: vi.fn(),
  _changeCallback: null as any,
  // Helper to trigger change events in tests
  _triggerChange: (eventData: any) => {
    if (mockCardElement._changeCallback) {
      mockCardElement._changeCallback(eventData);
    }
  },
};

const mockElements = {
  create: vi.fn(() => mockCardElement),
  getElement: vi.fn(() => mockCardElement),
  submit: vi.fn(),
  fetchUpdates: vi.fn(),
  update: vi.fn(),
};

// Mock @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements-provider">{children}</div>,
  CardElement: ({ onChange, ...props }: any) => {
    React.useEffect(() => {
      // Simulate mounting
      if (onChange) {
        mockCardElement._changeCallback = onChange;
      }
    }, [onChange]);
    return <div data-testid="stripe-card-element" {...props}>Mock Stripe Card Element</div>;
  },
}));

// Mock loadStripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripe)),
}));

// Mock the API
vi.mock('../../../apis/financial.api');
const mockFinancialApi = vi.mocked(FinancialApi);

// Mock GlassCard
vi.mock('../../design-system', () => ({
  GlassCard: ({ children, ...props }: any) => (
    <div data-testid="glass-card" {...props}>
      {children}
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

const mockGateway: PaymentGateway = {
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
};

const mockBookingConfig: BookingModeConfig = {
  mode: 'booking',
  booking_session_id: 'session_123',
  event_id: 1,
  total_amount: 10000,
  currency: 'USD',
  create_payment_intent: true,
  save_payment_method: false,
};

const mockSaveConfig: SaveModeConfig = {
  mode: 'save',
  save_as_default: false,
  nickname: 'My Card',
};

const mockInvoiceConfig: InvoiceModeConfig = {
  mode: 'invoice',
  invoice_id: 123,
  amount: 5000,
  currency: 'USD',
  save_payment_method: false,
};

const mockPaymentMethod = {
  id: 1,
  type: 'CREDIT_CARD' as const,
  stripe_payment_method_id: 'pm_123',
  last_four: '4242',
  card_brand: 'visa',
  exp_month: 12,
  exp_year: 2025,
  is_default: false,
  nickname: 'Test Card',
  is_active: true,
  gateway: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

// ===========================
// Test Suite
// ===========================

describe('UnifiedStripePaymentFlow', () => {
  const mockOnSuccess = vi.fn<[PaymentFlowResult], void>();
  const mockOnError = vi.fn<[PaymentFlowError], void>();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset card element callbacks
    mockCardElement._changeCallback = null;

    // Setup default API mocks
    mockFinancialApi.formatAmount = vi.fn((amount, currency) => `$${(amount / 100).toFixed(2)}`);
  });

  // ===========================
  // Booking Mode Tests
  // ===========================

  describe('Booking Mode', () => {
    const defaultProps = {
      config: mockBookingConfig,
      gateway: mockGateway,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
      onCancel: mockOnCancel,
    };

    it('should render booking mode correctly', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Booking Payment')).toBeInTheDocument();
        expect(screen.getByText(/complete your booking with secure payment.*\$100\.00/i)).toBeInTheDocument();
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      expect(screen.getByTestId('stripe-card-element')).toBeInTheDocument();
      expect(screen.getByText('Your payment information is encrypted and secure')).toBeInTheDocument();
    });

    it('should handle payment method creation in booking mode', async () => {
      const user = userEvent.setup();

      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_123',
          card: {
            last4: '4242',
            brand: 'visa',
            exp_month: 12,
            exp_year: 2025,
          },
        },
      });

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
          brand: 'visa',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).not.toBeDisabled();
      });

      // Click submit button
      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
          type: 'card',
          card: mockCardElement,
        });
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          mode: 'booking',
          success: true,
          message: 'Booking payment method created successfully',
          bookingResult: expect.objectContaining({
            payment_method_saved: false,
            booking_session_updated: false,
            status: 'requires_payment_method',
          }),
        });
      });
    });

    it('should handle save payment option in booking mode', async () => {
      const user = userEvent.setup();

      const configWithSave: BookingModeConfig = {
        ...mockBookingConfig,
        save_payment_method: true,
      };

      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_123',
          card: {
            last4: '4242',
            brand: 'visa',
            exp_month: 12,
            exp_year: 2025,
          },
        },
      });

      mockFinancialApi.createPaymentMethod.mockResolvedValue(mockPaymentMethod);

      renderWithProviders(
        <UnifiedStripePaymentFlow {...defaultProps} config={configWithSave} />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
          brand: 'visa',
        });
      });

      // Click submit button
      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFinancialApi.createPaymentMethod).toHaveBeenCalledWith({
          type: 'CREDIT_CARD',
          stripe_payment_method_id: 'pm_test_123',
          last_four: '4242',
          card_brand: 'visa',
          exp_month: 12,
          exp_year: 2025,
          is_default: false,
        });
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          mode: 'booking',
          success: true,
          message: 'Booking payment method created successfully',
          bookingResult: expect.objectContaining({
            payment_method_saved: true,
            payment_method: mockPaymentMethod,
          }),
        });
      });
    });

    it('should handle Stripe errors in booking mode', async () => {
      const user = userEvent.setup();

      mockStripe.createPaymentMethod.mockResolvedValue({
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      });

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'stripe',
          message: 'Your card was declined.',
          stripe_error: {
            type: 'card_error',
            code: 'card_declined',
            message: 'Your card was declined.',
          },
        });
      });

      expect(screen.getByText('Your card was declined.')).toBeInTheDocument();
    });
  });

  // ===========================
  // Save Mode Tests
  // ===========================

  describe('Save Mode', () => {
    const defaultProps = {
      config: mockSaveConfig,
      gateway: mockGateway,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
      onCancel: mockOnCancel,
    };

    beforeEach(() => {
      mockFinancialApi.createStripeSetupIntent.mockResolvedValue({
        client_secret: 'seti_test_123_secret_456',
        setup_intent_id: 'seti_test_123',
        status: 'requires_payment_method',
        gateway: 'stripe',
        success: true,
      });
    });

    it('should render save mode correctly', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Save Payment Method')).toBeInTheDocument();
        expect(screen.getByText('Securely save your card for future payments')).toBeInTheDocument();
        expect(screen.getByText('Save Card')).toBeInTheDocument();
      });

      expect(screen.getByTestId('stripe-card-element')).toBeInTheDocument();
    });

    it('should handle setup intent creation', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(mockFinancialApi.createStripeSetupIntent).toHaveBeenCalled();
      });
    });

    it('should handle successful card setup', async () => {
      const user = userEvent.setup();

      mockStripe.confirmCardSetup.mockResolvedValue({
        setupIntent: {
          id: 'seti_test_123',
          status: 'succeeded',
          payment_method: {
            id: 'pm_test_123',
            card: {
              last4: '4242',
              brand: 'visa',
              exp_month: 12,
              exp_year: 2025,
            },
          },
        },
      });

      mockFinancialApi.createPaymentMethod.mockResolvedValue(mockPaymentMethod);

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      // Wait for setup intent to load
      await waitFor(() => {
        expect(screen.getByText('Save Card')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Save Card');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.confirmCardSetup).toHaveBeenCalledWith(
          'seti_test_123_secret_456',
          {
            payment_method: {
              card: mockCardElement,
            },
          }
        );
      });

      await waitFor(() => {
        expect(mockFinancialApi.createPaymentMethod).toHaveBeenCalledWith({
          type: 'CREDIT_CARD',
          stripe_payment_method_id: 'pm_test_123',
          last_four: '4242',
          card_brand: 'visa',
          exp_month: 12,
          exp_year: 2025,
          is_default: false,
          nickname: 'My Card',
        });
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          mode: 'save',
          success: true,
          message: 'Payment method saved successfully',
          saveResult: {
            payment_method: mockPaymentMethod,
            setup_intent_id: 'seti_test_123',
            is_default: false,
          },
        });
      });
    });

    it('should handle setup intent errors', async () => {
      const user = userEvent.setup();

      mockStripe.confirmCardSetup.mockResolvedValue({
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      });

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Save Card')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Save Card');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'stripe',
          message: 'Your card was declined.',
          stripe_error: {
            type: 'card_error',
            code: 'card_declined',
            message: 'Your card was declined.',
          },
        });
      });
    });

    it('should handle setup intent initialization failure', async () => {
      mockFinancialApi.createStripeSetupIntent.mockRejectedValue(
        new Error('Failed to create setup intent')
      );

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to create setup intent')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // Invoice Mode Tests
  // ===========================

  describe('Invoice Mode', () => {
    const defaultProps = {
      config: mockInvoiceConfig,
      gateway: mockGateway,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
      onCancel: mockOnCancel,
    };

    beforeEach(() => {
      mockFinancialApi.createInvoicePaymentIntent.mockResolvedValue({
        client_secret: 'pi_test_123_secret_456',
        payment_intent_id: 'pi_test_123',
        status: 'requires_payment_method',
        gateway: 'stripe',
        success: true,
        requires_action: false,
      });
    });

    it('should render invoice mode correctly', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice Payment')).toBeInTheDocument();
        expect(screen.getByText(/pay your invoice securely.*\$50\.00/i)).toBeInTheDocument();
        expect(screen.getByText('Pay Invoice')).toBeInTheDocument();
      });
    });

    it('should handle payment intent creation', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(mockFinancialApi.createInvoicePaymentIntent).toHaveBeenCalledWith(
          123,
          'stripe'
        );
      });
    });

    it('should handle successful invoice payment', async () => {
      const user = userEvent.setup();

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
        },
      });

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pay Invoice')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Pay Invoice');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
          'pi_test_123_secret_456',
          {
            payment_method: {
              card: mockCardElement,
            },
          }
        );
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          mode: 'invoice',
          success: true,
          message: 'Invoice payment completed successfully',
          invoiceResult: expect.objectContaining({
            payment: expect.objectContaining({
              amount: 5000,
              currency: 'USD',
              status: 'completed',
              gateway: 'stripe',
              stripe_payment_intent_id: 'pi_test_123',
            }),
            invoice: expect.objectContaining({
              id: 123,
            }),
          }),
        });
      });
    });

    it('should handle payment intent errors', async () => {
      const user = userEvent.setup();

      mockStripe.confirmCardPayment.mockResolvedValue({
        error: {
          type: 'card_error',
          code: 'card_declined',
          decline_code: 'generic_decline',
          message: 'Your card was declined.',
        },
      });

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pay Invoice')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Pay Invoice');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'stripe',
          message: 'Your card was declined.',
          stripe_error: {
            type: 'card_error',
            code: 'card_declined',
            decline_code: 'generic_decline',
            message: 'Your card was declined.',
          },
        });
      });
    });
  });

  // ===========================
  // Error Handling Tests
  // ===========================

  describe('Error Handling', () => {
    const defaultProps = {
      config: mockBookingConfig,
      gateway: mockGateway,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
    };

    it('should handle Stripe not ready', async () => {
      const user = userEvent.setup();

      // Mock useStripe to return null
      vi.mocked(require('@stripe/react-stripe-js').useStripe).mockReturnValue(null);

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'stripe',
          message: 'Payment system not ready. Please try again.',
        });
      });

      // Restore mock
      vi.mocked(require('@stripe/react-stripe-js').useStripe).mockReturnValue(mockStripe);
    });

    it('should handle card element not found', async () => {
      const user = userEvent.setup();

      mockElements.getElement.mockReturnValue(null);

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'stripe',
          message: 'Card information not found. Please refresh and try again.',
        });
      });

      // Restore mock
      mockElements.getElement.mockReturnValue(mockCardElement);
    });

    it('should handle card element validation errors', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      // Simulate card error
      act(() => {
        mockCardElement._triggerChange({
          complete: false,
          empty: false,
          error: {
            code: 'incomplete_number',
            message: 'Your card number is incomplete.',
            type: 'validation_error',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Your card number is incomplete.')).toBeInTheDocument();
      });

      // Submit button should be disabled
      const submitButton = screen.getByText('Complete Booking');
      expect(submitButton).toBeDisabled();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      mockStripe.createPaymentMethod.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'unknown',
          message: 'Network error',
        });
      });
    });

    it('should handle missing publishable key', async () => {
      const gatewayWithoutKey = {
        ...mockGateway,
        public_config: {},
      };

      // Mock environment variable not being set
      const originalEnv = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      delete (import.meta.env as any).VITE_STRIPE_PUBLIC_KEY;

      renderWithProviders(
        <UnifiedStripePaymentFlow
          {...defaultProps}
          gateway={gatewayWithoutKey}
        />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          type: 'backend',
          message: 'Stripe publishable key not configured',
        });
      });

      // Restore environment variable
      (import.meta.env as any).VITE_STRIPE_PUBLIC_KEY = originalEnv;
    });
  });

  // ===========================
  // UI and Props Tests
  // ===========================

  describe('UI and Props', () => {
    const defaultProps = {
      config: mockBookingConfig,
      gateway: mockGateway,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
    };

    it('should show loading state during initialization', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      expect(screen.getByText('Loading payment system...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle disabled prop', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} disabled={true} />);

      await waitFor(() => {
        const submitButton = screen.getByText('Complete Booking');
        expect(submitButton).toBeDisabled();
      });
    });

    it('should handle loading prop', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} loading={true} />);

      await waitFor(() => {
        const submitButton = screen.getByText('Complete Booking');
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show cancel button when onCancel provided', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} onCancel={mockOnCancel} />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should handle cancel button click', async () => {
      const user = userEvent.setup();

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} onCancel={mockOnCancel} />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should hide security badge when showSecurityBadge is false', async () => {
      renderWithProviders(
        <UnifiedStripePaymentFlow {...defaultProps} showSecurityBadge={false} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Your payment information is encrypted and secure')).not.toBeInTheDocument();
      });
    });

    it('should hide powered by stripe when showPoweredByStripe is false', async () => {
      renderWithProviders(
        <UnifiedStripePaymentFlow {...defaultProps} showPoweredByStripe={false} />
      );

      await waitFor(() => {
        expect(screen.queryByText(/powered by.*stripe/i)).not.toBeInTheDocument();
      });
    });

    it('should show processing state during payment', async () => {
      const user = userEvent.setup();

      mockStripe.createPaymentMethod.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          paymentMethod: { id: 'pm_test', card: { last4: '4242', brand: 'visa', exp_month: 12, exp_year: 2025 } }
        }), 100))
      );

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate card being complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
        });
      });

      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Processing Booking...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      }, { timeout: 150 });
    });

    it('should apply custom card element options', async () => {
      const cardElementOptions = {
        hidePostalCode: true,
        iconStyle: 'solid' as const,
        style: {
          base: {
            fontSize: '18px',
          },
        },
      };

      renderWithProviders(
        <UnifiedStripePaymentFlow
          {...defaultProps}
          cardElementOptions={cardElementOptions}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('stripe-card-element')).toBeInTheDocument();
      });

      // Card element options would be applied to the actual Stripe element
      // In a real test environment, we'd verify these through Stripe's testing tools
    });

    it('should show debug information when debugMode enabled', async () => {
      // Mock console.log to capture debug output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderWithProviders(
        <UnifiedStripePaymentFlow {...defaultProps} debugMode={true} />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedStripePaymentFlow - Booking mode initialized')
        );
      });

      consoleSpy.mockRestore();
    });
  });

  // ===========================
  // Integration Tests
  // ===========================

  describe('Integration', () => {
    const defaultProps = {
      config: mockBookingConfig,
      gateway: mockGateway,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
    };

    it('should clear error when user starts typing valid card info', async () => {
      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      // First show an error
      act(() => {
        mockCardElement._triggerChange({
          complete: false,
          empty: false,
          error: {
            code: 'incomplete_number',
            message: 'Your card number is incomplete.',
            type: 'validation_error',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Your card number is incomplete.')).toBeInTheDocument();
      });

      // Then show card as complete (error should clear)
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
          brand: 'visa',
        });
      });

      // Error should be gone but we need to wait for any error clearing
      await waitFor(() => {
        expect(screen.queryByText('Your card number is incomplete.')).not.toBeInTheDocument();
      });
    });

    it('should handle complete payment flow end-to-end', async () => {
      const user = userEvent.setup();

      // Setup successful flow
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_123',
          card: {
            last4: '4242',
            brand: 'visa',
            exp_month: 12,
            exp_year: 2025,
          },
        },
      });

      renderWithProviders(<UnifiedStripePaymentFlow {...defaultProps} />);

      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.getByText('Complete Booking')).toBeInTheDocument();
      });

      // Simulate user entering card information
      act(() => {
        mockCardElement._triggerChange({
          complete: false,
          empty: false,
          brand: 'visa',
        });
      });

      // Then complete
      act(() => {
        mockCardElement._triggerChange({
          complete: true,
          empty: false,
          brand: 'visa',
        });
      });

      // Submit the form
      const submitButton = screen.getByText('Complete Booking');
      await user.click(submitButton);

      // Verify success
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          mode: 'booking',
          success: true,
          message: 'Booking payment method created successfully',
          bookingResult: expect.any(Object),
        });
      });
    });
  });
});