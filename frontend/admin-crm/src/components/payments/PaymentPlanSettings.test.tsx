// frontend/admin-crm/src/components/payments/PaymentPlanSettings.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { PaymentPlanSettings } from './PaymentPlanSettings';
import * as usePaymentsHooks from '../../hooks/usePayments';
import type { PaymentSettings } from '../../types/payments.types';

// Mock the hooks
vi.mock('../../hooks/usePayments', () => ({
  usePaymentSettings: vi.fn(),
  useUpdatePaymentSettings: vi.fn(),
}));

// Mock the design system imports
vi.mock('../../design-system', () => ({
  tokens: {
    color: {
      primary: {
        300: '#93c5fd',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      },
      secondary: {
        500: '#8b5cf6',
        600: '#7c3aed',
      },
      success: {
        500: '#10b981',
        600: '#059669',
      },
      warning: {
        500: '#f59e0b',
        600: '#d97706',
      },
      info: {
        500: '#06b6d4',
        600: '#0891b2',
      },
      error: {
        500: '#ef4444',
        600: '#dc2626',
      },
      neutral: {
        300: '#d1d5db',
        500: '#6b7280',
        600: '#4b5563',
        800: '#1f2937',
      },
      borders: {
        glass: 'rgba(255, 255, 255, 0.2)',
      },
    },
    spacing: {
      radius: {
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
    },
  },
}));

vi.mock('../../design-system/utils/glassmorphism', () => ({
  glassPresets: {
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
    },
  },
}));

vi.mock('../../design-system/utils/animations', () => ({
  createTransition: vi.fn(() => 'all 0.2s ease'),
}));

