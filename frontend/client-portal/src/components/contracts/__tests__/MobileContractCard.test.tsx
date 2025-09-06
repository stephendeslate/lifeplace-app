// frontend/client-portal/src/components/contracts/__tests__/MobileContractCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import MobileContractCard from '../MobileContractCard';
import type { Contract, SignatureRole } from '../../../types/contracts.types';

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
    title: 'Wedding Celebration',
    date: '2024-06-15',
    status: 'confirmed',
  },
  template: {
    id: 'template-1',
    name: 'Premium Wedding Package Contract',
    description: 'Comprehensive wedding service agreement',
    signature_requirements: ['CLIENT', 'WITNESS'],
  },
  status: 'SENT',
  content: '<p>Contract terms and conditions</p>',
  sent_at: '2024-05-15T09:00:00Z',
  fully_signed_at: null,
  valid_until: '2024-07-15T23:59:59Z',
  contract_value: '8500.00',
  payment_schedule_reference: 'PS-WED-001',
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
  can_client_sign: true,
  created_at: '2024-05-15T09:00:00Z',
  updated_at: '2024-05-15T09:00:00Z',
};

describe('MobileContractCard', () => {
  const mockOnSign = vi.fn();
  const mockOnView = vi.fn();
  const mockOnDownload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contract information correctly', () => {
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Wedding Celebration')).toBeInTheDocument();
    expect(screen.getByText('Premium Wedding Package Contract')).toBeInTheDocument();
    expect(screen.getByText('Sent for Signature')).toBeInTheDocument();
    expect(screen.getByText('$8,500.00')).toBeInTheDocument();
  });

  it('shows signature progress correctly', () => {
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Signatures')).toBeInTheDocument();
    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('displays amendment information when contract is an amendment', () => {
    const amendmentContract = {
      ...mockContract,
      is_amendment: true,
      amendment_number: 3,
    };

    renderWithTheme(
      <MobileContractCard
        contract={amendmentContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Amendment #3')).toBeInTheDocument();
  });

  it('shows expired status when contract is expired', () => {
    const expiredContract = {
      ...mockContract,
      valid_until: '2020-01-01T00:00:00Z', // Past date
    };

    renderWithTheme(
      <MobileContractCard
        contract={expiredContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('expands and collapses details when expand button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    // Find the expand button by its icon
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    expect(expandButton).toBeInTheDocument();
    
    if (expandButton) {
      await user.click(expandButton);
      
      // Now expanded - details should be visible
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Valid Until')).toBeInTheDocument();
    }
  });

  it('shows action buttons by default', () => {
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Sign')).toBeInTheDocument();
  });

  it('hides action buttons when showActions is false', () => {
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        showActions={false}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign')).not.toBeInTheDocument();
  });

  it('shows sign button only when client can sign', () => {
    const cannotSignContract = {
      ...mockContract,
      can_client_sign: false,
    };

    renderWithTheme(
      <MobileContractCard
        contract={cannotSignContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Sign')).not.toBeInTheDocument();
  });

  it('shows PDF download button for signed contracts', () => {
    const signedContract = {
      ...mockContract,
      status: 'SIGNED' as const,
    };

    renderWithTheme(
      <MobileContractCard
        contract={signedContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    expect(mockOnView).toHaveBeenCalledWith(mockContract);
  });

  it('calls onSign when sign button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    const signButton = screen.getByText('Sign');
    await user.click(signButton);

    expect(mockOnSign).toHaveBeenCalledWith(mockContract);
  });

  it('shows disabled PDF button for signed contracts', async () => {
    const signedContract = {
      ...mockContract,
      status: 'SIGNED' as const,
    };
    
    renderWithTheme(
      <MobileContractCard
        contract={signedContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    const pdfButton = screen.getByText('PDF');
    expect(pdfButton).toBeInTheDocument();
    expect(pdfButton).toBeDisabled();
  });

  it('shows signature details when expanded and contract has signatures', async () => {
    const user = userEvent.setup();
    const signedContract = {
      ...mockContract,
      signatures: [{
        id: 'sig-1',
        contract: 'contract-1',
        signer: {
          id: 'user-1',
          email: 'client@example.com',
          first_name: 'John',
          last_name: 'Smith',
        },
        role: 'CLIENT' as const,
        role_display: 'Client',
        signature_data: 'data:image/png;base64,signature',
        signed_at: '2024-05-20T14:30:00Z',
        signer_name: 'John Smith',
        signer_title: 'Groom',
        signer_email: 'client@example.com',
        is_verified: true,
        verification_method: 'electronic_signature',
        legal_disclosure_accepted: true,
        signature_intent_confirmed: true,
        created_at: '2024-05-20T14:30:00Z',
        updated_at: '2024-05-20T14:30:00Z',
      }],
      signature_progress: {
        total_required: 2,
        signed_count: 1,
        percentage: 50,
        required_roles: ['CLIENT', 'WITNESS'] as SignatureRole[],
        signed_roles: ['CLIENT'] as SignatureRole[],
        missing_roles: ['WITNESS'] as SignatureRole[],
      },
    };

    renderWithTheme(
      <MobileContractCard
        contract={signedContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    // Expand the card using the expand icon
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    if (expandButton) {
      await user.click(expandButton);

      // Check signature details
      expect(screen.getByText('Signatures')).toBeInTheDocument();
      expect(screen.getByText('Client')).toBeInTheDocument();
      expect(screen.getByText('John Smith • May 20, 2024')).toBeInTheDocument();
    }
  });

  it('shows fully signed contract with completed progress', () => {
    const fullySignedContract = {
      ...mockContract,
      status: 'SIGNED' as const,
      signature_progress: {
        total_required: 2,
        signed_count: 2,
        percentage: 100,
        required_roles: ['CLIENT', 'WITNESS'] as SignatureRole[],
        signed_roles: ['CLIENT', 'WITNESS'] as SignatureRole[],
        missing_roles: [] as SignatureRole[],
      },
      fully_signed_at: '2024-05-25T16:45:00Z',
    };

    renderWithTheme(
      <MobileContractCard
        contract={fullySignedContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Fully Signed')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('formats contract value correctly with different currencies', () => {
    const eurContract = {
      ...mockContract,
      contract_value: '7500.50',
      currency: 'EUR',
    };

    renderWithTheme(
      <MobileContractCard
        contract={eurContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('€7,500.50')).toBeInTheDocument();
  });

  it('handles contract without value gracefully', () => {
    const noValueContract = {
      ...mockContract,
      contract_value: null,
    };

    renderWithTheme(
      <MobileContractCard
        contract={noValueContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    // Should not show any value
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('shows contract details when expanded', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <MobileContractCard
        contract={mockContract}
        onSign={mockOnSign}
        onView={mockOnView}
        onDownload={mockOnDownload}
      />
    );

    // Expand the card using the expand icon
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    if (expandButton) {
      await user.click(expandButton);

      // Check all expanded details
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('May 15, 2024')).toBeInTheDocument(); // Created date
      expect(screen.getByText('Valid Until')).toBeInTheDocument();
      expect(screen.getByText('Jul 15, 2024')).toBeInTheDocument(); // Valid until date
    }
  });
});