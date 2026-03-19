import React from 'react';
import { Box, Typography, Stack, Button, useTheme, alpha } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Assignment as ContractIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  PriorityHigh as PriorityIcon,
} from '@mui/icons-material';
import { EVENT_TAB_INDICES } from '@/pages/events/EventDetail';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { DashboardData } from '@/hooks/useDashboardData/dashboard-types';
import { safeFormatDate, PHILIPPINE_TIMEZONE } from './dashboard-utils';

interface CriticalActionsSectionProps {
  criticalActions: DashboardData['criticalActions'];
  onNavigate: (path: string, options?: { state?: Record<string, unknown> }) => void;
  onQuoteAction: (quoteId: number, action: 'accept' | 'reject') => void;
  onPaymentAction: (paymentId: number) => void;
  onViewEvent: (eventId: number) => void;
}

const CriticalActionsSection: React.FC<CriticalActionsSectionProps> = ({
  criticalActions,
  onNavigate,
  onQuoteAction,
  onPaymentAction,
  onViewEvent,
}) => {
  const theme = useTheme();

  const hasCriticalActions =
    criticalActions.quotesNeedingResponse.length > 0 ||
    criticalActions.overduePayments.length > 0 ||
    criticalActions.urgentTasks.length > 0 ||
    criticalActions.contractsNeedingSignature.length > 0;

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <PriorityIcon color="error" />
        Critical Actions
      </Typography>

      {hasCriticalActions ? (
        <Stack spacing={2}>
          {criticalActions.quotesNeedingResponse.map((quote) => (
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
              onClick={() =>
                onNavigate(`/events/${quote.event_details.id}`, {
                  state: { activeTab: EVENT_TAB_INDICES.QUOTES },
                })
              }
            >
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} p={2}>
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
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: 'calc(100% - 56px)', sm: 0 },
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Quote Response Required
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {quote.event_details?.name || 'Event'} - Expires in {quote.daysUntilExpiry} day
                    {quote.daysUntilExpiry !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuoteAction(quote.id, 'accept');
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
                      onQuoteAction(quote.id, 'reject');
                    }}
                  >
                    Decline
                  </Button>
                </Stack>
              </Box>
            </GlassCard>
          ))}

          {criticalActions.overduePayments.map((payment) => (
            <GlassCard
              key={payment.id}
              variant="light"
              intensity="subtle"
              sx={{
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              }}
            >
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} p={2}>
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
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: 'calc(100% - 56px)', sm: 0 },
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Overdue Payment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${payment.amount} - {payment.daysPastDue} day
                    {payment.daysPastDue !== 1 ? 's' : ''} overdue
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<PaymentIcon />}
                  onClick={() => onPaymentAction(payment.id)}
                >
                  Pay Now
                </Button>
              </Box>
            </GlassCard>
          ))}

          {criticalActions.urgentTasks.map((task) => (
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
              onClick={() =>
                onNavigate(`/events/${task.eventId}`, {
                  state: { activeTab: EVENT_TAB_INDICES.TASKS },
                })
              }
            >
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} p={2}>
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
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: 'calc(100% - 56px)', sm: 0 },
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {task.title || task.description || 'Urgent Task'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {task.eventName} - Due:{' '}
                    {safeFormatDate(task.due_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewEvent(task.eventId);
                  }}
                >
                  View Event
                </Button>
              </Box>
            </GlassCard>
          ))}

          {criticalActions.contractsNeedingSignature.map((contract) => (
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
              onClick={() =>
                onNavigate(`/events/${contract.eventId}`, {
                  state: {
                    activeTab: EVENT_TAB_INDICES.CONTRACTS,
                  },
                })
              }
            >
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} p={2}>
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
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: 'calc(100% - 56px)', sm: 0 },
                  }}
                >
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
                    onNavigate(`/events/${contract.eventId}`, {
                      state: {
                        activeTab: EVENT_TAB_INDICES.CONTRACTS,
                      },
                    });
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
  );
};

export default CriticalActionsSection;
