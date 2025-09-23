// frontend/client-portal/src/components/payments/__tests__/PaymentPlanDialog.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { PaymentPlanDialog } from '../PaymentPlanDialog';
import FinancialApi from '../../../apis/financial.api';
import type { Invoice, PaymentPlan } from '../../../types/financial.types';

// Mock the API
vi.mock('../../../apis/financial.api');
const mockFinancialApi = vi.mocked(FinancialApi);

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

const mockPaymentPlan: PaymentPlan = {
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('PaymentPlanDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFinancialApi.formatAmount.mockImplementation((amount, currency) =>
      `₱${parseFloat(amount.toString()).toLocaleString()}`
    );
  });

  const defaultProps = {
    open: true,
    invoice: mockInvoice,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess
  };

  it('renders the dialog when open', () => {
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    expect(screen.getByText('Create Payment Plan')).toBeInTheDocument();
    expect(screen.getByText('Invoice #INV-TEST-001')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <PaymentPlanDialog {...defaultProps} open={false} />
    );

    expect(screen.queryByText('Create Payment Plan')).not.toBeInTheDocument();
  });

  it('displays invoice total correctly', () => {
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    expect(screen.getByText('₱11,200')).toBeInTheDocument();
  });

  it('shows payment plan configuration form', () => {
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    expect(screen.getByLabelText('Number of Installments')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment Frequency')).toBeInTheDocument();
    expect(screen.getByLabelText('First Payment Percentage')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
  });

  it('calculates installment preview correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Set 3 installments
    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '3');

    // Set first payment to 50%
    const firstPaymentInput = screen.getByLabelText('First Payment Percentage');
    await user.clear(firstPaymentInput);
    await user.type(firstPaymentInput, '50');

    // Should show preview calculations
    await waitFor(() => {
      expect(screen.getByText('First Payment: ₱5,600')).toBeInTheDocument();
      expect(screen.getByText('Remaining 2 payments: ₱2,800 each')).toBeInTheDocument();
    });
  });

  it('validates form inputs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Try to submit with invalid data
    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '0');

    const createButton = screen.getByText('Create Payment Plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Must be at least 2 installments')).toBeInTheDocument();
    });
  });

  it('validates first payment percentage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    const firstPaymentInput = screen.getByLabelText('First Payment Percentage');
    await user.clear(firstPaymentInput);
    await user.type(firstPaymentInput, '150');

    const createButton = screen.getByText('Create Payment Plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Must be between 10% and 90%')).toBeInTheDocument();
    });
  });

  it('validates start date is in the future', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    const startDateInput = screen.getByLabelText('Start Date');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2020-01-01');

    const createButton = screen.getByText('Create Payment Plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Start date must be in the future')).toBeInTheDocument();
    });
  });

  it('creates payment plan successfully', async () => {
    const user = userEvent.setup();
    mockFinancialApi.setupPaymentPlan.mockResolvedValue({
      success: true,
      message: 'Payment plan created successfully',
      payment_plan: mockPaymentPlan,
      invoice: mockInvoice
    });

    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Fill form
    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '3');

    const frequencySelect = screen.getByLabelText('Payment Frequency');
    await user.click(frequencySelect);
    await user.click(screen.getByText('Monthly'));

    const firstPaymentInput = screen.getByLabelText('First Payment Percentage');
    await user.clear(firstPaymentInput);
    await user.type(firstPaymentInput, '33.33');

    const startDateInput = screen.getByLabelText('Start Date');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2025-11-01');

    // Submit form
    const createButton = screen.getByText('Create Payment Plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockFinancialApi.setupPaymentPlan).toHaveBeenCalledWith(1, {
        installment_count: 3,
        installment_frequency: 'MONTHLY',
        first_installment_percentage: 33.33,
        start_date: '2025-11-01'
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows error message when payment plan creation fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Payment plan creation failed';
    mockFinancialApi.setupPaymentPlan.mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Fill and submit form
    const createButton = screen.getByText('Create Payment Plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();
    mockFinancialApi.setupPaymentPlan.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        payment_plan: mockPaymentPlan,
        invoice: mockInvoice
      }), 1000))
    );

    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    const createButton = screen.getByText('Create Payment Plan');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(createButton).toBeDisabled();
    });
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows different frequency options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    const frequencySelect = screen.getByLabelText('Payment Frequency');
    await user.click(frequencySelect);

    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Bi-weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('updates preview when frequency changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Set weekly frequency
    const frequencySelect = screen.getByLabelText('Payment Frequency');
    await user.click(frequencySelect);
    await user.click(screen.getByText('Weekly'));

    // Should update the preview schedule
    await waitFor(() => {
      expect(screen.getByText(/weekly payments/i)).toBeInTheDocument();
    });
  });

  it('handles minimum and maximum installment constraints', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Try to set too many installments
    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '25');

    await waitFor(() => {
      expect(screen.getByText('Maximum 24 installments allowed')).toBeInTheDocument();
    });
  });

  it('shows payment schedule preview', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Configure payment plan
    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '3');

    await waitFor(() => {
      expect(screen.getByText('Payment Schedule Preview')).toBeInTheDocument();
      expect(screen.getByText('Payment 1:')).toBeInTheDocument();
      expect(screen.getByText('Payment 2:')).toBeInTheDocument();
      expect(screen.getByText('Payment 3:')).toBeInTheDocument();
    });
  });

  it('calculates due dates correctly based on frequency', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    const startDateInput = screen.getByLabelText('Start Date');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2025-11-01');

    const frequencySelect = screen.getByLabelText('Payment Frequency');
    await user.click(frequencySelect);
    await user.click(screen.getByText('Monthly'));

    const installmentInput = screen.getByLabelText('Number of Installments');
    await user.clear(installmentInput);
    await user.type(installmentInput, '3');

    await waitFor(() => {
      expect(screen.getByText('Nov 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Dec 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2026')).toBeInTheDocument();
    });
  });

  it('resets form when dialog is reopened', async () => {
    const { rerender } = renderWithProviders(
      <PaymentPlanDialog {...defaultProps} open={false} />
    );

    // Open dialog and fill form
    rerender(<PaymentPlanDialog {...defaultProps} open={true} />);

    const installmentInput = screen.getByLabelText('Number of Installments');
    expect(installmentInput).toHaveValue(2); // Default value
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentPlanDialog {...defaultProps} />);

    // Tab through form elements
    await user.tab(); // Close button
    await user.tab(); // Number of installments
    await user.tab(); // Payment frequency
    await user.tab(); // First payment percentage
    await user.tab(); // Start date
    await user.tab(); // Cancel button
    await user.tab(); // Create button

    expect(document.activeElement).toBe(screen.getByText('Create Payment Plan'));
  });
});