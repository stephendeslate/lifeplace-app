// frontend/client-portal/src/components/events/EventQuestionnaires.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import EventQuestionnaires from './EventQuestionnaires';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock the hooks
vi.mock('../../hooks/useEventQuestionnaires', () => ({
  useEventQuestionnaires: () => ({
    useActiveQuestionnaires: () => ({
      data: [],
      isLoading: false,
      error: null,
    }),
    useEventResponses: () => ({
      data: [],
      isLoading: false,
      error: null,
    }),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('EventQuestionnaires', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    // Check for empty state since no questionnaires are provided
    expect(screen.getByText('No questionnaires available')).toBeInTheDocument();
  });

  it('shows empty state when no questionnaires', () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    expect(screen.getByText('No questionnaires available')).toBeInTheDocument();
    expect(screen.getByText('Questionnaires for this event will appear here when available.')).toBeInTheDocument();
  });
});