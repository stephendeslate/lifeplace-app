// frontend/admin-crm/src/pages/metrics/MetricsDashboard/DeploymentsTab.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { RocketLaunch as RocketIcon, Speed as SpeedIcon } from '@mui/icons-material';
import { useDORAMetrics, useDeploymentHistory } from '@/hooks/useMetrics';
import { formatPhilippinesTime } from '@/utils/timezone';
import { DORACard } from './DORACard';
import { classificationColor, humanizeSeconds } from './utils';

export const DeploymentsTab: React.FC = () => {
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
