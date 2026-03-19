// frontend/client-portal/src/pages/payments/FinancialPortal/FinancialOverviewCards.tsx

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Avatar,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface FinancialOverviewCardsProps {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  completedCount: number;
  pendingCount: number;
  isLoading: boolean;
  formatAmount: (amount: number) => string;
  onRefresh: () => void;
}

const FinancialOverviewCards: React.FC<FinancialOverviewCardsProps> = ({
  totalPaid,
  totalPending,
  totalOverdue,
  completedCount,
  pendingCount,
  isLoading,
  formatAmount,
  onRefresh,
}) => {
  const theme = useTheme();

  const cardSx = {
    flex: 1,
    p: 3,
    border: `1px solid ${alpha('#fff', 0.1)}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
    },
  };

  return (
    <AnimatedElement animation="slideUp" delay={200}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          mb: 4,
        }}
      >
        {/* Total Paid Card */}
        <GlassCard variant="light" intensity="medium" hover={true} sx={cardSx}>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Avatar
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.15),
                  color: theme.palette.success.main,
                  border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                <CheckCircleIcon />
              </Avatar>
              <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                {formatAmount(totalPaid)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Paid
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.success.main }}>
                {completedCount} payments completed
              </Typography>
            </Box>
          </Stack>
        </GlassCard>

        {/* Pending Payments Card */}
        <GlassCard variant="light" intensity="medium" hover={true} sx={cardSx}>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Avatar
                sx={{
                  backgroundColor: alpha(theme.palette.warning.main, 0.15),
                  color: theme.palette.warning.main,
                  border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                }}
              >
                <ScheduleIcon />
              </Avatar>
              <WarningIcon sx={{ color: theme.palette.warning.main }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                {formatAmount(totalPending)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Payments
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.warning.main }}>
                {pendingCount} payments pending
              </Typography>
            </Box>
          </Stack>
        </GlassCard>

        {/* Overdue Amount Card */}
        <GlassCard variant="light" intensity="medium" hover={true} sx={cardSx}>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Avatar
                sx={{
                  backgroundColor: alpha(theme.palette.error.main, 0.15),
                  color: theme.palette.error.main,
                  border: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <ErrorIcon />
              </Avatar>
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={isLoading}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                  },
                }}
              >
                {isLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                {formatAmount(totalOverdue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overdue Amount
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.error.main }}>
                Overdue invoices
              </Typography>
            </Box>
          </Stack>
        </GlassCard>
      </Box>
    </AnimatedElement>
  );
};

export { FinancialOverviewCards };
