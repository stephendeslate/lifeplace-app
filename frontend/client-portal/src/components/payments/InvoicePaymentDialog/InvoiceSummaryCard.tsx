import React from 'react';
import { Typography, Box, Stack, Divider } from '@mui/material';
import { GlassCard } from '@/design-system';
import FinancialApi from '@/apis/financial';
import type { Invoice } from '@/types/financial';

interface InvoiceSummaryCardProps {
  invoice: Invoice;
  paymentStatus: {
    amountPaid: number;
    amountRemaining: number;
  };
}

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({
  invoice,
  paymentStatus,
}) => {
  return (
    <GlassCard variant="light" intensity="subtle" sx={{ mb: 3 }}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={2}
          spacing={1}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Payment Summary
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Total Amount:
          </Typography>
          <Typography variant="body2">
            {FinancialApi.formatAmount(invoice.total_amount, invoice.currency)}
          </Typography>
        </Stack>

        {paymentStatus.amountPaid > 0 && (
          <Stack direction="row" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Amount Paid:
            </Typography>
            <Typography variant="body2" color="success.main">
              -{FinancialApi.formatAmount(paymentStatus.amountPaid, invoice.currency)}
            </Typography>
          </Stack>
        )}

        <Divider sx={{ my: 1 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Amount Due:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)}
          </Typography>
        </Stack>
      </Box>
    </GlassCard>
  );
};
