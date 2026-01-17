// frontend/client-portal/src/__tests__/integration/ContractFlow.integration.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock contracts API
vi.mock('../../apis/contracts.api', () => ({
  contractsApi: {
    getContracts: vi.fn(),
    getContract: vi.fn(),
    acceptDisclosure: vi.fn(),
    signContract: vi.fn(),
    downloadContract: vi.fn(),
  },
}));

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock canvas for signature pad
vi.stubGlobal('HTMLCanvasElement', class MockCanvas {
  getContext() {
    return {
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      toDataURL: vi.fn(() => 'data:image/png;base64,signature'),
    };
  }
  toDataURL() {
    return 'data:image/png;base64,signature';
  }
});

import { contractsApi } from '../../apis/contracts.api';

// Mock data
const mockContracts = [
  {
    id: '1',
    contract_number: 'CON-001',
    event_name: 'Wedding Reception',
    event_date: '2025-06-15',
    status: 'PENDING_SIGNATURE',
    total_amount: '150000',
    created_at: '2024-12-01',
    updated_at: '2024-12-01',
    disclosure_accepted: false,
  },
  {
    id: '2',
    contract_number: 'CON-002',
    event_name: 'Corporate Event',
    event_date: '2025-07-20',
    status: 'SIGNED',
    total_amount: '80000',
    created_at: '2024-11-15',
    updated_at: '2024-11-20',
    disclosure_accepted: true,
    signed_at: '2024-11-20',
  },
];

const mockContractDetail = {
  id: '1',
  contract_number: 'CON-001',
  event_name: 'Wedding Reception',
  event_date: '2025-06-15',
  status: 'PENDING_SIGNATURE',
  total_amount: '150000',
  currency: 'PHP',
  created_at: '2024-12-01',
  updated_at: '2024-12-01',
  disclosure_accepted: false,
  terms_and_conditions: `
    Terms and Conditions

    1. Booking Confirmation
    The booking is confirmed upon signing this contract and payment of the deposit.

    2. Payment Terms
    - Deposit: 50% due upon signing
    - Balance: Due 30 days before event

    3. Cancellation Policy
    - 60+ days: Full refund minus processing fee
    - 30-59 days: 50% refund
    - Less than 30 days: No refund

    4. Force Majeure
    Events beyond our control may result in rescheduling.

    5. Liability
    We maintain comprehensive insurance for all events.
  `,
  disclosure_text: `
    By signing this contract, you acknowledge that:
    1. You have read and understood all terms and conditions.
    2. You agree to the payment schedule outlined.
    3. You understand the cancellation policy.
    4. All information provided is accurate and complete.
  `,
  line_items: [
    { description: 'Venue Rental - Grand Ballroom', quantity: 1, amount: '50000' },
    { description: 'Premium Package', quantity: 1, amount: '80000' },
    { description: 'Photo Booth Add-on', quantity: 1, amount: '10000' },
    { description: 'DJ Services', quantity: 1, amount: '10000' },
  ],
  subtotal: '150000',
  tax_amount: '18000',
  grand_total: '168000',
  deposit_amount: '84000',
  balance_amount: '84000',
  client: {
    name: 'Test User',
    email: 'test@example.com',
    phone: '09123456789',
  },
};

// Test utilities
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const theme = createTheme();

