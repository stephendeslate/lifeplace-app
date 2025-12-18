// frontend/client-portal/src/components/booking/steps/VenueSelectionStep.tsx

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Skeleton,
  Collapse,
} from '@mui/material';
import {
  Check,
  AccessTime,
  People,
  LocationOn,
  LocalOffer,
  ArrowForward,
  Star,
  Inventory,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { VenuesApi } from '../../../apis/booking/venues.api';
import { ProductsApi } from '../../../apis/booking/products.api';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import type {
  RentableVenue,
  VenueSelectionStepConfiguration,
  MatchedPackage,
  FindMatchingPackagesResponse,
} from '../../../types/booking/venues.types';
import type { VenueSelectionStepData } from '../../../types/booking/stepData.types';
import type { SelectedPackage } from '../../../types/booking';

interface VenueSelectionStepProps {
  stepData?: VenueSelectionStepData;
  config: VenueSelectionStepConfiguration | null;
  onDataChange: (data: VenueSelectionStepData & { selected_packages?: SelectedPackage[]; navigate_to_packages?: boolean }) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  sessionId?: string;
  onNavigateToPackages?: () => void;
}

export const VenueSelectionStep: React.FC<VenueSelectionStepProps> = ({
  stepData = { selected_venue_ids: [], primary_venue_id: null },
  config,
  onDataChange,
  validationErrors,
  isValidating,
  sessionId,
  onNavigateToPackages,
}) => {
  const { formatAmount } = useCurrencySettings();
  const [selectedVenueIds, setSelectedVenueIds] = useState<number[]>(
    stepData.selected_venue_ids || []
  );
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [matchingPackages, setMatchingPackages] = useState<FindMatchingPackagesResponse | null>(null);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedPreMadePackage, setSelectedPreMadePackage] = useState<MatchedPackage | null>(null);

  // Configuration values
  const minVenues = config?.min_venues || 1;
  const maxVenues = config?.max_venues || 5;
  const showPricing = config?.show_pricing ?? true;
  const showIncludedHours = config?.show_included_hours ?? true;
  const showBundleDiscount = config?.show_bundle_discount ?? true;
  const bundleDiscountPercent = parseFloat(config?.bundle_discount_percent || '10');
  const title = config?.title || 'Select Your Spaces';
  const description = config?.description || 'Choose which spaces to include in your booking.';
  const showPackageRecommendations = config?.show_package_recommendations ?? true;
  const showViewPackagesOption = config?.show_view_packages_option ?? true;
  const viewPackagesButtonText = config?.view_packages_button_text || 'Not sure? View our packages instead';

  // Fetch rentable venues
  const { data: venues, isLoading, error: fetchError } = useQuery({
    queryKey: ['rentable-venues'],
    queryFn: VenuesApi.getRentableVenues,
  });

  // Use configured venues if available, otherwise use fetched venues
  const availableVenues = config?.available_venues_details || venues || [];

  // Sync local state with stepData changes from parent
  useEffect(() => {
    if (stepData.selected_venue_ids) {
      setSelectedVenueIds(stepData.selected_venue_ids);
    }
  }, [stepData.selected_venue_ids]);

  // Fetch matching packages when venues change
  useEffect(() => {
    const fetchMatchingPackages = async () => {
      if (selectedVenueIds.length === 0 || !showPackageRecommendations) {
        setMatchingPackages(null);
        setShowRecommendations(false);
        setSelectedPreMadePackage(null);
        return;
      }

      setIsLoadingMatches(true);
      try {
        const result = await VenuesApi.findMatchingPackages({
          venue_ids: selectedVenueIds,
          bundle_discount_percent: config?.bundle_discount_percent,
        });
        setMatchingPackages(result);

        // Auto-show recommendations if we have matches
        if (result.exact_matches.length > 0 || result.partial_matches.length > 0) {
          setShowRecommendations(true);
        }
      } catch (error) {
        console.error('Failed to fetch matching packages:', error);
        setMatchingPackages(null);
      } finally {
        setIsLoadingMatches(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchMatchingPackages, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedVenueIds, showPackageRecommendations, config?.bundle_discount_percent]);

  // Get selected venue objects
  const selectedVenueObjects = useMemo(() => {
    return availableVenues.filter(v => selectedVenueIds.includes(v.id));
  }, [availableVenues, selectedVenueIds]);

  // Calculate bundle pricing
  const pricingSummary = useMemo(() => {
    const subtotal = selectedVenueObjects.reduce(
      (sum, v) => sum + parseFloat(v.standalone_base_price || '0'),
      0
    );
    const totalHours = selectedVenueObjects.reduce(
      (sum, v) => sum + parseFloat(v.standalone_included_hours || '0'),
      0
    );
    const hasDiscount = selectedVenueIds.length > 1;
    const discountAmount = hasDiscount ? subtotal * (bundleDiscountPercent / 100) : 0;
    const total = subtotal - discountAmount;

    return {
      subtotal,
      totalHours,
      hasDiscount,
      discountPercent: bundleDiscountPercent,
      discountAmount,
      total,
    };
  }, [selectedVenueObjects, selectedVenueIds.length, bundleDiscountPercent]);

  // Check if venue is selected
  const isVenueSelected = useCallback((venueId: number) => {
    return selectedVenueIds.includes(venueId);
  }, [selectedVenueIds]);

  // Handle venue toggle
  const handleVenueToggle = useCallback((venue: RentableVenue) => {
    let newSelectedIds: number[];

    if (isVenueSelected(venue.id)) {
      // Remove venue
      newSelectedIds = selectedVenueIds.filter(id => id !== venue.id);
    } else {
      // Add venue if under limit
      if (maxVenues > 0 && selectedVenueIds.length >= maxVenues) {
        return; // Don't add if at limit
      }
      newSelectedIds = [...selectedVenueIds, venue.id];
    }

    setSelectedVenueIds(newSelectedIds);
    setCreateError(null);
    setSelectedPreMadePackage(null); // Reset pre-made package selection when venues change

    // Auto-select first venue as primary (backend requirement, not shown to user)
    const autoPrimaryId = newSelectedIds.length > 0 ? newSelectedIds[0] : null;

    onDataChange({
      selected_venue_ids: newSelectedIds,
      primary_venue_id: autoPrimaryId,
    });
  }, [selectedVenueIds, maxVenues, isVenueSelected, onDataChange]);

  // Handle selecting a pre-made package
  const handleSelectPreMadePackage = useCallback((pkg: MatchedPackage) => {
    setSelectedPreMadePackage(pkg);
    setCreateError(null);
  }, []);

  // Handle using the selected pre-made package
  const handleUsePreMadePackage = useCallback(() => {
    if (!selectedPreMadePackage) return;

    const selectedPackage: SelectedPackage = {
      product_id: selectedPreMadePackage.id,
      name: selectedPreMadePackage.name,
      price: selectedPreMadePackage.base_price,
      quantity: 1,
      included_hours: selectedPreMadePackage.included_hours,
      excess_hour_price: selectedPreMadePackage.excess_hour_price || undefined,
    };

    onDataChange({
      selected_venue_ids: selectedVenueIds,
      primary_venue_id: selectedVenueIds[0] || null,
      matched_package_id: selectedPreMadePackage.id,
      selected_packages: [selectedPackage],
    });
  }, [selectedPreMadePackage, selectedVenueIds, onDataChange]);

  // Handle "View Packages" navigation
  const handleViewPackages = useCallback(() => {
    if (onNavigateToPackages) {
      onNavigateToPackages();
    } else {
      // Signal to parent to navigate to package selection
      onDataChange({
        selected_venue_ids: selectedVenueIds,
        primary_venue_id: selectedVenueIds[0] || null,
        navigate_to_packages: true,
      });
    }
  }, [onNavigateToPackages, onDataChange, selectedVenueIds]);

  // Create custom package from selected venues
  const handleCreatePackage = useCallback(async () => {
    if (selectedVenueIds.length === 0 || !sessionId) {
      return;
    }

    setIsCreatingPackage(true);
    setCreateError(null);

    // Auto-select first venue as primary for backend
    const primaryVenueId = selectedVenueIds[0];

    try {
      const response = await VenuesApi.createFromVenues({
        venue_ids: selectedVenueIds,
        primary_venue_id: primaryVenueId,
        booking_session_id: sessionId,
      });

      // Store the created package as selected_packages for downstream steps
      const selectedPackage: SelectedPackage = {
        product_id: response.id,
        name: response.name,
        price: response.base_price,
        quantity: 1,
        included_hours: response.included_hours,
        excess_hour_price: response.excess_hour_price,
      };

      onDataChange({
        selected_venue_ids: selectedVenueIds,
        primary_venue_id: primaryVenueId,
        custom_package_id: response.id,
        selected_packages: [selectedPackage],
      });
    } catch (error) {
      console.error('Failed to create custom package:', error);
      setCreateError('Failed to create your custom package. Please try again.');
    } finally {
      setIsCreatingPackage(false);
    }
  }, [selectedVenueIds, sessionId, onDataChange]);

  // Validation status
  const validationStatus = useMemo(() => {
    const errors: string[] = [];

    if (minVenues > 0 && selectedVenueIds.length < minVenues) {
      errors.push(`Please select at least ${minVenues} space${minVenues > 1 ? 's' : ''}`);
    }

    if (maxVenues > 0 && selectedVenueIds.length > maxVenues) {
      errors.push(`Cannot select more than ${maxVenues} space${maxVenues > 1 ? 's' : ''}`);
    }

    // Merge with external validation errors
    const allErrors = [
      ...errors,
      ...Object.values(validationErrors).flat(),
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }, [selectedVenueIds, minVenues, maxVenues, validationErrors]);

  const formatPrice = (price: string | number) => {
    return ProductsApi.formatPrice(price.toString());
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="80%" />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <Alert severity="error">
        Failed to load venues. Please refresh and try again.
      </Alert>
    );
  }

  // No venues available
  if (availableVenues.length === 0) {
    return (
      <Alert severity="info">
        No spaces are currently available for selection.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {maxVenues > 1 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You can select up to {maxVenues} spaces for your event.
        </Typography>
      )}

      {/* Validation Errors */}
      {!validationStatus.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationStatus.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Create Error */}
      {createError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {createError}
        </Alert>
      )}

      {/* Venue Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {availableVenues.map((venue) => {
          const isSelected = isVenueSelected(venue.id);

          return (
            <Card
              key={venue.id}
              variant={isSelected ? 'elevation' : 'outlined'}
              sx={{
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? 'primary.main' : 'divider',
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: isSelected ? 'primary.main' : 'primary.light',
                  boxShadow: 2,
                },
              }}
              onClick={() => handleVenueToggle(venue)}
            >
              {isSelected && (
                <Chip
                  icon={<Check />}
                  label="Included"
                  color="primary"
                  size="small"
                  sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
                />
              )}

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                {venue.featured_image && (
                  <CardMedia
                    component="img"
                    image={venue.featured_image}
                    alt={venue.name}
                    sx={{
                      width: { xs: '100%', sm: 200 },
                      height: { xs: 150, sm: 'auto' },
                      objectFit: 'cover',
                    }}
                  />
                )}

                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {venue.name}
                  </Typography>

                  {venue.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {venue.description}
                    </Typography>
                  )}

                  {/* Venue Features */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip
                      icon={<People />}
                      label={`${venue.minimum_capacity}-${venue.maximum_capacity} guests`}
                      size="small"
                      variant="outlined"
                    />
                    {showIncludedHours && venue.standalone_included_hours && (
                      <Chip
                        icon={<AccessTime />}
                        label={`${venue.standalone_included_hours} hours included`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {venue.location_description && (
                      <Chip
                        icon={<LocationOn />}
                        label={venue.location_description}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {/* Pricing */}
                  {showPricing && (
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography variant="h5" color="primary">
                        {formatPrice(venue.standalone_base_price)}
                      </Typography>
                      {venue.standalone_excess_hour_price && (
                        <Typography variant="body2" color="text.secondary">
                          +{formatAmount(parseFloat(venue.standalone_excess_hour_price))}/hr extra
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Box>

              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  variant={isSelected ? 'contained' : 'outlined'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVenueToggle(venue);
                  }}
                  fullWidth
                >
                  {isSelected ? 'Included' : 'Add to Booking'}
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>

      {/* Pricing Summary */}
      {selectedVenueIds.length > 0 && showPricing && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Your Selection
          </Typography>
          <Divider sx={{ my: 1 }} />

          {/* Venue breakdown */}
          {selectedVenueObjects.map((venue) => (
            <Box key={venue.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {venue.name}
                {showIncludedHours && venue.standalone_included_hours && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({venue.standalone_included_hours} hrs)
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2">
                {formatPrice(venue.standalone_base_price)}
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 1 }} />

          {/* Subtotal */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2">
              {formatPrice(pricingSummary.subtotal)}
            </Typography>
          </Box>

          {/* Bundle Discount */}
          {showBundleDiscount && pricingSummary.hasDiscount && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="success.main">
                Multi-Space Discount ({pricingSummary.discountPercent}%)
              </Typography>
              <Typography variant="body2" color="success.main">
                -{formatPrice(pricingSummary.discountAmount)}
              </Typography>
            </Box>
          )}

          {/* Total */}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">Total</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {formatPrice(pricingSummary.total)}
            </Typography>
          </Box>

          {/* Total Hours */}
          {showIncludedHours && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Included Hours
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pricingSummary.totalHours} hours
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Package Recommendations */}
      {showPackageRecommendations && selectedVenueIds.length > 0 && (
        <Collapse in={showRecommendations}>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalOffer color="primary" />
              <Typography variant="subtitle1">
                Package Recommendations
              </Typography>
              {isLoadingMatches && <CircularProgress size={16} />}
            </Box>

            {/* Exact Matches */}
            {matchingPackages?.exact_matches && matchingPackages.exact_matches.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="success.main" sx={{ mb: 1, fontWeight: 'medium' }}>
                  <Star sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  Perfect Match! These packages include your exact selection:
                </Typography>
                {matchingPackages.exact_matches.map((pkg) => (
                  <Card
                    key={pkg.id}
                    variant={selectedPreMadePackage?.id === pkg.id ? 'elevation' : 'outlined'}
                    sx={{
                      mb: 1,
                      cursor: 'pointer',
                      border: selectedPreMadePackage?.id === pkg.id ? 2 : 1,
                      borderColor: selectedPreMadePackage?.id === pkg.id ? 'success.main' : 'divider',
                      '&:hover': { borderColor: 'success.light' },
                    }}
                    onClick={() => handleSelectPreMadePackage(pkg)}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle2">{pkg.name}</Typography>
                          {pkg.description && (
                            <Typography variant="caption" color="text.secondary">
                              {pkg.description}
                            </Typography>
                          )}
                          {pkg.bonus_venues.length > 0 && (
                            <Typography variant="caption" color="success.main" display="block">
                              + Bonus: {pkg.bonus_venues.map(v => v.name).join(', ')}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" color="primary">
                            {formatPrice(pkg.base_price)}
                          </Typography>
                          {pkg.is_better_value && parseFloat(pkg.savings_vs_custom) > 0 && (
                            <Chip
                              label={`Save ${formatPrice(pkg.savings_vs_custom)}`}
                              color="success"
                              size="small"
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* Partial Matches - Only show top 3 */}
            {matchingPackages?.partial_matches && matchingPackages.partial_matches.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="info.main" sx={{ mb: 1 }}>
                  <Inventory sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  You might also like these packages:
                </Typography>
                {matchingPackages.partial_matches.slice(0, 3).map((pkg) => (
                  <Card
                    key={pkg.id}
                    variant={selectedPreMadePackage?.id === pkg.id ? 'elevation' : 'outlined'}
                    sx={{
                      mb: 1,
                      cursor: 'pointer',
                      border: selectedPreMadePackage?.id === pkg.id ? 2 : 1,
                      borderColor: selectedPreMadePackage?.id === pkg.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                    onClick={() => handleSelectPreMadePackage(pkg)}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle2">{pkg.name}</Typography>
                          {pkg.additional_venues.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Includes: {pkg.venues.map(v => v.name).join(', ')}
                            </Typography>
                          )}
                          {pkg.bonus_venues.length > 0 && (
                            <Typography variant="caption" color="success.main" display="block">
                              + Bonus: {pkg.bonus_venues.map(v => v.name).join(', ')}
                            </Typography>
                          )}
                          {pkg.match_type === 'superset' && pkg.additional_venues.length > 0 && (
                            <Typography variant="caption" color="info.main" display="block">
                              Extra venues included: {pkg.additional_venues.map(v => v.name).join(', ')}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" color="primary">
                            {formatPrice(pkg.base_price)}
                          </Typography>
                          {pkg.is_better_value && parseFloat(pkg.savings_vs_custom) > 0 && (
                            <Chip
                              label={`Save ${formatPrice(pkg.savings_vs_custom)}`}
                              color="success"
                              size="small"
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* Custom Package Option */}
            <Card
              variant={selectedPreMadePackage === null ? 'elevation' : 'outlined'}
              sx={{
                cursor: 'pointer',
                border: selectedPreMadePackage === null ? 2 : 1,
                borderColor: selectedPreMadePackage === null ? 'secondary.main' : 'divider',
                bgcolor: selectedPreMadePackage === null ? 'action.selected' : 'background.paper',
              }}
              onClick={() => setSelectedPreMadePackage(null)}
            >
              <CardContent sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">Create Custom Package</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedVenueObjects.map(v => v.name).join(' + ')}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="secondary">
                      {formatPrice(pricingSummary.total)}
                    </Typography>
                    {pricingSummary.hasDiscount && (
                      <Typography variant="caption" color="success.main">
                        {pricingSummary.discountPercent}% multi-space discount applied
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Collapse>
      )}

      {/* Confirm Selection Buttons */}
      {selectedVenueIds.length > 0 && !stepData.custom_package_id && !stepData.matched_package_id && (
        <Box sx={{ mb: 2 }}>
          {selectedPreMadePackage ? (
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              onClick={handleUsePreMadePackage}
              disabled={!validationStatus.isValid}
              startIcon={<Check />}
            >
              Use {selectedPreMadePackage.name}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={handleCreatePackage}
              disabled={!validationStatus.isValid || isCreatingPackage || !sessionId}
            >
              {isCreatingPackage ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creating Custom Package...
                </>
              ) : (
                'Confirm Custom Package'
              )}
            </Button>
          )}
        </Box>
      )}

      {/* Package Created/Selected Confirmation */}
      {(stepData.custom_package_id || stepData.matched_package_id) && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {stepData.matched_package_id
            ? 'Package selected! Click Continue to proceed.'
            : 'Your custom package has been created. Click Continue to proceed.'}
        </Alert>
      )}

      {/* View Packages Option */}
      {showViewPackagesOption && selectedVenueIds.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              OR
            </Typography>
          </Divider>
          <Button
            variant="text"
            color="primary"
            onClick={handleViewPackages}
            endIcon={<ArrowForward />}
          >
            {viewPackagesButtonText}
          </Button>
        </Box>
      )}

      {/* Validation indicator */}
      {isValidating && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Validating selection...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VenueSelectionStep;
