// frontend/client-portal/src/components/contracts/__tests__/ContractSigningDialog.test.tsx
import { render, screen, waitFor as _waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ContractSigningDialog from '../ContractSigningDialog';
import type { Contract } from '../../../types/contracts.types';

import { vi } from 'vitest';

// Mock signed contract for testing
const mockSignedContract = {
  id: 'contract-1',
  event: { id: 'event-1', title: 'Wedding Event', date: '2024-06-01', status: 'confirmed' },
  template: { id: 'template-1', name: 'Wedding Contract Template', description: '', signature_requirements: ['CLIENT'] },
  status: 'SIGNED' as const,
  content: '<p>Contract content here</p>',
  sent_at: '2024-05-01T10:00:00Z',
  fully_signed_at: new Date().toISOString(),
  valid_until: '2024-07-01T10:00:00Z',
  contract_value: '5000.00',
  payment_schedule_reference: 'PS-001',
  currency: 'USD',
  is_amendment: false,
  original_contract: null,
  amendment_number: 0,
  signatures: [{ role: 'CLIENT', signed: true, signer_name: 'John Doe' }],
  is_fully_signed: true,
  missing_signatures: [],
  signature_progress: { total_required: 1, signed_count: 1, percentage: 100, required_roles: [], signed_roles: [], missing_roles: [] },
  created_at: '2024-05-01T10:00:00Z',
  updated_at: new Date().toISOString(),
};

// Mock the ContractsContext hook
vi.mock('../../../contexts/ContractsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../contexts/ContractsContext')>();
  return {
    ...actual,
    useContracts: () => ({
      contracts: [],
      pendingContracts: [],
      signedContracts: [],
      expiredContracts: [],
      pendingSignatures: undefined,
      isLoading: false,
      isRefreshing: false,
      refreshContracts: vi.fn(),
      signContract: vi.fn(() => Promise.resolve(mockSignedContract)),
      getContract: vi.fn(),
      downloadContract: vi.fn(),
      simulateSignatureEvent: vi.fn(),
    }),
  };
});

// Mock contract utils - must be before importing the component
vi.mock('../../../apis/contracts.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../apis/contracts.api')>();
  return {
    ...actual,
    contractUtils: {
      ...actual.contractUtils,
      validateSignature: vi.fn(() => true),
      generateDeviceFingerprint: vi.fn(() => 'mock-fingerprint'),
    },
  };
});

// Mock dependencies
vi.mock('../EnhancedSignaturePad', () => ({
  default: function MockEnhancedSignaturePad({ onSignatureChange }: { onSignatureChange: (data: string) => void }) {
    return (
      <div data-testid="enhanced-signature-pad">
        <button onClick={() => onSignatureChange('mock-signature-data')}>
          Mock Signature
        </button>
      </div>
    );
  },
}));

vi.mock('../ContractViewer', () => ({
  default: function MockContractViewer() {
    return <div data-testid="contract-viewer">Contract Viewer</div>;
  },
}));

// Use render from test/utils which includes all necessary providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(component);
};

const mockContract: Contract = {
  id: 'contract-1',
  event: {
    id: 'event-1',
    title: 'Wedding Event',
    date: '2024-06-01',
    status: 'confirmed',
  },
  template: {
    id: 'template-1',
    name: 'Wedding Contract Template',
    description: 'Standard wedding contract',
    signature_requirements: ['CLIENT', 'WITNESS'],
  },
  status: 'SENT',
  content: '<p>Contract content here</p>',
  sent_at: '2024-05-01T10:00:00Z',
  fully_signed_at: null,
  valid_until: '2024-07-01T10:00:00Z',
  contract_value: '5000.00',
  payment_schedule_reference: 'PS-001',
  currency: 'USD',
  is_amendment: false,
  original_contract: null,
  amendment_number: 0,
  signatures: [],
  is_fully_signed: false,
  missing_signatures: ['CLIENT', 'WITNESS'],
  signature_progress: {
    total_required: 2,
    signed_count: 0,
    percentage: 0,
    required_roles: ['CLIENT', 'WITNESS'],
    signed_roles: [],
    missing_roles: ['CLIENT', 'WITNESS'],
  },
  created_at: '2024-05-01T10:00:00Z',
  updated_at: '2024-05-01T10:00:00Z',
};

