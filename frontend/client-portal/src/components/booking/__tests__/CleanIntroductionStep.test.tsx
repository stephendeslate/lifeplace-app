// frontend/client-portal/src/components/booking/__tests__/CleanIntroductionStep.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { CleanIntroductionStep } from '../steps/CleanIntroductionStep';

const theme = createTheme();

// Mock accessibility hook
const mockAnnounceToScreenReader = vi.fn();
vi.mock('../../accessibility', () => ({
  useAccessibility: () => ({
    announceToScreenReader: mockAnnounceToScreenReader,
  }),
}));

// Mock design system components
vi.mock('../../../design-system/components/GlassCard', () => ({
  GlassCard: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="glass-card" {...props}>{children}</div>
  ),
}));

vi.mock('../../../design-system/components/AnimatedElement', () => ({
  AnimatedElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const defaultProps = {
  stepData: { acknowledged: false },
  config: {
    title: 'Welcome to Booking',
    content: 'Please review the terms before proceeding.',
  },
  onDataChange: vi.fn(),
  validationErrors: {},
  isValidating: false,
  eventTypeName: 'Wedding',
};

describe('CleanIntroductionStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders welcome message with config title', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to Booking')).toBeInTheDocument();
    });

    it('renders default title when config title is not provided', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            config={null}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to Your Event Booking')).toBeInTheDocument();
    });

    it('renders config content', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Please review the terms before proceeding.')).toBeInTheDocument();
    });

    it('renders event type chip', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Booking: Wedding')).toBeInTheDocument();
    });

    it('uses default event type name when not provided', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            eventTypeName={undefined}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Booking: Your Event')).toBeInTheDocument();
    });

    it('renders terms and conditions section', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
    });

    it('renders acknowledgment checkbox', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(
        screen.getByText('I acknowledge that I have read and agree to the terms and conditions')
      ).toBeInTheDocument();
    });
  });

  describe('Checkbox behavior', () => {
    it('checkbox is unchecked by default', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('checkbox reflects stepData.acknowledged state', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            stepData={{ acknowledged: true }}
          />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls onDataChange when checkbox is checked', () => {
      const onDataChange = vi.fn();
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            onDataChange={onDataChange}
          />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onDataChange).toHaveBeenCalledWith({ acknowledged: true });
    });

    it('calls onDataChange when checkbox is unchecked', () => {
      const onDataChange = vi.fn();
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            stepData={{ acknowledged: true }}
            onDataChange={onDataChange}
          />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onDataChange).toHaveBeenCalledWith({ acknowledged: false });
    });

    it('checkbox is disabled when isValidating is true', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            isValidating={true}
          />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('announces to screen reader when acknowledged', () => {
      const onDataChange = vi.fn();
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            onDataChange={onDataChange}
          />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
        'Terms and conditions acknowledged. You can now proceed to the next step.'
      );
    });

    it('does not announce when unchecking', () => {
      const onDataChange = vi.fn();
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            stepData={{ acknowledged: true }}
            onDataChange={onDataChange}
          />
        </TestWrapper>
      );

      mockAnnounceToScreenReader.mockClear();
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockAnnounceToScreenReader).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('displays validation error for acknowledged field', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            validationErrors={{
              acknowledged: ['You must accept the terms and conditions'],
            }}
          />
        </TestWrapper>
      );

      expect(screen.getByText('You must accept the terms and conditions')).toBeInTheDocument();
    });

    it('shows only first error when multiple errors exist', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            validationErrors={{
              acknowledged: ['First error', 'Second error'],
            }}
          />
        </TestWrapper>
      );

      expect(screen.getByText('First error')).toBeInTheDocument();
      expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    });

    it('does not show error alert when no errors', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Completion state', () => {
    it('shows completion message when acknowledged', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            stepData={{ acknowledged: true }}
          />
        </TestWrapper>
      );

      expect(
        screen.getByText('Thank you! You can now proceed to the next step.')
      ).toBeInTheDocument();
    });

    it('does not show completion message when not acknowledged', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            stepData={{ acknowledged: false }}
          />
        </TestWrapper>
      );

      expect(
        screen.queryByText('Thank you! You can now proceed to the next step.')
      ).not.toBeInTheDocument();
    });
  });

  describe('Default step data', () => {
    it('uses default stepData when not provided', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            config={defaultProps.config}
            onDataChange={defaultProps.onDataChange}
            validationErrors={{}}
            isValidating={false}
          />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Config variations', () => {
    it('handles config with only title', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            config={{
              title: 'Custom Title',
              content: undefined,
            }}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('handles empty config object', () => {
      render(
        <TestWrapper>
          <CleanIntroductionStep
            {...defaultProps}
            config={{} as typeof defaultProps.config}
          />
        </TestWrapper>
      );

      // Should render default title
      expect(screen.getByText('Welcome to Your Event Booking')).toBeInTheDocument();
    });
  });
});
