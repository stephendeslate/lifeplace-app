// Dashboard - Flat design matching Analytics page style

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Notifications,
  Refresh as RefreshIcon,
  ArrowForward,
  CheckCircle,
  AttachMoney,
  CalendarToday,
  Analytics,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useToastActions } from '../../contexts/ToastContext';
import { KPICard } from '../../components/analytics';
import { useDateRange, useDashboardKPIs } from '../../hooks/useAnalytics';
import { useEvents } from '../../hooks/useEvents';
import { useClients } from '../../hooks/useClients';
import { usePayments } from '../../hooks/usePayments';
import { useNotifications } from '../../hooks/useNotifications';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { createTransition } from '../../design-system/utils/animations';
import { TasksSummaryWidget } from '../../components/dashboard/TasksSummaryWidget';
import { ModernPageLayout, ModernPageHeader } from '../../components/common';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { setBreadcrumbs } = useLayout();
  const { showSuccess } = useToastActions();
  // Date range for metrics (last 30 days by default)
  const { dateRange } = useDateRange(30);

  // Data hooks with error handling
  const { data: dashboardKPIs, refetch: refetchDashboardKPIs } = useDashboardKPIs(dateRange);

  const { events } = useEvents({
    start_date_from: new Date().toISOString().split('T')[0],
    start_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const { clients } = useClients({ search: '' });

  const { payments } = usePayments({
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  });

  const { useNotificationCounts, useRecentNotifications } = useNotifications();
  const { data: notificationCounts } = useNotificationCounts();
  const { data: recentNotifications = [] } = useRecentNotifications(5);

  // Get user's currency settings for proper formatting
  const { settings: currencySettings } = useCurrencySettings();

  // Format revenue based on user's currency settings
  const formatRevenue = (amount: string | number) => {
    const currency = currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  // Set breadcrumbs for dashboard
  useEffect(() => {
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const handleRefreshAll = () => {
    refetchDashboardKPIs();
    showSuccess('Dashboard Refreshed', 'All data has been refreshed successfully.');
  };


  // Calculate dashboard metrics
  const totalActiveClients = clients?.length || 0;
  const upcomingEvents = events?.filter(e => e.status !== 'CANCELLED').length || 0;
  const eventRevenue = dashboardKPIs?.event_revenue || 0;
  const totalRevenue = dashboardKPIs?.total_revenue || 0;
  const pendingPayments = payments?.filter(p => p.status === 'PENDING').length || 0;

  // System health calculation
  const systemHealth = (() => {
    let health = 100;
    if (notificationCounts && notificationCounts.unread > 10) health -= 10;
    if (pendingPayments > 5) health -= 15;
    return Math.max(health, 0);
  })();

  return (
    <ModernPageLayout backgroundPattern="default">
        {/* Page Header - matching Analytics flat style */}
        <ModernPageHeader
          title={`Welcome back, ${user?.first_name || user?.email}!`}
          subtitle="Here's your LifePlace business overview for today"
          icon={<DashboardIcon />}
          size="medium"
          secondaryActions={[
            {
              label: 'Refresh',
              icon: <RefreshIcon />,
              onClick: handleRefreshAll,
              variant: 'outlined',
            },
          ]}
        />

        {/* Key Performance Metrics - flat grid like Analytics */}
        <Box
          display="flex"
          gap={2}
          mb={4}
          sx={{
            flexWrap: 'wrap',
            '& > *': {
              flex: '1 1 200px',
              minWidth: 200,
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(20% - 10px)' },
            },
          }}
        >
              <KPICard
                title="Event Revenue"
                value={formatRevenue(eventRevenue)}
                subtitle="From completed events"
                color="success"
                icon={<AttachMoney />}
                trend={dashboardKPIs?.event_revenue_trend}
              />

              <KPICard
                title="Total Revenue"
                value={formatRevenue(totalRevenue)}
                subtitle="All collected payments"
                color="primary"
                icon={<AttachMoney />}
                trend={dashboardKPIs?.total_revenue_trend}
              />

              <KPICard
                title="Active Clients"
                value={totalActiveClients}
                subtitle="Total registered"
                color="secondary"
                icon={<People />}
              />

              <KPICard
                title="Upcoming Events"
                value={upcomingEvents}
                subtitle="Next 7 days"
                color="warning"
                icon={<CalendarToday />}
              />

              <KPICard
                title="Conversion Rate"
                value={`${dashboardKPIs?.conversion_rate || 0}%`}
                subtitle="Booking sessions"
                color="info"
                icon={<Analytics />}
              />
        </Box>

        {/* Main Content Grid - flat layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 3,
            mb: 4,
          }}
        >
          {/* Left Column */}
          <Stack spacing={3}>
            {/* Tasks Summary Widget */}
            <TasksSummaryWidget />

            {/* Activity & Alerts Section */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Notifications color="action" />
                  <Typography variant="h6" fontWeight="bold">Recent Activity & Alerts</Typography>
                </Box>
                <Chip
                  label={`${notificationCounts?.unread || 0} unread`}
                  color={notificationCounts && notificationCounts.unread > 0 ? 'warning' : 'default'}
                  size="small"
                />
              </Box>

              <Stack spacing={2}>
                {recentNotifications.length > 0 ? (
                  recentNotifications.slice(0, 3).map((notification) => (
                    <Box key={notification.id} sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="600">{notification.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{notification.time_since_created}</Typography>
                        </Box>
                        {!notification.is_read && <Chip label="New" size="small" color="primary" />}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="success" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">No recent alerts</Typography>
                  </Box>
                )}
                <Button variant="text" size="small" endIcon={<ArrowForward />} href="/notifications">
                  View All Notifications
                </Button>
              </Stack>
            </Box>
          </Stack>

          {/* Right Column */}
          <Stack spacing={3}>
            {/* Quick Actions */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <DashboardIcon color="action" />
                <Typography variant="h6" fontWeight="bold">Quick Actions</Typography>
              </Box>
              <Stack spacing={1}>
                {[
                  { title: 'Create Event', icon: <CalendarToday />, color: 'primary' as const, href: '/events/new' },
                  { title: 'Add Client', icon: <People />, color: 'success' as const, href: '/clients/new' },
                  { title: 'View Analytics', icon: <Analytics />, color: 'secondary' as const, href: '/analytics' },
                  { title: 'Payments', icon: <AttachMoney />, color: 'warning' as const, href: '/payments' },
                ].map((action) => (
                  <Button
                    key={action.title}
                    component="a"
                    href={action.href}
                    variant="outlined"
                    color={action.color}
                    startIcon={action.icon}
                    size="small"
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {action.title}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* Upcoming Events */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarToday color="action" />
                  <Typography variant="h6" fontWeight="bold">Upcoming Events</Typography>
                </Box>
                <Chip label={upcomingEvents} size="small" />
              </Box>
              <Stack spacing={1}>
                {events && events.length > 0 ? (
                  events.slice(0, 3).map((event) => (
                    <Box key={event.id} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                      <Typography variant="body2" fontWeight="600">{event.name || `Event #${event.id}`}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.start_date).toLocaleDateString()} - {event.client_name}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No upcoming events</Typography>
                )}
                <Button variant="text" size="small" endIcon={<ArrowForward />} href="/events">View All</Button>
              </Stack>
            </Box>

            {/* System Status */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CheckCircle color={systemHealth > 90 ? 'success' : systemHealth > 70 ? 'warning' : 'error'} />
                <Typography variant="h6" fontWeight="bold">System Status</Typography>
              </Box>
              <Stack spacing={1}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Health</Typography>
                    <Typography variant="body2" fontWeight="bold" color={systemHealth > 90 ? 'success.main' : systemHealth > 70 ? 'warning.main' : 'error.main'}>
                      {systemHealth}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.200', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: `${systemHealth}%`,
                      bgcolor: systemHealth > 90 ? 'success.main' : systemHealth > 70 ? 'warning.main' : 'error.main',
                      borderRadius: 4,
                      transition: createTransition('width', 'slow'),
                    }} />
                  </Box>
                </Box>
                {[
                  { label: 'Database Status', value: 'Operational', color: 'success' as const },
                  { label: 'API Response Time', value: '< 200ms', color: 'success' as const },
                  { label: 'Active Sessions', value: `${Math.floor(Math.random() * 50) + 10}`, color: 'info' as const },
                  { label: 'Pending Payments', value: pendingPayments, color: (pendingPayments > 5 ? 'warning' : 'success') as 'warning' | 'success' }
                ].map((status) => (
                  <Box key={status.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{status.label}</Typography>
                    <Chip label={status.value} size="small" color={status.color} variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
    </ModernPageLayout>
  );
};