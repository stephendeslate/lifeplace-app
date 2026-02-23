// design-system/visualizations/PricingDisplay.tsx
// Note: This design system component shows basic pricing breakdown
// For detailed venue-based excess hours, see:
// - PricingSummaryStep.tsx
// - BookingSummaryCard.tsx
// - InvoiceViewer.tsx

import React from 'react';
import { Box, Typography, Chip, Divider, Tooltip, IconButton, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ExpandMore, ExpandLess, LocalOffer, Schedule, AttachMoney } from '@mui/icons-material';
import { tokens } from '../tokens';
import { GlassCard } from '../components/GlassCard';
import { AnimatedElement } from '../components/AnimatedElement';

// Import actual types from backend
import type {
  ProductOption,
  Discount,
  PricingCalculation,
  SelectedPackage,
  SelectedAddon,
} from '../../types/booking/stepData.types';

// Updated to use actual backend data structures
interface PricingDisplayProps {
  pricingCalculation: PricingCalculation;
  selectedPackages?: SelectedPackage[];
  selectedAddons?: SelectedAddon[];
  appliedDiscount?: Discount;
  showBreakdown?: boolean;
  showExcessHours?: boolean;
  currency?: string;
  compact?: boolean;
}

const StyledPriceContainer = styled(Box)(() => ({
  position: 'relative',
  padding: tokens.spacing.space[3],
  borderRadius: tokens.spacing.radius.card,
  background: `linear-gradient(135deg, ${tokens.color.base.forest[50]} 0%, ${tokens.color.base.gold[50]} 100%)`,
  overflow: 'hidden',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: tokens.color.gradients.glassOverlay,
    pointerEvents: 'none',
  },
}));

