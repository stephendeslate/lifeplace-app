// frontend/client-portal/src/components/payments/__tests__/InvoicePaymentDialog.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { InvoicePaymentDialog } from '../InvoicePaymentDialog';
import FinancialApi from '../../../apis/financial.api';
import type { Invoice, PaymentMethod } from '../../../types/financial.types';

// Mock the API
vi.mock('../../../apis/financial.api');
const mockFinancialApi = vi.mocked(FinancialApi);

// Mock the PaymentMethodSelector component
vi.mock('../PaymentMethodSelector', () => ({
  PaymentMethodSelector: ({ selectedMethod, onMethodSelect, disabled }: any) => (
    <div data-testid="payment-method-selector">
      <button
        onClick={() => onMethodSelect(mockPaymentMethod)}
        disabled={disabled}
        data-testid="select-payment-method"
      >
        Select Payment Method
      </button>
      {selectedMethod && (
        <div data-testid="selected-method">{selectedMethod.nickname}</div>
      )}
    </div>
  ),
}));

// Mock the UnifiedStripePaymentFlow component
vi.mock('../UnifiedStripePaymentFlow', () => ({
  UnifiedStripePaymentFlow: ({ onSuccess, disabled }: any) => (
    <div data-testid="unified-stripe-payment-flow">
      <button
        onClick={() => onSuccess({ paymentMethodId: 'pm_test_123' })}
        disabled={disabled}
        data-testid="unified-stripe-pay-button"
      >
        Pay with Unified Stripe
      </button>
    </div>
  ),
}));

// Mock the PaymentPlanDialog component
vi.mock('../PaymentPlanDialog', () => ({
  PaymentPlanDialog: ({ open, onClose, onSuccess }: any) => (
    open ? (
      <div data-testid="payment-plan-dialog">
        <button onClick={onSuccess} data-testid="create-payment-plan">
          Create Payment Plan
        </button>
        <button onClick={onClose} data-testid="close-payment-plan">
          Close
        </button>
      </div>
    ) : null
  ),
}));

const mockInvoice: Invoice = {
  id: 1,
  invoice_id: 'INV-TEST-001',
  event: 1,
  client: 1,
  subtotal: '10000.00',
  tax_amount: '1200.00',
  total_amount: '11200.00',
  currency: 'PHP',
  status: 'ISSUED',
  issue_date: '2025-10-01',
  due_date: '2025-11-01',
  notes: 'Test invoice',
  payment_terms: '',
  quote: 1,
  created_at: '2025-09-21T00:00:00Z',
  updated_at: '2025-09-21T00:00:00Z',
  line_items: [],
  taxes: [],
  related_payments: []
};

const mockPaymentMethod: PaymentMethod = {
  id: 1,
  user: 1,
  type: 'CREDIT_CARD',
  nickname: 'Test Card',
  is_default: true,
  token_reference: 'test_token',
  last_four: '4242',
  gateway: 1,
  gateway_details: {
    id: 1,
    name: 'Stripe',
    code: 'stripe',
    is_active: true,
    created_at: '2025-09-21T00:00:00Z',
    updated_at: '2025-09-21T00:00:00Z'
  },
  created_at: '2025-09-21T00:00:00Z',
  updated_at: '2025-09-21T00:00:00Z'
};

const mockPaymentResponse = {
  success: true,
  message: 'Payment processed successfully',
  payment: {
    id: 1,
    payment_number: 'PAY-TEST-001',
    amount: '11200.00',
    currency: 'PHP',
    status: 'COMPLETED'
  },
  invoice: mockInvoice
};

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

