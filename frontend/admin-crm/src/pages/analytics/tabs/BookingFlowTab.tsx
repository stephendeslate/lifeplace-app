// frontend/admin-crm/src/pages/analytics/tabs/BookingFlowTab.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
} from '@mui/material';
import { ModernCard } from '../../../components/common/ModernCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { KPICard, KPIGrid } from '../../../components/analytics';
import {
  useBookingFlowFunnel,
  useBookingFlowPerformance,
  useBookingFlowAbandonment,
  useBookingFlowTrends,
} from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';
import { formatCurrency } from '../../../utils/currency';
import { formatPercent } from '../../../utils/formatters';

interface BookingFlowTabProps {
  dateRange: DateRange;
}

export const BookingFlowTab: React.FC<BookingFlowTabProps> = ({ dateRange }) => {
  const [selectedFlowId, setSelectedFlowId] = useState<string | undefined>(undefined);

  const { data: performance, isLoading: performanceLoading } = useBookingFlowPerformance(dateRange);
  const { data: funnel, isLoading: funnelLoading } = useBookingFlowFunnel(
    dateRange,
    selectedFlowId,
  );
  const { data: abandonment, isLoading: abandonmentLoading } = useBookingFlowAbandonment(
    dateRange,
    selectedFlowId,
  );
  const { data: trends, isLoading: trendsLoading } = useBookingFlowTrends(
    dateRange,
    selectedFlowId,
  );

  // Calculate overall metrics
  const totalSessions = performance?.reduce((sum, f) => sum + f.total_sessions, 0) ?? 0;
  const totalCompleted = performance?.reduce((sum, f) => sum + f.completed_sessions, 0) ?? 0;
  const totalAbandoned = performance?.reduce((sum, f) => sum + f.abandoned_sessions, 0) ?? 0;
  const totalRevenue = performance?.reduce((sum, f) => sum + f.total_revenue, 0) ?? 0;
  const overallConversionRate = totalSessions > 0 ? (totalCompleted / totalSessions) * 100 : 0;

  return (
    <Box>
      {/* Overall Metrics */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Overall Booking Flow Metrics
        </Typography>
        <KPIGrid>
          <KPICard
            title="Total Sessions"
            value={totalSessions}
            isLoading={performanceLoading}
            color="primary"
          />
          <KPICard
            title="Completed"
            value={totalCompleted}
            isLoading={performanceLoading}
            color="success"
          />
          <KPICard
            title="Abandoned"
            value={totalAbandoned}
            isLoading={performanceLoading}
            color="error"
          />
          <KPICard
            title="Conversion Rate"
            value={formatPercent(overallConversionRate)}
            isLoading={performanceLoading}
            color="info"
          />
          <KPICard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            isLoading={performanceLoading}
            color="success"
          />
        </KPIGrid>
      </Box>

      {/* Flow Selector */}
      {performance && performance.length > 0 && (
        <Box mb={3}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Filter by Booking Flow</InputLabel>
            <Select
              value={selectedFlowId ?? ''}
              onChange={(e) => setSelectedFlowId(e.target.value || undefined)}
              label="Filter by Booking Flow"
            >
              <MenuItem value="">All Flows</MenuItem>
              {performance.map((flow) => (
                <MenuItem key={flow.flow_id} value={String(flow.flow_id)}>
                  {flow.flow_name} ({flow.event_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Funnel Visualization */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Booking Flow Funnel
        </Typography>
        {funnelLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : funnel && funnel.length > 0 ? (
          <ModernCard variant="flat" size="medium">
            <Box sx={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <BarChart
                  data={funnel}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="step_name" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'sessions_reached' ? value : formatPercent(value),
                      name === 'sessions_reached' ? 'Sessions' : 'Completion Rate',
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="sessions_reached"
                    name="Sessions Reached"
                    fill={tokens.color.charts.series[0]}
                  />
                  <Bar
                    dataKey="completion_rate"
                    name="Completion %"
                    fill={tokens.color.charts.series[1]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            {/* Step-by-step breakdown table */}
            <TableContainer sx={{ mt: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Step</TableCell>
                    <TableCell align="center">Sessions Reached</TableCell>
                    <TableCell align="center">Completed</TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      Completion Rate
                    </TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      Drop-off Rate
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {funnel.map((step, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={step.order + 1}
                            size="small"
                            sx={{ width: 28, height: 24, fontSize: '0.75rem' }}
                          />
                          {step.step_name}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{step.sessions_reached}</TableCell>
                      <TableCell align="center">{step.sessions_completed}</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={step.completion_rate}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            color={
                              step.completion_rate >= 70
                                ? 'success'
                                : step.completion_rate >= 50
                                  ? 'warning'
                                  : 'error'
                            }
                          />
                          {formatPercent(step.completion_rate)}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Chip
                          label={formatPercent(step.drop_off_rate)}
                          size="small"
                          color={
                            step.drop_off_rate <= 10
                              ? 'success'
                              : step.drop_off_rate <= 30
                                ? 'warning'
                                : 'error'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        ) : (
          <ModernCard variant="flat" size="small" sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              No funnel data available for the selected period
            </Typography>
          </ModernCard>
        )}
      </Box>

      {/* Abandonment Analysis */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Abandonment Analysis
        </Typography>
        {abandonmentLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : abandonment && abandonment.by_step?.length > 0 ? (
          <ModernCard variant="flat" size="medium">
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Typography variant="body1">
                Total Abandoned Sessions: <strong>{abandonment.total_abandoned}</strong>
              </Typography>
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Step Where Abandoned</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">% of Total Abandoned</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {abandonment.by_step.map((step, index) => (
                    <TableRow key={index}>
                      <TableCell>{step.step_name}</TableCell>
                      <TableCell align="right">{step.count}</TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={step.percentage}
                            sx={{ width: 80, height: 6, borderRadius: 3 }}
                            color="error"
                          />
                          {formatPercent(step.percentage)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        ) : (
          <ModernCard variant="flat" size="small" sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              No abandonment data available for the selected period
            </Typography>
          </ModernCard>
        )}
      </Box>

      {/* Daily Trends */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Daily Trends
        </Typography>
        {trendsLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : trends && trends.length > 0 ? (
          <ModernCard variant="flat" size="medium">
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.color.charts.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_sessions"
                    name="Total Sessions"
                    stroke={tokens.color.charts.series[0]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed_sessions"
                    name="Completed"
                    stroke={tokens.color.charts.series[1]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="abandoned_sessions"
                    name="Abandoned"
                    stroke={tokens.color.charts.series[3]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </ModernCard>
        ) : (
          <ModernCard variant="flat" size="small" sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              No trend data available for the selected period
            </Typography>
          </ModernCard>
        )}
      </Box>

      {/* Flow Performance Table */}
      <Box>
        <Typography variant="h6" mb={2}>
          Performance by Booking Flow
        </Typography>
        {performanceLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : performance && performance.length > 0 ? (
          <ModernCard variant="flat" size="medium">
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Flow Name</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell align="right">Sessions</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">Conversion</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      Abandonment
                    </TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      Avg. Revenue
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performance.map((flow) => (
                    <TableRow key={flow.flow_id}>
                      <TableCell>{flow.flow_name}</TableCell>
                      <TableCell>
                        <Chip label={flow.event_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{flow.total_sessions}</TableCell>
                      <TableCell align="right">{flow.completed_sessions}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatPercent(flow.conversion_rate)}
                          size="small"
                          color={
                            flow.conversion_rate >= 50
                              ? 'success'
                              : flow.conversion_rate >= 25
                                ? 'warning'
                                : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Chip
                          label={formatPercent(flow.abandonment_rate)}
                          size="small"
                          color={
                            flow.abandonment_rate <= 25
                              ? 'success'
                              : flow.abandonment_rate <= 50
                                ? 'warning'
                                : 'error'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(flow.total_revenue)}</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        {formatCurrency(flow.avg_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        ) : (
          <ModernCard variant="flat" size="small" sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              No booking flow performance data available
            </Typography>
          </ModernCard>
        )}
      </Box>
    </Box>
  );
};

export default BookingFlowTab;