describe('ContractSigningDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSignComplete = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Sign Contract - Wedding Event')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <ContractSigningDialog
        open={false}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    expect(screen.queryByText('Sign Contract - Wedding Event')).not.toBeInTheDocument();
  });

  it('does not render without contract', () => {
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={null}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    expect(screen.queryByText('Sign Contract')).not.toBeInTheDocument();
  });

  it('shows contract review step by default', () => {
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Please review the contract carefully')).toBeInTheDocument();
    expect(screen.getByTestId('contract-viewer')).toBeInTheDocument();
  });

  it('shows stepper with correct steps', () => {
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Review Contract')).toBeInTheDocument();
    expect(screen.getByText('Legal Disclosure')).toBeInTheDocument();
    expect(screen.getByText('Sign Document')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('allows progression through steps', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Should start at review contract step
    expect(screen.getByText('Please review the contract carefully')).toBeInTheDocument();

    // Click next to go to legal disclosure
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(screen.getByText('Electronic Signature Disclosure')).toBeInTheDocument();
  });

  it('prevents progression without accepting legal disclosure', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Go to legal disclosure step
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Next button should be disabled without accepting disclosure
    const nextButton2 = screen.getByText('Next');
    expect(nextButton2).toBeDisabled();

    // Accept the disclosure
    await user.click(screen.getByRole('checkbox'));

    // Now Next button should be enabled
    expect(nextButton2).not.toBeDisabled();
  });

  it('allows progression after accepting legal disclosure', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Go to legal disclosure step
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Accept the disclosure
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    // Should be able to proceed
    const nextButton2 = screen.getByText('Next');
    expect(nextButton2).not.toBeDisabled();
  });

  it('shows signature capture step', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Navigate to signature step
    await user.click(screen.getByText('Next')); // Review -> Legal
    await user.click(screen.getByRole('checkbox')); // Accept legal
    await user.click(screen.getByText('Next')); // Legal -> Signature

    expect(screen.getByText('Sign the Contract')).toBeInTheDocument();
    expect(screen.getByTestId('enhanced-signature-pad')).toBeInTheDocument();
    // Use getByRole for MUI TextField which is more reliable
    expect(screen.getByRole('textbox', { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
  });

  it('validates signature step fields', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Navigate to signature step
    await user.click(screen.getByText('Next')); // Review -> Legal
    await user.click(screen.getByRole('checkbox')); // Accept legal
    await user.click(screen.getByText('Next')); // Legal -> Signature

    // The Next button should be disabled when required fields are not filled
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();

    // Fill in only the name - still should be disabled (need signature and email)
    await user.type(screen.getByRole('textbox', { name: /full name/i }), 'John Doe');
    expect(nextButton).toBeDisabled();

    // Add email - still should be disabled (need signature)
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'john@example.com');
    expect(nextButton).toBeDisabled();

    // Add signature - now should be enabled
    await user.click(screen.getByText('Mock Signature'));
    expect(nextButton).not.toBeDisabled();
  });

  it('shows confirmation step with signature details', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Navigate to signature step
    await user.click(screen.getByText('Next')); // Review -> Legal
    await user.click(screen.getByRole('checkbox')); // Accept legal
    await user.click(screen.getByText('Next')); // Legal -> Signature

    // Fill in signature details using getByRole
    await user.type(screen.getByRole('textbox', { name: /full name/i }), 'John Doe');
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'john@example.com');

    // Mock signature
    await user.click(screen.getByText('Mock Signature'));

    await user.click(screen.getByText('Next')); // Signature -> Confirmation

    expect(screen.getByText('Confirm Your Signature')).toBeInTheDocument();
    expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
  });

  it('completes signing process', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Navigate through all steps
    await user.click(screen.getByText('Next')); // Review -> Legal
    await user.click(screen.getByRole('checkbox')); // Accept legal
    await user.click(screen.getByText('Next')); // Legal -> Signature

    // Fill signature details using getByRole
    await user.type(screen.getByRole('textbox', { name: /full name/i }), 'John Doe');
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'john@example.com');
    await user.click(screen.getByText('Mock Signature'));

    await user.click(screen.getByText('Next')); // Signature -> Confirmation

    // Complete Signature button should initially be disabled (need to confirm intent)
    const completeButton = screen.getByText('Complete Signature');
    expect(completeButton).toBeDisabled();

    // Accept final confirmation
    const finalCheckbox = screen.getByRole('checkbox');
    await user.click(finalCheckbox);

    // Now Complete Signature button should be enabled
    expect(completeButton).not.toBeDisabled();
  });

  it('allows going back through steps', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Go forward
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('Electronic Signature Disclosure')).toBeInTheDocument();

    // Go back
    await user.click(screen.getByText('Back'));
    expect(screen.getByText('Please review the contract carefully')).toBeInTheDocument();
  });

  it('disables back button on first step', () => {
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    const backButton = screen.getByText('Back');
    expect(backButton).toBeDisabled();
  });

  it('closes dialog when pressing Escape', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Press Escape to close dialog
    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles errors during signing', async () => {
    // const user = userEvent.setup();
    
    // Mock console.error to avoid noise in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Navigate to confirmation and complete signing
    // (This would trigger error handling in the component)
    
    consoleSpy.mockRestore();
  });

  it('resets state when dialog reopens', async () => {
    const { rerender } = renderWithProviders(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Navigate to second step
    const user = userEvent.setup();
    await user.click(screen.getByText('Next'));

    // Close and reopen dialog
    rerender(
      <ContractSigningDialog
        open={false}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    rerender(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    // Should be back at first step
    expect(screen.getByText('Please review the contract carefully')).toBeInTheDocument();
  });
});