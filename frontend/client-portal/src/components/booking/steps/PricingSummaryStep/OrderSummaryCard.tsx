import React from 'react';
import { Box, Typography, Paper, Divider, Skeleton } from '@mui/material';
import type { PricingSummaryStepConfiguration } from '@/types/booking';

interface PricingData {
  subtotal: number;
  tax: number;
  discount: number;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedTotal: string;
}

interface OrderSummaryCardProps {
  config: PricingSummaryStepConfiguration | null;
  pricing: PricingData;
  totalItemCount: number;
  isQuoteMode: boolean;
  isUpdatingPrices: boolean;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  config,
  pricing,
  totalItemCount,
  isQuoteMode,
  isUpdatingPrices,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        ...(isQuoteMode && { borderColor: 'info.main', borderWidth: 2 }),
      }}
    >
      <Typography variant="h6" gutterBottom>
        {isQuoteMode ? 'Estimated Add-ons Summary' : 'Order Summary'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {config?.show_subtotal !== false && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Subtotal ({totalItemCount} items)</Typography>
            <Typography>
              {isUpdatingPrices ? (
                <Skeleton width={80} animation="wave" />
              ) : (
                pricing.formattedSubtotal
              )}
            </Typography>
          </Box>
        )}

        {config?.show_tax_breakdown !== false && pricing.tax > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Tax</Typography>
            <Typography>
              {isUpdatingPrices ? <Skeleton width={80} animation="wave" /> : pricing.formattedTax}
            </Typography>
          </Box>
        )}

        {pricing.discount > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'success.main',
            }}
          >
            <Typography>Discount</Typography>
            <Typography>
              {isUpdatingPrices ? (
                <Skeleton width={80} animation="wave" />
              ) : (
                `-${pricing.formattedDiscount}`
              )}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">{isQuoteMode ? 'Estimated Total' : 'Total'}</Typography>
          <Typography variant="h6" color={isQuoteMode ? 'info.main' : 'primary'}>
            {isUpdatingPrices ? <Skeleton width={100} animation="wave" /> : pricing.formattedTotal}
          </Typography>
        </Box>
        {isQuoteMode && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1, textAlign: 'center' }}
          >
            * Final pricing will be provided in your custom quote, which will include a recommended
            package.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
