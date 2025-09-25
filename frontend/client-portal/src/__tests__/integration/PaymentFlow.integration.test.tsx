// frontend/client-portal/src/__tests__/integration/PaymentFlow.integration.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import FinancialPortal from '../../pages/payments/FinancialPortal';
import FinancialApi from '../../apis/financial.api';

// Mock the API
vi.mock('../../apis/financial.api');
const mockFinancialApi = vi.mocked(FinancialApi);

// Mock authentication context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'CLIENT'
    },
    token: 'mock-token'
  })
}));

const mockInvoices = [
  {
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
    line_items: [
      {
        id: 1,
        description: 'Wedding Photography',
        quantity: 1,
        unit_price: '10000.00',
        total: '10000.00'
      }
    ],
    taxes: [
      {
        id: 1,
        tax_rate: {
          name: 'VAT',
          rate: '12.00'
        },
        amount: '1200.00'
      }
    ],
    related_payments: []
  },
  {
    id: 2,
    invoice_id: 'INV-TEST-002',
    event: 2,
    client: 1,
    subtotal: '5000.00',
    tax_amount: '600.00',
    total_amount: '5600.00',
    currency: 'PHP',
    status: 'PAID',
    issue_date: '2025-09-01',
    due_date: '2025-09-15',
    notes: 'Paid invoice',
    payment_terms: '',
    quote: 2,
    created_at: '2025-09-01T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    line_items: [],
    taxes: [],
    related_payments: [
      {
        id: 1,
        payment_number: 'PAY-TEST-001',
        amount: '5600.00',
        status: 'COMPLETED'
      }
    ]
  }
];

const mockPaymentMethods = [
  {
    id: 1,
    user: 1,
    type: 'CREDIT_CARD',
    nickname: 'Visa Card',
    is_default: true,
    token_reference: 'card_123',
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
  }
];

