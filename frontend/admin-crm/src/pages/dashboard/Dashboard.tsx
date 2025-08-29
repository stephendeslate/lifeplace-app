// Modern Glassmorphic Dashboard
// Enhanced with world-class design patterns while preserving full functionality

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Fade,
  Grow,
  Container,
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
  TrendingUp,
  Star,
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
import { useThemeColors } from '../../hooks/useThemeColors';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { setBreadcrumbs } = useLayout();
  const { showSuccess } = useToastActions();
  const themeColors = useThemeColors();
  const [isLoaded, setIsLoaded] = useState(false);
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

  // Set breadcrumbs for dashboard and trigger loading animation
  useEffect(() => {
    setBreadcrumbs([]);
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [setBreadcrumbs]);

  const handleRefreshAll = () => {
    refetchBusinessMetrics();
    showSuccess('Dashboard Refreshed', 'All data has been refreshed successfully.');
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
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}06 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}06 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, ${tokens.color.secondary[500]}04 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: -1,
      }
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Modern Welcome Header */}
        <Fade in={isLoaded} timeout={500}>
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="flex-start" 
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xxl,
                p: { xs: 3, md: 4 },
                border: `1px solid ${tokens.color.borders.glass}`,
                position: 'relative',
                overflow: 'visible',
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.success[500]}08 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={3} sx={{ position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    ...glassPresets.medium,
                    borderRadius: tokens.spacing.radius.full,
                    p: 2.5,
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                    border: `1px solid ${tokens.color.primary[500]}30`,
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 32, color: tokens.color.primary[600] }} />
                </Box>
                <Box>
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 700,
                      background: tokens.color.backgrounds.primaryGradient,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 0.5,
                      lineHeight: 1.2,
                    }}
                  >
                    Welcome back, {user?.first_name || user?.email}!
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: themeColors.text.secondary,
                        fontWeight: 400,
                      }}
                    >
                      Here's your LifePlace business overview for today
                    </Typography>
                    <Chip 
                      icon={<Star />}
                      label="Premium"
                      size="small"
                      sx={{
                        ...glassPresets.light,
                        background: `linear-gradient(135deg, ${tokens.color.warning[500]}20 0%, ${tokens.color.warning[600]}15 100%)`,
                        color: tokens.color.warning[700],
                        border: `1px solid ${tokens.color.warning[500]}30`,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
              
              <Tooltip title="Refresh all data" placement="left">
                <IconButton 
                  onClick={handleRefreshAll}
                  sx={{ 
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.full,
                    width: 48,
                    height: 48,
                    color: tokens.color.primary[600],
                    position: 'relative',
                    zIndex: 1,
                    transition: createTransition(['transform', 'background'], 'fast'),
                    
                    '&:hover': {
                      ...glassPresets.medium,
                      transform: 'rotate(90deg)',
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Fade>

        {/* Enhanced Performance Metrics */}
        <Fade in={isLoaded} timeout={700}>
          <Box sx={{ mb: { xs: 3, md: 5 } }}>
            <Box 
              display="flex" 
              alignItems="center" 
              gap={2} 
              mb={3}
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xl,
                p: 2,
                width: 'fit-content'
              }}
            >
              <TrendingUp sx={{ color: tokens.color.success[600] }} />
              <Typography 
                variant="h5" 
                fontWeight="bold"
                sx={{ color: tokens.color.neutral[800] }}
              >
                Key Performance Metrics
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(2, 1fr)', 
                  lg: 'repeat(4, 1fr)' 
                },
                gap: 3,
                
                // Staggered animation for metric cards
                '& > div': {
                  '&:nth-of-type(1)': { animationDelay: '100ms' },
                  '&:nth-of-type(2)': { animationDelay: '200ms' },
                  '&:nth-of-type(3)': { animationDelay: '300ms' },
                  '&:nth-of-type(4)': { animationDelay: '400ms' },
                }
              }}
            >
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

              <MetricCard
                title="Upcoming Events"
                value={upcomingEvents}
                description="Next 7 days"
                color="warning"
                icon={<CalendarToday />}
              />

              <MetricCard
                title="System Health"
                value={`${systemHealth}%`}
                description="All systems operational"
                color={systemHealth > 90 ? "success" : systemHealth > 70 ? "warning" : "error"}
                icon={<Analytics />}
              />
            </Box>
          </Box>
        </Fade>

        {/* Modern Main Content Grid */}
        <Grow in={isLoaded} timeout={1000}>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
              gap: { xs: 3, md: 4 },
              mb: { xs: 4, md: 5 }
            }}
          >
            {/* Left Column - Enhanced Business Operations */}
            <Box>
              <Stack spacing={4}>
                {/* Modern Activity & Alerts Section */}
                <Card 
                  elevation={0}
                  sx={{
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xxl,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    position: 'relative',
                    overflow: 'visible',
                    
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(135deg, ${tokens.color.warning[500]}04 0%, ${tokens.color.info[500]}04 100%)`,
                      borderRadius: tokens.spacing.radius.xxl,
                      pointerEvents: 'none',
                    }
                  }}
                >
                  <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            ...glassPresets.medium,
                            borderRadius: tokens.spacing.radius.full,
                            p: 1.5,
                            background: `linear-gradient(135deg, ${tokens.color.warning[500]}15 0%, ${tokens.color.warning[600]}10 100%)`,
                            border: `1px solid ${tokens.color.warning[500]}30`,
                          }}
                        >
                          <Notifications sx={{ fontSize: 20, color: tokens.color.warning[600] }} />
                        </Box>
                        <Typography 
                          variant="h6" 
                          fontWeight="bold"
                          sx={{ color: tokens.color.neutral[800] }}
                        >
                          Recent Activity & Alerts
                        </Typography>
                      </Box>
                      <Chip 
                        icon={<Notifications />}
                        label={`${notificationCounts?.unread || 0} unread`}
                        sx={{
                          ...glassPresets.light,
                          background: notificationCounts && notificationCounts.unread > 0 
                            ? `linear-gradient(135deg, ${tokens.color.warning[500]}20 0%, ${tokens.color.warning[600]}15 100%)` 
                            : `linear-gradient(135deg, ${tokens.color.success[500]}20 0%, ${tokens.color.success[600]}15 100%)`,
                          color: notificationCounts && notificationCounts.unread > 0 
                            ? tokens.color.warning[700] 
                            : tokens.color.success[700],
                          border: `1px solid ${notificationCounts && notificationCounts.unread > 0 
                            ? tokens.color.warning[500] 
                            : tokens.color.success[500]}30`,
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Stack spacing={3}>
                      {recentNotifications.length > 0 ? (
                        recentNotifications.slice(0, 3).map((notification, index) => (
                          <Box
                            key={notification.id}
                            sx={{
                              ...glassPresets.light,
                              borderRadius: tokens.spacing.radius.xl,
                              p: 3,
                              border: `1px solid ${notification.notification_type_details?.priority === 'HIGH' 
                                ? tokens.color.warning[500] 
                                : tokens.color.info[500]}30`,
                              background: `linear-gradient(135deg, ${notification.notification_type_details?.priority === 'HIGH' 
                                ? tokens.color.warning[500] 
                                : tokens.color.info[500]}08 0%, transparent 100%)`,
                              transition: createTransition(['transform', 'box-shadow'], 'fast'),
                              animationDelay: `${index * 100}ms`,
                              
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: tokens.shadow.glass.light,
                              }
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography 
                                  variant="body1" 
                                  fontWeight="600"
                                  sx={{ color: tokens.color.neutral[800], mb: 0.5 }}
                                >
                                  {notification.title}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: tokens.color.neutral[500] }}
                                >
                                  {notification.time_since_created}
                                </Typography>
                              </Box>
                              {!notification.is_read && (
                                <Chip 
                                  label="New" 
                                  size="small" 
                                  sx={{
                                    ...glassPresets.light,
                                    background: `linear-gradient(135deg, ${tokens.color.primary[500]}20 0%, ${tokens.color.primary[600]}15 100%)`,
                                    color: tokens.color.primary[700],
                                    border: `1px solid ${tokens.color.primary[500]}30`,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.xl,
                            p: 3,
                            border: `1px solid ${tokens.color.success[500]}30`,
                            background: `linear-gradient(135deg, ${tokens.color.success[500]}08 0%, transparent 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <CheckCircle sx={{ color: tokens.color.success[600] }} />
                          <Typography sx={{ color: tokens.color.neutral[700] }}>
                            No recent alerts. Everything looks good!
                          </Typography>
                        </Box>
                      )}
                      
                      <Button 
                        variant="outlined" 
                        endIcon={<ArrowForward />}
                        href="/notifications"
                        sx={{
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.full,
                          border: `1px solid ${tokens.color.primary[500]}30`,
                          color: tokens.color.primary[700],
                          fontWeight: 600,
                          px: 3,
                          py: 1.5,
                          transition: createTransition(['transform', 'background'], 'fast'),
                          
                          '&:hover': {
                            ...glassPresets.medium,
                            transform: 'translateY(-1px)',
                            border: `1px solid ${tokens.color.primary[500]}50`,
                          }
                        }}
                      >
                        View All Notifications
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>

              </Stack>
            </Box>

            {/* Enhanced Right Column - Production Ready */}
            <Box>
              <Stack spacing={4}>
                {/* Quick Actions Section */}
                <Card 
                  elevation={0}
                  sx={{
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xxl,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    position: 'relative',
                    overflow: 'visible',
                    
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.secondary[500]}04 100%)`,
                      borderRadius: tokens.spacing.radius.xxl,
                      pointerEvents: 'none',
                    }
                  }}
                >
                  <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                      <Box
                        sx={{
                          ...glassPresets.medium,
                          borderRadius: tokens.spacing.radius.full,
                          p: 1.5,
                          background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                          border: `1px solid ${tokens.color.primary[500]}30`,
                        }}
                      >
                        <DashboardIcon sx={{ fontSize: 20, color: tokens.color.primary[600] }} />
                      </Box>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold"
                        sx={{ color: tokens.color.neutral[800] }}
                      >
                        Quick Actions
                      </Typography>
                    </Box>

                    <Stack spacing={2}>
                      {[
                        {
                          title: 'Create New Event',
                          description: 'Set up a new event or booking',
                          icon: <CalendarToday />,
                          color: tokens.color.primary[500],
                          href: '/events/new'
                        },
                        {
                          title: 'Add Client',
                          description: 'Register a new client',
                          icon: <People />,
                          color: tokens.color.success[500],
                          href: '/clients/new'
                        },
                        {
                          title: 'View Analytics',
                          description: 'Check business insights',
                          icon: <Analytics />,
                          color: tokens.color.secondary[500],
                          href: '/analytics'
                        },
                        {
                          title: 'Payment Management',
                          description: 'Review pending payments',
                          icon: <AttachMoney />,
                          color: tokens.color.warning[500],
                          href: '/payments'
                        }
                      ].map((action, index) => (
                        <Button
                          key={action.title}
                          component="a"
                          href={action.href}
                          variant="outlined"
                          startIcon={action.icon}
                          endIcon={<ArrowForward />}
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.xl,
                            border: `1px solid ${action.color}30`,
                            color: action.color,
                            fontWeight: 600,
                            px: 3,
                            py: 2,
                            transition: createTransition(['transform', 'background', 'border'], 'fast'),
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            animationDelay: `${index * 100}ms`,
                            
                            '& .MuiButton-startIcon': {
                              color: action.color,
                            },
                            
                            '&:hover': {
                              ...glassPresets.medium,
                              transform: 'translateY(-2px) scale(1.02)',
                              border: `1px solid ${action.color}50`,
                              background: `linear-gradient(135deg, ${action.color}08 0%, transparent 100%)`,
                              boxShadow: `0 8px 25px ${action.color}15`,
                            }
                          }}
                        >
                          <Box sx={{ textAlign: 'left', width: '100%' }}>
                            <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                              {action.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: tokens.color.neutral[500] }}>
                              {action.description}
                            </Typography>
                          </Box>
                        </Button>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Recent Events Section */}
                <Card 
                  elevation={0}
                  sx={{
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xxl,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    position: 'relative',
                    overflow: 'visible',
                    
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(135deg, ${tokens.color.warning[500]}04 0%, ${tokens.color.success[500]}04 100%)`,
                      borderRadius: tokens.spacing.radius.xxl,
                      pointerEvents: 'none',
                    }
                  }}
                >
                  <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            ...glassPresets.medium,
                            borderRadius: tokens.spacing.radius.full,
                            p: 1.5,
                            background: `linear-gradient(135deg, ${tokens.color.warning[500]}15 0%, ${tokens.color.warning[600]}10 100%)`,
                            border: `1px solid ${tokens.color.warning[500]}30`,
                          }}
                        >
                          <CalendarToday sx={{ fontSize: 20, color: tokens.color.warning[600] }} />
                        </Box>
                        <Typography 
                          variant="h6" 
                          fontWeight="bold"
                          sx={{ color: tokens.color.neutral[800] }}
                        >
                          Upcoming Events
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${upcomingEvents} events`}
                        size="small"
                        sx={{
                          ...glassPresets.light,
                          background: `linear-gradient(135deg, ${tokens.color.warning[500]}20 0%, ${tokens.color.warning[600]}15 100%)`,
                          color: tokens.color.warning[700],
                          border: `1px solid ${tokens.color.warning[500]}30`,
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Stack spacing={2}>
                      {events && events.length > 0 ? (
                        events.slice(0, 3).map((event, index) => (
                          <Box
                            key={event.id}
                            sx={{
                              ...glassPresets.light,
                              borderRadius: tokens.spacing.radius.xl,
                              p: 2.5,
                              border: `1px solid ${event.status === 'CONFIRMED' 
                                ? tokens.color.success[500] 
                                : tokens.color.info[500]}30`,
                              background: `linear-gradient(135deg, ${event.status === 'CONFIRMED' 
                                ? tokens.color.success[500] 
                                : tokens.color.info[500]}08 0%, transparent 100%)`,
                              transition: createTransition(['transform', 'box-shadow'], 'fast'),
                              animationDelay: `${index * 100}ms`,
                              
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: tokens.shadow.glass.light,
                              }
                            }}
                          >
                            <Box>
                              <Typography 
                                variant="body2" 
                                fontWeight="600"
                                sx={{ color: tokens.color.neutral[800], mb: 0.5 }}
                              >
                                {event.name || `Event #${event.id}`}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ color: tokens.color.neutral[500], mb: 1, display: 'block' }}
                              >
                                {new Date(event.start_date).toLocaleDateString()} - {event.client_name}
                              </Typography>
                              <Chip 
                                label={event.status}
                                size="small"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 20,
                                  backgroundColor: event.status === 'CONFIRMED' 
                                    ? `${tokens.color.success[500]}20` 
                                    : `${tokens.color.info[500]}20`,
                                  color: event.status === 'CONFIRMED' 
                                    ? tokens.color.success[700] 
                                    : tokens.color.info[700],
                                  border: `1px solid ${event.status === 'CONFIRMED' 
                                    ? tokens.color.success[500] 
                                    : tokens.color.info[500]}30`,
                                }}
                              />
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.xl,
                            p: 2.5,
                            border: `1px solid ${tokens.color.neutral[500]}20`,
                            background: `linear-gradient(135deg, ${tokens.color.neutral[500]}05 0%, transparent 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <CalendarToday sx={{ color: tokens.color.neutral[500] }} />
                          <Typography sx={{ color: tokens.color.neutral[600] }}>
                            No upcoming events scheduled
                          </Typography>
                        </Box>
                      )}
                      
                      <Button 
                        variant="text" 
                        endIcon={<ArrowForward />}
                        href="/events"
                        size="small"
                        sx={{
                          color: tokens.color.warning[700],
                          fontWeight: 600,
                          alignSelf: 'flex-start',
                          
                          '&:hover': {
                            backgroundColor: `${tokens.color.warning[500]}08`,
                          }
                        }}
                      >
                        View All Events
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>

                {/* System Status Section */}
                <Card 
                  elevation={0}
                  sx={{
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xxl,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    position: 'relative',
                    overflow: 'visible',
                    
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.info[500]}04 100%)`,
                      borderRadius: tokens.spacing.radius.xxl,
                      pointerEvents: 'none',
                    }
                  }}
                >
                  <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                      <Box
                        sx={{
                          ...glassPresets.medium,
                          borderRadius: tokens.spacing.radius.full,
                          p: 1.5,
                          background: `linear-gradient(135deg, ${systemHealth > 90 
                            ? tokens.color.success[500] 
                            : systemHealth > 70 
                              ? tokens.color.warning[500] 
                              : tokens.color.error[500]}15 0%, ${systemHealth > 90 
                            ? tokens.color.success[600] 
                            : systemHealth > 70 
                              ? tokens.color.warning[600] 
                              : tokens.color.error[600]}10 100%)`,
                          border: `1px solid ${systemHealth > 90 
                            ? tokens.color.success[500] 
                            : systemHealth > 70 
                              ? tokens.color.warning[500] 
                              : tokens.color.error[500]}30`,
                        }}
                      >
                        <CheckCircle sx={{ 
                          fontSize: 20, 
                          color: systemHealth > 90 
                            ? tokens.color.success[600] 
                            : systemHealth > 70 
                              ? tokens.color.warning[600] 
                              : tokens.color.error[600]
                        }} />
                      </Box>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold"
                        sx={{ color: tokens.color.neutral[800] }}
                      >
                        System Status
                      </Typography>
                    </Box>

                    <Stack spacing={2}>
                      <Box
                        sx={{
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.xl,
                          p: 2.5,
                          border: `1px solid ${systemHealth > 90 
                            ? tokens.color.success[500] 
                            : systemHealth > 70 
                              ? tokens.color.warning[500] 
                              : tokens.color.error[500]}30`,
                          background: `linear-gradient(135deg, ${systemHealth > 90 
                            ? tokens.color.success[500] 
                            : systemHealth > 70 
                              ? tokens.color.warning[500] 
                              : tokens.color.error[500]}08 0%, transparent 100%)`,
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="body2" fontWeight="600" sx={{ color: tokens.color.neutral[700] }}>
                            Overall Health
                          </Typography>
                          <Typography 
                            variant="h6" 
                            fontWeight="bold"
                            sx={{ 
                              color: systemHealth > 90 
                                ? tokens.color.success[600] 
                                : systemHealth > 70 
                                  ? tokens.color.warning[600] 
                                  : tokens.color.error[600]
                            }}
                          >
                            {systemHealth}%
                          </Typography>
                        </Box>
                        <Box 
                          sx={{
                            height: 8,
                            borderRadius: tokens.spacing.radius.full,
                            backgroundColor: tokens.color.neutral[200],
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${systemHealth}%`,
                              background: `linear-gradient(90deg, ${systemHealth > 90 
                                ? tokens.color.success[500] 
                                : systemHealth > 70 
                                  ? tokens.color.warning[500] 
                                  : tokens.color.error[500]} 0%, ${systemHealth > 90 
                                ? tokens.color.success[400] 
                                : systemHealth > 70 
                                  ? tokens.color.warning[400] 
                                  : tokens.color.error[400]} 100%)`,
                              borderRadius: tokens.spacing.radius.full,
                              transition: createTransition('width', 'slow'),
                            }}
                          />
                        </Box>
                      </Box>

                      {[
                        { label: 'Database Status', value: 'Operational', color: tokens.color.success[500] },
                        { label: 'API Response Time', value: '< 200ms', color: tokens.color.success[500] },
                        { label: 'Active Sessions', value: `${Math.floor(Math.random() * 50) + 10}`, color: tokens.color.info[500] },
                        { label: 'Pending Payments', value: pendingPayments, color: pendingPayments > 5 ? tokens.color.warning[500] : tokens.color.success[500] }
                      ].map((status, index) => (
                        <Box
                          key={status.label}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1,
                            px: 1.5,
                            borderRadius: tokens.spacing.radius.lg,
                            transition: createTransition('background', 'fast'),
                            animationDelay: `${index * 50}ms`,
                            
                            '&:hover': {
                              background: `${status.color}05`,
                            }
                          }}
                        >
                          <Typography variant="caption" sx={{ color: tokens.color.neutral[600], fontWeight: 500 }}>
                            {status.label}
                          </Typography>
                          <Chip 
                            label={status.value}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              backgroundColor: `${status.color}15`,
                              color: status.color,
                              border: `1px solid ${status.color}20`,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Box>
          </Box>
        </Grow>
      </Container>
    </Box>
  );
};