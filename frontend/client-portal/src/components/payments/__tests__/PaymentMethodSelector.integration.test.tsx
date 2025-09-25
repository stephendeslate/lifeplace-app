// frontend/client-portal/src/components/payments/__tests__/PaymentMethodSelector.integration.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { PaymentMethodSelector } from '../PaymentMethodSelector';
import FinancialApi from '../../../apis/financial.api';
import type { PaymentMethod, PaymentGateway } from '../../../types/financial.types';

// ===========================
// Mock Setup
// ===========================

// Mock the APIs
vi.mock('../../../apis/financial.api');
const mockFinancialApi = vi.mocked(FinancialApi);

// Mock PaymentGatewaySelector
vi.mock('../PaymentGatewaySelector', () => ({
  PaymentGatewaySelector: ({ onGatewaySelect, selectedGateway, required, ...props }: any) => (
    <div data-testid="payment-gateway-selector">
      <select
        data-testid="gateway-select"
        value={selectedGateway?.id || ''}
        onChange={(e) => {
          const gatewayId = parseInt(e.target.value);
          const gateway = mockGateways.find(g => g.id === gatewayId);
          onGatewaySelect(gateway || null);
        }}
        {...props}
      >
        <option value="">Select Gateway</option>
        {mockGateways.map(gateway => (
          <option key={gateway.id} value={gateway.id}>
            {gateway.name}
          </option>
        ))}
      </select>
      {required && <span data-testid="gateway-required">Required</span>}
    </div>
  ),
}));