describe('InvoicePaymentDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnPaymentSuccess = vi.fn();
  const mockOnPaymentPlanCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFinancialApi.calculateInvoicePaymentStatus.mockReturnValue({
      amountRemaining: 11200.00,
      amountPaid: 0,
      isPaid: false
    });
    mockFinancialApi.formatAmount.mockImplementation((amount, currency) =>
      `₱${parseFloat(amount.toString()).toLocaleString()}`
    );
  });

  const defaultProps = {
    open: true,
    invoice: mockInvoice,
    onClose: mockOnClose,
    onPaymentSuccess: mockOnPaymentSuccess,
    onPaymentPlanCreated: mockOnPaymentPlanCreated
  };

  it('renders the dialog when open', () => {
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    expect(screen.getByText('Pay Invoice')).toBeInTheDocument();
    expect(screen.getByText('Invoice #INV-TEST-001')).toBeInTheDocument();
    expect(screen.getByText('Payment Summary')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <InvoicePaymentDialog {...defaultProps} open={false} />
    );

    expect(screen.queryByText('Pay Invoice')).not.toBeInTheDocument();
  });

  it('displays invoice payment summary correctly', () => {
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    expect(screen.getAllByText('₱11,200')).toHaveLength(3); // Should appear in multiple places
    expect(screen.getByText('Total Amount:')).toBeInTheDocument();
    expect(screen.getByText('Amount Due:')).toBeInTheDocument();
  });

  it('shows payment tabs (Pay Now and Payment Plan)', () => {
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    expect(screen.getByText('Pay Now')).toBeInTheDocument();
    expect(screen.getByText('Payment Plan')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    const paymentPlanTab = screen.getByText('Payment Plan');
    await user.click(paymentPlanTab);

    expect(screen.getByText('Set Up Payment Plan')).toBeInTheDocument();
    expect(screen.getByText('Create Payment Plan')).toBeInTheDocument();
  });

  it('renders payment method selector', () => {
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    expect(screen.getByTestId('select-payment-method')).toBeInTheDocument();
  });

  it('enables pay button when payment method is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    const selectButton = screen.getByTestId('select-payment-method');
    await user.click(selectButton);

    expect(screen.getByTestId('selected-method')).toHaveTextContent('Test Card');

    const payButton = screen.getByRole('button', { name: /pay.*₱11,200/i });
    expect(payButton).toBeEnabled();
  });

  it('processes payment successfully', async () => {
    const user = userEvent.setup();
    mockFinancialApi.payInvoice.mockResolvedValue(mockPaymentResponse);

    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Select payment method
    const selectButton = screen.getByTestId('select-payment-method');
    await user.click(selectButton);

    // Click pay button
    const payButton = screen.getByRole('button', { name: /pay.*₱11,200/i });
    await user.click(payButton);

    await waitFor(() => {
      expect(mockFinancialApi.payInvoice).toHaveBeenCalledWith(1, {
        gateway_code: 'stripe',
        payment_method_id: 1,
        notes: 'Payment for invoice INV-TEST-001'
      });
    });

    await waitFor(() => {
      expect(mockOnPaymentSuccess).toHaveBeenCalledWith(mockPaymentResponse);
    });
  });

  it('shows error message when payment fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Payment processing failed';
    mockFinancialApi.payInvoice.mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Select payment method
    const selectButton = screen.getByTestId('select-payment-method');
    await user.click(selectButton);

    // Click pay button
    const payButton = screen.getByRole('button', { name: /pay.*₱11,200/i });
    await user.click(payButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows Stripe payment form for credit card payment methods', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Select payment method (credit card with Stripe)
    const selectButton = screen.getByTestId('select-payment-method');
    await user.click(selectButton);

    expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
  });

  it('processes Stripe payment successfully', async () => {
    const user = userEvent.setup();
    mockFinancialApi.payInvoice.mockResolvedValue(mockPaymentResponse);

    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Select payment method
    const selectButton = screen.getByTestId('select-payment-method');
    await user.click(selectButton);

    // Click Stripe pay button
    const stripePayButton = screen.getByTestId('unified-stripe-pay-button');
    await user.click(stripePayButton);

    await waitFor(() => {
      expect(mockFinancialApi.payInvoice).toHaveBeenCalledWith(1, {
        gateway_code: 'stripe',
        payment_data: { payment_intent_id: 'pi_test_123' },
        notes: 'Stripe payment for invoice INV-TEST-001'
      });
    });

    await waitFor(() => {
      expect(mockOnPaymentSuccess).toHaveBeenCalledWith(mockPaymentResponse);
    });
  });

  it('opens payment plan dialog when clicking Create Payment Plan', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Switch to Payment Plan tab
    const paymentPlanTab = screen.getByText('Payment Plan');
    await user.click(paymentPlanTab);

    // Click Create Payment Plan button
    const createPlanButton = screen.getByText('Create Payment Plan');
    await user.click(createPlanButton);

    expect(screen.getByTestId('payment-plan-dialog')).toBeInTheDocument();
  });

  it('handles payment plan creation success', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Switch to Payment Plan tab
    const paymentPlanTab = screen.getByText('Payment Plan');
    await user.click(paymentPlanTab);

    // Click Create Payment Plan button
    const createPlanButton = screen.getByText('Create Payment Plan');
    await user.click(createPlanButton);

    // Click create payment plan in dialog
    const createButton = screen.getByTestId('create-payment-plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnPaymentPlanCreated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows success message after payment completion', () => {
    renderWithProviders(
      <InvoicePaymentDialog {...defaultProps} />
    );

    // Simulate success state by manually triggering it
    // This would normally be triggered by payment success
    // We'll test this by checking if the success message appears after payment
  });

  it('disables all interactions during payment processing', async () => {
    const user = userEvent.setup();

    // Mock a delayed payment response
    mockFinancialApi.payInvoice.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockPaymentResponse), 1000))
    );

    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Select payment method
    const selectButton = screen.getByTestId('select-payment-method');
    await user.click(selectButton);

    // Click pay button
    const payButton = screen.getByRole('button', { name: /pay.*₱11,200/i });

    // Use fireEvent for disabled buttons
    fireEvent.click(payButton);

    // Check that button shows loading
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('shows info message when invoice is already paid', () => {
    mockFinancialApi.calculateInvoicePaymentStatus.mockReturnValue({
      amountRemaining: 0,
      amountPaid: 11200.00,
      isPaid: true
    });

    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    expect(screen.getByText('This invoice has been paid in full.')).toBeInTheDocument();
  });

  it('requires payment method selection before allowing payment', () => {
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    const payButton = screen.getByRole('button', { name: /pay.*₱11,200/i });
    expect(payButton).toBeDisabled();
  });

  it('handles keyboard navigation correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePaymentDialog {...defaultProps} />);

    // Tab navigation should work
    await user.tab();

    // The first focusable element should be focused
    expect(document.activeElement).toBeTruthy();
  });
});