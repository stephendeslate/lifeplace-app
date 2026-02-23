import type {
  DailyKPISnapshot,
  KPISnapshotSummary,
  SystemHealthSnapshot,
  DORAMetricsReport,
} from '../../../types/metrics.types';

export function createMockPlatformMetrics(
  overrides: Partial<DailyKPISnapshot> = {},
): DailyKPISnapshot {
  return {
    date: '2024-06-15',
    total_bookings: 25,
    confirmed_bookings: 18,
    completed_bookings: 12,
    cancelled_bookings: 2,
    event_revenue: 450000,
    total_revenue: 520000,
    avg_booking_value: 28900,
    new_clients: 8,
    booking_sessions: 45,
    completed_sessions: 25,
    conversion_rate: 55.6,
    cumulative_revenue: 5200000,
    cumulative_bookings: 180,
    cumulative_clients: 95,
    revenue_change_pct: 12.5,
    bookings_change_pct: 8.3,
    ...overrides,
  };
}

export function createMockPlatformMetricsSeries(days: number): DailyKPISnapshot[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date('2024-06-01');
    date.setDate(date.getDate() + i);
    return createMockPlatformMetrics({
      date: date.toISOString().split('T')[0],
      total_bookings: 15 + Math.floor(Math.random() * 20),
      confirmed_bookings: 10 + Math.floor(Math.random() * 15),
      completed_bookings: 5 + Math.floor(Math.random() * 10),
      cancelled_bookings: Math.floor(Math.random() * 3),
      event_revenue: 300000 + Math.floor(Math.random() * 200000),
      total_revenue: 400000 + Math.floor(Math.random() * 250000),
      new_clients: 3 + Math.floor(Math.random() * 10),
      booking_sessions: 30 + Math.floor(Math.random() * 30),
      completed_sessions: 15 + Math.floor(Math.random() * 20),
      conversion_rate: 40 + Math.random() * 30,
      cumulative_revenue: 5000000 + i * 50000,
      cumulative_bookings: 160 + i * 2,
      cumulative_clients: 80 + i,
      revenue_change_pct: -5 + Math.random() * 20,
      bookings_change_pct: -3 + Math.random() * 15,
    });
  });
}

export const mockPlatformMetrics = createMockPlatformMetricsSeries(30);

export function createMockKPISnapshotSummary(
  overrides: Partial<KPISnapshotSummary> = {},
): KPISnapshotSummary {
  return {
    latest_date: '2024-06-15',
    cumulative_revenue: 5200000,
    cumulative_bookings: 180,
    cumulative_clients: 95,
    latest_conversion_rate: 55.6,
    trends_7d: {
      revenue_pct: 12.5,
      bookings_pct: 8.3,
      clients_pct: 15.2,
    },
    trends_30d: {
      revenue_pct: 22.1,
      bookings_pct: 18.7,
      clients_pct: 25.0,
    },
    ...overrides,
  };
}

export const mockKPISnapshotSummary = createMockKPISnapshotSummary();

export function createMockSystemHealth(
  overrides: Partial<SystemHealthSnapshot> = {},
): SystemHealthSnapshot {
  return {
    date: '2024-06-15',
    error_count: 3,
    pending_review_count: 2,
    celery_tasks_failed: 1,
    celery_success_rate: 99.2,
    cache_hit_ratio: 0.85,
    cache_memory_used_bytes: 52428800,
    total_queue_depth: 5,
    open_circuit_breakers: 0,
    circuit_breaker_states: {
      stripe: 'CLOSED',
      paymongo: 'CLOSED',
      email: 'CLOSED',
    },
    broker_healthy: true,
    broker_ping_ms: 12,
    ...overrides,
  };
}

export function createMockSystemHealthSeries(days: number): SystemHealthSnapshot[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date('2024-06-01');
    date.setDate(date.getDate() + i);
    return createMockSystemHealth({
      date: date.toISOString().split('T')[0],
      error_count: Math.floor(Math.random() * 10),
      pending_review_count: Math.floor(Math.random() * 5),
      celery_tasks_failed: Math.floor(Math.random() * 3),
      celery_success_rate: 95 + Math.random() * 5,
      cache_hit_ratio: 0.7 + Math.random() * 0.25,
      total_queue_depth: Math.floor(Math.random() * 15),
    });
  });
}

export const mockSystemHealthSeries = createMockSystemHealthSeries(30);

export function createMockDORAMetricsReport(
  overrides: Partial<DORAMetricsReport> = {},
): DORAMetricsReport {
  return {
    period_days: 30,
    service: 'backend',
    overall_classification: 'High',
    deployment_frequency: {
      classification: 'Elite',
      days: 30,
      total_deploys: 45,
      daily_average: 1.5,
      weekly_average: 10.5,
    },
    lead_time_for_changes: {
      classification: 'High',
      days: 30,
      avg_seconds: 3600,
      avg_human: '1 hour',
      min_seconds: 600,
      max_seconds: 14400,
      sample_size: 45,
    },
    change_failure_rate: {
      classification: 'High',
      days: 30,
      total_deploys: 45,
      failed_deploys: 2,
      rate_pct: 4.4,
    },
    mean_time_to_recovery: {
      classification: 'High',
      days: 30,
      avg_seconds: 1800,
      avg_human: '30 minutes',
      incident_count: 2,
    },
    ...overrides,
  };
}

export const mockDORAMetricsReport = createMockDORAMetricsReport();