// Mock the ModernCard component
vi.mock('../common/ModernCard', () => ({
  ModernCard: ({ children, title, ...props }: { children?: React.ReactNode; title?: string; [key: string]: unknown }) => (
    <div data-testid="modern-card" {...props}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
}));

// Mock the payment types
vi.mock('../../types/payments.types', async () => {
  const actual = await vi.importActual('../../types/payments.types');
  return {
    ...actual,
    PAYMENT_FREQUENCIES: [
      { value: 'WEEKLY', label: 'Weekly' },
      { value: 'BIWEEKLY', label: 'Bi-weekly' },
      { value: 'MONTHLY', label: 'Monthly' },
    ],
  };
});

const mockPaymentSettings: PaymentSettings = {
  id: 1,
  balance_due_days: 30,
  grace_period_days: 7,
  default_installments: 2,
  default_installment_frequency: 'MONTHLY',
  late_fee_enabled: true,
  default_late_fee_amount: 25.00,
  default_deposit_percentage: 50.00,
  default_currency: 'PHP',
  auto_payment_retry_attempts: 3,
  auto_payment_retry_delay_days: 2,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const theme = createTheme();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
};

describe('PaymentPlanSettings', () => {
  const mockUpdateSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(usePaymentsHooks.usePaymentSettings).mockReturnValue({
      data: mockPaymentSettings,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(usePaymentsHooks.useUpdatePaymentSettings).mockReturnValue({
      mutate: mockUpdateSettings,
      isPending: false,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the payment plan settings form', () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      expect(screen.getByText('Payment Plan Configuration')).toBeInTheDocument();
      expect(screen.getByText('Balance Due Settings')).toBeInTheDocument();
      expect(screen.getByText('Grace Period & Late Fees')).toBeInTheDocument();
      expect(screen.getByText('Default Installment Settings')).toBeInTheDocument();
      expect(screen.getByText('Deposit Settings')).toBeInTheDocument();
      expect(screen.getByText('Currency Settings')).toBeInTheDocument();
      expect(screen.getByText('Auto Payment Settings')).toBeInTheDocument();
    });

    it('displays loading state when settings are loading', () => {
      vi.mocked(usePaymentsHooks.usePaymentSettings).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Form should still render but button should be disabled
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      expect(saveButton).toBeDisabled();
    });

    it('displays all form fields with correct labels', () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      expect(screen.getByLabelText(/days after event when balance is due/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/grace period days/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/default number of installments/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/default installment frequency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enable late fees/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/default deposit percentage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/default currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auto payment retry attempts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/retry delay/i)).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('populates form fields with loaded payment settings', async () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/days after event when balance is due/i)).toHaveValue(30);
        expect(screen.getByLabelText(/grace period days/i)).toHaveValue(7);
        expect(screen.getByLabelText(/default number of installments/i)).toHaveValue(2);
        expect(screen.getByLabelText(/default late fee amount/i)).toHaveValue(25);
        expect(screen.getByLabelText(/default deposit percentage/i)).toHaveValue(50);
        expect(screen.getByLabelText(/auto payment retry attempts/i)).toHaveValue(3);
      });
    });

    it('shows late fee field when late fees are enabled', async () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      await waitFor(() => {
        const lateFeeToggle = screen.getByLabelText(/enable late fees/i);
        expect(lateFeeToggle).toBeChecked();
        expect(screen.getByLabelText(/default late fee amount/i)).toBeInTheDocument();
      });
    });

    it('hides late fee field when late fees are disabled', async () => {
      const settingsWithoutLateFees = { ...mockPaymentSettings, late_fee_enabled: false };
      vi.mocked(usePaymentsHooks.usePaymentSettings).mockReturnValue({
        data: settingsWithoutLateFees,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      await waitFor(() => {
        const lateFeeToggle = screen.getByLabelText(/enable late fees/i);
        expect(lateFeeToggle).not.toBeChecked();
        expect(screen.queryByLabelText(/default late fee amount/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('enables save button when form is dirty', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      expect(saveButton).toBeDisabled();

      // Make form dirty by changing a value
      const balanceDueDaysField = screen.getByLabelText(/days after event when balance is due/i);
      await user.clear(balanceDueDaysField);
      await user.type(balanceDueDaysField, '45');

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('toggles late fee field visibility when switch is toggled', async () => {
      const user = userEvent.setup();
      const settingsWithoutLateFees = { ...mockPaymentSettings, late_fee_enabled: false };
      vi.mocked(usePaymentsHooks.usePaymentSettings).mockReturnValue({
        data: settingsWithoutLateFees,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Initially, late fee field should not be visible
      expect(screen.queryByLabelText(/default late fee amount/i)).not.toBeInTheDocument();

      // Toggle the switch
      const lateFeeToggle = screen.getByLabelText(/enable late fees/i);
      await user.click(lateFeeToggle);

      // Late fee field should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/default late fee amount/i)).toBeInTheDocument();
      });
    });

    it('updates frequency dropdown options correctly', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      const frequencyField = screen.getByLabelText(/default installment frequency/i);
      await user.click(frequencyField);

      await waitFor(() => {
        expect(screen.getAllByText('Weekly')).toHaveLength(1);
        expect(screen.getAllByText('Bi-weekly')).toHaveLength(1);
        expect(screen.getAllByText('Monthly').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('updates currency dropdown options correctly', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      const currencyField = screen.getByLabelText(/default currency/i);
      await user.click(currencyField);

      await waitFor(() => {
        expect(screen.getAllByText(/USD - US Dollar/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/PHP - Philippine Peso/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/EUR - Euro/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Clear a required field
      const balanceDueDaysField = screen.getByLabelText(/days after event when balance is due/i);
      await user.clear(balanceDueDaysField);

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/balance due days is required/i)).toBeInTheDocument();
      });
    });

    it('validates numeric field ranges', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Test deposit percentage > 100
      const depositField = screen.getByLabelText(/default deposit percentage/i);
      await user.clear(depositField);
      await user.type(depositField, '150');

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot exceed 100%/i)).toBeInTheDocument();
      });
    });

    it('validates minimum values', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Test installments < 2
      const installmentsField = screen.getByLabelText(/default number of installments/i);
      await user.clear(installmentsField);
      await user.type(installmentsField, '1');

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 2 installments/i)).toBeInTheDocument();
      });
    });

    it('validates late fee amount when late fees are enabled', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Ensure late fees are enabled
      const lateFeeToggle = screen.getByLabelText(/enable late fees/i);
      if (!lateFeeToggle.checked) {
        await user.click(lateFeeToggle);
      }

      // Clear the late fee amount
      await waitFor(() => {
        const lateFeeField = screen.getByLabelText(/default late fee amount/i);
        expect(lateFeeField).toBeInTheDocument();
      });

      const lateFeeField = screen.getByLabelText(/default late fee amount/i);
      await user.clear(lateFeeField);

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/late fee amount is required when enabled/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls updateSettings with correct data on form submission', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Modify some fields
      const balanceDueDaysField = screen.getByLabelText(/days after event when balance is due/i);
      await user.clear(balanceDueDaysField);
      await user.type(balanceDueDaysField, '45');

      const gracePeriodField = screen.getByLabelText(/grace period days/i);
      await user.clear(gracePeriodField);
      await user.type(gracePeriodField, '10');

      // Submit the form
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({
          id: 1,
          data: expect.objectContaining({
            balance_due_days: 45,
            grace_period_days: 10,
            default_installments: 2,
            default_installment_frequency: 'MONTHLY',
            late_fee_enabled: true,
            default_late_fee_amount: 25,
            default_deposit_percentage: 50,
            default_currency: 'PHP',
            auto_payment_retry_attempts: 3,
            auto_payment_retry_delay_days: 2,
          }),
        });
      });
    });

    it('disables save button during update', async () => {
      vi.mocked(usePaymentsHooks.useUpdatePaymentSettings).mockReturnValue({
        mutate: mockUpdateSettings,
        isPending: true,
        error: null,
        isSuccess: false,
        reset: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      const saveButton = screen.getByRole('button', { name: /saving settings.../i });
      expect(saveButton).toBeDisabled();
    });

    it('handles update errors gracefully', async () => {
      const mockError = new Error('Update failed');
      vi.mocked(usePaymentsHooks.useUpdatePaymentSettings).mockReturnValue({
        mutate: mockUpdateSettings,
        isPending: false,
        error: mockError,
        isSuccess: false,
        reset: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // The component should still render even with an error
      expect(screen.getByText('Payment Plan Configuration')).toBeInTheDocument();
    });

    it('handles missing payment settings gracefully', () => {
      vi.mocked(usePaymentsHooks.usePaymentSettings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Should render with default values
      expect(screen.getByText('Payment Plan Configuration')).toBeInTheDocument();

      // Save button should be disabled when no settings are loaded
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('User Experience', () => {
    it('shows correct button text during different states', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Initially disabled
      let saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      expect(saveButton).toBeDisabled();

      // Make form dirty
      const balanceDueDaysField = screen.getByLabelText(/days after event when balance is due/i);
      await user.clear(balanceDueDaysField);
      await user.type(balanceDueDaysField, '45');

      // Should be enabled with normal text
      await waitFor(() => {
        saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
        expect(saveButton).not.toBeDisabled();
      });

      // Mock updating state
      vi.mocked(usePaymentsHooks.useUpdatePaymentSettings).mockReturnValue({
        mutate: mockUpdateSettings,
        isPending: true,
        error: null,
        isSuccess: false,
        reset: vi.fn(),
      });

      // Re-render to see the updating state
      render(<PaymentPlanSettings />, { wrapper: Wrapper });
      saveButton = screen.getByRole('button', { name: /saving settings.../i });
      expect(saveButton).toBeDisabled();
    });

    it('displays helpful information alert', () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      expect(screen.getByText(/these settings serve as defaults for new payment plans/i)).toBeInTheDocument();
      expect(screen.getByText(/individual payment plans can override these settings/i)).toBeInTheDocument();
    });

    it('shows appropriate helper text for form fields', () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      expect(screen.getByText(/number of days after the event.*service date/i)).toBeInTheDocument();
      expect(screen.getByText(/number of days after due date before late fees apply/i)).toBeInTheDocument();
      expect(screen.getByText(/percentage of total amount required as deposit/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Check that form fields have proper labels
      const balanceDueDaysField = screen.getByLabelText(/days after event when balance is due/i);
      expect(balanceDueDaysField).toHaveAttribute('type', 'number');

      const lateFeeToggle = screen.getByLabelText(/enable late fees/i);
      expect(lateFeeToggle).toHaveAttribute('type', 'checkbox');

      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      expect(saveButton).toHaveAttribute('type', 'submit');
    });

    it('provides proper error announcements', async () => {
      const user = userEvent.setup();
      const Wrapper = createWrapper();
      render(<PaymentPlanSettings />, { wrapper: Wrapper });

      // Clear a required field to trigger validation
      const balanceDueDaysField = screen.getByLabelText(/days after event when balance is due/i);
      await user.clear(balanceDueDaysField);

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save payment plan settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/balance due days is required/i);
        expect(errorMessage).toBeInTheDocument();
        // Error should be associated with the field
        expect(balanceDueDaysField).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});