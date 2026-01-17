// frontend/client-portal/src/components/events/EventQuestionnaires.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EventQuestionnaires from './EventQuestionnaires';
import { ToastProvider } from '../../contexts/ToastContext';
import type { Questionnaire, QuestionnaireResponse } from '../../types/questionnaires.types';

const mockQuestionnaires: Questionnaire[] = [
  {
    id: 1,
    name: 'Event Details',
    event_type: null,
    is_active: true,
    order: 1,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    fields_count: 2,
    fields: [
      {
        id: 1,
        questionnaire: 1,
        name: 'Event Name',
        type: 'text',
        type_display: 'Text',
        required: true,
        order: 1,
        options: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 2,
        questionnaire: 1,
        name: 'Guest Count',
        type: 'number',
        type_display: 'Number',
        required: false,
        order: 2,
        options: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ],
  },
];

const mockResponses: QuestionnaireResponse[] = [
  {
    id: 1,
    event: 1,
    field: 1,
    field_name: 'Event Name',
    field_type: 'text',
    value: 'Birthday Party',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

const mockSaveResponses = vi.fn();

// Mock the hooks
vi.mock('../../hooks/useEventQuestionnaires', () => ({
  useEventQuestionnaires: () => ({
    useQuestionnairesForEvent: () => ({
      data: mockQuestionnaires,
      isLoading: false,
      error: null,
    }),
    useEventResponses: () => ({
      data: mockResponses,
      isLoading: false,
      error: null,
    }),
    useSaveEventResponses: () => ({
      mutate: mockSaveResponses,
      isPending: false,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    expect(screen.getByText('Event Questionnaires')).toBeInTheDocument();
  });

  it('shows questionnaire accordions', () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    // 'Event Details' appears in both accordion and summary card
    expect(screen.getAllByText('Event Details').length).toBeGreaterThan(0);
    expect(screen.getByText('1 of 2 fields completed')).toBeInTheDocument();
  });

  it('shows Edit Responses button in view mode', () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /edit responses/i })).toBeInTheDocument();
  });

  it('enters edit mode when Edit Responses is clicked', async () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    const editButton = screen.getByRole('button', { name: /edit responses/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save responses/i })).toBeInTheDocument();
    });
  });

  it('displays response summary card', () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    expect(screen.getByText('Response Summary')).toBeInTheDocument();
    expect(screen.getByText('1/2 fields completed')).toBeInTheDocument();
  });

  it('expands accordion when clicked', async () => {
    render(
      <TestWrapper>
        <EventQuestionnaires eventId={1} />
      </TestWrapper>
    );

    // Get the accordion summary (first occurrence of 'Event Details')
    const accordionHeaders = screen.getAllByText('Event Details');
    fireEvent.click(accordionHeaders[0]);

    await waitFor(() => {
      expect(screen.getByText('Event Name')).toBeInTheDocument();
      expect(screen.getByText('Guest Count')).toBeInTheDocument();
    });
  });
});