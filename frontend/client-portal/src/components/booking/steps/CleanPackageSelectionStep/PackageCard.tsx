// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep/PackageCard.tsx

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CardContent,
  Collapse,
  IconButton,
  Stack,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { useAccessibility } from '@/components/accessibility';
import type { ProductOption, AttendeeBreakdown } from '@/types/booking';

export interface PackageCardProps {
  pkg: ProductOption;
  isSelected: boolean;
  selectedQuantity: number;
  onSelect: (pkg: ProductOption) => void;
  onQuantityChange: (pkg: ProductOption, quantity: number) => void;
  canSelectMore: boolean;
  selectionType: 'SINGLE' | 'MULTIPLE';
  animationDelay: number;
  isCustomBundle?: boolean;
  isMultiVenue?: boolean;
  childPricingEnabled?: boolean;
  attendeeBreakdown?: AttendeeBreakdown[];
  onAttendeeBreakdownChange?: (tierIndex: number, newCount: number) => void;
  onResetBreakdown?: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  isSelected,
  selectedQuantity,
  onSelect,
  onQuantityChange,
  canSelectMore,
  selectionType,
  animationDelay,
  isCustomBundle = false,
  isMultiVenue = false,
  childPricingEnabled = false,
  attendeeBreakdown,
  onAttendeeBreakdownChange,
  onResetBreakdown,
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  const [expanded, setExpanded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleSelect = useCallback(() => {
    if (selectionType === 'SINGLE' || (!isSelected && canSelectMore)) {
      onSelect(pkg);
      announceToScreenReader(`Selected ${pkg.name}`);
    }
  }, [pkg, onSelect, isSelected, canSelectMore, selectionType, announceToScreenReader]);

  const handleQuantityChange = useCallback(
    (change: number) => {
      const maxQty = pkg.maximum_quantity ?? Infinity;
      const newQuantity = Math.max(0, Math.min(maxQty, selectedQuantity + change));
      onQuantityChange(pkg, newQuantity);
      announceToScreenReader(`Updated ${pkg.name} quantity to ${newQuantity}`);
    },
    [pkg, selectedQuantity, onQuantityChange, announceToScreenReader],
  );

  const packageColor = isCustomBundle
    ? theme.palette.secondary.main
    : pkg.is_featured
      ? theme.palette.warning.main
      : theme.palette.primary.main;

  return (
    <AnimatedElement animation="slideUp" delay={animationDelay}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          position: 'relative',
          cursor:
            selectionType === 'SINGLE' || (!isSelected && canSelectMore) ? 'pointer' : 'default',
          backgroundColor: isSelected ? alpha(packageColor, 0.1) : alpha('#fff', 0.08),
          border: isSelected ? `2px solid ${packageColor}` : `1px solid ${alpha('#fff', 0.1)}`,
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            backgroundColor: alpha(packageColor, 0.05),
            border: `2px solid ${alpha(packageColor, 0.5)}`,
          },
          '&::before': isSelected
            ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                backgroundColor: packageColor,
                borderRadius: '8px 8px 0 0',
              }
            : {},
        }}
        onClick={handleSelect}
      >
        <CardContent sx={{ p: 3, pb: 1 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isCustomBundle && (
                <Chip
                  icon={<BuildIcon fontSize="small" />}
                  label={isMultiVenue ? 'Custom Bundle' : 'Venue Package'}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                    color: theme.palette.secondary.main,
                    fontWeight: 600,
                  }}
                />
              )}
              {pkg.is_featured && !isCustomBundle && (
                <Chip
                  icon={<StarIcon fontSize="small" />}
                  label="Featured"
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.main,
                    fontWeight: 600,
                  }}
                />
              )}
              {pkg.type_display && !isCustomBundle && (
                <Chip
                  label={pkg.type_display}
                  size="small"
                  variant="outlined"
                  sx={{
                    backgroundColor: alpha('#fff', 0.05),
                    borderColor: alpha('#fff', 0.2),
                  }}
                />
              )}
            </Box>

            {/* Selection indicator */}
            <Box>
              {isSelected ? (
                <CheckCircleIcon
                  sx={{
                    color: packageColor,
                    fontSize: 28,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}
                />
              ) : (
                <RadioButtonUncheckedIcon
                  sx={{
                    color: alpha('#fff', 0.4),
                    fontSize: 28,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Package name and description */}
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {pkg.name}
          </Typography>

          {pkg.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {pkg.description}
            </Typography>
          )}

          {/* Show actual data from API */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
            {pkg.included_hours && (
              <Chip
                icon={<AccessTimeIcon fontSize="small" />}
                label={`${pkg.included_hours} hours included`}
                size="small"
                variant="outlined"
                sx={{ backgroundColor: alpha('#fff', 0.1) }}
              />
            )}
          </Stack>

          {/* Pricing */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: packageColor }}>
                {pkg.formatted_price || `₱${parseFloat(pkg.base_price || '0').toLocaleString()}`}
              </Typography>
              {pkg.pricing_unit ? (
                <Typography variant="body2" color="text.secondary">
                  {pkg.pricing_unit_display?.toLowerCase() ||
                    pkg.pricing_unit.replace('PER_', 'per ').toLowerCase()}
                </Typography>
              ) : (
                <>
                  {pkg.pricing_model === 'HOURLY' && (
                    <Typography variant="body2" color="text.secondary">
                      per hour
                    </Typography>
                  )}
                  {pkg.pricing_model === 'FIXED' && (
                    <Typography variant="body2" color="text.secondary">
                      per event
                    </Typography>
                  )}
                </>
              )}
            </Box>

            {pkg.has_excess_hours && pkg.excess_hour_price && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Additional hours:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ₱{parseFloat(pkg.excess_hour_price).toLocaleString()}/hr
                </Typography>
              </Box>
            )}
          </Box>

          {/* Per-person pricing info */}
          {pkg.pricing_unit === 'PER_PERSON' && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: alpha(packageColor, 0.08),
                border: `1px solid ${alpha(packageColor, 0.15)}`,
              }}
            >
              {pkg.minimum_guests && pkg.minimum_guests > 1 ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: packageColor }}>
                    Minimum {pkg.minimum_guests} persons
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
                    Starting at ₱
                    {(parseFloat(pkg.base_price || '0') * pkg.minimum_guests).toLocaleString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Price is per person
                </Typography>
              )}
            </Box>
          )}

          {/* Per-person headcount input */}
          {pkg.pricing_unit === 'PER_PERSON' && isSelected && (
            <PerPersonInput
              pkg={pkg}
              selectedQuantity={selectedQuantity}
              packageColor={packageColor}
              childPricingEnabled={childPricingEnabled}
              attendeeBreakdown={attendeeBreakdown}
              onAttendeeBreakdownChange={onAttendeeBreakdownChange}
              onResetBreakdown={onResetBreakdown}
              onQuantityChange={handleQuantityChange}
              showBreakdown={showBreakdown}
              setShowBreakdown={setShowBreakdown}
            />
          )}

          {/* Quantity selector for multiple selection */}
          {selectionType === 'MULTIPLE' && isSelected && pkg.allow_multiple && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 2,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(-1);
                }}
                disabled={selectedQuantity <= 1}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                }}
              >
                <RemoveIcon />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 600 }}>
                {selectedQuantity}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(1);
                }}
                disabled={pkg.maximum_quantity ? selectedQuantity >= pkg.maximum_quantity : false}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                }}
              >
                <AddIcon />
              </IconButton>
              {pkg.maximum_quantity && (
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
                  max {pkg.maximum_quantity}
                </Typography>
              )}
            </Box>
          )}

          {/* Show additional details if they exist */}
          {(pkg.minimum_hours || pkg.maximum_hours || pkg.advance_booking_days) && (
            <Box>
              <Button
                startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                size="small"
                sx={{
                  color: 'text.secondary',
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                  },
                }}
              >
                {expanded ? 'Less Details' : 'More Details'}
              </Button>

              <Collapse in={expanded}>
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  <Stack spacing={1}>
                    {pkg.minimum_hours && (
                      <Typography variant="body2" color="text.secondary">
                        • Minimum booking: {pkg.minimum_hours} hours
                      </Typography>
                    )}
                    {pkg.maximum_hours && (
                      <Typography variant="body2" color="text.secondary">
                        • Maximum booking: {pkg.maximum_hours} hours
                      </Typography>
                    )}
                    {pkg.advance_booking_days && (
                      <Typography variant="body2" color="text.secondary">
                        • Advance booking required: {pkg.advance_booking_days} days
                      </Typography>
                    )}
                    {pkg.sku && (
                      <Typography variant="caption" color="text.secondary">
                        SKU: {pkg.sku}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          )}
        </CardContent>
      </GlassCard>
    </AnimatedElement>
  );
};

