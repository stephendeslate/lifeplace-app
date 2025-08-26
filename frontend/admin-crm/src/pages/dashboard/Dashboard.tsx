// frontend/admin-crm/src/pages/dashboard/Dashboard.tsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Stack,
  Divider,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Event,
  Payment,
  Schedule,
  Notifications,
  AdminPanelSettings,
  Email,
  Business,
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
import { MetricCard } from '../../components/analytics/common/MetricCard';
import { useDateRange } from '../../components/analytics/common/DateRangePicker';
import { useBusinessMetrics } from '../../hooks/useAnalytics';
import { useEvents } from '../../hooks/useEvents';
import { useClients } from '../../hooks/useClients';
import { usePayments } from '../../hooks/usePayments';
import { useNotifications } from '../../hooks/useNotifications';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { setBreadcrumbs } = useLayout();
  const { showSuccess } = useToastActions();
  // Date range for metrics (last 30 days by default)
  const { dateRange } = useDateRange();

  // Data hooks with error handling
  const { businessMetrics, refetchBusinessMetrics } = useBusinessMetrics({
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  const { events } = useEvents({ 
    start_date_from: new Date().toISOString().split('T')[0],
    start_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const { clients } = useClients({ search: '' });
  
  const { payments } = usePayments({
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  const { useNotificationCounts, useRecentNotifications } = useNotifications();
  const { data: notificationCounts } = useNotificationCounts();
  const { data: recentNotifications = [] } = useRecentNotifications(5);

  // Set breadcrumbs for dashboard
  useEffect(() => {
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const handleRefreshAll = () => {
    refetchBusinessMetrics();
    showSuccess('Dashboard Refreshed', 'All data has been refreshed successfully.');
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate dashboard metrics
  const totalActiveClients = clients?.length || 0;
  const upcomingEvents = events?.filter(e => e.status !== 'CANCELLED').length || 0;
  const totalRevenue = businessMetrics?.total_revenue || '0';
  const pendingPayments = payments?.filter(p => p.status === 'PENDING').length || 0;

  // System health calculation
  const systemHealth = (() => {
    let health = 100;
    if (notificationCounts && notificationCounts.unread > 10) health -= 10;
    if (pendingPayments > 5) health -= 15;
    return Math.max(health, 0);
  })();

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <DashboardIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Welcome back, {user?.first_name || user?.email}!
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Here's your LifePlace business overview for today.
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh all data">
            <IconButton onClick={handleRefreshAll} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Performance Metrics */}
      <Box sx={{ mb: 4 }}>
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            gap: 3,
          }}
        >
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <MetricCard
              title="Total Revenue"
              value={`$${parseFloat(totalRevenue).toLocaleString()}`}
              description="Last 30 days"
              color="success"
              icon={<AttachMoney />}
              trend={{
                value: 12.5,
                direction: 'up'
              }}
            />
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <MetricCard
              title="Active Clients"
              value={totalActiveClients}
              description="Total registered"
              color="primary"
              icon={<People />}
              trend={{
                value: 8.2,
                direction: 'up'
              }}
            />
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <MetricCard
              title="Upcoming Events"
              value={upcomingEvents}
              description="Next 7 days"
              color="warning"
              icon={<CalendarToday />}
            />
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <MetricCard
              title="System Health"
              value={`${systemHealth}%`}
              description="All systems operational"
              color={systemHealth > 90 ? "success" : systemHealth > 70 ? "warning" : "error"}
              icon={<Analytics />}
            />
          </Box>
        </Box>
      </Box>

      {/* Main Content Grid */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 4
        }}
      >
        {/* Left Column - Business Operations */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '2 1 0' } }}>
          <Stack spacing={3}>
            {/* Recent Activity & Alerts */}
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Activity & Alerts
                  </Typography>
                  <Chip 
                    icon={<Notifications />}
                    label={`${notificationCounts?.unread || 0} unread`}
                    color={notificationCounts && notificationCounts.unread > 0 ? "warning" : "default"}
                    size="small"
                  />
                </Box>

                <Stack spacing={2}>
                  {recentNotifications.length > 0 ? (
                    recentNotifications.slice(0, 3).map((notification) => (
                      <Alert 
                        key={notification.id}
                        severity={notification.notification_type_details?.priority === 'HIGH' ? 'warning' : 'info'}
                        sx={{ '& .MuiAlert-message': { width: '100%' } }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {notification.time_since_created}
                            </Typography>
                          </Box>
                          {!notification.is_read && (
                            <Chip label="New" size="small" color="primary" />
                          )}
                        </Box>
                      </Alert>
                    ))
                  ) : (
                    <Alert severity="success" icon={<CheckCircle />}>
                      No recent alerts. Everything looks good!
                    </Alert>
                  )}
                  
                  <Button 
                    variant="outlined" 
                    size="small" 
                    endIcon={<ArrowForward />}
                    href="/notifications"
                  >
                    View All Notifications
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Today's Events */}
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Today's Events
                  </Typography>
                  <Chip 
                    icon={<Event />}
                    label={`${events?.filter(e => new Date(e.start_date).toDateString() === new Date().toDateString()).length || 0} today`}
                    color="primary"
                    size="small"
                  />
                </Box>

                <Stack spacing={2}>
                  {events && events.length > 0 ? (
                    events
                      .filter(event => new Date(event.start_date).toDateString() === new Date().toDateString())
                      .slice(0, 3)
                      .map((event) => (
                        <Paper key={event.id} variant="outlined" sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {event.name || `Event for ${event.client_name}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Client: {event.client_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(event.start_date).toLocaleTimeString()}
                              </Typography>
                            </Box>
                            <Chip 
                              label={event.status} 
                              color={event.status === 'CONFIRMED' ? 'success' : 'default'}
                              size="small" 
                            />
                          </Box>
                        </Paper>
                      ))
                  ) : (
                    <Alert severity="info">
                      No events scheduled for today.
                    </Alert>
                  )}
                  
                  <Button 
                    variant="outlined" 
                    size="small" 
                    endIcon={<ArrowForward />}
                    href="/events"
                  >
                    View All Events
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* Right Column - User Profile & Quick Actions */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 0' } }}>
          <Stack spacing={3}>
            {/* User Profile Card */}
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Your Profile
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: 'primary.main',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {getInitials(user?.first_name, user?.last_name, user?.email)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {user?.first_name || user?.last_name 
                        ? `${user?.first_name} ${user?.last_name}`.trim()
                        : user?.email}
                    </Typography>
                    <Chip
                      icon={<AdminPanelSettings />}
                      label={user?.role || 'ADMIN'}
                      color="primary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Email color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {user?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {user?.profile?.company && (
                    <Box display="flex" alignItems="center" gap={2}>
                      <Business color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Company
                        </Typography>
                        <Typography variant="body1">
                          {user.profile.company}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <Schedule color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Member Since
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(user?.date_joined)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Button 
                  variant="outlined" 
                  fullWidth 
                  sx={{ mt: 2 }}
                  href="/settings/account/account-settings"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Actions
                </Typography>
                
                <Stack spacing={2}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    startIcon={<Event />}
                    href="/events"
                  >
                    Manage Events
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<People />}
                    href="/clients"
                  >
                    View Clients
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Payment />}
                    href="/payments"
                  >
                    Payment Overview
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Analytics />}
                    href="/analytics"
                  >
                    View Analytics
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Payment Status Overview */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Payment Status
                </Typography>
                
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Pending Payments</Typography>
                    <Chip 
                      label={pendingPayments}
                      color={pendingPayments > 0 ? "warning" : "success"}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Total Revenue (30d)</Typography>
                    <Typography variant="body1" fontWeight="bold" color="success.main">
                      ${parseFloat(totalRevenue).toLocaleString()}
                    </Typography>
                  </Box>

                  {businessMetrics && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Conversion Rate
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={parseFloat(businessMetrics.event_conversion_rate) || 0}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {businessMetrics.event_conversion_rate}% events confirmed
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Box>

      {/* Bottom Section - System Status */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            System Status
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              sx={{
                backgroundColor: 'success.light',
                borderRadius: 1,
                color: 'success.contrastText',
                flex: 1,
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                Authentication Service
              </Typography>
              <Chip
                label="Online"
                size="small"
                color="success"
                variant="filled"
              />
            </Box>
            
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              sx={{
                backgroundColor: businessMetrics ? 'success.light' : 'warning.light',
                borderRadius: 1,
                color: businessMetrics ? 'success.contrastText' : 'warning.contrastText',
                flex: 1,
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                Analytics Service
              </Typography>
              <Chip
                label={businessMetrics ? "Active" : "Loading"}
                size="small"
                color={businessMetrics ? "success" : "warning"}
                variant="filled"
              />
            </Box>
            
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              sx={{
                backgroundColor: 'info.light',
                borderRadius: 1,
                color: 'info.contrastText',
                flex: 1,
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                Admin Dashboard
              </Typography>
              <Chip
                label="Operational"
                size="small"
                color="info"
                variant="filled"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};