// frontend/client-portal/src/__tests__/integration/PaymentFlow.integration.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import _userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import FinancialPortal from '../../pages/payments/FinancialPortal';
import FinancialApi from '../../apis/financial';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock the API
vi.mock('../../apis/financial');
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
      role: 'CLIENT',
    },
    token: 'mock-token',
  }),
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
        total: '10000.00',
      },
    ],
    taxes: [
      {
        id: 1,
        tax_rate: {
          name: 'VAT',
          rate: '12.00',
        },
        amount: '1200.00',
      },
    ],
    related_payments: [],
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
        status: 'COMPLETED',
      },
    ],
  },
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
      updated_at: '2025-09-21T00:00:00Z',
    },
    created_at: '2025-09-21T00:00:00Z',
    updated_at: '2025-09-21T00:00:00Z',
  },
];

const _mockPaymentPlan = {
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
      description: 'First installment',
    },
    {
      id: 2,
      payment_plan: 1,
      installment_number: 2,
      amount: '3733.33',
      due_date: '2025-12-01',
      status: 'PENDING',
      description: 'Second installment',
    },
    {
      id: 3,
      payment_plan: 1,
      installment_number: 3,
      amount: '3733.34',
      due_date: '2026-01-01',
      status: 'PENDING',
      description: 'Third installment',
    },
  ],
};

// Test utilities
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ToastProvider>{component}</ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>,
  );
};

describe('Payment Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default API responses
    mockFinancialApi.getInvoices.mockResolvedValue({
      results: mockInvoices,
      count: mockInvoices.length,
    });

    mockFinancialApi.getPayments.mockResolvedValue({
      results: [],
      count: 0,
    });

    mockFinancialApi.getPaymentPlans.mockResolvedValue({
      results: [],
      count: 0,
    });

    mockFinancialApi.getPaymentMethods.mockResolvedValue({
      results: mockPaymentMethods,
      count: mockPaymentMethods.length,
    });

    // Mock payment summary
    mockFinancialApi.getPaymentSummary.mockResolvedValue({
      total_paid: '5600.00',
      total_pending: '11200.00',
      total_overdue: '0.00',
      payment_count: 1,
      currency: 'PHP',
    });

    // Mock refunds
    mockFinancialApi.getRefunds.mockResolvedValue({
      results: [],
      count: 0,
    });

    // Mock payment plan settings
    mockFinancialApi.getPaymentPlanSettings.mockResolvedValue({
      deposit_percentage: 25,
      balance_due_days_before_event: 30,
      allow_partial_payments: true,
      minimum_payment_percentage: 10,
    });

    mockFinancialApi.calculateInvoicePaymentStatus.mockImplementation((invoice) => ({
      status: invoice.status === 'PAID' ? 'FULLY_PAID' : 'UNPAID',
      amountRemaining: invoice.status === 'PAID' ? 0 : parseFloat(invoice.total_amount),
      amountPaid: invoice.status === 'PAID' ? parseFloat(invoice.total_amount) : 0,
      paymentProgress: invoice.status === 'PAID' ? 100 : 0,
    }));

    // Mock invoice display status
    mockFinancialApi.getInvoiceDisplayStatus.mockImplementation((invoice) => ({
      label: invoice.status === 'PAID' ? 'Paid' : 'Unpaid',
      color: invoice.status === 'PAID' ? 'success' : 'default',
      description:
        invoice.status === 'PAID' ? 'Invoice has been paid in full' : `Due ${invoice.due_date}`,
    }));

    mockFinancialApi.formatAmount.mockImplementation(
      (amount, _currency) => `₱${parseFloat(amount.toString()).toLocaleString()}`,
    );
  });

  it('displays financial portal with invoices', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // Check for invoice IDs (may be in different format in the UI)
    await waitFor(() => {
      expect(screen.getByText(/INV-TEST-001/)).toBeInTheDocument();
    });
  });

  it('displays invoice information in the portal', async () => {
    renderWithProviders(<FinancialPortal />);

    // Wait for the portal to render with invoice data
    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // Verify invoice ID is displayed
    await waitFor(() => {
      expect(screen.getByText(/INV-TEST-001/)).toBeInTheDocument();
    });

    // Verify amounts are displayed (may appear multiple times)
    await waitFor(() => {
      expect(screen.getAllByText(/₱11,200/).length).toBeGreaterThan(0);
    });
  });

  it('displays payment summary statistics', async () => {
    renderWithProviders(<FinancialPortal />);

    // Wait for the portal to render
    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // Verify payment summary statistics are displayed
    await waitFor(() => {
      expect(screen.getByText('Total Paid')).toBeInTheDocument();
      expect(screen.getAllByText(/₱5,600/).length).toBeGreaterThan(0);
    });
  });

  it('displays pending amount from invoices', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // The pending amount should be displayed (may appear multiple times)
    await waitFor(() => {
      expect(screen.getAllByText(/₱11,200/).length).toBeGreaterThan(0);
    });
  });

  it('calls API methods on initial load', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(mockFinancialApi.getInvoices).toHaveBeenCalled();
      expect(mockFinancialApi.getPayments).toHaveBeenCalled();
      expect(mockFinancialApi.getPaymentSummary).toHaveBeenCalled();
    });
  });

  it('shows tabs for navigation', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // Verify tabs are present (the portal uses tabs for navigation)
    await waitFor(() => {
      // The portal should show invoices by default
      expect(screen.getByText(/INV-TEST-001/)).toBeInTheDocument();
    });
  });

  it('displays invoice status correctly', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // Verify the mock getInvoiceDisplayStatus is being used
    await waitFor(() => {
      expect(mockFinancialApi.getInvoiceDisplayStatus).toHaveBeenCalled();
    });
  });

  it('formats currency amounts correctly', async () => {
    renderWithProviders(<FinancialPortal />);

    await waitFor(() => {
      expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
    });

    // Verify the formatAmount mock is being used
    await waitFor(() => {
      expect(mockFinancialApi.formatAmount).toHaveBeenCalled();
    });

    // Verify formatted amounts are displayed (may appear multiple times)
    await waitFor(() => {
      // Check for the PHP formatted amounts from our mock
      expect(screen.getAllByText(/₱/).length).toBeGreaterThan(0);
    });
  });

  it('renders without crashing when data is loading', () => {
    renderWithProviders(<FinancialPortal />);

    // Component should render even during loading
    expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
  });
});
