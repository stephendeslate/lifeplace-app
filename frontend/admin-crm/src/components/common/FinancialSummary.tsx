// frontend/admin-crm/src/components/common/FinancialSummary.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  CheckCircle as PaidIcon,
  Warning as OverdueIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  AccountBalance as BalanceIcon,
} from '@mui/icons-material';

export interface FinancialMetric {
  label: string;
  value: number;
  formatted?: string;
  currency?: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
    period?: string;
  };
  status?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon?: React.ReactNode;
}

export interface PaymentBreakdown {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  currency?: string;
}

export interface FinancialSummaryProps {
  title?: string;
  metrics?: FinancialMetric[];
  paymentBreakdown?: PaymentBreakdown;
  showProgress?: boolean;
  showTrends?: boolean;
  currency?: string;
  compactMode?: boolean;
}

const formatCurrency = (amount: number, currency = 'PHP') => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status?: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  switch (status) {
    case 'positive': return 'success';
    case 'negative': return 'error';
    case 'warning': return 'warning';
    case 'neutral': return 'info';
    default: return 'default';
  }
};

const MetricCard: React.FC<{ 
  metric: FinancialMetric; 
  compactMode?: boolean;
  currency?: string;
}> = ({ metric, currency = 'PHP' }) => {
  const displayValue = metric.formatted || formatCurrency(metric.value, metric.currency || currency);
  
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ pb: 2 }}>
        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between" alignItems="start">
            <Box display="flex" alignItems="center" gap={1}>
              {metric.icon && (
                <Box sx={{ color: `${getStatusColor(metric.status)}.main` }}>
                  {metric.icon}
                </Box>
              )}
              <Typography 
                variant="body2" 
                color="text.secondary"
                fontWeight="medium"
              >
                {metric.label}
              </Typography>
            </Box>
            {metric.trend && (
              <Box display="flex" alignItems="center" gap={0.5}>
                {metric.trend.direction === 'up' ? (
                  <TrendingUpIcon fontSize="small" color="success" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="error" />
                )}
                <Typography variant="caption" color={metric.trend.direction === 'up' ? 'success.main' : 'error.main'}>
                  {metric.trend.percentage}%
                </Typography>
              </Box>
            )}
          </Box>
          
          <Typography 
            variant="h5" 
            fontWeight="bold"
            color={`${getStatusColor(metric.status)}.main`}
          >
            {displayValue}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

const PaymentBreakdownCard: React.FC<{ 
  breakdown: PaymentBreakdown; 
  compactMode?: boolean;
  currency?: string;
}> = ({ breakdown, currency = 'PHP' }) => {
  const paidPercentage = breakdown.total > 0 ? (breakdown.paid / breakdown.total) * 100 : 0;
  const pendingPercentage = breakdown.total > 0 ? (breakdown.pending / breakdown.total) * 100 : 0;
  const overduePercentage = breakdown.total > 0 ? (breakdown.overdue / breakdown.total) * 100 : 0;

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <PaymentIcon color="primary" />
          <Typography variant="h6">Payment Overview</Typography>
        </Box>

        <Stack spacing={2}>
          {/* Total */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Amount
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {formatCurrency(breakdown.total, breakdown.currency || currency)}
            </Typography>
          </Box>

          {/* Progress Bar */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Payment Progress
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {Math.round(paidPercentage)}% Complete
              </Typography>
            </Box>
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={paidPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: 'success.main',
                  },
                }}
              />
              {overduePercentage > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={overduePercentage}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: `${paidPercentage}%`,
                    width: `${pendingPercentage + overduePercentage}%`,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'transparent',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: 'error.main',
                    },
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Breakdown Items */}
          <Stack spacing={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <PaidIcon fontSize="small" color="success" />
                <Typography variant="body2" color="text.secondary">
                  Paid
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="medium" color="success.main">
                {formatCurrency(breakdown.paid, breakdown.currency || currency)}
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon fontSize="small" color="warning" />
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="medium" color="warning.main">
                {formatCurrency(breakdown.pending, breakdown.currency || currency)}
              </Typography>
            </Box>

            {breakdown.overdue > 0 && (
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <OverdueIcon fontSize="small" color="error" />
                  <Typography variant="body2" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="medium" color="error.main">
                  {formatCurrency(breakdown.overdue, breakdown.currency || currency)}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Alerts */}
          {breakdown.overdue > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                {formatCurrency(breakdown.overdue, breakdown.currency || currency)} is overdue and requires immediate attention.
              </Typography>
            </Alert>
          )}

          {paidPercentage === 100 && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2">
                All payments have been completed! 🎉
              </Typography>
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  title = "Financial Summary",
  metrics = [],
  paymentBreakdown,
  compactMode = false,
  currency = 'PHP',
}) => {
  if (metrics.length === 0 && !paymentBreakdown) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={2}>
            <MoneyIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              No Financial Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Financial information will appear here once data is available.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Title */}
      {title && (
        <Box display="flex" alignItems="center" gap={1}>
          <MoneyIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <Box 
          display="grid" 
          gridTemplateColumns={{ 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: metrics.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' 
          }}
          gap={2}
        >
          {metrics.map((metric, index) => (
            <MetricCard 
              key={index}
              metric={metric} 
              compactMode={compactMode} 
              currency={currency}
            />
          ))}
        </Box>
      )}

      {/* Payment Breakdown */}
      {paymentBreakdown && (
        <PaymentBreakdownCard 
          breakdown={paymentBreakdown} 
          compactMode={compactMode} 
          currency={currency}
        />
      )}
    </Stack>
  );
};

// Utility functions for common financial calculations
export const calculateEventFinancials = (event: any): FinancialMetric[] => {
  const totalPrice = parseFloat(event.total_price || '0');
  const totalPaid = parseFloat(event.total_amount_paid || '0');
  const totalDue = parseFloat(event.total_amount_due || '0');
  
  return [
    {
      label: 'Event Value',
      value: totalPrice,
      icon: <InvoiceIcon />,
      status: totalPrice > 0 ? 'positive' : 'neutral',
    },
    {
      label: 'Amount Paid',
      value: totalPaid,
      icon: <PaidIcon />,
      status: 'positive',
    },
    {
      label: 'Balance Due',
      value: totalDue,
      icon: <BalanceIcon />,
      status: totalDue > 0 ? 'warning' : 'positive',
    },
  ];
};

export const calculateClientFinancials = (events: any[]): FinancialMetric[] => {
  const totalRevenue = events.reduce((sum, event) => sum + parseFloat(event.total_price || '0'), 0);
  const totalPaid = events.reduce((sum, event) => sum + parseFloat(event.total_amount_paid || '0'), 0);
  const averageEventValue = events.length > 0 ? totalRevenue / events.length : 0;
  
  return [
    {
      label: 'Total Revenue',
      value: totalRevenue,
      icon: <MoneyIcon />,
      status: 'positive',
    },
    {
      label: 'Total Paid',
      value: totalPaid,
      icon: <PaidIcon />,
      status: 'positive',
    },
    {
      label: 'Avg Event Value',
      value: averageEventValue,
      icon: <TrendingUpIcon />,
      status: 'neutral',
    },
  ];
};