// Simplified test component for contract flow
const ContractFlowTest: React.FC = () => {
  const [contracts, setContracts] = React.useState<typeof mockContracts>([]);
  const [selectedContract, setSelectedContract] = React.useState<typeof mockContractDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = React.useState(false);
  const [disclosureAccepted, setDisclosureAccepted] = React.useState(false);
  const [isSigning, setIsSigning] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    const loadContracts = async () => {
      try {
        const data = await contractsApi.getContracts();
        setContracts(data);
      } catch (_err) {
        setError('Failed to load contracts');
      } finally {
        setIsLoading(false);
      }
    };
    loadContracts();
  }, []);

  const handleViewContract = async (contractId: string) => {
    try {
      setIsLoading(true);
      const data = await contractsApi.getContract(contractId);
      setSelectedContract(data);
      setDisclosureAccepted(data.disclosure_accepted || false);
    } catch (_err) {
      setError('Failed to load contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptDisclosure = async () => {
    if (!selectedContract) return;
    try {
      await contractsApi.acceptDisclosure(selectedContract.id);
      setDisclosureAccepted(true);
    } catch (_err) {
      setError('Failed to accept disclosure');
    }
  };

  const handleOpenSignatureDialog = () => {
    setShowSignatureDialog(true);
  };

  const handleSign = async (signatureData: string) => {
    if (!selectedContract) return;
    setIsSigning(true);
    try {
      await contractsApi.signContract(selectedContract.id, { signature: signatureData });
      setIsComplete(true);
      setShowSignatureDialog(false);
    } catch (_err) {
      setError('Failed to sign contract');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedContract) return;
    try {
      await contractsApi.downloadContract(selectedContract.id);
    } catch (_err) {
      setError('Failed to download contract');
    }
  };

  const handleBackToList = () => {
    setSelectedContract(null);
    setIsComplete(false);
    setDisclosureAccepted(false);
  };

  if (isLoading) {
    return <div role="progressbar">Loading...</div>;
  }

  if (error) {
    return <div role="alert">{error}</div>;
  }

  // Signature dialog
  if (showSignatureDialog) {
    return (
      <div role="dialog" aria-label="Sign Contract">
        <h2>Sign Contract</h2>
        <p>Please sign in the box below:</p>
        <div data-testid="signature-pad" style={{ border: '1px solid #ccc', height: 200 }}>
          Signature Pad Area
        </div>
        <button onClick={() => setShowSignatureDialog(false)}>Cancel</button>
        <button onClick={() => handleSign('signature-data')} disabled={isSigning}>
          {isSigning ? 'Signing...' : 'Confirm Signature'}
        </button>
      </div>
    );
  }

  // Contract signed confirmation
  if (isComplete) {
    return (
      <div>
        <h1>Contract Signed Successfully!</h1>
        <p>Thank you for signing the contract.</p>
        <p>Contract Number: {selectedContract?.contract_number}</p>
        <p>A copy has been sent to your email.</p>
        <button onClick={handleDownload}>Download Contract PDF</button>
        <button onClick={handleBackToList}>Back to Contracts</button>
      </div>
    );
  }

  // Contract detail view
  if (selectedContract) {
    return (
      <div>
        <button onClick={handleBackToList}>Back to Contracts</button>
        <h1>Contract: {selectedContract.contract_number}</h1>
        <div data-testid="contract-status">Status: {selectedContract.status}</div>

        <section data-testid="event-details">
          <h2>Event Details</h2>
          <p>Event: {selectedContract.event_name}</p>
          <p>Date: {selectedContract.event_date}</p>
          <p>Client: {selectedContract.client.name}</p>
        </section>

        <section data-testid="line-items">
          <h2>Services</h2>
          {selectedContract.line_items.map((item, index) => (
            <div key={index} data-testid={`line-item-${index}`}>
              <span>{item.description}</span>
              <span>₱{parseFloat(item.amount).toLocaleString()}</span>
            </div>
          ))}
        </section>

        <section data-testid="pricing-summary">
          <h2>Pricing Summary</h2>
          <div>Subtotal: ₱{parseFloat(selectedContract.subtotal).toLocaleString()}</div>
          <div>Tax: ₱{parseFloat(selectedContract.tax_amount).toLocaleString()}</div>
          <div>Total: ₱{parseFloat(selectedContract.grand_total).toLocaleString()}</div>
          <div>Deposit Due: ₱{parseFloat(selectedContract.deposit_amount).toLocaleString()}</div>
          <div>Balance Due: ₱{parseFloat(selectedContract.balance_amount).toLocaleString()}</div>
        </section>

        <section data-testid="terms-and-conditions">
          <h2>Terms and Conditions</h2>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            <pre>{selectedContract.terms_and_conditions}</pre>
          </div>
        </section>

        {selectedContract.status === 'PENDING_SIGNATURE' && (
          <section data-testid="signing-section">
            <h2>Sign Contract</h2>

            {!disclosureAccepted ? (
              <div data-testid="disclosure-section">
                <h3>Disclosure</h3>
                <div style={{ maxHeight: 150, overflow: 'auto' }}>
                  <pre>{selectedContract.disclosure_text}</pre>
                </div>
                <label>
                  <input
                    type="checkbox"
                    data-testid="disclosure-checkbox"
                    onChange={(e) => e.target.checked && handleAcceptDisclosure()}
                  />
                  I have read and accept the disclosure above
                </label>
              </div>
            ) : (
              <div>
                <p>Disclosure accepted</p>
                <button onClick={handleOpenSignatureDialog} data-testid="sign-button">
                  Sign Contract
                </button>
              </div>
            )}
          </section>
        )}

        {selectedContract.status === 'SIGNED' && (
          <div data-testid="already-signed">
            <p>This contract has been signed.</p>
            <button onClick={handleDownload}>Download PDF</button>
          </div>
        )}
      </div>
    );
  }

  // Contract list view
  return (
    <div>
      <h1>My Contracts</h1>
      {contracts.length === 0 ? (
        <p>No contracts found.</p>
      ) : (
        <div data-testid="contracts-list">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              data-testid={`contract-${contract.id}`}
              style={{ border: '1px solid #ccc', padding: 16, marginBottom: 8 }}
            >
              <h3>{contract.contract_number}</h3>
              <p>Event: {contract.event_name}</p>
              <p>Date: {contract.event_date}</p>
              <p>Status: {contract.status}</p>
              <p>Amount: ₱{parseFloat(contract.total_amount).toLocaleString()}</p>
              <button onClick={() => handleViewContract(contract.id)}>View Contract</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TestApp: React.FC = () => {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <Routes>
            <Route path="*" element={<ContractFlowTest />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Contract Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default API responses
    vi.mocked(contractsApi.getContracts).mockResolvedValue(mockContracts);
    vi.mocked(contractsApi.getContract).mockResolvedValue(mockContractDetail);
    vi.mocked(contractsApi.acceptDisclosure).mockResolvedValue({ success: true });
    vi.mocked(contractsApi.signContract).mockResolvedValue({
      success: true,
      signed_at: new Date().toISOString(),
    });
    vi.mocked(contractsApi.downloadContract).mockResolvedValue(new Blob());
  });

  describe('Contract List', () => {
    it('displays list of contracts', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('My Contracts')).toBeInTheDocument();
        expect(screen.getByText('CON-001')).toBeInTheDocument();
        expect(screen.getByText('CON-002')).toBeInTheDocument();
      });
    });

    it('shows contract details in list', async () => {
      render(<TestApp />);

      await waitFor(() => {
        const contract1 = screen.getByTestId('contract-1');
        expect(contract1).toHaveTextContent('Wedding Reception');
        expect(contract1).toHaveTextContent('₱150,000');

        const contract2 = screen.getByTestId('contract-2');
        expect(contract2).toHaveTextContent('Corporate Event');
      });
    });

    it('shows loading state initially', () => {
      render(<TestApp />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows empty state when no contracts', async () => {
      vi.mocked(contractsApi.getContracts).mockResolvedValue([]);

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('No contracts found.')).toBeInTheDocument();
      });
    });

    it('handles API error gracefully', async () => {
      vi.mocked(contractsApi.getContracts).mockRejectedValue(new Error('Network error'));

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load contracts');
      });
    });
  });

  describe('Contract Detail View', () => {
    it('navigates to contract detail on click', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('CON-001')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        expect(screen.getByText('Contract: CON-001')).toBeInTheDocument();
      });
    });

    it('displays event details', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        const eventSection = screen.getByTestId('event-details');
        expect(eventSection).toHaveTextContent('Wedding Reception');
        expect(eventSection).toHaveTextContent('2025-06-15');
        expect(eventSection).toHaveTextContent('Test User');
      });
    });

    it('displays line items', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        expect(screen.getByText('Venue Rental - Grand Ballroom')).toBeInTheDocument();
        expect(screen.getByText('Premium Package')).toBeInTheDocument();
        expect(screen.getByText('Photo Booth Add-on')).toBeInTheDocument();
      });
    });

    it('displays pricing summary', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        const pricingSection = screen.getByTestId('pricing-summary');
        expect(pricingSection).toHaveTextContent('₱150,000');
        expect(pricingSection).toHaveTextContent('₱18,000');
        expect(pricingSection).toHaveTextContent('₱168,000');
      });
    });

    it('displays terms and conditions', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        expect(screen.getByTestId('terms-and-conditions')).toHaveTextContent('Booking Confirmation');
        expect(screen.getByTestId('terms-and-conditions')).toHaveTextContent('Cancellation Policy');
      });
    });

    it('allows navigating back to list', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => expect(screen.getByText('Contract: CON-001')).toBeInTheDocument());
      await user.click(screen.getByText('Back to Contracts'));

      await waitFor(() => {
        expect(screen.getByText('My Contracts')).toBeInTheDocument();
      });
    });
  });

  describe('Disclosure Acceptance', () => {
    it('shows disclosure section for unsigned contracts', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        expect(screen.getByTestId('disclosure-section')).toBeInTheDocument();
        expect(screen.getByTestId('disclosure-checkbox')).toBeInTheDocument();
      });
    });

    it('requires disclosure acceptance before signing', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => {
        expect(screen.queryByTestId('sign-button')).not.toBeInTheDocument();
      });
    });

    it('enables signing after disclosure acceptance', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => expect(screen.getByTestId('disclosure-checkbox')).toBeInTheDocument());
      await user.click(screen.getByTestId('disclosure-checkbox'));

      await waitFor(() => {
        expect(contractsApi.acceptDisclosure).toHaveBeenCalledWith('1');
        expect(screen.getByTestId('sign-button')).toBeInTheDocument();
      });
    });
  });

  describe('Contract Signing', () => {
    it('opens signature dialog when signing', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => expect(screen.getByTestId('disclosure-checkbox')).toBeInTheDocument());
      await user.click(screen.getByTestId('disclosure-checkbox'));

      await waitFor(() => expect(screen.getByTestId('sign-button')).toBeInTheDocument());
      await user.click(screen.getByTestId('sign-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Sign Contract' })).toBeInTheDocument();
        expect(screen.getByTestId('signature-pad')).toBeInTheDocument();
      });
    });

    it('allows canceling signature', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => expect(screen.getByTestId('disclosure-checkbox')).toBeInTheDocument());
      await user.click(screen.getByTestId('disclosure-checkbox'));

      await waitFor(() => expect(screen.getByTestId('sign-button')).toBeInTheDocument());
      await user.click(screen.getByTestId('sign-button'));

      await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument());
      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('completes contract signing', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => expect(screen.getByTestId('disclosure-checkbox')).toBeInTheDocument());
      await user.click(screen.getByTestId('disclosure-checkbox'));

      await waitFor(() => expect(screen.getByTestId('sign-button')).toBeInTheDocument());
      await user.click(screen.getByTestId('sign-button'));

      await waitFor(() => expect(screen.getByText('Confirm Signature')).toBeInTheDocument());
      await user.click(screen.getByText('Confirm Signature'));

      await waitFor(() => {
        expect(contractsApi.signContract).toHaveBeenCalledWith('1', { signature: 'signature-data' });
        expect(screen.getByText('Contract Signed Successfully!')).toBeInTheDocument();
      });
    });

    it('handles signing error gracefully', async () => {
      vi.mocked(contractsApi.signContract).mockRejectedValue(new Error('Signing failed'));

      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-001')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      await waitFor(() => expect(screen.getByTestId('disclosure-checkbox')).toBeInTheDocument());
      await user.click(screen.getByTestId('disclosure-checkbox'));

      await waitFor(() => expect(screen.getByTestId('sign-button')).toBeInTheDocument());
      await user.click(screen.getByTestId('sign-button'));

      await waitFor(() => expect(screen.getByText('Confirm Signature')).toBeInTheDocument());
      await user.click(screen.getByText('Confirm Signature'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to sign contract');
      });
    });
  });

  describe('Complete Contract Signing Flow', () => {
    it('completes full contract review and signing journey', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Step 1: View contract list
      await waitFor(() => {
        expect(screen.getByText('My Contracts')).toBeInTheDocument();
        expect(screen.getByText('CON-001')).toBeInTheDocument();
      });

      // Step 2: Select contract to view
      await user.click(screen.getByTestId('contract-1').querySelector('button')!);

      // Step 3: Review contract details
      await waitFor(() => {
        expect(screen.getByText('Contract: CON-001')).toBeInTheDocument();
        expect(screen.getByTestId('terms-and-conditions')).toBeInTheDocument();
      });

      // Step 4: Accept disclosure
      await user.click(screen.getByTestId('disclosure-checkbox'));

      await waitFor(() => {
        expect(contractsApi.acceptDisclosure).toHaveBeenCalled();
      });

      // Step 5: Open signature dialog
      await waitFor(() => expect(screen.getByTestId('sign-button')).toBeInTheDocument());
      await user.click(screen.getByTestId('sign-button'));

      // Step 6: Sign contract
      await waitFor(() => expect(screen.getByText('Confirm Signature')).toBeInTheDocument());
      await user.click(screen.getByText('Confirm Signature'));

      // Step 7: Confirmation
      await waitFor(() => {
        expect(screen.getByText('Contract Signed Successfully!')).toBeInTheDocument();
        expect(screen.getByText(/CON-001/)).toBeInTheDocument();
      });

      // Verify API calls
      expect(contractsApi.getContracts).toHaveBeenCalled();
      expect(contractsApi.getContract).toHaveBeenCalledWith('1');
      expect(contractsApi.acceptDisclosure).toHaveBeenCalledWith('1');
      expect(contractsApi.signContract).toHaveBeenCalledWith('1', { signature: 'signature-data' });
    }, 30000);
  });

  describe('Already Signed Contracts', () => {
    it('shows signed status for completed contracts', async () => {
      vi.mocked(contractsApi.getContract).mockResolvedValue({
        ...mockContractDetail,
        id: '2',
        contract_number: 'CON-002',
        status: 'SIGNED',
        disclosure_accepted: true,
      });

      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-002')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-2').querySelector('button')!);

      await waitFor(() => {
        expect(screen.getByTestId('already-signed')).toBeInTheDocument();
        expect(screen.getByText('This contract has been signed.')).toBeInTheDocument();
      });
    });

    it('allows downloading signed contract', async () => {
      vi.mocked(contractsApi.getContract).mockResolvedValue({
        ...mockContractDetail,
        id: '2',
        contract_number: 'CON-002',
        status: 'SIGNED',
        disclosure_accepted: true,
      });

      const user = userEvent.setup();
      render(<TestApp />);

      await waitFor(() => expect(screen.getByText('CON-002')).toBeInTheDocument());
      await user.click(screen.getByTestId('contract-2').querySelector('button')!);

      await waitFor(() => expect(screen.getByText('Download PDF')).toBeInTheDocument());
      await user.click(screen.getByText('Download PDF'));

      expect(contractsApi.downloadContract).toHaveBeenCalledWith('2');
    });
  });
});
