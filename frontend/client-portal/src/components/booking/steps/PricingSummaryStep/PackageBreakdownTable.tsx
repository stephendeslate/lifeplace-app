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
  Skeleton,
} from '@mui/material';
import type { SelectedPackage } from '@/types/booking';
import type { SimplePricingBreakdown } from '@/hooks/booking/useSimplePricing';

interface PackageBreakdownTableProps {
  selectedPackages: SelectedPackage[];
  pricing: SimplePricingBreakdown;
  isUpdatingPrices: boolean;
  formatAmount: (amount: string) => string;
}

export const PackageBreakdownTable: React.FC<PackageBreakdownTableProps> = ({
  selectedPackages,
  pricing,
  isUpdatingPrices,
  formatAmount,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Selected Packages
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Package</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedPackages.map((pkg) => {
              const lineItem = pricing.lineItems?.find(
                (item) => item.product_id === pkg.product_id,
              );
              const basePrice = lineItem?.base_unit_price
                ? parseFloat(lineItem.base_unit_price)
                : parseFloat(pkg.price);
              const unitPrice = basePrice;
              const totalPrice = lineItem?.total_unit_price
                ? parseFloat(lineItem.total_unit_price)
                : parseFloat(pkg.price);

              const venueDetails = lineItem?.venue_details;
              const hasVenueExcess =
                venueDetails &&
                venueDetails.length > 0 &&
                venueDetails.some((v) => v.additional_hours > 0);
              const hasLegacyExcess =
                !hasVenueExcess && lineItem?.excess_hours && lineItem.excess_hours > 0;

              const breakdown = pkg.attendee_breakdown || lineItem?.attendee_breakdown;
              const activeTiers = breakdown?.filter((t) => t.count > 0);
              const showBreakdown = activeTiers && activeTiers.length > 1;

              return (
                <React.Fragment key={pkg.product_id}>
                  <TableRow>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {pkg.name}
                          {showBreakdown && pkg.pricing_unit === 'PER_PERSON' && (
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: 400 }}
                            >
                              {' '}
                              ({pkg.quantity} persons)
                            </Typography>
                          )}
                        </Typography>
                        {hasVenueExcess && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              Base: {formatAmount(basePrice.toString())}
                            </Typography>
                            {venueDetails?.map(
                              (venue) =>
                                venue.additional_hours > 0 && (
                                  <Typography
                                    key={venue.venue_id}
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block' }}
                                  >
                                    {venue.venue_name}: +{venue.additional_hours}h @{' '}
                                    {formatAmount(venue.excess_hour_price)}
                                    /h
                                  </Typography>
                                ),
                            )}
                          </Box>
                        )}
                        {hasLegacyExcess && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            Base: {formatAmount(basePrice.toString())}
                            {lineItem.excess_hours && lineItem.excess_hour_price && (
                              <>
                                {' '}
                                + {lineItem.excess_hours}h excess @{' '}
                                {formatAmount(lineItem.excess_hour_price)}
                                /h
                              </>
                            )}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {!showBreakdown && pkg.pricing_unit === 'PER_PERSON' ? (
                        <Box>
                          <Typography variant="body2">{pkg.quantity} persons</Typography>
                          {pkg.minimum_guests && pkg.minimum_guests > 1 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              min. {pkg.minimum_guests}
                            </Typography>
                          )}
                        </Box>
                      ) : showBreakdown ? (
                        ''
                      ) : (
                        pkg.quantity
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2">
                          {isUpdatingPrices ? (
                            <Skeleton width={60} animation="wave" />
                          ) : !showBreakdown ? (
                            formatAmount(unitPrice.toString())
                          ) : (
                            ''
                          )}
                        </Typography>
                        {!showBreakdown && pkg.pricing_unit === 'PER_PERSON' && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            per person
                          </Typography>
                        )}
                        {(hasVenueExcess || hasLegacyExcess) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            (+
                            {formatAmount((totalPrice - basePrice).toString())} excess)
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {isUpdatingPrices ? (
                        <Skeleton width={80} animation="wave" />
                      ) : (
                        formatAmount((totalPrice * pkg.quantity).toString())
                      )}
                    </TableCell>
                  </TableRow>
                  {/* Attendee breakdown sub-rows */}
                  {showBreakdown &&
                    activeTiers.map((tier, idx) => (
                      <TableRow
                        key={`${pkg.product_id}-tier-${idx}`}
                        sx={{
                          '& > .MuiTableCell-root': {
                            borderBottom: idx === activeTiers.length - 1 ? undefined : 'none',
                            py: 0.5,
                          },
                        }}
                      >
                        <TableCell colSpan={2} sx={{ pl: 4 }}>
                          <Typography variant="caption" color="text.secondary">
                            {tier.count} {tier.tier_label}
                            {tier.discount_percentage > 0
                              ? ` (${tier.discount_percentage}% off)`
                              : ''}{' '}
                            &times; {formatAmount(tier.unit_price.toString())}
                            /person
                          </Typography>
                        </TableCell>
                        <TableCell />
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">
                            {formatAmount(tier.subtotal.toString())}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
