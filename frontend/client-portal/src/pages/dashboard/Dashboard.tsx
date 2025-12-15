// frontend/client-portal/src/pages/dashboard/Dashboard.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Divider,
  CircularProgress,
  useTheme,
  alpha,
  LinearProgress,
  Alert,
  CardContent,
} from '@mui/material';
import {
  Event as EventIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Message as MessageIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as ContractIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  PriorityHigh as PriorityIcon,
  ShoppingCart as BookingIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunications } from '../../hooks/useCommunications';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useUnfinishedBookings } from '../../hooks/useUnfinishedBookings';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useAcceptQuote, useRejectQuote } from '../../hooks/useEventQuotes';
import { QuoteRejectionDialog } from '../../components/common/QuoteRejectionDialog';


const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const PHILIPPINE_TIMEZONE = 'Asia/Manila';
  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean;
    quoteId: number | null;
    quoteName: string | null;
  }>({ open: false, quoteId: null, quoteName: null });

  const { useAnalytics } = useCommunications();
  const dashboardData = useDashboardData();
  const { data: unfinishedBookings, isLoading: isLoadingBookings } = useUnfinishedBookings();

  // Quote action hooks
  const acceptQuoteMutation = useAcceptQuote();
  const rejectQuoteMutation = useRejectQuote();

  // Get communication analytics
  const { data: commAnalytics, isLoading: isLoadingAnalytics } = useAnalytics();

  // Handler for quote actions
  const handleQuoteAction = async (quoteId: number, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      try {
        await acceptQuoteMutation.mutateAsync({ quoteId });
        // Dashboard data will automatically refresh via React Query
      } catch (error) {
        // Error handling is already done in the hook
        console.error('Failed to accept quote:', error);
      }
    } else {
      // For reject, open the rejection dialog
      const quote = dashboardData.criticalActions.quotesNeedingResponse.find(q => q.id === quoteId);
      setRejectionDialog({
        open: true,
        quoteId,
        quoteName: quote?.event_details?.name || null,
      });
    }
  };

  // Handler for quote rejection with reason
  const handleQuoteRejection = async (reason: string) => {
    if (!rejectionDialog.quoteId) return;

    try {
      await rejectQuoteMutation.mutateAsync({
        quoteId: rejectionDialog.quoteId,
        data: { reason: reason },
      });
      // Dashboard data will automatically refresh via React Query
    } catch (error) {
      // Error handling is already done in the hook
      console.error('Failed to reject quote:', error);
    }
  };

  // Handler for closing rejection dialog
  const handleRejectionDialogClose = () => {
    setRejectionDialog({ open: false, quoteId: null, quoteName: null });
  };

  // Handler for payment actions
  const handlePaymentAction = (paymentId: number) => {
    // Navigate to payments page with the specific payment highlighted
    navigate('/payments', { state: { highlightPayment: paymentId } });
  };

  // Handler for viewing events
  const handleViewEvent = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };




  return (
    <Box sx={{ width: '100%' }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
          Welcome back, {user?.first_name || 'Client'}! 🌿
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your events and view communications.
        </Typography>
      </Box>


      {/* Main Dashboard Content */}
      <AnimatedElement animation="slideUp" delay={400}>
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            border: `1px solid ${alpha('#fff', 0.1)}`,
            overflow: 'hidden',
            p: 3,
          }}
        >
          {dashboardData.loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : dashboardData.error ? (
            <Alert severity="error">{dashboardData.error}</Alert>
          ) : (
            <Stack spacing={4}>
              {/* Unfinished Bookings Section */}
              {!isLoadingBookings && unfinishedBookings && unfinishedBookings.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BookingIcon color="primary" />
                    Continue Your Booking
                  </Typography>

                  <Stack spacing={2}>
                    {unfinishedBookings.map((session) => (
                      <GlassCard
                        key={session.session_id}
                        variant="light"
                        intensity="subtle"
                        hover={true}
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/book?session_id=${session.session_id}`)}
                      >
                        <Box display="flex" alignItems="center" gap={2} p={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.primary.main, 0.15),
                              color: theme.palette.primary.main,
                            }}
                          >
                            <BookingIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {session.booking_flow?.name || 'Booking in Progress'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {session.current_step?.name || 'Step'} - {session.progress_percentage}% complete
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={session.progress_percentage}
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                            <Button
                              variant="contained"
                              size="small"
                              endIcon={<ArrowForwardIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/book?session_id=${session.session_id}`);
                              }}
                            >
                              Continue
                            </Button>
                          </Box>
                        </Box>
                      </GlassCard>
                    ))}
                  </Stack>
                </Box>
              )}

              {unfinishedBookings && unfinishedBookings.length > 0 && <Divider />}

              {/* Critical Actions Bar */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PriorityIcon color="error" />
                  Critical Actions
                </Typography>

                {/* Check if there are any critical actions */}
                {(dashboardData.criticalActions.quotesNeedingResponse.length > 0 ||
                  dashboardData.criticalActions.overduePayments.length > 0 ||
                  dashboardData.criticalActions.urgentTasks.length > 0 ||
                  dashboardData.criticalActions.contractsNeedingSignature.length > 0) ? (
                  <Stack spacing={2}>
                    {/* Quotes Needing Response */}
                    {dashboardData.criticalActions.quotesNeedingResponse.map((quote) => (
                      <GlassCard
                        key={quote.id}
                        variant="light"
                        intensity="subtle"
                        hover={true}
                        sx={{
                          backgroundColor: alpha(theme.palette.error.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/events/${quote.event_details.id}`, { state: { activeTab: 5 } })}
                      >
                        <Box display="flex" alignItems="center" gap={2} p={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.error.main, 0.15),
                              color: theme.palette.error.main,
                            }}
                          >
                            <WarningIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Quote Response Required
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {quote.event_details?.name || 'Event'} - Expires in {quote.daysUntilExpiry} day{quote.daysUntilExpiry !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuoteAction(quote.id, 'accept');
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuoteAction(quote.id, 'reject');
                              }}
                            >
                              Decline
                            </Button>
                          </Stack>
                        </Box>
                      </GlassCard>
                    ))}

                    {/* Overdue Payments */}
                    {dashboardData.criticalActions.overduePayments.map((payment) => (
                      <GlassCard
                        key={payment.id}
                        variant="light"
                        intensity="subtle"
                        sx={{
                          backgroundColor: alpha(theme.palette.error.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2} p={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.error.main, 0.15),
                              color: theme.palette.error.main,
                            }}
                          >
                            <PaymentIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Overdue Payment
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ${payment.amount} - {payment.daysPastDue} day{payment.daysPastDue !== 1 ? 's' : ''} overdue
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<PaymentIcon />}
                            onClick={() => handlePaymentAction(payment.id)}
                          >
                            Pay Now
                          </Button>
                        </Box>
                      </GlassCard>
                    ))}

                    {/* Urgent Tasks */}
                    {dashboardData.criticalActions.urgentTasks.map((task) => (
                      <GlassCard
                        key={task.id}
                        variant="light"
                        intensity="subtle"
                        hover={true}
                        sx={{
                          backgroundColor: alpha(theme.palette.warning.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/events/${task.eventId}`, { state: { activeTab: 3 } })}
                      >
                        <Box display="flex" alignItems="center" gap={2} p={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.warning.main, 0.15),
                              color: theme.palette.warning.main,
                            }}
                          >
                            <AccessTimeIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {task.title || task.description || 'Urgent Task'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {task.eventName} - Due: {formatInTimeZone(task.due_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewEvent(task.eventId);
                            }}
                          >
                            View Event
                          </Button>
                        </Box>
                      </GlassCard>
                    ))}

                    {/* Contracts Needing Signature */}
                    {dashboardData.criticalActions.contractsNeedingSignature.map((contract) => (
                      <GlassCard
                        key={contract.id}
                        variant="light"
                        intensity="subtle"
                        hover={true}
                        sx={{
                          backgroundColor: alpha(theme.palette.warning.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/events/${contract.eventId}`, { state: { activeTab: 6 } })}
                      >
                        <Box display="flex" alignItems="center" gap={2} p={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.warning.main, 0.15),
                              color: theme.palette.warning.main,
                            }}
                          >
                            <ContractIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Contract Signature Required
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {contract.templateName} - {contract.eventName}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/events/${contract.eventId}`, { state: { activeTab: 6 } });
                            }}
                          >
                            Sign Contract
                          </Button>
                        </Box>
                      </GlassCard>
                    ))}
                  </Stack>
                ) : (
                  <GlassCard
                    variant="light"
                    intensity="subtle"
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      All Caught Up!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No urgent actions required at this time.
                    </Typography>
                  </GlassCard>
                )}
              </Box>

              <Divider />

              {/* Event Status Overview */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon color="primary" />
                  Event Status
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  {/* Next Upcoming Event */}
                  <Box sx={{ flex: 1 }}>
                    <GlassCard variant="light" intensity="subtle" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          Next Upcoming Event
                        </Typography>
                        {dashboardData.eventStatus.nextUpcomingEvent ? (
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {dashboardData.eventStatus.nextUpcomingEvent.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {formatInTimeZone(dashboardData.eventStatus.nextUpcomingEvent.start_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                              {formatInTimeZone(dashboardData.eventStatus.nextUpcomingEvent.start_date, PHILIPPINE_TIMEZONE, 'yyyy-MM-dd') !== formatInTimeZone(dashboardData.eventStatus.nextUpcomingEvent.end_date, PHILIPPINE_TIMEZONE, 'yyyy-MM-dd') &&
                                ` - ${formatInTimeZone(dashboardData.eventStatus.nextUpcomingEvent.end_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}`
                              }
                            </Typography>
                            <Chip
                              label={dashboardData.eventStatus.nextUpcomingEvent.status.replace('_', ' ')}
                              color="primary"
                              size="small"
                              sx={{ mb: 2 }}
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() => handleViewEvent(dashboardData.eventStatus.nextUpcomingEvent!.id)}
                            >
                              View Details
                            </Button>
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CalendarIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                              No upcoming events scheduled
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </GlassCard>
                  </Box>

                  {/* Current Event Progress */}
                  <Box sx={{ flex: 1 }}>
                    <GlassCard variant="light" intensity="subtle" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          Current Event Progress
                        </Typography>
                        {dashboardData.eventStatus.currentEventProgress ? (
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {dashboardData.eventStatus.currentEventProgress.event.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {dashboardData.eventStatus.currentEventProgress.completedTasks} of {dashboardData.eventStatus.currentEventProgress.totalTasks} tasks completed
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                              <LinearProgress
                                variant="determinate"
                                value={dashboardData.eventStatus.currentEventProgress.progressPercentage}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                                {dashboardData.eventStatus.currentEventProgress.progressPercentage}% Complete
                              </Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() => handleViewEvent(dashboardData.eventStatus.currentEventProgress!.event.id)}
                            >
                              View Progress
                            </Button>
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <TrendingUpIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                              No events currently in progress
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </GlassCard>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Financial Summary */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon color="primary" />
                  Financial Summary
                </Typography>

                {/* Total Outstanding */}
                <GlassCard
                  variant="light"
                  intensity="subtle"
                  sx={{
                    backgroundColor: dashboardData.financialSummary.urgencyLevel === 'critical' || dashboardData.financialSummary.urgencyLevel === 'high'
                      ? alpha(theme.palette.error.main, 0.08)
                      : alpha(theme.palette.info.main, 0.08),
                    border: `1px solid ${dashboardData.financialSummary.urgencyLevel === 'critical' || dashboardData.financialSummary.urgencyLevel === 'high'
                      ? alpha(theme.palette.error.main, 0.3)
                      : alpha(theme.palette.info.main, 0.3)}`,
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Total Outstanding
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                      ${dashboardData.financialSummary.totalOutstanding}
                    </Typography>
                    <Chip
                      label={dashboardData.financialSummary.urgencyLevel.toUpperCase()}
                      color={dashboardData.financialSummary.urgencyLevel === 'critical' || dashboardData.financialSummary.urgencyLevel === 'high' ? 'error' : 'info'}
                      size="small"
                    />
                  </CardContent>
                </GlassCard>
              </Box>

              <Divider />

              {/* Communication Highlights */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageIcon color="primary" />
                  Communication Highlights
                  {dashboardData.communications.unreadCount > 0 && (
                    <Chip
                      label={`${dashboardData.communications.unreadCount} unread`}
                      color="warning"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>

                {dashboardData.communications.recentMessages.length > 0 ? (
                  <Stack spacing={2}>
                    {dashboardData.communications.recentMessages.slice(0, 3).map((message) => (
                      <GlassCard
                        key={message.id}
                        variant="light"
                        intensity="subtle"
                        hover={true}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: !message.is_opened
                            ? alpha(theme.palette.primary.main, 0.08)
                            : alpha('#fff', 0.03),
                          border: `1px solid ${!message.is_opened
                            ? alpha(theme.palette.primary.main, 0.3)
                            : alpha('#fff', 0.1)}`,
                        }}
                        onClick={() => navigate('/records')}
                      >
                        <Box display="flex" alignItems="center" gap={2} p={2}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.info.main, 0.15),
                              color: theme.palette.info.main,
                            }}
                          >
                            {message.channel === 'EMAIL' ? <EmailIcon /> : <MessageIcon />}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: !message.is_opened ? 600 : 500 }}
                            >
                              {message.subject || 'No Subject'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatInTimeZone(message.created_at, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                            </Typography>
                          </Box>
                          <Chip
                            label={message.is_opened ? 'Read' : 'Unread'}
                            size="small"
                            color={message.is_opened ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Box>
                      </GlassCard>
                    ))}
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/records')}
                      sx={{ alignSelf: 'center' }}
                    >
                      View All Records
                    </Button>
                  </Stack>
                ) : (
                  <GlassCard variant="light" intensity="subtle" sx={{ p: 3, textAlign: 'center' }}>
                    <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No Recent Messages
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your communications will appear here.
                    </Typography>
                  </GlassCard>
                )}
              </Box>
            </Stack>
          )}
        </GlassCard>
      </AnimatedElement>

      {/* Communication Analytics (if available) */}
      {commAnalytics && !isLoadingAnalytics && (
        <AnimatedElement animation="fadeIn" delay={500}>
          <GlassCard 
            variant="light" 
            intensity="medium"
            sx={{ 
              mt: 4,
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Communication Summary
            </Typography>
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {commAnalytics.total_sent}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Messages
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {commAnalytics.delivered}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Delivered
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                  {commAnalytics.opened}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Opened
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {commAnalytics.open_rate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open Rate
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}

      {/* Quote Rejection Dialog */}
      <QuoteRejectionDialog
        open={rejectionDialog.open}
        onClose={handleRejectionDialogClose}
        onConfirm={handleQuoteRejection}
        quoteName={rejectionDialog.quoteName || undefined}
        isLoading={rejectQuoteMutation.isPending}
      />
    </Box>
  );
};

export default Dashboard;