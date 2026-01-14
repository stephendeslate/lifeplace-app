import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Payment as PaymentIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { tokens } from '../../design-system';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useCurrentCurrency } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { ModernCard } from '../../components/common';
import type { Client } from '../../types/clients.types';
import type { PaymentPlan, PaymentInstallment } from '../../types/payments.types';

interface ClientPaymentPlansProps {
  client: Client;
}

interface PaymentAnalytics {
  totalOwed: number;
  totalPaid: number;
  overdueAmount: number;
  upcomingPayments: number;
  activePaymentPlans: number;
  averagePaymentTime: number;
  onTimePaymentRate: number;
}

const PaymentAnalyticsCard: React.FC<{ analytics: PaymentAnalytics }> = ({ analytics }) => {
  const { currentCurrency: currency } = useCurrentCurrency();

  const metrics = [
    {
      label: 'Total Outstanding',
      value: formatCurrency(analytics.totalOwed - analytics.totalPaid, String(currency)),
      icon: <AccountBalanceIcon />,
      color: 'info' as const,
    },
    {
      label: 'Overdue Amount',
      value: formatCurrency(analytics.overdueAmount, String(currency)),
      icon: <WarningIcon />,
      color: analytics.overdueAmount > 0 ? 'error' as const : 'success' as const,
    },
    {
      label: 'Active Plans',
      value: analytics.activePaymentPlans.toString(),
      icon: <PaymentIcon />,
      color: 'primary' as const,
    },
    {
      label: 'On-Time Rate',
      value: `${analytics.onTimePaymentRate.toFixed(1)}%`,
      icon: <TrendingUpIcon />,
      color: analytics.onTimePaymentRate >= 90 ? 'success' as const : analytics.onTimePaymentRate >= 70 ? 'warning' as const : 'error' as const,
    },
  ];

  return (
    <ModernCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Payment Overview
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          {metrics.map((metric, index) => (
            <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '50%',
                    backgroundColor: `${metric.color}.100`,
                    color: `${metric.color}.600`,
                    mb: 1,
                  }}
                >
                  {metric.icon}
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {metric.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metric.label}
                </Typography>
              </Paper>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </ModernCard>
  );
};

const PaymentPlanSummaryCard: React.FC<{
  paymentPlan: PaymentPlan;
  onViewDetails: (plan: PaymentPlan) => void;
  onSendReminder: (plan: PaymentPlan) => void;
}> = ({ paymentPlan, onViewDetails, onSendReminder }) => {
  const { currentCurrency: currency } = useCurrentCurrency();
  const completionPercentage = (parseFloat(paymentPlan.paid_amount) / parseFloat(paymentPlan.total_amount)) * 100;

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
      onClick={() => onViewDetails(paymentPlan)}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {paymentPlan.event_details?.name || `Event #${paymentPlan.event}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Plan #{paymentPlan.id} • {paymentPlan.number_of_installments} installments
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={paymentPlan.status}
              color={paymentPlan.status === 'ACTIVE' ? 'success' : 'default'}
              size="small"
            />
            {paymentPlan.is_overdue && (
              <Chip
                icon={<WarningIcon />}
                label="Overdue"
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(paymentPlan.paid_amount, String(currency))} / {formatCurrency(paymentPlan.total_amount, String(currency))}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: tokens.color.neutral[300],
              '& .MuiLinearProgress-bar': {
                backgroundColor: completionPercentage === 100 ? tokens.color.success[500] : tokens.color.primary[500],
              },
            }}
          />
        </Box>

        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Next Payment
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {paymentPlan.next_payment_date ? format(new Date(paymentPlan.next_payment_date), 'MMM d') : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Remaining
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(paymentPlan.remaining_balance, String(currency))}
            </Typography>
          </Box>
          {paymentPlan.is_overdue && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<SendIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onSendReminder(paymentPlan);
              }}
            >
              Remind
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const UpcomingPaymentsTable: React.FC<{ installments: PaymentInstallment[] }> = ({ installments }) => {
  const { currentCurrency: currency } = useCurrentCurrency();

  // Filter and sort upcoming payments (next 30 days)
  const upcomingInstallments = installments
    .filter(installment =>
      installment.status === 'PENDING' &&
      isAfter(new Date(installment.due_date), new Date()) &&
      isBefore(new Date(installment.due_date), addDays(new Date(), 30))
    )
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (upcomingInstallments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
        No upcoming payments in the next 30 days
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Event</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {upcomingInstallments.map((installment) => (
            <TableRow key={installment.id}>
              <TableCell>
                <Typography variant="body2">
                  {installment.payment_plan_details?.event_details?.name || 'Unknown Event'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(installment.due_date), 'MMM d, yyyy')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.ceil((new Date(installment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(installment.amount, String(currency))}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  #{installment.payment_plan} • {installment.installment_number}/{installment.payment_plan_details?.number_of_installments || 0}
                </Typography>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SendIcon />}
                >
                  Remind
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PaymentPlanDetailsAccordion: React.FC<{
  paymentPlan: PaymentPlan;
  installments: PaymentInstallment[];
}> = ({ paymentPlan, installments }) => {
  const { currentCurrency: currency } = useCurrentCurrency();
  const planInstallments = installments.filter(inst => inst.payment_plan === paymentPlan.id);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Box>
            <Typography variant="subtitle1">
              {paymentPlan.event_details?.name || `Event #${paymentPlan.event}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Plan #{paymentPlan.id} • {paymentPlan.status}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2} mr={2}>
            <Typography variant="body2">
              {formatCurrency(paymentPlan.paid_amount, String(currency))} / {formatCurrency(paymentPlan.total_amount, String(currency))}
            </Typography>
            {paymentPlan.is_overdue && (
              <Chip
                icon={<WarningIcon />}
                label="Overdue"
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Paid</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {planInstallments.map((installment) => (
                <TableRow key={installment.id}>
                  <TableCell>{installment.installment_number}</TableCell>
                  <TableCell>
                    {format(new Date(installment.due_date), 'MMM d, yyyy')}
                    {installment.days_overdue_count > 0 && (
                      <Typography variant="caption" color="error.main" display="block">
                        {installment.days_overdue_count} days overdue
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(installment.amount, String(currency))}</TableCell>
                  <TableCell>
                    <Chip
                      label={installment.status}
                      color={
                        installment.status === 'PAID' ? 'success' :
                        installment.status === 'OVERDUE' ? 'error' :
                        'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatCurrency(installment.paid_amount, String(currency))}
                    {parseFloat(installment.late_fee_amount) > 0 && (
                      <Typography variant="caption" color="warning.main" display="block">
                        +{formatCurrency(installment.late_fee_amount, String(currency))} fee
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
};

export const ClientPaymentPlans: React.FC<ClientPaymentPlansProps> = ({ client }) => {
  const [_selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);

  // WIP: Payment plans feature is disabled
  const paymentPlans: PaymentPlan[] = [];
  const isLoadingPlans = false;
  const plansError = null;
  const installments: PaymentInstallment[] = [];
  const isLoadingInstallments = false;

  const handleViewDetails = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
  };

  const handleSendReminder = async (plan: PaymentPlan) => {
    // Implementation for sending payment reminders
    console.log('Sending reminder for plan:', plan.id);
  };

  const handleSendBulkReminders = async () => {
    // Implementation for sending bulk reminders
    console.log('Sending bulk reminders for client:', client.id);
  };

  if (isLoadingPlans || isLoadingInstallments) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (plansError) {
    return (
      <Alert severity="error">
        Failed to load payment plans
      </Alert>
    );
  }

  const hasPaymentPlans = paymentPlans && paymentPlans.length > 0;

  // Calculate analytics
  const analytics: PaymentAnalytics = {
    totalOwed: paymentPlans?.reduce((sum: number, plan: PaymentPlan) => sum + parseFloat(plan.total_amount), 0) || 0,
    totalPaid: paymentPlans?.reduce((sum: number, plan: PaymentPlan) => sum + parseFloat(plan.paid_amount), 0) || 0,
    overdueAmount: paymentPlans?.filter((plan: PaymentPlan) => plan.is_overdue).reduce((sum: number, plan: PaymentPlan) => sum + parseFloat(plan.remaining_balance), 0) || 0,
    upcomingPayments: installments?.filter((inst: PaymentInstallment) =>
      inst.status === 'PENDING' &&
      isAfter(new Date(inst.due_date), new Date()) &&
      isBefore(new Date(inst.due_date), addDays(new Date(), 30))
    ).length || 0,
    activePaymentPlans: paymentPlans?.filter((plan: PaymentPlan) => plan.status === 'ACTIVE').length || 0,
    averagePaymentTime: 0, // Would be calculated from payment history
    onTimePaymentRate: 85, // Would be calculated from payment history
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Payment Plans for {client.first_name} {client.last_name}
        </Typography>
        {hasPaymentPlans && analytics.overdueAmount > 0 && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<SendIcon />}
            onClick={handleSendBulkReminders}
          >
            Send Overdue Reminders
          </Button>
        )}
      </Box>

      {!hasPaymentPlans ? (
        <ModernCard>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <PaymentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Payment Plans
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This client doesn't have any payment plans yet. Payment plans will appear here when events with installment payments are created.
            </Typography>
          </CardContent>
        </ModernCard>
      ) : (
        <Stack spacing={3}>
          {/* Analytics Overview */}
          <PaymentAnalyticsCard analytics={analytics} />

          {/* Payment Plans Summary */}
          <ModernCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Payment Plans ({analytics.activePaymentPlans})
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {paymentPlans?.filter((plan: PaymentPlan) => plan.status === 'ACTIVE').map((plan: PaymentPlan) => (
                  <Box key={plan.id} sx={{ flex: { xs: '1 1 100%', md: '1 1 48%', lg: '1 1 32%' } }}>
                    <PaymentPlanSummaryCard
                      paymentPlan={plan}
                      onViewDetails={handleViewDetails}
                      onSendReminder={handleSendReminder}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </ModernCard>

          {/* Upcoming Payments */}
          {analytics.upcomingPayments > 0 && (
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Payments (Next 30 Days)
                </Typography>
                <UpcomingPaymentsTable installments={installments || []} />
              </CardContent>
            </ModernCard>
          )}

          {/* Detailed Payment Plans */}
          <ModernCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Plan Details
              </Typography>
              <Stack spacing={1}>
                {paymentPlans?.map((plan: PaymentPlan) => (
                  <PaymentPlanDetailsAccordion
                    key={plan.id}
                    paymentPlan={plan}
                    installments={installments || []}
                  />
                ))}
              </Stack>
            </CardContent>
          </ModernCard>
        </Stack>
      )}
    </Box>
  );
};