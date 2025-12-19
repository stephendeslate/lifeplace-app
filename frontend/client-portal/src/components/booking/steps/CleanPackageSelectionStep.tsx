// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep.tsx
// Enhanced: Venue-aware package selection with custom bundle option

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CardContent,
  Alert,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  Divider,
  useTheme,
  alpha,
  Paper,
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
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import type {
  ProductOption,
  PackageSelectionStepData,
  PackageSelectionStepConfiguration,
  SelectedPackage,
} from '../../../types/booking';
import type { VenueSelectionStepData, DateTimeStepData } from '../../../types/booking/stepData.types';
import type { RentableVenue, RentableVenueWithEventType } from '../../../types/booking/venues.types';
import { ProductsApi } from '../../../apis/booking/products.api';
import { VenuesApi } from '../../../apis/booking/venues.api';

interface PackageCardProps {
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
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  const [expanded, setExpanded] = useState(false);

  const handleSelect = useCallback(() => {
    if (selectionType === 'SINGLE' || (!isSelected && canSelectMore)) {
      onSelect(pkg);
      announceToScreenReader(`Selected ${pkg.name}`);
    }
  }, [pkg, onSelect, isSelected, canSelectMore, selectionType, announceToScreenReader]);

  const handleQuantityChange = useCallback((change: number) => {
    const newQuantity = Math.max(0, selectedQuantity + change);
    onQuantityChange(pkg, newQuantity);
    announceToScreenReader(`Updated ${pkg.name} quantity to ${newQuantity}`);
  }, [pkg, selectedQuantity, onQuantityChange, announceToScreenReader]);

