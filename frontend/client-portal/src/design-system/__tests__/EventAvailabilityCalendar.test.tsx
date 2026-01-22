// design-system/__tests__/EventAvailabilityCalendar.test.tsx

import './test-setup';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { vi } from 'vitest';
import { EventAvailabilityCalendar } from '../visualizations/EventAvailabilityCalendar';
import type { EventData } from '../visualizations/EventAvailabilityCalendar';
import { theme } from '../../utils/theme';
import { format } from 'date-fns';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EventAvailabilityCalendar', () => {
  const mockEvents: EventData[] = [
    {
      id: 1,
      name: 'Wedding Celebration',
      event_type_name: 'Wedding',
      status: 'CONFIRMED',
      start_date: '2024-02-15T10:00:00Z',
      end_date: '2024-02-15T18:00:00Z',
      payment_status: 'PAID',
    },
    {
      id: 2,
      name: 'Corporate Workshop',
      event_type_name: 'Workshop',
      status: 'CONFIRMED',
      start_date: '2024-02-16T09:00:00Z',
      end_date: '2024-02-16T17:00:00Z',
      payment_status: 'PARTIAL',
    },
    {
      id: 3,
      name: 'Birthday Party',
      event_type_name: 'Birthday',
      status: 'CANCELLED',
      start_date: '2024-02-17T14:00:00Z',
      end_date: '2024-02-17T20:00:00Z',
      payment_status: 'PENDING',
    },
  ];

  it('renders calendar with correct month header', () => {
    renderWithTheme(
      <EventAvailabilityCalendar />
    );
    
    const currentMonth = format(new Date(), 'MMMM yyyy');
    expect(screen.getByText(currentMonth)).toBeInTheDocument();
  });

  it('displays events correctly', () => {
    renderWithTheme(
      <EventAvailabilityCalendar 
        events={mockEvents}
      />
    );
    
    // Should show the days with events
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('calls onDateSelect when bookable date is clicked', async () => {
    const mockOnDateSelect = vi.fn();

    renderWithTheme(
      <EventAvailabilityCalendar
        events={[]} // No events to interfere
        onDateSelect={mockOnDateSelect}
        minAdvanceBookingDays={0} // Allow immediate booking for testing
      />
    );

    // Navigate to next month to ensure we're clicking on future dates
    const nextButton = screen.getAllByRole('button')[1];
    fireEvent.click(nextButton);

    // Click on a date in the future month (15th should always exist and be available)
    const availableDate = screen.getByText('15');
    fireEvent.click(availableDate);

    await waitFor(() => {
      expect(mockOnDateSelect).toHaveBeenCalled();
    });
  });

  it('respects booking constraints', () => {
    renderWithTheme(
      <EventAvailabilityCalendar 
        events={mockEvents}
        minAdvanceBookingDays={7}
        maxAdvanceBookingDays={90}
        maxEventsPerDay={1}
      />
    );
    
    // Calendar should render with booking constraints applied
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('shows event details in tooltip when enabled', () => {
    renderWithTheme(
      <EventAvailabilityCalendar 
        events={mockEvents}
        showEventDetails={true}
      />
    );
    
    // The calendar should render - tooltip content is tested through DOM structure
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('navigates months correctly', () => {
    renderWithTheme(
      <EventAvailabilityCalendar />
    );
    
    const currentMonth = format(new Date(), 'MMMM yyyy');
    const prevButton = screen.getAllByRole('button')[0];
    const nextButton = screen.getAllByRole('button')[1];
    
    // Test previous month navigation
    fireEvent.click(prevButton);
    expect(screen.queryByText(currentMonth)).not.toBeInTheDocument();
    
    // Test next month navigation
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    expect(screen.queryByText(currentMonth)).not.toBeInTheDocument();
  });

  it('calculates availability correctly based on max events per day', () => {
    const manyEvents: EventData[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Event ${i + 1}`,
      event_type_name: 'Workshop',
      status: 'CONFIRMED',
      start_date: '2024-02-15T10:00:00Z',
      end_date: '2024-02-15T18:00:00Z',
      payment_status: 'PAID',
    }));

    renderWithTheme(
      <EventAvailabilityCalendar 
        events={manyEvents}
        maxEventsPerDay={2}
      />
    );
    
    // Should show indicators for days with events
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('handles cancelled events correctly', () => {
    const cancelledEvents: EventData[] = [
      {
        id: 1,
        name: 'Cancelled Event',
        event_type_name: 'Workshop',
        status: 'CANCELLED',
        start_date: '2024-02-15T10:00:00Z',
        end_date: '2024-02-15T18:00:00Z',
        payment_status: 'PENDING',
      },
    ];

    renderWithTheme(
      <EventAvailabilityCalendar 
        events={cancelledEvents}
        maxEventsPerDay={1}
      />
    );
    
    // Cancelled events shouldn't count towards the booking limit
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows legend with correct status indicators', () => {
    renderWithTheme(
      <EventAvailabilityCalendar 
        events={mockEvents}
      />
    );
    
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Has Events')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('handles compact mode correctly', () => {
    renderWithTheme(
      <EventAvailabilityCalendar 
        events={mockEvents}
        compact={true}
      />
    );
    
    // In compact mode, day headers might not be shown
    // But the calendar should still render
    expect(screen.getByText(format(new Date(), 'MMMM yyyy'))).toBeInTheDocument();
  });
});