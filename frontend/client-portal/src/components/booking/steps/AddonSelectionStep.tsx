// frontend/client-portal/src/components/booking/steps/AddonSelectionStep.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
} from '@mui/material';
import { 
  Add, 
  Remove, 
  Star,
  ShoppingCart,
} from '@mui/icons-material';
import { ProductsApi } from '../../../apis/booking/products.api';
import { VenuesApi } from '../../../apis/booking/venues.api';
import type {
  AddonSelectionStepData,
  AddonSelectionStepConfiguration,
  ProductOption,
  SelectedAddon,
  RentableVenue,
} from '../../../types/booking';

interface AddonSelectionStepProps {
  stepData?: AddonSelectionStepData;
  config: AddonSelectionStepConfiguration | null;
  onDataChange: (data: AddonSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  selectedVenues?: RentableVenue[];
  venueAdditionalHoursData?: Record<string, number>;
}

export const AddonSelectionStep: React.FC<AddonSelectionStepProps> = ({
  stepData = { selected_addons: [] },
  config,
  onDataChange,
  validationErrors,
  isValidating,
  selectedVenues = [],
  venueAdditionalHoursData = {},
}) => {
  // Memoize config values to prevent unnecessary re-renders
  const availableAddons = useMemo(() => config?.available_addons_details || [], [config?.available_addons_details]);
  const minSelection = config?.min_selection || 0;
  const maxSelection = config?.max_selection || 0; // 0 means unlimited
  const groupByCategory = config?.group_by_category || false;

  // Use props stepData as single source of truth - memoize to stabilize reference
  const selectedAddons = useMemo(() => stepData.selected_addons || [], [stepData.selected_addons]);

  // State for venue additional hours (initialize from prop data)
  const [venueAdditionalHours, setVenueAdditionalHours] = React.useState<Record<number, number>>(() => {
    // Convert string keys to number keys
    return Object.entries(venueAdditionalHoursData).reduce((acc, [key, value]) => ({
      ...acc,
      [parseInt(key)]: value
    }), {});
  });

  // Sync venue hours when props change (e.g., when navigating from package selection)
  React.useEffect(() => {
    const propsHours = Object.entries(venueAdditionalHoursData).reduce((acc, [key, value]) => ({
      ...acc,
      [parseInt(key)]: value
    }), {} as Record<number, number>);

    // Only update if the props have hours that aren't in local state
    const hasNewHours = Object.keys(propsHours).length > 0 &&
      Object.keys(venueAdditionalHours).length === 0;
    if (hasNewHours) {
      setVenueAdditionalHours(propsHours);
    }
  }, [venueAdditionalHoursData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group addons by category if enabled
  const groupedAddons = useMemo(() => {
    if (!groupByCategory) {
      return { 'All Add-ons': availableAddons };
    }
    return ProductsApi.groupProductsByCategory(availableAddons);
  }, [availableAddons, groupByCategory]);

  // Check if addon is selected - Fixed to use addon_id
  const isAddonSelected = useCallback((addonId: number) => {
    return selectedAddons.some(a => a.product_id === addonId);
  }, [selectedAddons]);

  // Get selected addon details - Fixed to use addon_id
  const getSelectedAddon = useCallback((addonId: number) => {
    return selectedAddons.find(a => a.product_id === addonId);
  }, [selectedAddons]);

  // Handle venue hours change
  const handleVenueHoursChange = useCallback((venueId: number, hours: number) => {
    setVenueAdditionalHours(prev => ({
      ...prev,
      [venueId]: hours
    }));
  }, []);

  // Helper to build complete data with venue hours
  const buildCompleteData = useCallback((addons: SelectedAddon[]) => {
    const venueHoursForApi = Object.entries(venueAdditionalHours).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value  // Keep as string key for API
    }), {} as Record<string, number>);

    const dataToSend: AddonSelectionStepData = {
      selected_addons: addons,
    };

    if (selectedVenues.length > 0 && Object.keys(venueHoursForApi).length > 0) {
      dataToSend.venue_additional_hours = venueHoursForApi;
    }

    return dataToSend;
  }, [venueAdditionalHours, selectedVenues.length]);

