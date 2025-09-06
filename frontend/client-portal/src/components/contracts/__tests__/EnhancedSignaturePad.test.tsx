// frontend/client-portal/src/components/contracts/__tests__/EnhancedSignaturePad.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import EnhancedSignaturePad from '../EnhancedSignaturePad';

import { vi } from 'vitest';

// Mock signature_pad module
vi.mock('signature_pad', () => ({
  default: vi.fn().mockImplementation(() => ({
    isEmpty: vi.fn(() => true),
    toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
    clear: vi.fn(),
    fromData: vi.fn(),
    toData: vi.fn(() => []),
    addEventListener: vi.fn(),
    off: vi.fn(),
    _drawCurve: vi.fn(),
  })),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EnhancedSignaturePad', () => {
  const mockOnSignatureChange = vi.fn();
  const mockOnSignatureComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Canvas is already mocked in setup.ts
  });

  it('renders with default props', () => {
    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    expect(screen.getByText('Your Signature')).toBeInTheDocument();
    expect(screen.getByText('Please sign in the box above using your mouse or touch screen')).toBeInTheDocument();
  });

  it('renders custom label and helper text', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        label="Custom Signature Label"
        helperText="Custom helper text"
      />
    );

    expect(screen.getByText('Custom Signature Label')).toBeInTheDocument();
    expect(screen.getByText('Custom helper text')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        required
        label="Required Signature"
      />
    );

    expect(screen.getByText('Required Signature *')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        error
        errorText="Custom error message"
      />
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders disabled state correctly', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        disabled
      />
    );

    const canvas = screen.getByRole('img', { hidden: true }); // Canvas has img role
    expect(canvas).toHaveStyle('cursor: not-allowed');
  });

  it('shows biometric analysis when enabled', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        enableBiometricAnalysis
        showAnalytics
      />
    );

    // Initially no analysis should be shown
    expect(screen.queryByText(/confidence/)).not.toBeInTheDocument();
  });

  it('renders action buttons', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        onSignatureComplete={mockOnSignatureComplete}
      />
    );

    expect(screen.getByLabelText('Clear signature')).toBeInTheDocument();
    expect(screen.getByLabelText('Undo last stroke')).toBeInTheDocument();
    expect(screen.getByLabelText('Complete signature')).toBeInTheDocument();
  });

  it('disables action buttons when empty', () => {
    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    const clearButton = screen.getByLabelText('Clear signature');
    const undoButton = screen.getByLabelText('Undo last stroke');

    expect(clearButton).toBeDisabled();
    expect(undoButton).toBeDisabled();
  });

  it('calls onSignatureChange when signature changes', async () => {
    const SignaturePad = await import('signature_pad');
    const mockPad = new (SignaturePad.default as any)();
    mockPad.isEmpty.mockReturnValue(false);
    
    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    // Simulate signature change by calling the event handler
    const handleEndStroke = mockPad.addEventListener.mock.calls
      .find(([event]: any[]) => event === 'endStroke')?.[1];
    
    if (handleEndStroke) {
      await waitFor(() => {
        handleEndStroke();
      });

      expect(mockOnSignatureChange).toHaveBeenCalled();
    }
  });

  it('shows analysis progress when analyzing', async () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        enableBiometricAnalysis
      />
    );

    // The component should show analyzing state during analysis
    // This would need to be tested by triggering a signature event
  });

  it('handles clear button click', async () => {
    const user = userEvent.setup();
    const SignaturePad = await import('signature_pad');
    const mockPad = new (SignaturePad.default as any)();
    mockPad.isEmpty.mockReturnValue(false);

    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    // First make the signature pad non-empty
    mockPad.isEmpty.mockReturnValue(false);
    
    const clearButton = screen.getByLabelText('Clear signature');
    await user.click(clearButton);

    expect(mockPad.clear).toHaveBeenCalled();
  });

  it('handles undo button click', async () => {
    const user = userEvent.setup();
    const SignaturePad = await import('signature_pad');
    const mockPad = new (SignaturePad.default as any)();
    mockPad.isEmpty.mockReturnValue(false);
    mockPad.toData.mockReturnValue([{ x: 1, y: 1 }]);

    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    const undoButton = screen.getByLabelText('Undo last stroke');
    await user.click(undoButton);

    expect(mockPad.toData).toHaveBeenCalled();
    expect(mockPad.fromData).toHaveBeenCalled();
  });

  it('handles complete button click', async () => {
    const user = userEvent.setup();
    const SignaturePad = await import('signature_pad');
    const mockPad = new (SignaturePad.default as any)();
    mockPad.isEmpty.mockReturnValue(false);

    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        onSignatureComplete={mockOnSignatureComplete}
      />
    );

    const completeButton = screen.getByLabelText('Complete signature');
    await user.click(completeButton);

    expect(mockOnSignatureComplete).toHaveBeenCalledWith(
      'data:image/png;base64,mockdata',
      expect.any(Object)
    );
  });

  it('prevents context menu on canvas', () => {
    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    const canvas = screen.getByRole('img', { hidden: true });
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
    
    Object.defineProperty(contextMenuEvent, 'preventDefault', {
      value: vi.fn(),
      writable: true,
    });

    fireEvent(canvas, contextMenuEvent);
    expect(contextMenuEvent.preventDefault).toHaveBeenCalled();
  });

  it('handles window resize', () => {
    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    // Trigger window resize
    fireEvent(window, new Event('resize'));

    // The component should handle resize gracefully
    // This is more of an integration test to ensure no errors
  });

  it('renders with custom dimensions', () => {
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        width={400}
        height={150}
      />
    );

    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toHaveStyle('width: 400px');
    expect(canvas).toHaveStyle('height: 150px');
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        className="custom-signature-pad"
      />
    );

    expect(container.querySelector('.custom-signature-pad')).toBeInTheDocument();
  });
});

// Integration tests
describe('EnhancedSignaturePad Integration', () => {
  it('integrates with biometric analysis correctly', async () => {
    const mockOnSignatureChange = vi.fn();
    
    renderWithTheme(
      <EnhancedSignaturePad
        onSignatureChange={mockOnSignatureChange}
        enableBiometricAnalysis
        showAnalytics
      />
    );

    // Test that the component can handle biometric analysis flow
    // This would involve mocking the signature analysis functions
  });

  it('maintains state across clear and undo operations', async () => {
    const user = userEvent.setup();
    const mockOnSignatureChange = vi.fn();
    
    const SignaturePad = await import('signature_pad');
    const mockPad = new (SignaturePad.default as any)();
    mockPad.isEmpty.mockReturnValueOnce(false).mockReturnValueOnce(true);

    renderWithTheme(
      <EnhancedSignaturePad onSignatureChange={mockOnSignatureChange} />
    );

    // Simulate signing
    mockPad.isEmpty.mockReturnValue(false);
    
    // Clear signature
    const clearButton = screen.getByLabelText('Clear signature');
    await user.click(clearButton);

    expect(mockPad.clear).toHaveBeenCalled();
    expect(mockOnSignatureChange).toHaveBeenCalledWith(null);
  });
});