// Mock UnifiedStripePaymentFlow
vi.mock('../UnifiedStripePaymentFlow', () => ({
  UnifiedStripePaymentFlow: ({ onSuccess, onError, config, gateway, ...props }: any) => (
    <div data-testid="unified-stripe-payment-flow">
      <div data-testid="payment-flow-mode">{config.mode}</div>
      <div data-testid="payment-flow-nickname">{config.nickname}</div>
      <div data-testid="payment-flow-gateway">{gateway.code}</div>
      <button
        onClick={() => onSuccess({
          mode: 'save',
          success: true,
          message: 'Payment method saved successfully',
          saveResult: {
            payment_method: {
              id: 99,
              type: 'CREDIT_CARD',
              stripe_payment_method_id: 'pm_test_123',
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
            },
            setup_intent_id: 'seti_test_123',
            is_default: false,
          }
        })}
        data-testid="payment-flow-success"
      >
        Save Card
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

const mockGateways: PaymentGateway[] = [
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

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 1,
    type: 'CREDIT_CARD',
    stripe_payment_method_id: 'pm_123',
    last_four: '4242',
    card_brand: 'visa',
    exp_month: 12,
    exp_year: 2025,
    is_default: true,
    nickname: 'My Visa Card',
    is_active: true,
    gateway: 1,
    gateway_details: { name: 'Stripe', code: 'stripe' },
    type_display: 'Credit Card',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    type: 'DIGITAL_WALLET',
    last_four: '',
    is_default: false,
    nickname: 'PayPal Account',
    is_active: true,
    gateway: 2,
    gateway_details: { name: 'PayPal', code: 'paypal' },
    type_display: 'Digital Wallet',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

// ===========================
// Test Suite
// ===========================

describe('PaymentMethodSelector Integration', () => {
  const mockOnMethodSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default API mocks
    mockFinancialApi.getPaymentMethods.mockResolvedValue(mockPaymentMethods);
    mockFinancialApi.createPaymentMethod.mockImplementation((data) =>
      Promise.resolve({
        id: 3,
        type: data.type,
        nickname: data.nickname,
        is_default: data.is_default || false,
        is_active: true,
        gateway: data.gateway || 1,
        last_four: data.last_four || '',
        card_brand: data.card_brand || '',
        exp_month: data.exp_month || 0,
        exp_year: data.exp_year || 0,
        stripe_payment_method_id: data.stripe_payment_method_id || '',
        gateway_details: { name: 'Test Gateway', code: 'test' },
        type_display: data.type === 'CREDIT_CARD' ? 'Credit Card' : 'Digital Wallet',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      } as PaymentMethod)
    );
  });

  const defaultProps = {
    selectedMethod: null,
    onMethodSelect: mockOnMethodSelect,
    disabled: false,
    showAddNew: true,
    allowedTypes: undefined,
  };

  // ===========================
  // Basic Rendering Tests
  // ===========================

  describe('Basic Rendering', () => {
    it('should render payment method selector with existing methods', async () => {
      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Visa Card')).toBeInTheDocument();
        expect(screen.getByText('PayPal Account')).toBeInTheDocument();
        expect(screen.getByText('•••• 4242')).toBeInTheDocument();
        expect(screen.getByText('Default')).toBeInTheDocument();
      });

      expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
    });

    it('should show loading state while fetching payment methods', () => {
      mockFinancialApi.getPaymentMethods.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPaymentMethods), 100))
      );

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error state when payment methods fail to load', async () => {
      mockFinancialApi.getPaymentMethods.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load payment methods. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle empty payment methods list', async () => {
      mockFinancialApi.getPaymentMethods.mockResolvedValue([]);

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
      });
    });

    it('should hide add new button when showAddNew is false', async () => {
      renderWithProviders(
        <PaymentMethodSelector {...defaultProps} showAddNew={false} />
      );

      await waitFor(() => {
        expect(screen.getByText('My Visa Card')).toBeInTheDocument();
      });

      expect(screen.queryByText('Add New Payment Method')).not.toBeInTheDocument();
    });
  });

  // ===========================
  // Method Selection Tests
  // ===========================

  describe('Method Selection', () => {
    it('should handle payment method selection', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Visa Card')).toBeInTheDocument();
      });

      const visaRadio = screen.getByDisplayValue('1');
      await user.click(visaRadio);

      expect(mockOnMethodSelect).toHaveBeenCalledWith(mockPaymentMethods[0]);
    });

    it('should show selected method as checked', async () => {
      renderWithProviders(
        <PaymentMethodSelector {...defaultProps} selectedMethod={mockPaymentMethods[0]} />
      );

      await waitFor(() => {
        const visaRadio = screen.getByDisplayValue('1');
        expect(visaRadio).toBeChecked();
      });
    });

    it('should filter methods by allowed types', async () => {
      renderWithProviders(
        <PaymentMethodSelector {...defaultProps} allowedTypes={['CREDIT_CARD']} />
      );

      await waitFor(() => {
        expect(screen.getByText('My Visa Card')).toBeInTheDocument();
        expect(screen.queryByText('PayPal Account')).not.toBeInTheDocument();
      });
    });

    it('should disable selection when disabled prop is true', async () => {
      renderWithProviders(
        <PaymentMethodSelector {...defaultProps} disabled={true} />
      );

      await waitFor(() => {
        const radioGroup = screen.getByRole('radiogroup');
        expect(radioGroup).toHaveAttribute('aria-disabled', 'true');
      });

      expect(screen.getByText('Add New Payment Method')).toHaveAttribute('disabled');
    });
  });

  // ===========================
  // Add New Payment Method Tests
  // ===========================

  describe('Add New Payment Method', () => {
    it('should open add payment method dialog', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
      expect(screen.getByLabelText('Nickname')).toBeInTheDocument();
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add Payment Method')).not.toBeInTheDocument();
      });
    });

    it('should validate required fields before submission', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Nickname is required')).toBeInTheDocument();
      });
    });

    it('should create payment method manually for non-Stripe gateways', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      // Fill form for bank transfer (no gateway required)
      const typeSelect = screen.getByLabelText('Payment Type');
      await user.click(typeSelect);
      await user.click(screen.getByText('Bank Transfer'));

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'My Bank Account');

      const instructionsInput = screen.getByLabelText('Instructions');
      await user.type(instructionsInput, 'Wire transfer to account 123');

      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFinancialApi.createPaymentMethod).toHaveBeenCalledWith({
          type: 'BANK_TRANSFER',
          nickname: 'My Bank Account',
          instructions: 'Wire transfer to account 123',
          is_default: false,
        });

        expect(mockOnMethodSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'BANK_TRANSFER',
            nickname: 'My Bank Account',
          })
        );
      });
    });

    it('should show gateway selector for credit card and digital wallet types', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      // Default should be credit card, which requires gateway
      expect(screen.getByTestId('payment-gateway-selector')).toBeInTheDocument();

      // Switch to digital wallet
      const typeSelect = screen.getByLabelText('Payment Type');
      await user.click(typeSelect);
      await user.click(screen.getByText('Digital Wallet'));

      expect(screen.getByTestId('payment-gateway-selector')).toBeInTheDocument();

      // Switch to bank transfer (no gateway needed)
      await user.click(typeSelect);
      await user.click(screen.getByText('Bank Transfer'));

      expect(screen.queryByTestId('payment-gateway-selector')).not.toBeInTheDocument();
    });

    it('should require gateway selection for credit card types', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'Test Card');

      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a payment gateway')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // UnifiedStripePaymentFlow Integration Tests
  // ===========================

  describe('UnifiedStripePaymentFlow Integration', () => {
    it('should render unified payment flow when Stripe gateway is selected', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'Test Card');

      // Select Stripe gateway
      const gatewaySelect = screen.getByTestId('gateway-select');
      await user.selectOptions(gatewaySelect, '1');

      await waitFor(() => {
        expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
        expect(screen.getByTestId('payment-flow-mode')).toHaveTextContent('save');
        expect(screen.getByTestId('payment-flow-nickname')).toHaveTextContent('Test Card');
        expect(screen.getByTestId('payment-flow-gateway')).toHaveTextContent('stripe');
      });
    });

    it('should handle successful payment method creation from unified flow', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'Test Card');

      // Select Stripe gateway
      const gatewaySelect = screen.getByTestId('gateway-select');
      await user.selectOptions(gatewaySelect, '1');

      await waitFor(() => {
        expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
      });

      // Trigger successful payment method creation
      const successButton = screen.getByTestId('payment-flow-success');
      await user.click(successButton);

      await waitFor(() => {
        expect(screen.getByText('•••• •••• •••• 4242 (visa)')).toBeInTheDocument();
      });

      // Submit the dialog (should use saved payment method, not create manually)
      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnMethodSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 99,
            type: 'CREDIT_CARD',
            last_four: '4242',
            nickname: 'Test Card',
          })
        );
      });

      // Should not call manual create API
      expect(mockFinancialApi.createPaymentMethod).not.toHaveBeenCalled();
    });

    it('should handle payment method creation errors from unified flow', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'Test Card');

      // Select Stripe gateway
      const gatewaySelect = screen.getByTestId('gateway-select');
      await user.selectOptions(gatewaySelect, '1');

      await waitFor(() => {
        expect(screen.getByTestId('unified-stripe-payment-flow')).toBeInTheDocument();
      });

      // Trigger payment method creation error
      const errorButton = screen.getByTestId('payment-flow-error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText('Your card was declined.')).toBeInTheDocument();
      });
    });

    it('should configure unified flow with correct save mode settings', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'Test Card');

      // Set as default
      const defaultCheckbox = screen.getByLabelText('Set as default payment method');
      await user.click(defaultCheckbox);

      // Select Stripe gateway
      const gatewaySelect = screen.getByTestId('gateway-select');
      await user.selectOptions(gatewaySelect, '1');

      await waitFor(() => {
        expect(screen.getByTestId('payment-flow-mode')).toHaveTextContent('save');
        expect(screen.getByTestId('payment-flow-nickname')).toHaveTextContent('Test Card');
      });
    });
  });

  // ===========================
  // Error Handling Tests
  // ===========================

  describe('Error Handling', () => {
    it('should handle API errors during payment method creation', async () => {
      const user = userEvent.setup();

      mockFinancialApi.createPaymentMethod.mockRejectedValue(new Error('Server error'));

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      // Fill form for bank transfer
      const typeSelect = screen.getByLabelText('Payment Type');
      await user.click(typeSelect);
      await user.click(screen.getByText('Bank Transfer'));

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'My Bank Account');

      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('should handle non-array response from getPaymentMethods', async () => {
      mockFinancialApi.getPaymentMethods.mockResolvedValue(null as any);

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
      });

      // Should not crash and should show empty state
      expect(screen.queryByText('My Visa Card')).not.toBeInTheDocument();
    });

    it('should reset form state when dialog is closed', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      // Fill some form data
      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'Test Card');

      const instructionsInput = screen.getByLabelText('Instructions');
      await user.type(instructionsInput, 'Some instructions');

      // Close dialog
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Reopen dialog - form should be reset
      await user.click(addButton);

      await waitFor(() => {
        const nicknameField = screen.getByLabelText('Nickname');
        const instructionsField = screen.getByLabelText('Instructions');

        expect(nicknameField).toHaveValue('');
        expect(instructionsField).toHaveValue('');
      });
    });
  });

  // ===========================
  // Accessibility Tests
  // ===========================

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      });

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(2); // Two payment methods
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add New Payment Method');

      // Should be focusable
      addButton.focus();
      expect(addButton).toHaveFocus();

      // Should open dialog on Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
      });
    });

    it('should provide proper form validation feedback', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PaymentMethodSelector {...defaultProps} />);

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        const nicknameField = screen.getByLabelText('Nickname');
        expect(nicknameField).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  // ===========================
  // Performance Tests
  // ===========================

  describe('Performance', () => {
    it('should not re-render unnecessarily when props do not change', async () => {
      const renderSpy = vi.fn();

      const TestWrapper = (props: any) => {
        renderSpy();
        return <PaymentMethodSelector {...props} />;
      };

      const { rerender } = renderWithProviders(
        <TestWrapper {...defaultProps} />
      );

      await waitFor(() => {
        expect(screen.getByText('My Visa Card')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(<TestWrapper {...defaultProps} />);

      // Should not cause additional API calls
      expect(mockFinancialApi.getPaymentMethods).toHaveBeenCalledTimes(1);
    });

    it('should invalidate queries after successful payment method creation', async () => {
      const user = userEvent.setup();
      const queryClient = createQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <PaymentMethodSelector {...defaultProps} />
          </ThemeProvider>
        </QueryClientProvider>
      );

      const addButton = screen.getByText('Add New Payment Method');
      await user.click(addButton);

      // Create bank transfer payment method
      const typeSelect = screen.getByLabelText('Payment Type');
      await user.click(typeSelect);
      await user.click(screen.getByText('Bank Transfer'));

      const nicknameInput = screen.getByLabelText('Nickname');
      await user.type(nicknameInput, 'My Bank Account');

      const submitButton = screen.getByText('Add Payment Method');
      await user.click(submitButton);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['paymentMethods'] });
      });
    });
  });
});