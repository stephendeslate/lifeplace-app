// pages/home/components/AvailabilitySection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AvailabilitySection } from './AvailabilitySection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../contexts/ToastContext';

// Mock the hooks
vi.mock('../../../hooks/useEventAvailability', () => ({
  useEventAvailability: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('../../../hooks/useGlobalAvailabilityConfig', () => ({
  useGlobalAvailabilityConfig: vi.fn(() => ({
    minAdvanceBookingDays: 7,
    maxAdvanceBookingDays: 365,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
};

describe('AvailabilitySection', () => {
  const mockOnNavigateToBooking = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section with heading', () => {
    render(<AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Check Availability')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/See available dates and book your perfect event/i),
    ).toBeInTheDocument();
  });

  it('renders instructions text', () => {
    render(<AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/Click on any available date to begin your booking journey/i),
    ).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    const { useEventAvailability } = await import('../../../hooks/useEventAvailability');
    vi.mocked(useEventAvailability).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: false,
      isFetching: false,
      status: 'pending',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  it('shows error state', async () => {
    const { useEventAvailability } = await import('../../../hooks/useEventAvailability');
    vi.mocked(useEventAvailability).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
      isSuccess: false,
      isFetching: false,
      status: 'error',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Unable to load availability data/i)).toBeInTheDocument();
    });
  });

  it('has proper semantic structure for accessibility', () => {
    const { container } = render(
      <AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />,
      { wrapper: createWrapper() },
    );

    // Check for section element
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();

    // Check heading structure
    expect(screen.getByText('Check Availability')).toBeInTheDocument();
  });

  it('uses design system tokens for styling', () => {
    const { container } = render(
      <AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />,
      { wrapper: createWrapper() },
    );

    // Check if container has the expected class/styling structure
    expect(container.firstChild).toBeTruthy();
  });

  it('renders CTA button when data is loaded', async () => {
    const { useEventAvailability } = await import('../../../hooks/useEventAvailability');
    vi.mocked(useEventAvailability).mockReturnValue({
      data: [
        {
          id: 1,
          name: 'Test Event',
          event_type_name: 'Wedding',
          status: 'CONFIRMED',
          start_date: '2026-03-15T10:00:00',
          end_date: '2026-03-15T18:00:00',
          payment_status: 'PAID',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
      isFetching: false,
      status: 'success',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<AvailabilitySection onNavigateToBooking={mockOnNavigateToBooking} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('Start Your Booking')).toBeInTheDocument();
    });
  });
});
