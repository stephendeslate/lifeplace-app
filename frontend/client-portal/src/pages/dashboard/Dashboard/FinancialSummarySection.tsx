import React from 'react';
import { Box, Typography, Chip, CardContent, useTheme, alpha } from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { DashboardData } from '@/hooks/useDashboardData/dashboard-types';

interface FinancialSummarySectionProps {
  financialSummary: DashboardData['financialSummary'];
  formatAmount: (amount: number) => string;
}

const FinancialSummarySection: React.FC<FinancialSummarySectionProps> = ({
  financialSummary,
  formatAmount,
}) => {
  const theme = useTheme();

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
        <MoneyIcon color="primary" />
        Financial Summary
      </Typography>

      <GlassCard
        variant="light"
        intensity="subtle"
        sx={{
          backgroundColor:
            financialSummary.urgencyLevel === 'critical' || financialSummary.urgencyLevel === 'high'
              ? alpha(theme.palette.error.main, 0.08)
              : alpha(theme.palette.info.main, 0.08),
          border: `1px solid ${
            financialSummary.urgencyLevel === 'critical' || financialSummary.urgencyLevel === 'high'
              ? alpha(theme.palette.error.main, 0.3)
              : alpha(theme.palette.info.main, 0.3)
          }`,
        }}
      >
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Total Outstanding
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            {formatAmount(parseFloat(financialSummary.totalOutstanding))}
          </Typography>
          <Chip
            label={financialSummary.urgencyLevel.toUpperCase()}
            color={
              financialSummary.urgencyLevel === 'critical' ||
              financialSummary.urgencyLevel === 'high'
                ? 'error'
                : 'info'
            }
            size="small"
          />
        </CardContent>
      </GlassCard>
    </Box>
  );
};

export default FinancialSummarySection;