  // Handle addon toggle - Fixed to use addon_id
  const handleAddonToggle = useCallback((addon: ProductOption) => {
    let newSelectedAddons: SelectedAddon[];

    if (isAddonSelected(addon.id)) {
      // Remove addon
      newSelectedAddons = selectedAddons.filter(a => a.product_id !== addon.id);
    } else {
      // Check max selection limit
      if (maxSelection > 0 && selectedAddons.length >= maxSelection) {
        return; // Don't add if at max
      }

      // Add addon with tax information - Fixed to use addon_id
      const newAddon: SelectedAddon = {
        product_id: addon.id, // Fixed: Changed from 'id' to 'addon_id'
        name: addon.name,
        price: addon.base_price,
        quantity: 1,
        // CRITICAL: Include tax information for proper pricing calculation
        is_tax_inclusive: addon.is_tax_inclusive, // Tax-inclusive flag from backend
        price_with_tax: addon.price_with_tax, // Pre-calculated price including tax
      };

      newSelectedAddons = [...selectedAddons, newAddon];
    }

    onDataChange(buildCompleteData(newSelectedAddons));
  }, [selectedAddons, maxSelection, isAddonSelected, onDataChange, buildCompleteData]);

  // Handle quantity change - Fixed to use addon_id
  const handleQuantityChange = useCallback((addonId: number, delta: number) => {
    const addonConfig = availableAddons.find(a => a.id === addonId);
    const maxQty = addonConfig?.maximum_quantity ?? Infinity;

    const newSelectedAddons = selectedAddons.map(addon => {
      if (addon.product_id === addonId) {
        const newQuantity = Math.max(1, Math.min(maxQty, addon.quantity + delta));
        return { ...addon, quantity: newQuantity };
      }
      return addon;
    });

    // Only update data, don't trigger navigation
    onDataChange(buildCompleteData(newSelectedAddons));
  }, [selectedAddons, availableAddons, onDataChange, buildCompleteData]);

  // Effect to update venue hours when they change (without changing addons)
  React.useEffect(() => {
    if (selectedVenues.length > 0) {
      onDataChange(buildCompleteData(selectedAddons));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Other deps intentionally excluded to avoid infinite loops
  }, [venueAdditionalHours]);

  // Validation status
  const validationStatus = useMemo(() => {
    const errors: string[] = [];
    
    if (minSelection > 0 && selectedAddons.length < minSelection) {
      errors.push(`Must select at least ${minSelection} add-on${minSelection > 1 ? 's' : ''}`);
    }
    
    if (maxSelection > 0 && selectedAddons.length > maxSelection) {
      errors.push(`Cannot select more than ${maxSelection} add-on${maxSelection > 1 ? 's' : ''}`);
    }
    
    // Merge with external validation errors
    const allErrors = [
      ...errors,
      ...Object.values(validationErrors).flat()
    ];
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }, [selectedAddons, minSelection, maxSelection, validationErrors]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = selectedAddons.reduce((total, addon) => {
      const price = parseFloat(addon.price);
      return total + (price * addon.quantity);
    }, 0);
    
    return {
      subtotal,
      formatted: ProductsApi.formatPrice(subtotal.toString()),
    };
  }, [selectedAddons]);

  const formatPrice = (price: string) => {
    return ProductsApi.formatPrice(price);
  };

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const totalAddons = availableAddons.length;
  const selectedCount = selectedAddons.length;