const StyledBreakdownItem = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${tokens.spacing.space[1]} 0`,
  transition: tokens.animation.transition.all,

  '&:hover': {
    transform: 'translateX(4px)',
  },
}));

const StyledSavingsBadge = styled(Chip)(() => ({
  background: tokens.color.gradients.forest,
  color: 'white',
  fontWeight: 600,
  animation: 'pulse 2s infinite',

  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
  },
}));

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
  pricingCalculation,
  selectedPackages = [],
  selectedAddons = [],
  appliedDiscount,
  showBreakdown = true,
  // showExcessHours = true, // Reserved for future features
  currency = '₱',
  compact = false,
}) => {
  const [showDetails, setShowDetails] = React.useState(!compact);

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${currency}${numPrice.toLocaleString()}`;
  };

  const hasDiscount = appliedDiscount && pricingCalculation.discount_details;
  const subtotal = parseFloat(pricingCalculation.subtotal);
  const total = parseFloat(pricingCalculation.total);
  const discount = parseFloat(pricingCalculation.discount);
  const tax = parseFloat(pricingCalculation.tax);

  return (
    <GlassCard variant="light" intensity="medium" hover={false}>
      <StyledPriceContainer>
        <AnimatedElement animation="fadeIn" duration={500}>
          {/* Price Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              {hasDiscount && discount > 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    textDecoration: 'line-through',
                    color: tokens.color.base.sage[500],
                  }}
                >
                  {formatPrice(subtotal + discount)}
                </Typography>
              )}
              <Typography
                variant="h3"
                fontWeight={700}
                color={tokens.color.base.forest[700]}
                sx={{ lineHeight: 1 }}
              >
                {formatPrice(total)}
              </Typography>

              {tax > 0 && (
                <Typography variant="caption" color="text.secondary">
                  (includes {formatPrice(tax)} tax)
                </Typography>
              )}
            </Box>

            {hasDiscount && (
              <StyledSavingsBadge
                icon={<LocalOffer />}
                label={`${pricingCalculation.discount_details?.name}`}
              />
            )}
          </Box>

          {/* Toggle Details */}
          {compact && (
            <Box display="flex" justifyContent="center">
              <IconButton
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                sx={{ color: tokens.color.base.forest[600] }}
              >
                {showDetails ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          )}

          {/* Price Breakdown */}
          <Collapse in={showDetails && showBreakdown}>
            {(selectedPackages.length > 0 || selectedAddons.length > 0) && (
              <>
                <Divider sx={{ my: 2, borderColor: tokens.color.base.sage[200] }} />
                <Box>
                  {/* Packages */}
                  {selectedPackages.map((pkg, index) => (
                    <AnimatedElement
                      key={`package-${pkg.product_id}`}
                      animation="slideUp"
                      delay={index * 50}
                      duration={300}
                    >
                      <StyledBreakdownItem>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {pkg.name} × {pkg.quantity}
                          </Typography>
                          {pkg.included_hours && (
                            <Tooltip title={`Includes ${pkg.included_hours} hours`} arrow>
                              <Schedule sx={{ fontSize: 14, color: tokens.color.base.sage[400] }} />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="body2">
                          {formatPrice(parseFloat(pkg.price) * pkg.quantity)}
                        </Typography>
                      </StyledBreakdownItem>
                    </AnimatedElement>
                  ))}

                  {/* Addons */}
                  {selectedAddons.map((addon, index) => (
                    <AnimatedElement
                      key={`addon-${addon.product_id}`}
                      animation="slideUp"
                      delay={(selectedPackages.length + index) * 50}
                      duration={300}
                    >
                      <StyledBreakdownItem>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {addon.name} × {addon.quantity}
                          </Typography>
                        </Box>
                        <Typography variant="body2">
                          {formatPrice(parseFloat(addon.price) * addon.quantity)}
                        </Typography>
                      </StyledBreakdownItem>
                    </AnimatedElement>
                  ))}

                  {/* Tax */}
                  {tax > 0 && (
                    <StyledBreakdownItem>
                      <Typography variant="body2">Tax</Typography>
                      <Typography variant="body2">{formatPrice(tax)}</Typography>
                    </StyledBreakdownItem>
                  )}
                </Box>
              </>
            )}

            {/* Discount Details */}
            {hasDiscount && discount > 0 && (
              <>
                <Divider sx={{ my: 2, borderColor: tokens.color.base.sage[200] }} />
                <StyledBreakdownItem>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color={tokens.color.semantic.success.main}>
                      {pricingCalculation.discount_details?.name}
                    </Typography>
                    {pricingCalculation.discount_details?.code && (
                      <Chip
                        size="small"
                        label={pricingCalculation.discount_details.code}
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={tokens.color.semantic.success.main}
                  >
                    -{formatPrice(discount)}
                  </Typography>
                </StyledBreakdownItem>
              </>
            )}

            {/* Total Summary */}
            <Divider sx={{ my: 2, borderColor: tokens.color.base.sage[200] }} />
            <Box
              p={2}
              borderRadius={2}
              bgcolor={tokens.color.base.forest[50]}
              border={`1px solid ${tokens.color.base.forest[200]}`}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  Total
                </Typography>
                <Typography variant="h6" fontWeight={700} color={tokens.color.base.forest[700]}>
                  {formatPrice(total)}
                </Typography>
              </Box>

              {hasDiscount && discount > 0 && (
                <Typography variant="caption" color={tokens.color.semantic.success.dark}>
                  You saved {formatPrice(discount)}
                </Typography>
              )}
            </Box>
          </Collapse>
        </AnimatedElement>
      </StyledPriceContainer>
    </GlassCard>
  );
};

// Product/Package Card based on actual backend ProductOption model
export const ProductCard: React.FC<{
  product: ProductOption;
  selected?: boolean;
  onSelect?: (product: ProductOption) => void;
  showDetails?: boolean;
}> = ({ product, selected = false, onSelect, showDetails = true }) => {
  const basePrice = parseFloat(product.base_price);
  const hasExcessHours = product.has_excess_hours && product.excess_hour_price;

  return (
    <Box
      onClick={() => onSelect?.(product)}
      sx={{
        p: 3,
        borderRadius: tokens.spacing.radius.card,
        background: selected
          ? tokens.color.gradients.forest
          : tokens.color.glass.lightGlass.background,
        backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
        border: selected
          ? `2px solid ${tokens.color.base.forest[600]}`
          : tokens.color.glass.lightGlass.border,
        color: selected ? 'white' : 'inherit',
        transition: tokens.animation.transition.all,
        cursor: onSelect ? 'pointer' : 'default',
        opacity: product.is_active ? 1 : 0.6,

        '&:hover': onSelect
          ? {
              transform: 'translateY(-2px)',
              boxShadow: tokens.shadow.elevation.lg,
            }
          : {},
      }}
    >
      {/* Product Type Badge */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Chip
          size="small"
          label={product.product_type}
          color={product.product_type === 'PACKAGE' ? 'primary' : 'secondary'}
          sx={{ opacity: selected ? 0.9 : 1 }}
        />
        {product.is_featured && (
          <Chip
            size="small"
            label="Featured"
            sx={{
              bgcolor: tokens.color.base.gold[500],
              color: 'white',
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {/* Product Name & Description */}
      <Typography variant="h5" fontWeight={600} mb={1}>
        {product.name}
      </Typography>

      {showDetails && product.description && (
        <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
          {product.description}
        </Typography>
      )}

      {/* Pricing */}
      <Box display="flex" alignItems="baseline" gap={1} mb={2}>
        <Typography variant="h4" fontWeight={700}>
          ₱{basePrice.toLocaleString()}
        </Typography>
        {product.pricing_unit ? (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {product.pricing_unit_display?.toLowerCase() ||
              product.pricing_unit.replace('PER_', 'per ').toLowerCase()}
          </Typography>
        ) : (
          product.pricing_model === 'HOURLY' && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              per hour
            </Typography>
          )
        )}
      </Box>

      {/* Package Details */}
      {showDetails && (
        <Box>
          {product.included_hours && (
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Schedule sx={{ fontSize: 16 }} />
              <Typography variant="body2">Includes {product.included_hours} hours</Typography>
            </Box>
          )}

          {hasExcessHours && (
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AttachMoney sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                Additional hours: ₱{parseFloat(product.excess_hour_price!).toLocaleString()}/hour
              </Typography>
            </Box>
          )}

          {product.advance_booking_days && (
            <Typography variant="caption" display="block" sx={{ opacity: 0.7, mt: 1 }}>
              Book at least {product.advance_booking_days} days in advance
            </Typography>
          )}
        </Box>
      )}

      {!product.is_active && (
        <Typography variant="caption" color="error" display="block" mt={1}>
          Currently unavailable
        </Typography>
      )}
    </Box>
  );
};

// Simplified price card for quick display
export const PriceCard: React.FC<{
  price: string | number;
  label?: string;
  period?: string;
  highlight?: boolean;
}> = ({ price, label, period = 'starting from', highlight = false }) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: tokens.spacing.radius.md,
        background: highlight
          ? tokens.color.gradients.forest
          : tokens.color.glass.lightGlass.background,
        backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
        border: highlight
          ? `2px solid ${tokens.color.base.forest[600]}`
          : tokens.color.glass.lightGlass.border,
        color: highlight ? 'white' : 'inherit',
        transition: tokens.animation.transition.all,

        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: tokens.shadow.elevation.lg,
        },
      }}
    >
      {label && (
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {label}
        </Typography>
      )}

      <Typography variant="h4" fontWeight={700}>
        ₱{numPrice.toLocaleString()}
      </Typography>

      <Typography variant="caption" sx={{ opacity: 0.8 }}>
        {period}
      </Typography>
    </Box>
  );
};

export default PricingDisplay;
