// frontend/client-portal/src/components/booking/__tests__/BookingProgressIndicator.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { BookingProgressIndicator, useBookingSteps } from '../BookingProgressIndicator';
import { renderHook } from '@testing-library/react';

const theme = createTheme();

// Wrapper component with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock steps data
const mockSteps = [
  { id: 'intro', label: 'Introduction', shortLabel: 'Intro', isCompleted: true, isCurrent: false },
  {
    id: 'contact',
    label: 'Contact Info',
    shortLabel: 'Contact',
    isCompleted: true,
    isCurrent: false,
  },
  { id: 'datetime', label: 'Date & Time', shortLabel: 'Date', isCompleted: false, isCurrent: true },
  { id: 'package', label: 'Package', shortLabel: 'Package', isCompleted: false, isCurrent: false },
  { id: 'payment', label: 'Payment', shortLabel: 'Pay', isCompleted: false, isCurrent: false },
];

describe('BookingProgressIndicator', () => {
  describe('Linear variant', () => {
    it('renders linear progress bar', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="linear"
          />
        </TestWrapper>,
      );

      // Should show step count
      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
    });

    it('calculates progress percentage correctly', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="linear"
          />
        </TestWrapper>,
      );

      // 2 out of 5 steps = 40%
      expect(screen.getByText('40% Complete')).toBeInTheDocument();
    });

    it('shows current step label when showLabels is true', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="linear"
            showLabels={true}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Date & Time')).toBeInTheDocument();
    });

    it('hides labels when showLabels is false', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="linear"
            showLabels={false}
          />
        </TestWrapper>,
      );

      // Label should not be in the output with variant h6
      const h6Elements = screen.queryAllByRole('heading', { level: 6 });
      expect(h6Elements).toHaveLength(0);
    });

    it('shows step description when available', () => {
      const stepsWithDescription = [
        ...mockSteps.slice(0, 2),
        { ...mockSteps[2], description: 'Select your preferred date and time' },
        ...mockSteps.slice(3),
      ];

      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={stepsWithDescription}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="linear"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Select your preferred date and time')).toBeInTheDocument();
    });
  });

  describe('Compact variant', () => {
    it('renders compact progress indicator', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="compact"
          />
        </TestWrapper>,
      );

      // Should show step counter chip
      expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('shows short label in compact mode', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="compact"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('falls back to full label when shortLabel not available', () => {
      const stepsWithoutShortLabel = mockSteps.map((s, i) =>
        i === 2 ? { ...s, shortLabel: undefined } : s,
      );

      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={stepsWithoutShortLabel}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="compact"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Date & Time')).toBeInTheDocument();
    });
  });

  describe('Stepper variant (default)', () => {
    it('renders stepper with all step labels', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
            variant="stepper"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
      expect(screen.getByText('Date & Time')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Payment')).toBeInTheDocument();
    });

    it('shows progress percentage in stepper variant', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('shows optional label for optional steps', () => {
      const stepsWithOptional = [
        ...mockSteps,
        {
          id: 'questionnaire',
          label: 'Questionnaire',
          isCompleted: false,
          isCurrent: false,
          isOptional: true,
        },
      ];

      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={stepsWithOptional}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Optional')).toBeInTheDocument();
    });
  });

  describe('Step status', () => {
    it('identifies completed steps', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={2}
            completedSteps={['intro', 'contact']}
          />
        </TestWrapper>,
      );

      // Should have completed icon for completed steps
      // We can't easily check SVG icons, but we can verify the component renders
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('handles empty completedSteps array', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator steps={mockSteps} currentStepIndex={0} completedSteps={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles all steps completed', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={4}
            completedSteps={['intro', 'contact', 'datetime', 'package', 'payment']}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Progress calculation', () => {
    it('calculates 0% for no completed steps', () => {
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={0}
            completedSteps={[]}
            variant="linear"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('0% Complete')).toBeInTheDocument();
    });

    it('calculates 100% for all completed steps', () => {
      const allIds = mockSteps.map((s) => s.id);

      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={4}
            completedSteps={allIds}
            variant="linear"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('100% Complete')).toBeInTheDocument();
    });

    it('rounds progress percentage', () => {
      // 1 out of 5 = 20%
      render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={1}
            completedSteps={['intro']}
            variant="linear"
          />
        </TestWrapper>,
      );

      expect(screen.getByText('20% Complete')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TestWrapper>
          <BookingProgressIndicator
            steps={mockSteps}
            currentStepIndex={0}
            completedSteps={[]}
            className="custom-class"
          />
        </TestWrapper>,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});

describe('useBookingSteps', () => {
  it('returns standard booking steps when no config provided', () => {
    const { result } = renderHook(() => useBookingSteps());

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].id).toBe('introduction');
  });

  it('returns all standard steps', () => {
    const { result } = renderHook(() => useBookingSteps());

    const stepIds = result.current.map((s) => s.id);
    expect(stepIds).toContain('introduction');
    expect(stepIds).toContain('contact_info');
    expect(stepIds).toContain('datetime');
    expect(stepIds).toContain('package_selection');
    expect(stepIds).toContain('payment_info');
    expect(stepIds).toContain('confirmation');
  });

  it('filters steps based on flow configuration', () => {
    const flowConfig = {
      steps: [
        { step_type: 'INTRODUCTION' },
        { step_type: 'CONTACT_INFO' },
        { step_type: 'CONFIRMATION' },
      ],
    };

    const { result } = renderHook(() => useBookingSteps(flowConfig));

    expect(result.current.length).toBe(3);
    expect(result.current.map((s) => s.id)).toEqual([
      'introduction',
      'contact_info',
      'confirmation',
    ]);
  });

  it('marks optional steps correctly', () => {
    const { result } = renderHook(() => useBookingSteps());

    const addonStep = result.current.find((s) => s.id === 'addon_selection');
    const questionnaireStep = result.current.find((s) => s.id === 'questionnaire');

    expect(addonStep?.isOptional).toBe(true);
    expect(questionnaireStep?.isOptional).toBe(true);
  });

  it('includes short labels for mobile view', () => {
    const { result } = renderHook(() => useBookingSteps());

    result.current.forEach((step) => {
      expect(step.shortLabel).toBeDefined();
    });
  });

  it('includes descriptions for steps', () => {
    const { result } = renderHook(() => useBookingSteps());

    result.current.forEach((step) => {
      expect(step.description).toBeDefined();
    });
  });
});