  return (
    <Box>
      {/* Venue Additional Hours Section */}
      {selectedVenues && selectedVenues.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Additional Hours
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Extend your time at any venue. These hours are in addition to what's included in your package.
          </Typography>

          {selectedVenues.map((venue) => {
            // Get effective pricing (uses event-type config if available)
            const pricing = VenuesApi.getEffectivePricing(venue);
            const additionalHours = venueAdditionalHours[venue.id] || 0;
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
                    backgroundColor: 'success.50',
                    borderColor: 'success.main',
                    borderWidth: 1,
                    borderStyle: 'solid',
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
              <Paper key={venue.id} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600}>{venue.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Includes {includedHours} hours
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={2}>
                    <IconButton
                      size="small"
                      onClick={() => handleVenueHoursChange(venue.id, Math.max(0, additionalHours - 1))}
                      disabled={additionalHours === 0}
                    >
                      <Remove />
                    </IconButton>

                    <Typography sx={{ minWidth: 40, textAlign: 'center' }}>
                      +{additionalHours}
                    </Typography>

                    <IconButton
                      size="small"
                      onClick={() => handleVenueHoursChange(venue.id, Math.min(10, additionalHours + 1))}
                      disabled={additionalHours >= 10}
                    >
                      <Add />
                    </IconButton>

                    {additionalHours > 0 && (
                      <Chip
                        label={`+₱${totalCost.toLocaleString()}`}
                        color="secondary"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  ₱{excessPrice.toLocaleString()}/hr for additional hours
                </Typography>
              </Paper>
            );
          })}
        </Box>
      )}

      {selectedVenues && selectedVenues.length > 0 && <Divider sx={{ my: 3 }} />}

      <Typography variant="h6" gutterBottom>
        Add-on Services
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {totalAddons === 0
          ? "No add-ons are currently available."
          : `Choose additional services to enhance your event. ${minSelection > 0 ? `Minimum ${minSelection} required.` : 'All optional.'}`}
      </Typography>

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

      {/* Progress indicator */}
      {totalAddons > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedCount} of {totalAddons} add-ons selected
            </Typography>
            {maxSelection > 0 && (
              <Typography variant="body2" color="text.secondary">
                Max: {maxSelection}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Addons Display */}
      {totalAddons > 0 && (
        <Box sx={{ mb: 3 }}>
          {Object.entries(groupedAddons).map(([category, addons]) => (
            <Box key={category} sx={{ mb: 3 }}>
              {groupByCategory && (
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  {category}
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(addons as ProductOption[]).map((addon) => {
                  const isSelected = isAddonSelected(addon.id);
                  const selectedAddon = getSelectedAddon(addon.id);
                  
                  return (
                    <Card
                      key={addon.id}
                      variant={isSelected ? "elevation" : "outlined"}
                      sx={{
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'secondary.main' : 'divider',
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1, mr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="h6">
                                {addon.name}
                              </Typography>
                              {addon.is_featured && (
                                <Chip
                                  icon={<Star />}
                                  label="Popular"
                                  size="small"
                                  color="secondary"
                                />
                              )}
                            </Box>
                            
                            {addon.description && (
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {addon.description}
                              </Typography>
                            )}
                            
                            <Typography variant="h6" color="primary">
                              {formatPrice(addon.base_price)}
                              {addon.pricing_unit ? (
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {' '}{addon.pricing_unit_display?.toLowerCase() || addon.pricing_unit.replace('PER_', 'per ').toLowerCase()}
                                </Typography>
                              ) : addon.pricing_model === 'HOURLY' && (
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {' '}per hour
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                            <Button
                              variant={isSelected ? "contained" : "outlined"}
                              color="secondary"
                              onClick={() => handleAddonToggle(addon)}
                              startIcon={isSelected ? null : <Add />}
                            >
                              {isSelected ? 'Remove' : 'Add'}
                            </Button>
                            
                            {isSelected && addon.allow_multiple && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuantityChange(addon.id, -1)}
                                  disabled={selectedAddon?.quantity === 1}
                                >
                                  <Remove />
                                </IconButton>
                                <Typography sx={{ minWidth: 24, textAlign: 'center' }}>
                                  {selectedAddon?.quantity || 1}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuantityChange(addon.id, 1)}
                                  disabled={addon.maximum_quantity ? (selectedAddon?.quantity ?? 1) >= addon.maximum_quantity : false}
                                >
                                  <Add />
                                </IconButton>
                                {addon.maximum_quantity && (
                                  <Typography variant="caption" color="text.secondary">
                                    max {addon.maximum_quantity}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Summary */}
      {selectedAddons.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ShoppingCart />
            <Typography variant="subtitle1">
              Selected Add-ons
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {selectedAddons.map((addon) => (
            <Box key={addon.product_id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {addon.name} {addon.quantity > 1 && `x${addon.quantity}`}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {formatPrice((parseFloat(addon.price) * addon.quantity).toString())}
              </Typography>
            </Box>
          ))}
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">Add-ons Subtotal</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {totals.formatted}
            </Typography>
          </Box>
        </Paper>
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