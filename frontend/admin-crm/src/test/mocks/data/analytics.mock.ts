import type { DashboardKPIs, BookingSummary } from '../../../types/analytics.types';

export function createMockDashboardKPIs(overrides: Partial<DashboardKPIs> = {}): DashboardKPIs {
  return {
    total_bookings: 150,
    confirmed_bookings: 100,
    completed_bookings: 80,
    cancelled_bookings: 10,
    event_revenue: 500000,
    total_revenue: 750000,
    event_revenue_trend: 12.5,
    total_revenue_trend: 8.3,
    avg_booking_value: 5000,
    new_clients: 25,
    booking_sessions: 200,
    completed_sessions: 150,
    conversion_rate: 75,
    period: {
      startDate: '2024-06-01',
      endDate: '2024-06-30',
    },
    ...overrides,
  };
}

export function createMockBookingsSummary(count = 3): BookingSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    period: `2024-06-${String(i * 10 + 1).padStart(2, '0')}`,
    total_bookings: 50 + i * 10,
    confirmed_bookings: 30 + i * 5,
    completed_bookings: 20 + i * 5,
    cancelled_bookings: 2 + i,
    leads: 10 + i * 3,
    total_revenue: 100000 + i * 50000,
  }));
}