// --- Per-person input sub-section (kept inline to stay under 300 lines total) ---

interface PerPersonInputProps {
  pkg: ProductOption;
  selectedQuantity: number;
  packageColor: string;
  childPricingEnabled: boolean;
  attendeeBreakdown?: AttendeeBreakdown[];
  onAttendeeBreakdownChange?: (tierIndex: number, newCount: number) => void;
  onResetBreakdown?: () => void;
  onQuantityChange: (change: number) => void;
  showBreakdown: boolean;
  setShowBreakdown: (show: boolean) => void;
}

const PerPersonInput: React.FC<PerPersonInputProps> = ({
  pkg,
  selectedQuantity,
  packageColor,
  childPricingEnabled,
  attendeeBreakdown,
  onAttendeeBreakdownChange,
  onResetBreakdown,
  onQuantityChange,
  showBreakdown,
  setShowBreakdown,
}) => (
  <Box
    sx={{
      mb: 2,
      p: 2,
      borderRadius: 2,
      backgroundColor: alpha(packageColor, 0.05),
      border: `1px solid ${alpha(packageColor, 0.15)}`,
    }}
    onClick={(e) => e.stopPropagation()}
  >
    <Typography variant="subtitle2" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
      Number of Guests
      {pkg.minimum_guests && pkg.minimum_guests > 1 ? ` (minimum ${pkg.minimum_guests})` : ''}
    </Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <IconButton
        size="small"
        onClick={() => onQuantityChange(-1)}
        disabled={selectedQuantity <= (pkg.minimum_guests || 1)}
        sx={{
          backgroundColor: alpha('#fff', 0.1),
          '&:hover': { backgroundColor: alpha('#fff', 0.2) },
        }}
      >
        <RemoveIcon />
      </IconButton>
      <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 600 }}>
        {selectedQuantity}
      </Typography>
      <IconButton
        size="small"
        onClick={() => onQuantityChange(1)}
        disabled={pkg.maximum_guests ? selectedQuantity >= pkg.maximum_guests : false}
        sx={{
          backgroundColor: alpha('#fff', 0.1),
          '&:hover': { backgroundColor: alpha('#fff', 0.2) },
        }}
      >
        <AddIcon />
      </IconButton>
      {pkg.maximum_guests && (
        <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
          max {pkg.maximum_guests}
        </Typography>
      )}
    </Box>
    <Typography variant="body2" sx={{ textAlign: 'center', mt: 1, fontWeight: 600 }}>
      {selectedQuantity} × ₱{parseFloat(pkg.base_price || '0').toLocaleString()}/person = ₱
      {(selectedQuantity * parseFloat(pkg.base_price || '0')).toLocaleString()}
    </Typography>

    {/* Optional attendee breakdown toggle */}
    {childPricingEnabled && attendeeBreakdown && onAttendeeBreakdownChange && (
      <>
        <Divider sx={{ my: 1.5, borderColor: alpha('#fff', 0.1) }} />
        <Collapse in={showBreakdown}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Adjust counts per age group for discounted rates. Total must meet the minimum.
          </Typography>
          <Stack spacing={1.5}>
            {attendeeBreakdown.map((tier, tierIdx) => {
              const totalCount = attendeeBreakdown.reduce((sum, t) => sum + t.count, 0);
              const atMin = tier.count <= 0;
              const atMax = pkg.maximum_guests ? totalCount >= pkg.maximum_guests : false;

              const ageRange =
                tier.min_age != null && tier.max_age != null
                  ? `Ages ${tier.min_age}–${tier.max_age}`
                  : tier.min_age != null
                    ? `Ages ${tier.min_age}+`
                    : '';

              return (
                <Box
                  key={tierIdx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {tier.tier_label}
                      {ageRange && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 0.5 }}
                        >
                          ({ageRange})
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', lineHeight: 1.3 }}
                    >
                      {tier.discount_percentage === 100
                        ? 'Free'
                        : tier.discount_percentage > 0
                          ? `${tier.discount_percentage}% off — `
                          : ''}
                      {tier.discount_percentage < 100 &&
                        `₱${tier.unit_price.toLocaleString()}/person`}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flex: '0 0 auto',
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => onAttendeeBreakdownChange(tierIdx, tier.count - 1)}
                      disabled={atMin}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.2),
                        },
                      }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography
                      variant="body1"
                      sx={{
                        minWidth: 32,
                        textAlign: 'center',
                        fontWeight: 600,
                      }}
                    >
                      {tier.count}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => onAttendeeBreakdownChange(tierIdx, tier.count + 1)}
                      disabled={atMax}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.2),
                        },
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Stack>

          {/* Breakdown total */}
          <Divider sx={{ my: 1.5, borderColor: alpha('#fff', 0.1) }} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Total: {attendeeBreakdown.reduce((sum, t) => sum + t.count, 0)} persons
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: packageColor }}>
              ₱{attendeeBreakdown.reduce((sum, t) => sum + t.subtotal, 0).toLocaleString()}
            </Typography>
          </Box>
        </Collapse>

        <Button
          size="small"
          onClick={() => {
            if (showBreakdown && onResetBreakdown) {
              onResetBreakdown();
            }
            setShowBreakdown(!showBreakdown);
          }}
          sx={{
            mt: 1,
            textTransform: 'none',
            color: packageColor,
            fontWeight: 600,
            p: 0,
            minWidth: 0,
            '&:hover': { backgroundColor: 'transparent' },
          }}
        >
          {showBreakdown ? 'Use simple headcount' : 'Have children or infants? Adjust by age group'}
        </Button>
      </>
    )}
  </Box>
);

export { PackageCard };
