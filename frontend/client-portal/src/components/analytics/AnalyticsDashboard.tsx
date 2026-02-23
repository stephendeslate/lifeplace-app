// frontend/client-portal/src/components/analytics/AnalyticsDashboard.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  LinearProgress,
  Chip,
  Avatar,
  Stack,
  Skeleton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Event as EventIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import {
  useClientDashboard,
  useClientSpendingTrends,
  useClientDeadlines,
  useClientEventHistory,
} from '../../hooks/useClientAnalytics';
import { useQueryClient } from '@tanstack/react-query';

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('12m');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '12m':
      default:
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [timeRange]);

  // Fetch data from API
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useClientDashboard(dateRange.startDate, dateRange.endDate);
  const { data: spendingTrends, isLoading: trendsLoading } = useClientSpendingTrends(
    timeRange === '12m' ? 12 : timeRange === '90d' ? 3 : 1,
  );
  const { data: deadlines, isLoading: deadlinesLoading } = useClientDeadlines(30);
  const { data: eventHistory, isLoading: historyLoading } = useClientEventHistory(5);

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // Build metrics from API data
  const metrics: AnalyticsMetric[] = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        id: 'total-events',
        title: 'Total Events',
        value: String(dashboard.events.total),
        subtitle: `${dashboard.events.upcoming} upcoming`,
        icon: <EventIcon fontSize="small" />,
        color: theme.palette.primary.main,
      },
      {
        id: 'total-spent',
        title: 'Total Spent',
        value: formatCurrency(dashboard.financials.total_spent),
        subtitle: 'completed payments',
        icon: <MoneyIcon fontSize="small" />,
        color: theme.palette.success.main,
      },
      {
        id: 'pending-payments',
        title: 'Pending Payments',
        value: formatCurrency(dashboard.financials.pending_amount),
        subtitle:
          dashboard.financials.overdue_count > 0
            ? `${dashboard.financials.overdue_count} overdue`
            : 'all on track',
        icon: <PaymentIcon fontSize="small" />,
        color:
          dashboard.financials.overdue_count > 0
            ? theme.palette.error.main
            : theme.palette.warning.main,
      },
      {
        id: 'upcoming-due',
        title: 'Due Soon',
        value: formatCurrency(dashboard.financials.upcoming_amount),
        subtitle: `${dashboard.financials.upcoming_count} payments in 30 days`,
        icon: <ScheduleIcon fontSize="small" />,
        color: theme.palette.info.main,
      },
    ];
  }, [dashboard, theme]);

  // Format spending trends for chart
  const chartData = useMemo(() => {
    if (!spendingTrends || spendingTrends.length === 0) return [];

    return spendingTrends.map((trend) => ({
      name: trend.month_name,
      amount: trend.amount,
      payments: trend.payment_count,
    }));
  }, [spendingTrends]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['client-analytics'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getDeadlineIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <PaymentIcon fontSize="small" />;
      case 'event':
        return <EventIcon fontSize="small" />;
      case 'contract':
        return <AccessTimeIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return theme.palette.success.main;
      case 'CONFIRMED':
        return theme.palette.primary.main;
      case 'LEAD':
        return theme.palette.warning.main;
      case 'CANCELLED':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Error state
  if (dashboardError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Unable to load analytics data. Please try again later.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              My Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track your events, payments, and upcoming deadlines
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha('#fff', 0.2),
                  },
                }}
              >
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="12m">Last 12 months</MenuItem>
              </Select>
            </FormControl>

            <IconButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.2),
                },
              }}
            >
              <RefreshIcon sx={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Box>
        </Box>
      </AnimatedElement>

      {/* Key Metrics Cards */}
      <AnimatedElement animation="slideUp" delay={200}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 3,
            mb: 4,
          }}
        >
          {dashboardLoading
            ? // Loading skeletons
              [...Array(4)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
              ))
            : metrics.map((metric, index) => (
                <AnimatedElement key={metric.id} animation="slideUp" delay={200 + index * 50}>
                  <GlassCard
                    variant="light"
                    intensity="medium"
                    hover
                    sx={{
                      p: 3,
                      height: '100%',
                      backgroundColor: alpha('#fff', 0.08),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha('#fff', 0.1)}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          backgroundColor: alpha(metric.color, 0.15),
                          color: metric.color,
                          width: 48,
                          height: 48,
                        }}
                      >
                        {metric.icon}
                      </Avatar>
                    </Box>

                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {metric.value}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {metric.title}
                    </Typography>

                    {metric.subtitle && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {metric.subtitle}
                      </Typography>
                    )}
                  </GlassCard>
                </AnimatedElement>
              ))}
        </Box>
      </AnimatedElement>

      {/* Charts and Details */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Spending Trend & Deadlines Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          {/* Spending Trend Chart */}
          <Box>
            <AnimatedElement animation="slideUp" delay={400}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  p: 3,
                  backgroundColor: alpha('#fff', 0.08),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    mb: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Spending Trend
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your payment history over time
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ height: 300, position: 'relative' }}>
                  {(isRefreshing || trendsLoading) && (
                    <LinearProgress
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: alpha('#fff', 0.1),
                      }}
                    />
                  )}
                  {trendsLoading ? (
                    <Skeleton variant="rectangular" height={280} />
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="amountGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={theme.palette.primary.main}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={theme.palette.primary.main}
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                        <XAxis dataKey="name" stroke={alpha('#fff', 0.6)} fontSize={12} />
                        <YAxis
                          stroke={alpha('#fff', 0.6)}
                          fontSize={12}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: alpha('#fff', 0.95),
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${alpha('#fff', 0.2)}`,
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'Amount']}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke={theme.palette.primary.main}
                          strokeWidth={3}
                          fill="url(#amountGradient)"
                          name="Amount"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography color="text.secondary">No spending data available yet</Typography>
                    </Box>
                  )}
                </Box>
              </GlassCard>
            </AnimatedElement>
          </Box>

          {/* Upcoming Deadlines */}
          <Box>
            <AnimatedElement animation="slideUp" delay={500}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  p: 3,
                  backgroundColor: alpha('#fff', 0.08),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  height: '100%',
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Upcoming Deadlines
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Next 30 days
                  </Typography>
                </Box>

                {deadlinesLoading ? (
                  <Stack spacing={2}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rectangular" height={60} />
                    ))}
                  </Stack>
                ) : deadlines && deadlines.length > 0 ? (
                  <Stack spacing={2} sx={{ maxHeight: 280, overflow: 'auto' }}>
                    {deadlines.slice(0, 5).map((deadline, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(
                            deadline.urgency === 'high'
                              ? theme.palette.error.main
                              : theme.palette.primary.main,
                            0.1,
                          ),
                          border: `1px solid ${alpha(
                            deadline.urgency === 'high'
                              ? theme.palette.error.main
                              : theme.palette.primary.main,
                            0.2,
                          )}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              backgroundColor: alpha(
                                deadline.urgency === 'high'
                                  ? theme.palette.error.main
                                  : theme.palette.primary.main,
                                0.2,
                              ),
                              color:
                                deadline.urgency === 'high'
                                  ? theme.palette.error.main
                                  : theme.palette.primary.main,
                            }}
                          >
                            {getDeadlineIcon(deadline.type)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {deadline.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(deadline.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Typography>
                            {deadline.amount && (
                              <Typography
                                variant="caption"
                                sx={{ display: 'block', fontWeight: 600, mt: 0.5 }}
                              >
                                {formatCurrency(deadline.amount)}
                              </Typography>
                            )}
                          </Box>
                          {deadline.urgency === 'high' && (
                            <WarningIcon fontSize="small" color="error" />
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      py: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.5 }} />
                    <Typography color="text.secondary" align="center">
                      No upcoming deadlines
                    </Typography>
                  </Box>
                )}
              </GlassCard>
            </AnimatedElement>
          </Box>
        </Box>

        {/* Recent Events */}
        <Box>
          <AnimatedElement animation="slideUp" delay={600}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                p: 3,
                backgroundColor: alpha('#fff', 0.08),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Events
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your latest event history
                </Typography>
              </Box>

              {historyLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : eventHistory && eventHistory.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Event</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Paid</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {eventHistory.map((event) => (
                        <TableRow key={event.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {event.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {event.event_type} - {event.venue}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {new Date(event.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={event.status_display}
                              size="small"
                              sx={{
                                backgroundColor: alpha(getStatusColor(event.status), 0.1),
                                color: getStatusColor(event.status),
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(event.total_price)}</TableCell>
                          <TableCell align="right">
                            <Typography color="success.main">
                              {formatCurrency(event.amount_paid)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {event.amount_pending > 0 ? (
                              <Typography color="warning.main">
                                {formatCurrency(event.amount_pending)}
                              </Typography>
                            ) : (
                              <CheckCircleIcon fontSize="small" color="success" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    py: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <EventIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  <Typography color="text.secondary" align="center">
                    No events yet
                  </Typography>
                </Box>
              )}
            </GlassCard>
          </AnimatedElement>
        </Box>
      </Box>

      {/* CSS for loading animation */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </Box>
  );
};
