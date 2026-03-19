// frontend/client-portal/src/components/booking/BookingContainer/BookingPricingSummary.tsx

import React from 'react';
import { Box, Typography, Collapse, alpha } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { BookingContainerLogic } from './useBookingContainerLogic';

interface BookingPricingSummaryProps {
  logic: BookingContainerLogic;
}

export const BookingPricingSummary: React.FC<BookingPricingSummaryProps> = ({ logic }) => {
  const { theme, state, formatAmount, priceDetailsExpanded, setPriceDetailsExpanded } = logic;

  if (state.totalPrice === '0.00') {
    return null;
  }

  const hasTax = state.pricingBreakdown.formattedTax && parseFloat(state.pricingBreakdown.tax) > 0;
  const hasDiscount =
    state.pricingBreakdown.formattedDiscount && parseFloat(state.pricingBreakdown.discount) > 0;
  const hasExpandableDetails = hasTax || hasDiscount;

  return (
    <GlassCard
      variant="light"
      intensity="subtle"
      onClick={() => setPriceDetailsExpanded(!priceDetailsExpanded)}
      sx={{
        mt: 3,
        p: 2,
        backgroundColor: alpha(theme.palette.success.main, 0.08),
        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.success.main, 0.12),
        },
        '&:active': {
          transform: 'scale(0.99)',
        },
      }}
    >
      {/* Subtotal row - always show if we have breakdown data */}
      {state.pricingBreakdown.formattedSubtotal && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Subtotal:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {state.pricingBreakdown.formattedSubtotal}
          </Typography>
        </Box>
      )}

      {/* Collapsible Tax and Discount details */}
      <Collapse in={priceDetailsExpanded} timeout="auto">
        {/* Tax row - only show if we have tax data */}
        {hasTax && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Tax:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state.pricingBreakdown.formattedTax}
            </Typography>
          </Box>
        )}

        {/* Discount row - only show if discount exists */}
        {hasDiscount && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              Discount:
            </Typography>
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              -{state.pricingBreakdown.formattedDiscount}
            </Typography>
          </Box>
        )}
      </Collapse>

      {/* Divider if we have breakdown details */}
      {state.pricingBreakdown.formattedSubtotal && (
        <Box
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            my: 1,
          }}
        />
      )}

      {/* Total row with expand indicator */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: state.pricingBreakdown.formattedSubtotal ? 500 : 400,
            }}
          >
            {state.pricingBreakdown.formattedSubtotal ? 'Total:' : 'Current Total:'}
          </Typography>
          {/* Show expand hint if there's tax or discount to reveal */}
          {hasExpandableDetails && (
            <KeyboardArrowDown
              sx={{
                fontSize: 18,
                color: 'text.secondary',
                transform: priceDetailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            />
          )}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {formatAmount(state.totalPrice || '0')}
        </Typography>
      </Box>
    </GlassCard>
  );
};
