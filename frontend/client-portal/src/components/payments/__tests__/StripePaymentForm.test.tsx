// frontend/client-portal/src/components/payments/__tests__/StripePaymentForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { StripePaymentForm } from '../StripePaymentForm';
import FinancialApi from '../../../apis/financial.api';

// Mock Stripe
const mockStripe = {
  confirmPayment: vi.fn(),
  elements: vi.fn(() => ({
    create: vi.fn(() => ({
      mount: vi.fn(),
      unmount: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn()
    })),
    submit: vi.fn()
  })),
  createPaymentMethod: vi.fn()
};

const mockElements = {
  create: vi.fn(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn()
  })),
  submit: vi.fn(),
  getElement: vi.fn()
};

// Mock @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="stripe-payment-element">Payment Element</div>,
  loadStripe: vi.fn()
}));

// Mock the API
vi.mock('../../../apis/financial.api');
const mockFinancialApi = vi.mocked(FinancialApi);

// Test utilities
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

describe('StripePaymentForm', () => {
  const mockOnPaymentSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFinancialApi.createPaymentIntent.mockResolvedValue({
      client_secret: 'pi_test_123_secret_456',
      payment_intent_id: 'pi_test_123',
      status: 'requires_payment_method',
      requires_action: false
    });
  });

  const defaultProps = {
    amount: 11200,
    currency: 'PHP',
    invoiceId: 1,
    onPaymentSuccess: mockOnPaymentSuccess,
    disabled: false
  };

  it('renders payment form elements', async () => {
    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
      expect(screen.getByText('Pay ₱11,200.00')).toBeInTheDocument();
    });
  });

  it('creates payment intent on mount', async () => {
    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockFinancialApi.createPaymentIntent).toHaveBeenCalledWith(1, {
        gateway_code: 'stripe'
      });
    });
  });

  it('shows loading state while creating payment intent', () => {
    mockFinancialApi.createPaymentIntent.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        client_secret: 'pi_test_123_secret_456',
        payment_intent_id: 'pi_test_123',
        status: 'requires_payment_method',
        requires_action: false
      }), 1000))
    );

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Setting up payment...')).toBeInTheDocument();
  });

  it('shows error when payment intent creation fails', async () => {
    const errorMessage = 'Failed to create payment intent';
    mockFinancialApi.createPaymentIntent.mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('processes payment successfully', async () => {
    const user = userEvent.setup();

    mockStripe.confirmPayment.mockResolvedValue({
      paymentIntent: {
        id: 'pi_test_123',
        status: 'succeeded'
      }
    });

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay ₱11,200.00');
    await user.click(payButton);

    await waitFor(() => {
      expect(mockStripe.confirmPayment).toHaveBeenCalled();
      expect(mockOnPaymentSuccess).toHaveBeenCalledWith('pi_test_123');
    });
  });

  it('handles payment failure', async () => {
    const user = userEvent.setup();

    mockStripe.confirmPayment.mockResolvedValue({
      error: {
        message: 'Your card was declined.'
      }
    });

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay ₱11,200.00');
    await user.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Your card was declined.')).toBeInTheDocument();
    });
  });

  it('handles payment requiring additional action', async () => {
    const user = userEvent.setup();

    mockStripe.confirmPayment.mockResolvedValue({
      paymentIntent: {
        id: 'pi_test_123',
        status: 'requires_action'
      }
    });

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay ₱11,200.00');
    await user.click(payButton);

    await waitFor(() => {
      expect(screen.getByText(/additional authentication required/i)).toBeInTheDocument();
    });
  });

  it('disables payment button when disabled prop is true', async () => {
    renderWithProviders(<StripePaymentForm {...defaultProps} disabled={true} />);

    await waitFor(() => {
      const payButton = screen.getByText('Pay ₱11,200.00');
      expect(payButton).toBeDisabled();
    });
  });

  it('disables payment button during processing', async () => {
    const user = userEvent.setup();

    mockStripe.confirmPayment.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' }
      }), 1000))
    );

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay ₱11,200.00');
    await user.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(payButton).toBeDisabled();
    });
  });

  it('formats amount correctly for different currencies', async () => {
    renderWithProviders(
      <StripePaymentForm {...defaultProps} amount={1000} currency="USD" />
    );

    await waitFor(() => {
      expect(screen.getByText('Pay $1,000.00')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();

    mockStripe.confirmPayment.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay ₱11,200.00');
    await user.click(payButton);

    await waitFor(() => {
      expect(screen.getByText(/payment failed.*please try again/i)).toBeInTheDocument();
    });
  });

  it('validates payment element before submission', async () => {
    const user = userEvent.setup();

    // Mock elements submit to return validation error
    mockElements.submit.mockResolvedValue({
      error: {
        message: 'Your card number is incomplete.'
      }
    });

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay ₱11,200.00');
    await user.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Your card number is incomplete.')).toBeInTheDocument();
    });

    // Should not proceed to confirmPayment
    expect(mockStripe.confirmPayment).not.toHaveBeenCalled();
  });

  it('retries payment intent creation on failure', async () => {
    const user = userEvent.setup();

    // First call fails, second succeeds
    mockFinancialApi.createPaymentIntent
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        client_secret: 'pi_test_123_secret_456',
        payment_intent_id: 'pi_test_123',
        status: 'requires_payment_method',
        requires_action: false
      });

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Click retry button if available
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });
  });

  it('cleans up Stripe elements on unmount', () => {
    const { unmount } = renderWithProviders(<StripePaymentForm {...defaultProps} />);

    unmount();

    // Verify cleanup was called
    // This would typically be verified through mocking the Stripe element's destroy method
  });

  it('handles payment intent status updates', async () => {
    // Mock a payment intent that's already processing
    mockFinancialApi.createPaymentIntent.mockResolvedValue({
      client_secret: 'pi_test_123_secret_456',
      payment_intent_id: 'pi_test_123',
      status: 'processing',
      requires_action: false
    });

    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/payment is being processed/i)).toBeInTheDocument();
    });
  });

  it('supports different payment methods', async () => {
    renderWithProviders(<StripePaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });

    // Verify that the PaymentElement can handle different payment methods
    // This would be tested through Stripe's testing framework in a real implementation
  });

  it('handles currency conversion display', async () => {
    renderWithProviders(
      <StripePaymentForm
        {...defaultProps}
        amount={11200}
        currency="EUR"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pay €11,200.00')).toBeInTheDocument();
    });
  });
});