  // Different styling for custom bundles vs pre-made packages
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
          cursor: selectionType === 'SINGLE' || (!isSelected && canSelectMore) ? 'pointer' : 'default',
          backgroundColor: isSelected
            ? alpha(packageColor, 0.1)
            : alpha('#fff', 0.08),
          border: isSelected
            ? `2px solid ${packageColor}`
            : `1px solid ${alpha('#fff', 0.1)}`,
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            backgroundColor: alpha(packageColor, 0.05),
            border: `2px solid ${alpha(packageColor, 0.5)}`,
          },
          '&::before': isSelected ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: packageColor,
            borderRadius: '8px 8px 0 0',
          } : {},
        }}
        onClick={handleSelect}
      >
        <CardContent sx={{ p: 3, pb: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isCustomBundle && (
                <Chip
                  icon={<BuildIcon fontSize="small" />}
                  label={isMultiVenue ? "Custom Bundle" : "Venue Package"}
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
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }}
                />
              ) : (
                <RadioButtonUncheckedIcon
                  sx={{
                    color: alpha('#fff', 0.4),
                    fontSize: 28
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
            {pkg.category_name && (
              <Chip
                label={pkg.category_name}
                size="small"
                variant="outlined"
                sx={{ backgroundColor: alpha('#fff', 0.1) }}
              />
            )}
            {pkg.pricing_model_display && (
              <Chip
                label={pkg.pricing_model_display}
                size="small"
                variant="outlined"
                sx={{ backgroundColor: alpha('#fff', 0.1) }}
              />
            )}
          </Stack>

          {/* Pricing */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: packageColor }}>
                {pkg.formatted_price || `₱${parseFloat(pkg.base_price || '0').toLocaleString()}`}
              </Typography>
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
            </Box>

            {/* Show excess hour pricing if available */}
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

          {/* Quantity selector for multiple selection */}
          {selectionType === 'MULTIPLE' && isSelected && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(-1);
                }}
                disabled={selectedQuantity <= 1}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) }
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
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                }}
              >
                <AddIcon />
              </IconButton>
            </Box>
          )}

          {/* Show additional details if they exist in the API response */}
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
                  }
                }}
              >
                {expanded ? 'Less Details' : 'More Details'}
              </Button>

              <Collapse in={expanded}>
                <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha('#fff', 0.1)}` }}>
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

// VenueHoursSelector Component
interface VenueHoursSelectorProps {
  venues: (RentableVenue | RentableVenueWithEventType)[];
  venueHours: Record<number, number>;
  onHoursChange: (venueId: number, hours: number) => void;
  maxHours?: number;
}

const VenueHoursSelector: React.FC<VenueHoursSelectorProps> = ({
  venues,
  venueHours,
  onHoursChange,
  maxHours = 10
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Customize Your Hours
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Need more time? Add additional hours to your venues.
      </Typography>

      {venues.map((venue) => {
        // Get effective pricing (uses event-type config if available)
        const pricing = VenuesApi.getEffectivePricing(venue);
        const additionalHours = venueHours[venue.id] || 0;
        const excessPrice = parseFloat(pricing.excessHourPrice || '0');
        const includedHours = parseFloat(pricing.includedHours || '0');
        const totalCost = additionalHours * excessPrice;

        // Skip hours selector for all-day access venues
        if (pricing.isAllDayAccess) {
          return (
            <Paper
              key={venue.id}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.08),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontWeight={600}>{venue.name}</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={500}>
                    All-day access included
                  </Typography>
                </Box>
                <Chip
                  label="All Day"
                  color="success"
                  size="small"
                />
              </Box>
            </Paper>
          );
        }

        return (
          <Paper
            key={venue.id}
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: alpha('#fff', 0.08),
              border: `1px solid ${alpha('#fff', 0.1)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.12),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              }
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography fontWeight={600}>{venue.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Includes {includedHours} hours
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={2} sx={{ flex: '0 0 auto' }}>
                <Typography variant="body2" color="text.secondary">
                  Need more?
                </Typography>

                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{
                    backgroundColor: alpha('#fff', 0.05),
                    borderRadius: 2,
                    p: 0.5,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => onHoursChange(venue.id, Math.max(0, additionalHours - 1))}
                    disabled={additionalHours === 0}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                      '&.Mui-disabled': { opacity: 0.3 }
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>

                  <Typography
                    sx={{
                      minWidth: 50,
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    +{additionalHours}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => onHoursChange(venue.id, Math.min(maxHours, additionalHours + 1))}
                    disabled={additionalHours >= maxHours}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                      '&.Mui-disabled': { opacity: 0.3 }
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                {additionalHours > 0 && (
                  <Chip
                    label={`+₱${totalCost.toLocaleString()}`}
                    color="secondary"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  />
                )}
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Additional hours: ₱{excessPrice.toLocaleString()}/hr
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
};

interface CleanPackageSelectionStepProps {
  stepData?: PackageSelectionStepData;
  config: PackageSelectionStepConfiguration | null;
  onDataChange: (data: PackageSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating?: boolean;
  venueSelectionData?: VenueSelectionStepData;
  dateTimeStepData?: DateTimeStepData;
  eventTypeId?: number;
}

const CleanPackageSelectionStep: React.FC<CleanPackageSelectionStepProps> = ({
  stepData = { selected_packages: [] },
  config,
  onDataChange,
  validationErrors,
  venueSelectionData,
  dateTimeStepData,
  eventTypeId,
}) => {
  const theme = useTheme();

  // Calculate event days from datetime step data
  const eventDays = useMemo(() => {
    if (!dateTimeStepData?.start_date) return null;
    if (!dateTimeStepData?.end_date) return 1; // Single day event

    const start = new Date(dateTimeStepData.start_date);
    const end = new Date(dateTimeStepData.end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end day
  }, [dateTimeStepData?.start_date, dateTimeStepData?.end_date]);

  // Filter packages by event_days (exact match when eventDays is known)
  const filterPackagesByEventDays = useCallback((packages: ProductOption[]): ProductOption[] => {
    if (eventDays === null) return packages; // No filtering if no dates selected

    return packages.filter(pkg => {
      // If package has no event_days restriction, it's available for all durations
      if (pkg.event_days === null || pkg.event_days === undefined) return true;
      // Otherwise, exact match required
      return pkg.event_days === eventDays;
    });
  }, [eventDays]);

  const [availablePackages, setAvailablePackages] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [venueAdditionalHours, setVenueAdditionalHours] = useState<Record<number, number>>({});
  const selectionType = (config?.selection_type || 'SINGLE') as 'SINGLE' | 'MULTIPLE';
  const minSelection = config?.min_selection || 1;
  const maxSelection = config?.max_selection || 1;

  // Apply event_days filtering to available packages
  const filteredPackages = useMemo(() => {
    return filterPackagesByEventDays(availablePackages);
  }, [availablePackages, filterPackagesByEventDays]);

  // Get selected venue IDs from previous step
  const selectedVenueIds = venueSelectionData?.selected_venue_ids || [];
  const hasVenueSelection = selectedVenueIds.length > 0;

  // Fetch venues for display and custom bundle calculation with event-type-specific pricing
  const { data: allVenues } = useQuery({
    queryKey: ['rentable-venues', eventTypeId],
    queryFn: () => VenuesApi.getRentableVenues(eventTypeId),
    enabled: hasVenueSelection,
  });

  // Get selected venue objects
  const selectedVenues = useMemo(() => {
    if (!allVenues || !hasVenueSelection) return [];
    return allVenues.filter(v => selectedVenueIds.includes(v.id));
  }, [allVenues, selectedVenueIds, hasVenueSelection]);

  // Calculate custom bundle pricing using effective pricing (event-type-specific if available)
  const customBundlePricing = useMemo(() => {
    if (selectedVenues.length === 0) return null;

    // Get effective pricing for each venue
    const venuePricings = selectedVenues.map(v => ({
      venue: v,
      pricing: VenuesApi.getEffectivePricing(v),
    }));

    const subtotal = venuePricings.reduce(
      (sum, { pricing }) => sum + parseFloat(pricing.basePrice || '0'),
      0
    );

    // Check if any venue has all-day access
    const hasAllDayAccess = venuePricings.some(({ pricing }) => pricing.isAllDayAccess);

    const totalHours = hasAllDayAccess
      ? 24 // All-day access
      : venuePricings.reduce(
          (sum, { pricing }) => sum + parseFloat(pricing.includedHours || '0'),
          0
        );

    const hasDiscount = selectedVenues.length > 1;
    const discountPercent = 10; // 10% bundle discount for multi-venue
    const discountAmount = hasDiscount ? subtotal * (discountPercent / 100) : 0;
    const total = subtotal - discountAmount;

    // Get excess hour price from first venue (not applicable for all-day access)
    const firstVenuePricing = venuePricings[0]?.pricing;
    const excessHourPrice = hasAllDayAccess ? '0' : (firstVenuePricing?.excessHourPrice || '0');

    return {
      subtotal,
      totalHours,
      hasDiscount,
      discountPercent,
      discountAmount,
      total,
      excessHourPrice,
      venueNames: selectedVenues.map(v => v.name).join(' + '),
      hasAllDayAccess,
    };
  }, [selectedVenues]);

  // Create a virtual "custom bundle" package option
  const isMultiVenue = selectedVenues.length > 1;
  const customBundlePackage: ProductOption | null = useMemo(() => {
    if (!customBundlePricing || selectedVenues.length === 0) return null;

    // Contextual naming based on single vs multi-venue
    const packageName = isMultiVenue
      ? `Custom: ${customBundlePricing.venueNames}`
      : selectedVenues[0]?.name || 'Your Venue';

    // Build description based on features
    let packageDescription: string;
    if (isMultiVenue) {
      packageDescription = `Your custom package with ${selectedVenues.length} venues. Includes ${customBundlePricing.discountPercent}% multi-venue discount.`;
    } else if (customBundlePricing.hasAllDayAccess) {
      packageDescription = `Book ${selectedVenues[0]?.name} with all-day access for your event.`;
    } else {
      packageDescription = `Book ${selectedVenues[0]?.name} for your event.`;
    }

    return {
      id: -1, // Virtual ID for custom package
      name: packageName,
      description: packageDescription,
      base_price: customBundlePricing.total.toString(),
      formatted_price: `₱${customBundlePricing.total.toLocaleString()}`,
      included_hours: customBundlePricing.hasAllDayAccess ? 'All day' : customBundlePricing.totalHours,
      excess_hour_price: customBundlePricing.excessHourPrice,
      has_excess_hours: !customBundlePricing.hasAllDayAccess,
      pricing_model: 'FIXED' as const,
      type: 'PACKAGE' as const,
      is_active: true,
      is_featured: false,
    } as ProductOption;
  }, [customBundlePricing, selectedVenues, isMultiVenue]);

  useEffect(() => {
    const loadPackages = async () => {
      setIsLoading(true);
      try {
        let packages: ProductOption[] = [];

        // Priority 1: Use specific packages if configured (overrides category filtering)
        if (config?.available_packages_details?.length) {
          packages = config.available_packages_details;
        }
        // Priority 2: Filter by configured categories
        else if (config?.available_categories?.length) {
          const allPackages = await ProductsApi.getPackages();
          const categoryIds = new Set(config.available_categories);
          packages = allPackages.filter(pkg => categoryIds.has(pkg.category));
        }
        // Priority 3: No config - fetch all packages (backward compatibility)
        else {
          packages = await ProductsApi.getPackages();
        }

        setAvailablePackages(Array.isArray(packages) ? packages : []);
      } catch (err) {
        console.error('Failed to load packages:', err);
        setAvailablePackages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPackages();
  }, [config?.available_packages_details, config?.available_categories]);

  // Sync venue hours changes to parent
  useEffect(() => {
    if (stepData.selected_packages && stepData.selected_packages.length > 0) {
      // Convert venue hours to string keys for API
      const venueHoursForApi = Object.entries(venueAdditionalHours).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value
      }), {} as Record<string, number>);

      onDataChange({
        selected_packages: stepData.selected_packages,
        venue_additional_hours: venueHoursForApi
      });
    }
  }, [venueAdditionalHours]);

  // Calculate totals and selection state
  const selectedPackageIds = useMemo(() =>
    stepData.selected_packages?.map(p => p.product_id) || [],
    [stepData.selected_packages]
  );
  const totalSelected = stepData.selected_packages?.length || 0;
  const canSelectMore = selectionType === 'MULTIPLE' && totalSelected < maxSelection;

  // Calculate total price including excess hours for venues
  const totalPrice = useMemo(() => {
    const packagesPrice = stepData.selected_packages?.reduce((sum, pkg) => {
      const price = parseFloat(pkg.price || '0');
      return sum + (price * (pkg.quantity || 1));
    }, 0) || 0;

    // Add excess hours cost for selected venues
    const excessHoursCost = selectedVenues.reduce((sum, venue) => {
      const additionalHours = venueAdditionalHours[venue.id] || 0;
      const excessPrice = parseFloat(venue.standalone_excess_hour_price || '0');
      return sum + (additionalHours * excessPrice);
    }, 0);

    return packagesPrice + excessHoursCost;
  }, [stepData.selected_packages, selectedVenues, venueAdditionalHours]);

  // Check if custom bundle is selected
  const isCustomBundleSelected = selectedPackageIds.includes(-1);

  // Handle package selection
  const handlePackageSelect = useCallback((pkg: ProductOption) => {
    const isCurrentlySelected = selectedPackageIds.includes(pkg.id);

    // Convert venue hours to string keys for API
    const venueHoursForApi = Object.entries(venueAdditionalHours).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value
    }), {} as Record<string, number>);

    if (selectionType === 'SINGLE') {
      if (isCurrentlySelected) {
        onDataChange({
          selected_packages: [],
          venue_additional_hours: venueHoursForApi
        });
      } else {
        const selectedPkg: SelectedPackage = {
          product_id: pkg.id,
          name: pkg.name,
          price: pkg.base_price,
          quantity: 1,
          included_hours: pkg.included_hours,
          excess_hour_price: pkg.excess_hour_price,
        };

        // For custom bundle, we'll need to create it on the backend later
        if (pkg.id === -1) {
          selectedPkg.is_custom_bundle = true;
          selectedPkg.venue_ids = selectedVenueIds;
        }

        onDataChange({
          selected_packages: [selectedPkg],
          venue_additional_hours: venueHoursForApi
        });
      }
    } else {
      // MULTIPLE selection
      if (isCurrentlySelected) {
        const updatedPackages = stepData.selected_packages?.filter(p => p.product_id !== pkg.id) || [];
        onDataChange({
          selected_packages: updatedPackages,
          venue_additional_hours: venueHoursForApi
        });
      } else if (canSelectMore) {
        const selectedPkg: SelectedPackage = {
          product_id: pkg.id,
          name: pkg.name,
          price: pkg.base_price,
          quantity: 1,
          included_hours: pkg.included_hours,
          excess_hour_price: pkg.excess_hour_price,
        };

        if (pkg.id === -1) {
          selectedPkg.is_custom_bundle = true;
          selectedPkg.venue_ids = selectedVenueIds;
        }

        const updatedPackages = [...(stepData.selected_packages || []), selectedPkg];
        onDataChange({
          selected_packages: updatedPackages,
          venue_additional_hours: venueHoursForApi
        });
      }
    }
  }, [stepData.selected_packages, selectedPackageIds, selectionType, canSelectMore, venueAdditionalHours, onDataChange, selectedVenueIds]);

  // Handle quantity change
  const handleQuantityChange = useCallback((pkg: ProductOption, quantity: number) => {
    if (quantity === 0) {
      const updatedPackages = stepData.selected_packages?.filter(p => p.product_id !== pkg.id) || [];
      // Convert venue hours to string keys for API
      const venueHoursForApi = Object.entries(venueAdditionalHours).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value
      }), {} as Record<string, number>);
      onDataChange({
        selected_packages: updatedPackages,
        venue_additional_hours: venueHoursForApi
      });
    } else {
      const updatedPackages = stepData.selected_packages?.map(p =>
        p.product_id === pkg.id
          ? { ...p, quantity }
          : p
      ) || [];
      // Convert venue hours to string keys for API
      const venueHoursForApi = Object.entries(venueAdditionalHours).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value
      }), {} as Record<string, number>);
      onDataChange({
        selected_packages: updatedPackages,
        venue_additional_hours: venueHoursForApi
      });
    }
  }, [stepData.selected_packages, venueAdditionalHours, onDataChange]);

  // Handle venue hours change
  const handleVenueHoursChange = useCallback((venueId: number, hours: number) => {
    setVenueAdditionalHours(prev => ({
      ...prev,
      [venueId]: hours
    }));
  }, []);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);

  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading available packages...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Choose Your Package
          </Typography>

          {/* Venue context */}
          {hasVenueSelection && selectedVenues.length > 0 && (
            <Typography variant="body1" color="text.secondary">
              Based on your selection: <strong>{selectedVenues.map(v => v.name).join(', ')}</strong>
            </Typography>
          )}
        </Box>
      </AnimatedElement>

      {/* Selection info */}
      {selectionType === 'MULTIPLE' && (
        <AnimatedElement animation="fadeIn" delay={200}>
          <Alert
            severity="info"
            sx={{
              mb: 3,
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            }}
          >
            You can select {minSelection} to {maxSelection} packages.
            Currently selected: {totalSelected}
          </Alert>
        </AnimatedElement>
      )}

      {/* Custom Bundle Option - Show first if venues are selected */}
      {customBundlePackage && (
        <>
          <AnimatedElement animation="fadeIn" delay={250}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              {isMultiVenue ? 'Create Custom Bundle' : 'Book Your Venue'}
            </Typography>
          </AnimatedElement>

          <Box sx={{ mb: 4 }}>
            <PackageCard
              pkg={customBundlePackage}
              isSelected={isCustomBundleSelected}
              selectedQuantity={
                stepData.selected_packages?.find(p => p.product_id === -1)?.quantity || 0
              }
              onSelect={handlePackageSelect}
              onQuantityChange={handleQuantityChange}
              canSelectMore={canSelectMore}
              selectionType={selectionType}
              animationDelay={300}
              isCustomBundle={true}
              isMultiVenue={isMultiVenue}
            />

            {/* Show venue hours selector if custom bundle is selected */}
            {isCustomBundleSelected && selectedVenues.length > 0 && (
              <AnimatedElement animation="slideUp" delay={350}>
                <VenueHoursSelector
                  venues={selectedVenues}
                  venueHours={venueAdditionalHours}
                  onHoursChange={handleVenueHoursChange}
                  maxHours={10}
                />
              </AnimatedElement>
            )}
          </Box>

          <AnimatedElement animation="fadeIn" delay={400}>
            <Divider sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary">
                OR CHOOSE A PRE-MADE PACKAGE
              </Typography>
            </Divider>
          </AnimatedElement>
        </>
      )}

      {/* Pre-made Package Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: Array.isArray(filteredPackages) && filteredPackages.length === 2
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fit, minmax(350px, 1fr))'
          },
          gap: 4,
          mb: 4
        }}
      >
        {Array.isArray(filteredPackages) && filteredPackages.length > 0 ? (
          filteredPackages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackageIds.includes(pkg.id)}
              selectedQuantity={
                stepData.selected_packages?.find(p => p.product_id === pkg.id)?.quantity || 0
              }
              onSelect={handlePackageSelect}
              onQuantityChange={handleQuantityChange}
              canSelectMore={canSelectMore}
              selectionType={selectionType}
              animationDelay={400 + index * 150}
            />
          ))
        ) : (
          <Box sx={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            py: 8,
            color: 'text.secondary'
          }}>
            <Typography variant="h6" gutterBottom>
              No packages available
            </Typography>
            {customBundlePackage && (
              <Typography variant="body2">
                You can create a custom package from your venue selection.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Validation Errors */}
      {hasFieldError('selected_packages') && (
        <AnimatedElement animation="slideUp" delay={0}>
          <Alert severity="error" sx={{ mt: 2 }}>
            {getFieldError('selected_packages')}
          </Alert>
        </AnimatedElement>
      )}

      {/* Total Price Display */}
      {totalSelected > 0 && (
        <AnimatedElement animation="slideUp" delay={600}>
          <GlassCard
            variant="light"
            intensity="strong"
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Total Selected: {totalSelected} {totalSelected === 1 ? 'package' : 'packages'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                ₱{totalPrice.toLocaleString()}
              </Typography>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};

export { CleanPackageSelectionStep };
export type { CleanPackageSelectionStepProps };
