// frontend/client-portal/src/components/booking/shared/BookingSummaryCard.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack,
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  Place,
  Receipt,
} from '@mui/icons-material';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import type {
  EventSummary,
  PackageLineItem,
  AddonLineItem,
  PricingBreakdown,
} from '../../../types/booking';

interface BookingSummaryCardProps {
  event?: EventSummary;
  packages: PackageLineItem[];
  addons: AddonLineItem[];
  pricing: PricingBreakdown;
  displayMode?: 'review' | 'confirmation';
  showPackageBreakdown?: boolean;
  showAddonBreakdown?: boolean;
  showPricingBreakdown?: boolean;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  event,
  packages,
  addons,
  pricing,
  displayMode = 'confirmation',
  showPackageBreakdown = true,
  showAddonBreakdown = true,
  showPricingBreakdown = true,
}) => {
  const { formatAmount } = useCurrencySettings();

  const hasItems = packages.length > 0 || addons.length > 0;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt />
        {displayMode === 'confirmation' ? 'Booking Summary' : 'Review Your Booking'}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Event Details */}
      {event && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Event Details
          </Typography>
          <Stack spacing={1.5}>
            {event.eventType && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                  Event Type:
                </Typography>
                <Typography variant="body2">{event.eventType}</Typography>
              </Box>
            )}
            {event.date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                  Date:
                </Typography>
                <Typography variant="body2">{event.date}</Typography>
              </Box>
            )}
            {event.time && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                  Time:
                </Typography>
                <Typography variant="body2">{event.time}</Typography>
              </Box>
            )}
            {event.duration && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                  Duration:
                </Typography>
                <Typography variant="body2">{event.duration} hours</Typography>
              </Box>
            )}
            {event.venue && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Place sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                  Venue:
                </Typography>
                <Typography variant="body2">{event.venue}</Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Packages Breakdown */}
      {showPackageBreakdown && packages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Selected Packages
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Package</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.product_id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {pkg.name}
                        </Typography>
                        {pkg.excess_hours && pkg.excess_hours > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Base: {formatAmount(pkg.base_price)}
                            {' + '}{pkg.excess_hours}h excess @ {formatAmount(pkg.excess_hour_price || '0')}/h
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{pkg.quantity}</TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">
                          {formatAmount(pkg.unit_price)}
                        </Typography>
                        {pkg.excess_cost && parseFloat(pkg.excess_cost) > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            (+{formatAmount((parseFloat(pkg.excess_cost) / pkg.quantity).toString())} excess)
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatAmount(pkg.line_total)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add-ons Breakdown */}
      {showAddonBreakdown && addons.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Selected Add-ons
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Add-on</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {addons.map((addon) => (
                  <TableRow key={addon.product_id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {addon.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{addon.quantity}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatAmount(addon.unit_price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatAmount(addon.line_total)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* No Items Message */}
      {!hasItems && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center', py: 2 }}>
          No packages or add-ons selected
        </Typography>
      )}

      {/* Pricing Summary */}
      {showPricingBreakdown && hasItems && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2">{pricing.formattedSubtotal}</Typography>
            </Box>

            {pricing.tax && parseFloat(pricing.tax) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Tax:</Typography>
                <Typography variant="body2">{pricing.formattedTax}</Typography>
              </Box>
            )}

            {pricing.discount && parseFloat(pricing.discount) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                <Typography variant="body2">
                  Discount {pricing.discountDetails?.code && `(${pricing.discountDetails.code})`}:
                </Typography>
                <Typography variant="body2">-{pricing.formattedDiscount}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                {pricing.formattedTotal}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