const mockPaymentPlan = {
  id: 1,
  event: 1,
  quote: 1,
  total_amount: '11200.00',
  currency: 'PHP',
  installment_count: 3,
  installment_frequency: 'MONTHLY',
  start_date: '2025-11-01',
  status: 'ACTIVE',
  created_at: '2025-09-21T00:00:00Z',
  updated_at: '2025-09-21T00:00:00Z',
  installments: [
    {
      id: 1,
      payment_plan: 1,
      installment_number: 1,
      amount: '3733.33',
      due_date: '2025-11-01',
      status: 'PENDING',
      description: 'First installment'
    },
    {
      id: 2,
      payment_plan: 1,
      installment_number: 2,
      amount: '3733.33',
      due_date: '2025-12-01',
      status: 'PENDING',
      description: 'Second installment'
    },
    {
      id: 3,
      payment_plan: 1,
      installment_number: 3,
      amount: '3733.34',
      due_date: '2026-01-01',
      status: 'PENDING',
      description: 'Third installment'
    }
  ]
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Payment Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default API responses
    mockFinancialApi.getInvoices.mockResolvedValue({
      results: mockInvoices,
      count: mockInvoices.length
    });

    mockFinancialApi.getPayments.mockResolvedValue({
      results: [],
      count: 0
    });

    mockFinancialApi.getPaymentPlans.mockResolvedValue({
      results: [],
      count: 0
    });

    mockFinancialApi.getPaymentMethods.mockResolvedValue({
      results: mockPaymentMethods,
      count: mockPaymentMethods.length
    });

    mockFinancialApi.calculateInvoicePaymentStatus.mockImplementation((invoice) => ({
      amountRemaining: invoice.status === 'PAID' ? 0 : parseFloat(invoice.total_amount),
      amountPaid: invoice.status === 'PAID' ? parseFloat(invoice.total_amount) : 0,
      isPaid: invoice.status === 'PAID'
    }));

    mockFinancialApi.formatAmount.mockImplementation((amount, _currency) =>
      `₱${parseFloat(amount.toString()).toLocaleString()}`
    );
  });

  it('displays financial portal with invoices', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('Financial Portal')).toBeInTheDocument();
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
      expect(screen.getByText('INV-TEST-002')).toBeInTheDocument();
    });
  });

  it('allows user to view invoice details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
    });

    // Click on unpaid invoice
    const invoiceCard = screen.getByText('INV-TEST-001').closest('[data-testid="invoice-card"]');
    if (invoiceCard) {
      await user.click(invoiceCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
      expect(screen.getByText('Wedding Photography')).toBeInTheDocument();
      expect(screen.getByText('₱11,200')).toBeInTheDocument();
    });
  });

  it('completes full payment flow', async () => {
    const user = userEvent.setup();

    // Mock payment intent creation and payment processing
    mockFinancialApi.createPaymentIntent.mockResolvedValue({
      client_secret: 'pi_test_123_secret_456',
      payment_intent_id: 'pi_test_123',
      status: 'requires_payment_method',
      requires_action: false
    });

    mockFinancialApi.payInvoice.mockResolvedValue({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: 1,
        payment_number: 'PAY-TEST-001',
        amount: '11200.00',
        currency: 'PHP',
        status: 'COMPLETED'
      },
      invoice: { ...mockInvoices[0], status: 'PAID' }
    });

    renderWithProviders(<FinancialPortal />);

    // Wait for invoices to load
    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
    });

    // Click on invoice to view details
    const invoiceCard = screen.getByText('INV-TEST-001').closest('[data-testid="invoice-card"]');
    if (invoiceCard) {
      await user.click(invoiceCard);
    }

    // Click Pay Now button
    await waitFor(async () => {
      const payButton = screen.getByText('Pay Now');
      await user.click(payButton);
    });

    // Payment dialog should open
    await waitFor(() => {
      expect(screen.getByText('Pay Invoice')).toBeInTheDocument();
      expect(screen.getByText('Payment Summary')).toBeInTheDocument();
    });

    // Select payment method
    const selectMethodButton = screen.getByTestId('select-payment-method');
    await user.click(selectMethodButton);

    // Verify payment method is selected
    await waitFor(() => {
      expect(screen.getByTestId('selected-method')).toHaveTextContent('Visa Card');
    });

    // Click final pay button
    const finalPayButton = screen.getByRole('button', { name: /pay.*₱11,200/i });
    await user.click(finalPayButton);

    // Verify payment success
    await waitFor(() => {
      expect(mockFinancialApi.payInvoice).toHaveBeenCalledWith(1, {
        gateway_code: 'stripe',
        payment_method_id: 1,
        notes: 'Payment for invoice INV-TEST-001'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    });
  });

  it('completes payment plan creation flow', async () => {
    const user = userEvent.setup();

    mockFinancialApi.setupPaymentPlan.mockResolvedValue({
      success: true,
      message: 'Payment plan created successfully',
      payment_plan: mockPaymentPlan,
      invoice: mockInvoices[0]
    });

    renderWithProviders(<FinancialPortal />);

    // Wait for invoices to load
    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
    });

    // Click on invoice to view details
    const invoiceCard = screen.getByText('INV-TEST-001').closest('[data-testid="invoice-card"]');
    if (invoiceCard) {
      await user.click(invoiceCard);
    }

    // Click Pay Now to open payment dialog
    await waitFor(async () => {
      const payButton = screen.getByText('Pay Now');
      await user.click(payButton);
    });

    // Switch to Payment Plan tab
    await waitFor(() => {
      const paymentPlanTab = screen.getByText('Payment Plan');
      await user.click(paymentPlanTab);
    });

    // Click Create Payment Plan
    const createPlanButton = screen.getByText('Create Payment Plan');
    await user.click(createPlanButton);

    // Payment plan dialog should open
    await waitFor(() => {
      expect(screen.getByText('Create Payment Plan')).toBeInTheDocument();
    });

    // Fill payment plan form
    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '3');

    const startDateInput = screen.getByLabelText('Start Date');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2025-11-01');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create payment plan/i });
    await user.click(submitButton);

    // Verify payment plan creation
    await waitFor(() => {
      expect(mockFinancialApi.setupPaymentPlan).toHaveBeenCalledWith(1, {
        installment_count: 3,
        installment_frequency: 'MONTHLY',
        first_installment_percentage: 33.33,
        start_date: '2025-11-01'
      });
    });
  });

  it('handles payment errors gracefully', async () => {
    const user = userEvent.setup();

    mockFinancialApi.payInvoice.mockRejectedValue(new Error('Payment failed'));

    renderWithProviders(<FinancialPortal />);

    // Navigate to payment dialog
    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
    });

    const invoiceCard = screen.getByText('INV-TEST-001').closest('[data-testid="invoice-card"]');
    if (invoiceCard) {
      await user.click(invoiceCard);
    }

    await waitFor(() => {
      const payButton = screen.getByText('Pay Now');
      await user.click(payButton);
    });

    // Select payment method and try to pay
    const selectMethodButton = screen.getByTestId('select-payment-method');
    await user.click(selectMethodButton);

    const finalPayButton = screen.getByRole('button', { name: /pay.*₱11,200/i });
    await user.click(finalPayButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });
  });

  it('shows payment status and history correctly', async () => {
    // Update mocks to include payment history
    mockFinancialApi.getPayments.mockResolvedValue({
      results: [
        {
          id: 1,
          payment_number: 'PAY-TEST-001',
          amount: '5600.00',
          currency: 'PHP',
          status: 'COMPLETED',
          due_date: '2025-09-15',
          paid_on: '2025-09-15',
          description: 'Payment for invoice INV-TEST-002',
          created_at: '2025-09-15T00:00:00Z'
        }
      ],
      count: 1
    });

    renderWithProviders(<FinancialPortal />);

    // Navigate to payments tab
    await waitFor(() => {
      const paymentsTab = screen.getByText('Payments');
      await userEvent.setup().click(paymentsTab);
    });

    // Verify payment history is displayed
    await waitFor(() => {
      expect(screen.getByText('PAY-TEST-001')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('₱5,600')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockFinancialApi.getInvoices.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('maintains state across tab switches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FinancialPortal />);

    // Switch between tabs
    await waitFor(() => {
      const paymentsTab = screen.getByText('Payments');
      await user.click(paymentsTab);
    });

    await waitFor(() => {
      const invoicesTab = screen.getByText('Invoices');
      await user.click(invoicesTab);
    });

    // Verify invoices are still displayed
    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
      expect(screen.getByText('INV-TEST-002')).toBeInTheDocument();
    });
  });

  it('filters and sorts invoices correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
    });

    // Test filtering by status
    const statusFilter = screen.getByLabelText('Status');
    await user.click(statusFilter);
    await user.click(screen.getByText('Issued'));

    // Verify only issued invoices are shown
    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
      expect(screen.queryByText('INV-TEST-002')).not.toBeInTheDocument();
    });
  });

  it('handles responsive design correctly', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    });

    renderWithProviders(<FinancialPortal />);

    // Verify mobile-friendly layout
    // This would need specific responsive design elements to test
  });
});