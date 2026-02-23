// frontend/admin-crm/src/pages/metrics/MetricsDashboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  CircularProgress,
  Tooltip,
  Link,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  RocketLaunch as RocketIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { useLayout } from '../../contexts/LayoutContext';
import {
  useKPISnapshots,
  useKPISnapshotSummary,
  useSystemHealthSnapshots,
  useDORAMetrics,
  useDeploymentHistory,
} from '../../hooks/useMetrics';
import { formatPhilippinesTime } from '../../utils/timezone';

// ============================================================================
// Helper Components
// ============================================================================

const classificationColor = (
  classification: string,
): 'success' | 'info' | 'warning' | 'error' | 'default' => {
  switch (classification) {
    case 'Elite':
      return 'success';
    case 'High':
      return 'info';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'error';
    default:
      return 'default';
  }
};

const TrendIndicator: React.FC<{ value: number | null; suffix?: string }> = ({
  value,
  suffix = '%',
}) => {
  if (value === null || value === undefined)
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  const isPositive = value >= 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {isPositive ? (
        <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
      )}
      <Typography variant="body2" color={isPositive ? 'success.main' : 'error.main'}>
        {isPositive ? '+' : ''}
        {value.toFixed(1)}
        {suffix}
      </Typography>
    </Box>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  trend7d?: number | null;
  trend30d?: number | null;
  icon?: React.ReactNode;
}> = ({ title, value, trend7d, trend30d, icon }) => (
  <Card sx={{ flex: 1, minWidth: 200 }}>
    <CardContent>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
      >
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {icon}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {value}
      </Typography>
      {(trend7d !== undefined || trend30d !== undefined) && (
        <Stack direction="row" spacing={2}>
          {trend7d !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                7d
              </Typography>
              <TrendIndicator value={trend7d ?? null} />
            </Box>
          )}
          {trend30d !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                30d
              </Typography>
              <TrendIndicator value={trend30d ?? null} />
            </Box>
          )}
        </Stack>
      )}
    </CardContent>
  </Card>
);

