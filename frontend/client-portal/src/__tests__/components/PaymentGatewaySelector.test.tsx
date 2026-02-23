import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PaymentGatewaySelector } from '../../components/payments/PaymentGatewaySelector';
import type { PaymentGateway } from '../../types/financial.types';

// Mock the API - create a mock function that we can control
const mockGetActivePaymentGateways = vi.fn();
vi.mock('../../apis/financial.api', () => ({
  default: {
    getActivePaymentGateways: (...args: unknown[]) => mockGetActivePaymentGateways(...args),
  },
}));

// Mock data
const mockGateways: PaymentGateway[] = [
  {
    id: 1,
    name: 'Stripe',
    code: 'stripe',
    description: 'Credit card payments via Stripe',
    is_active: true,
    configuration: {},
    supported_currencies: ['USD', 'PHP'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'PayPal',
    code: 'paypal',
    description: 'PayPal digital wallet',
    is_active: true,
    configuration: {},
    supported_currencies: ['USD', 'EUR'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('PaymentGatewaySelector', () => {
  const mockOnGatewaySelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivePaymentGateways.mockResolvedValue(mockGateways);
  });

  it('renders loading state initially', async () => {
    mockGetActivePaymentGateways.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    expect(screen.getByText('Loading payment gateways...')).toBeInTheDocument();
  });

  it('renders multiple gateways with radio selection', async () => {
    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
    });

    // Should show radio buttons for multiple gateways
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(2);
  });

  it('auto-selects when only one gateway is available', async () => {
    const singleGateway = [mockGateways[0]];
    mockGetActivePaymentGateways.mockResolvedValue(singleGateway);

    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockOnGatewaySelect).toHaveBeenCalledWith(singleGateway[0]);
    });

    // Should show single gateway as selected info, not radio button
    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });
  });

  it('handles gateway selection', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    // Click on PayPal radio button
    const paypalRadio = screen.getByDisplayValue('2');
    await user.click(paypalRadio);

    expect(mockOnGatewaySelect).toHaveBeenCalledWith(mockGateways[1]);
  });

  it('filters gateways by allowed codes', async () => {
    render(
      <TestWrapper>
        <PaymentGatewaySelector
          selectedGateway={null}
          onGatewaySelect={mockOnGatewaySelect}
          allowedGateways={['stripe']}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.queryByText('PayPal')).not.toBeInTheDocument();
    });
  });

  it('handles authentication errors gracefully', async () => {
    const authError = new Error('Unauthorized');
    (authError as Error & { response?: { status?: number } }).response = { status: 403 };
    mockGetActivePaymentGateways.mockRejectedValue(authError);

    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    // Wait with longer timeout as component has retry logic (retries once for 403)
    await waitFor(
      () => {
        expect(
          screen.getByText(/Payment gateway information is not available/),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('handles network errors', async () => {
    const networkError = new Error('Network error');
    mockGetActivePaymentGateways.mockRejectedValue(networkError);

    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    // Wait with longer timeout as component has retry logic (retries up to 3 times)
    await waitFor(
      () => {
        expect(screen.getByText(/Failed to load payment gateways/)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  }, 15000); // Increase test timeout to allow for retry delays

  it('handles empty gateway list', async () => {
    mockGetActivePaymentGateways.mockResolvedValue([]);

    render(
      <TestWrapper>
        <PaymentGatewaySelector selectedGateway={null} onGatewaySelect={mockOnGatewaySelect} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No payment gateways are currently available/)).toBeInTheDocument();
    });
  });

  it('disables selection when disabled prop is true', async () => {
    render(
      <TestWrapper>
        <PaymentGatewaySelector
          selectedGateway={null}
          onGatewaySelect={mockOnGatewaySelect}
          disabled={true}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it('shows title when showTitle is true', async () => {
    render(
      <TestWrapper>
        <PaymentGatewaySelector
          selectedGateway={null}
          onGatewaySelect={mockOnGatewaySelect}
          showTitle={true}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Gateway')).toBeInTheDocument();
    });
  });

  it('shows required indicator when required is true', async () => {
    render(
      <TestWrapper>
        <PaymentGatewaySelector
          selectedGateway={null}
          onGatewaySelect={mockOnGatewaySelect}
          showTitle={true}
          required={true}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Gateway *')).toBeInTheDocument();
    });
  });
});
