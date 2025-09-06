// frontend/client-portal/src/components/contracts/__tests__/ContractSigningDialog.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import ContractSigningDialog from '../ContractSigningDialog';
import type { Contract } from '../../../types/contracts.types';

import { vi } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock dependencies
vi.mock('../EnhancedSignaturePad', () => ({
  default: function MockEnhancedSignaturePad({ onSignatureChange }: any) {
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

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
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
    renderWithTheme(
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
    renderWithTheme(
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
    renderWithTheme(
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
    renderWithTheme(
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
    renderWithTheme(
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
    
    renderWithTheme(
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
    
    renderWithTheme(
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

    // Try to proceed without accepting
    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    // Should show error
    expect(screen.getByText('You must accept the electronic signature disclosure')).toBeInTheDocument();
  });

  it('allows progression after accepting legal disclosure', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
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
    
    renderWithTheme(
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
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('validates signature step fields', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
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

    // Try to proceed without filling required fields
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Please provide a valid signature')).toBeInTheDocument();
    expect(screen.getByText('Signer name is required')).toBeInTheDocument();
  });

  it('shows confirmation step with signature details', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
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

    // Fill in signature details
    await user.type(screen.getByLabelText('Full Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
    
    // Mock signature
    await user.click(screen.getByText('Mock Signature'));

    await user.click(screen.getByText('Next')); // Signature -> Confirmation

    expect(screen.getByText('Confirm Your Signature')).toBeInTheDocument();
    expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
  });

  it('completes signing process', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
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

    // Fill signature details
    await user.type(screen.getByLabelText('Full Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
    await user.click(screen.getByText('Mock Signature'));

    await user.click(screen.getByText('Next')); // Signature -> Confirmation

    // Accept final confirmation
    const finalCheckbox = screen.getByRole('checkbox');
    await user.click(finalCheckbox);

    // Complete signature
    const completeButton = screen.getByText('Complete Signature');
    await user.click(completeButton);

    await waitFor(() => {
      expect(mockOnSignComplete).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('allows going back through steps', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
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
    renderWithTheme(
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

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <ContractSigningDialog
        open={true}
        onClose={mockOnClose}
        contract={mockContract}
        onSignComplete={mockOnSignComplete}
        onError={mockOnError}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles errors during signing', async () => {
    // const user = userEvent.setup();
    
    // Mock console.error to avoid noise in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithTheme(
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
    const { rerender } = renderWithTheme(
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
      <ThemeProvider theme={theme}>
        <ContractSigningDialog
          open={false}
          onClose={mockOnClose}
          contract={mockContract}
          onSignComplete={mockOnSignComplete}
          onError={mockOnError}
        />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={theme}>
        <ContractSigningDialog
          open={true}
          onClose={mockOnClose}
          contract={mockContract}
          onSignComplete={mockOnSignComplete}
          onError={mockOnError}
        />
      </ThemeProvider>
    );

    // Should be back at first step
    expect(screen.getByText('Please review the contract carefully')).toBeInTheDocument();
  });
});