const DORACard: React.FC<{
  title: string;
  value: string;
  classification: string;
  subtitle?: string;
}> = ({ title, value, classification, subtitle }) => (
  <Card sx={{ flex: 1, minWidth: 200 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {value}
      </Typography>
      <Chip
        label={classification}
        color={classificationColor(classification)}
        size="small"
        sx={{ fontWeight: 600 }}
      />
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ============================================================================
// Tab Panels
// ============================================================================

const PlatformImpactTab: React.FC = () => {
  const { data: summary, isLoading: summaryLoading } = useKPISnapshotSummary();
  const { data: snapshotsData, isLoading: snapshotsLoading } = useKPISnapshots();

  const snapshots = snapshotsData?.snapshots || [];

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: formatPhilippinesTime(s.date, false, 'MMM d'),
        revenue: s.total_revenue,
        bookings: s.total_bookings,
        clients: s.new_clients,
        conversion: s.conversion_rate,
      })),
    [snapshots],
  );

  if (summaryLoading || snapshotsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No KPI snapshots available yet. Data will appear after the daily snapshot task runs.
        </Typography>
      </Box>
    );
  }

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `₱${(val / 1_000).toFixed(1)}K`;
    return `₱${val.toFixed(0)}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <MetricCard
          title="Lifetime Revenue"
          value={formatCurrency(summary.cumulative_revenue)}
          trend7d={summary.trends_7d.revenue_pct}
          trend30d={summary.trends_30d.revenue_pct}
        />
        <MetricCard
          title="Total Bookings"
          value={summary.cumulative_bookings.toLocaleString()}
          trend7d={summary.trends_7d.bookings_pct}
          trend30d={summary.trends_30d.bookings_pct}
        />
        <MetricCard
          title="Total Clients"
          value={summary.cumulative_clients.toLocaleString()}
          trend7d={summary.trends_7d.clients_pct}
          trend30d={summary.trends_30d.clients_pct}
        />
        <MetricCard title="Conversion Rate" value={`${summary.latest_conversion_rate}%`} />
      </Box>

      {/* Revenue Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1976d2"
                  name="Revenue (₱)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bookings + Clients Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Bookings & New Clients
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="bookings" fill="#1976d2" name="Bookings" />
                <Bar dataKey="clients" fill="#2e7d32" name="New Clients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

const SystemHealthTab: React.FC = () => {
  const { data: healthData, isLoading } = useSystemHealthSnapshots();

  const snapshots = healthData?.snapshots || [];

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: formatPhilippinesTime(s.date, false, 'MMM d'),
        errors: s.error_count,
        success_rate: s.celery_success_rate,
        open_breakers: s.open_circuit_breakers,
        broker_ping: s.broker_ping_ms,
      })),
    [snapshots],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No system health snapshots available yet. Data will appear after the daily health check
          runs.
        </Typography>
      </Box>
    );
  }

  const latest = snapshots[snapshots.length - 1];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Health Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <MetricCard
          title="Celery Success Rate"
          value={`${latest.celery_success_rate}%`}
          icon={
            latest.celery_success_rate >= 99 ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="warning" />
            )
          }
        />
        <MetricCard
          title="DLQ Errors (Latest)"
          value={latest.error_count}
          icon={
            latest.error_count === 0 ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="warning" />
            )
          }
        />
        <MetricCard title="Pending Review" value={latest.pending_review_count} />
        <MetricCard
          title="Open Circuit Breakers"
          value={latest.open_circuit_breakers}
          icon={
            latest.open_circuit_breakers === 0 ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="error" />
            )
          }
        />
      </Box>

      {/* Error Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Error Count Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip />
                <Bar dataKey="errors" fill="#d32f2f" name="DLQ Errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Success Rate Trend */}
      {chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Task Success Rate
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[90, 100]} fontSize={12} />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="success_rate"
                  stroke="#2e7d32"
                  name="Success Rate (%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Circuit Breaker States */}
      {latest.circuit_breaker_states && Object.keys(latest.circuit_breaker_states).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Circuit Breaker States
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(latest.circuit_breaker_states).map(([service, state]) => (
                <Chip
                  key={service}
                  label={`${service}: ${state}`}
                  color={state === 'CLOSED' ? 'success' : state === 'OPEN' ? 'error' : 'warning'}
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

const DeploymentsTab: React.FC = () => {
  const { data: doraReport, isLoading: doraLoading } = useDORAMetrics(30);
  const { data: deployments, isLoading: deploymentsLoading } = useDeploymentHistory(25);

  if (doraLoading || deploymentsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* DORA Metrics Cards */}
      {doraReport && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: -1 }}>
            <SpeedIcon color="primary" />
            <Typography variant="h6">DORA Metrics (30 days)</Typography>
            <Chip
              label={`Overall: ${doraReport.overall_classification}`}
              color={classificationColor(doraReport.overall_classification)}
              size="small"
              sx={{ ml: 1, fontWeight: 600 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <DORACard
              title="Deployment Frequency"
              value={`${doraReport.deployment_frequency.daily_average}/day`}
              classification={doraReport.deployment_frequency.classification}
              subtitle={`${doraReport.deployment_frequency.total_deploys} total deploys`}
            />
            <DORACard
              title="Lead Time for Changes"
              value={doraReport.lead_time_for_changes.avg_human}
              classification={doraReport.lead_time_for_changes.classification}
              subtitle={`${doraReport.lead_time_for_changes.sample_size} samples`}
            />
            <DORACard
              title="Change Failure Rate"
              value={`${doraReport.change_failure_rate.rate_pct}%`}
              classification={doraReport.change_failure_rate.classification}
              subtitle={`${doraReport.change_failure_rate.failed_deploys}/${doraReport.change_failure_rate.total_deploys} failed`}
            />
            <DORACard
              title="Mean Time to Recovery"
              value={doraReport.mean_time_to_recovery.avg_human}
              classification={doraReport.mean_time_to_recovery.classification}
              subtitle={`${doraReport.mean_time_to_recovery.incident_count} incidents`}
            />
          </Box>
        </>
      )}

      {/* Recent Deployments Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <RocketIcon color="primary" />
            <Typography variant="h6">Recent Deployments</Typography>
          </Box>

          {deployments && deployments.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SHA</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Commit</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Lead Time</TableCell>
                    <TableCell>When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deployments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.github_run_url ? (
                          <Link
                            href={d.github_run_url}
                            target="_blank"
                            rel="noopener"
                            sx={{ fontFamily: 'monospace', fontSize: 13 }}
                          >
                            {d.git_sha_short}
                          </Link>
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontSize: 13 }}
                          >
                            {d.git_sha_short}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={d.service} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={d.status}
                          size="small"
                          color={
                            d.status === 'SUCCESS'
                              ? 'success'
                              : d.status === 'FAILURE'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={d.commit_message}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                            {d.commit_message || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {d.deploy_duration_seconds != null
                          ? `${Math.floor(d.deploy_duration_seconds / 60)}m ${d.deploy_duration_seconds % 60}s`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {d.lead_time_seconds != null ? humanizeSeconds(d.lead_time_seconds) : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatPhilippinesTime(d.created_at, false, 'MMM d, hh:mm a')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No deployments recorded yet. Deploy to production to start tracking.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

function humanizeSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ============================================================================
// Main Component
// ============================================================================

export const MetricsDashboard: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    setBreadcrumbs([{ label: 'Metrics' }]);
  }, [setBreadcrumbs]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Platform Metrics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track platform impact, system health, and deployment performance.
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Platform Impact" />
        <Tab label="System Health" />
        <Tab label="Deployments & DORA" />
      </Tabs>

      {tabIndex === 0 && <PlatformImpactTab />}
      {tabIndex === 1 && <SystemHealthTab />}
      {tabIndex === 2 && <DeploymentsTab />}
    </Box>
  );
};
