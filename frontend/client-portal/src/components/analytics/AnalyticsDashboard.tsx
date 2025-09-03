// frontend/client-portal/src/components/analytics/AnalyticsDashboard.tsx

import React, { useState } from 'react';
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
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Event as EventIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

interface ChartDataPoint {
  name: string;
  value?: number;
  revenue?: number;
  bookings?: number;
  events?: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock analytics data
  const metrics: AnalyticsMetric[] = [
    {
      id: 'total-events',
      title: 'Total Events',
      value: '47',
      change: 15.2,
      changeType: 'increase',
      icon: <EventIcon fontSize="small" />,
      color: theme.palette.primary.main,
    },
    {
      id: 'revenue',
      title: 'Revenue',
      value: '₱125,450',
      change: 8.7,
      changeType: 'increase',
      icon: <MoneyIcon fontSize="small" />,
      color: theme.palette.success.main,
    },
    {
      id: 'pending-payments',
      title: 'Pending Payments',
      value: '₱28,900',
      change: -5.3,
      changeType: 'decrease',
      icon: <PaymentIcon fontSize="small" />,
      color: theme.palette.warning.main,
    },
    {
      id: 'avg-booking-time',
      title: 'Avg. Booking Time',
      value: '12 min',
      change: -18.5,
      changeType: 'decrease',
      icon: <ScheduleIcon fontSize="small" />,
      color: theme.palette.info.main,
    },
  ];

  const revenueData: ChartDataPoint[] = [
    { name: 'Jan', revenue: 45000, bookings: 12 },
    { name: 'Feb', revenue: 52000, bookings: 15 },
    { name: 'Mar', revenue: 48000, bookings: 13 },
    { name: 'Apr', revenue: 61000, bookings: 18 },
    { name: 'May', revenue: 55000, bookings: 16 },
    { name: 'Jun', revenue: 67000, bookings: 20 },
    { name: 'Jul', revenue: 73000, bookings: 22 },
    { name: 'Aug', revenue: 68000, bookings: 19 },
    { name: 'Sep', revenue: 79000, bookings: 24 },
    { name: 'Oct', revenue: 82000, bookings: 26 },
    { name: 'Nov', revenue: 88000, bookings: 28 },
    { name: 'Dec', revenue: 94000, bookings: 31 },
  ];

  const eventTypeData: ChartDataPoint[] = [
    { name: 'Weddings', value: 45, events: 18 },
    { name: 'Corporate', value: 30, events: 12 },
    { name: 'Birthdays', value: 15, events: 8 },
    { name: 'Anniversaries', value: 10, events: 9 },
  ];

  const bookingFlowData: ChartDataPoint[] = [
    { name: 'Introduction', value: 100 },
    { name: 'Contact Info', value: 87 },
    { name: 'Date & Time', value: 75 },
    { name: 'Package Selection', value: 65 },
    { name: 'Add-ons', value: 58 },
    { name: 'Payment', value: 52 },
    { name: 'Confirmation', value: 47 },
  ];

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const renderTrendIcon = (changeType: string, change: number) => {
    const isPositive = changeType === 'increase';
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: isPositive ? 'success.main' : 'error.main',
          gap: 0.5,
        }}
      >
        {isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {Math.abs(change)}%
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track your event bookings, revenue, and performance metrics
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

            <IconButton
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.2),
                },
              }}
            >
              <FilterIcon />
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
            mb: 4
          }}
        >
          {metrics.map((metric, index) => (
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
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
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
                  {renderTrendIcon(metric.changeType, metric.change)}
                </Box>

                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {metric.value}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {metric.title}
                </Typography>
              </GlassCard>
            </AnimatedElement>
          ))}
        </Box>
      </AnimatedElement>

      {/* Charts Grid */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Revenue & Pie Chart Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          {/* Revenue Trend Chart */}
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
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Revenue & Bookings Trend
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly performance overview
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label="Revenue"
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    }}
                  />
                  <Chip
                    label="Bookings"
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main,
                    }}
                  />
                </Stack>
              </Box>

              <Box sx={{ height: 350, position: 'relative' }}>
                {isRefreshing && (
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
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                    <XAxis 
                      dataKey="name" 
                      stroke={alpha('#fff', 0.6)}
                      fontSize={12}
                    />
                    <YAxis stroke={alpha('#fff', 0.6)} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: alpha('#fff', 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      fill="url(#revenueGradient)"
                      name="Revenue (₱)"
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke={theme.palette.secondary.main}
                      strokeWidth={3}
                      fill="url(#bookingsGradient)"
                      name="Bookings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </GlassCard>
          </AnimatedElement>
          </Box>

          {/* Event Types Distribution */}
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
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Event Types Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Breakdown by event category
                </Typography>
              </Box>

              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {eventTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: alpha('#fff', 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: '12px',
                        color: theme.palette.text.primary,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </GlassCard>
          </AnimatedElement>
          </Box>
        </Box>

        {/* Booking Flow Conversion */}
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
                  Booking Flow Conversion
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Step-by-step conversion rates through the booking process
                </Typography>
              </Box>

              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingFlowData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                    <XAxis 
                      type="number" 
                      stroke={alpha('#fff', 0.6)}
                      fontSize={12}
                      domain={[0, 100]}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke={alpha('#fff', 0.6)}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: alpha('#fff', 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                        borderRadius: 8,
                      }}
                      formatter={(value) => [`${value}%`, 'Conversion Rate']}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={theme.palette.success.main}
                      radius={[0, 4, 4, 0]}
                      opacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
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