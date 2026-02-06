// frontend/admin-crm/src/types/metrics.types.ts

export interface DailyKPISnapshot {
  date: string;
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  event_revenue: number;
  total_revenue: number;
  avg_booking_value: number;
  new_clients: number;
  booking_sessions: number;
  completed_sessions: number;
  conversion_rate: number;
  cumulative_revenue: number;
  cumulative_bookings: number;
  cumulative_clients: number;
  revenue_change_pct: number | null;
  bookings_change_pct: number | null;
}

export interface KPISnapshotSummary {
  latest_date: string;
  cumulative_revenue: number;
  cumulative_bookings: number;
  cumulative_clients: number;
  latest_conversion_rate: number;
  trends_7d: {
    revenue_pct: number | null;
    bookings_pct: number | null;
    clients_pct: number | null;
  };
  trends_30d: {
    revenue_pct: number | null;
    bookings_pct: number | null;
    clients_pct: number | null;
  };
}

export interface SystemHealthSnapshot {
  date: string;
  error_count: number;
  pending_review_count: number;
  celery_tasks_failed: number;
  celery_success_rate: number;
  cache_hit_ratio: number | null;
  cache_memory_used_bytes: number | null;
  total_queue_depth: number;
  open_circuit_breakers: number;
  circuit_breaker_states: Record<string, string>;
  broker_healthy: boolean;
  broker_ping_ms: number | null;
}

export interface Deployment {
  id: string;
  git_sha: string;
  git_sha_short: string;
  commit_message: string;
  service: string;
  environment: string;
  status: 'SUCCESS' | 'FAILURE' | 'ROLLBACK';
  triggered_by: string;
  deploy_duration_seconds: number | null;
  lead_time_seconds: number | null;
  caused_incident: boolean;
  github_run_url: string;
  created_at: string;
}

export interface DORAMetric {
  classification: 'Elite' | 'High' | 'Medium' | 'Low' | 'N/A';
  days: number;
}

export interface DeploymentFrequency extends DORAMetric {
  total_deploys: number;
  daily_average: number;
  weekly_average: number;
}

export interface LeadTimeForChanges extends DORAMetric {
  avg_seconds: number | null;
  avg_human: string;
  min_seconds: number | null;
  max_seconds: number | null;
  sample_size: number;
}

export interface ChangeFailureRate extends DORAMetric {
  total_deploys: number;
  failed_deploys: number;
  rate_pct: number;
}

export interface MeanTimeToRecovery extends DORAMetric {
  avg_seconds: number | null;
  avg_human: string;
  incident_count: number;
}

export interface DORAMetricsReport {
  period_days: number;
  service: string;
  overall_classification: string;
  deployment_frequency: DeploymentFrequency;
  lead_time_for_changes: LeadTimeForChanges;
  change_failure_rate: ChangeFailureRate;
  mean_time_to_recovery: MeanTimeToRecovery;
}
