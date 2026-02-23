// frontend/client-portal/src/components/events/WorkflowProgressStepper.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { WorkflowProgressStepper } from './WorkflowProgressStepper';
import type { WorkflowProgress } from '../../apis/workflows.api';

const theme = createTheme();

const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const mockProgress: WorkflowProgress = {
  current_stage_id: 2,
  current_stage_name: 'Quote Review',
  current_stage_type: 'LEAD',
  total_stages: 4,
  completed_stages: 1,
  progress_percentage: 25,
  stages: [
    { id: 1, name: 'Initial Contact', stage: 'LEAD', order: 1, status: 'completed' },
    { id: 2, name: 'Quote Review', stage: 'LEAD', order: 2, status: 'current' },
    { id: 3, name: 'Event Preparation', stage: 'PRODUCTION', order: 1, status: 'pending' },
    { id: 4, name: 'Thank You Call', stage: 'POST_PRODUCTION', order: 1, status: 'pending' },
  ],
};

describe('WorkflowProgressStepper', () => {
  describe('linear variant', () => {
    it('renders progress bar with percentage', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="linear" />);

      expect(screen.getByText('25% Complete')).toBeInTheDocument();
      expect(screen.getByText('Quote Review')).toBeInTheDocument();
    });

    it('displays current stage name', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="linear" />);

      expect(screen.getByText('Quote Review')).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders stage count', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="compact" />);

      expect(screen.getByText('1/4')).toBeInTheDocument();
    });

    it('displays current stage name', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="compact" />);

      expect(screen.getByText('Quote Review')).toBeInTheDocument();
    });
  });

  describe('stepper variant', () => {
    it('renders all stage names when showLabels is true', () => {
      renderWithTheme(
        <WorkflowProgressStepper progress={mockProgress} variant="stepper" showLabels />,
      );

      expect(screen.getByText('Initial Contact')).toBeInTheDocument();
      expect(screen.getByText('Quote Review')).toBeInTheDocument();
      expect(screen.getByText('Event Preparation')).toBeInTheDocument();
      expect(screen.getByText('Thank You Call')).toBeInTheDocument();
    });

    it('renders stage type labels', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="stepper" />);

      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Preparation')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
    });

    it('renders progress summary', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="stepper" />);

      expect(screen.getByText('Overall Progress:')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('renders Event Progress title', () => {
      renderWithTheme(<WorkflowProgressStepper progress={mockProgress} variant="stepper" />);

      expect(screen.getByText('Event Progress')).toBeInTheDocument();
    });
  });

  describe('progress calculations', () => {
    it('displays correct percentage at start', () => {
      const startProgress: WorkflowProgress = {
        ...mockProgress,
        completed_stages: 0,
        progress_percentage: 0,
        stages: mockProgress.stages.map((s, i) => ({
          ...s,
          status: i === 0 ? 'current' : 'pending',
        })) as WorkflowProgress['stages'],
      };

      renderWithTheme(<WorkflowProgressStepper progress={startProgress} variant="linear" />);

      expect(screen.getByText('0% Complete')).toBeInTheDocument();
    });

    it('displays correct percentage at completion', () => {
      const completeProgress: WorkflowProgress = {
        ...mockProgress,
        completed_stages: 4,
        progress_percentage: 100,
        current_stage_name: 'Follow-up',
        stages: mockProgress.stages.map((s) => ({
          ...s,
          status: 'completed',
        })) as WorkflowProgress['stages'],
      };

      renderWithTheme(<WorkflowProgressStepper progress={completeProgress} variant="linear" />);

      expect(screen.getByText('100% Complete')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('handles empty stages array gracefully', () => {
      const emptyProgress: WorkflowProgress = {
        current_stage_id: null,
        current_stage_name: null,
        current_stage_type: null,
        total_stages: 0,
        completed_stages: 0,
        progress_percentage: 0,
        stages: [],
      };

      // Should not throw
      expect(() => {
        renderWithTheme(<WorkflowProgressStepper progress={emptyProgress} variant="stepper" />);
      }).not.toThrow();
    });

    it('displays "Not started" for null current stage', () => {
      const notStartedProgress: WorkflowProgress = {
        ...mockProgress,
        current_stage_name: null,
      };

      renderWithTheme(<WorkflowProgressStepper progress={notStartedProgress} variant="linear" />);

      expect(screen.getByText('Not started')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = renderWithTheme(
        <WorkflowProgressStepper
          progress={mockProgress}
          variant="stepper"
          className="custom-class"
        />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
