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
import type { 
  AddonSelectionStepData, 
  AddonSelectionStepConfiguration,
  ProductOption,
  SelectedAddon,
} from '../../../types/booking';

interface AddonSelectionStepProps {
  stepData?: AddonSelectionStepData;
  config: AddonSelectionStepConfiguration | null;
  onDataChange: (data: AddonSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

export const AddonSelectionStep: React.FC<AddonSelectionStepProps> = ({
  stepData = { selected_addons: [] },
  config,
  onDataChange,
  validationErrors,
  isValidating,
}) => {
  // Memoize config values to prevent unnecessary re-renders
  const availableAddons = useMemo(() => config?.available_addons_details || [], [config?.available_addons_details]);
  const minSelection = config?.min_selection || 0;
  const maxSelection = config?.max_selection || 0; // 0 means unlimited
  const groupByCategory = config?.group_by_category || false;

  // Use props stepData as single source of truth - memoize to stabilize reference
  const selectedAddons = useMemo(() => stepData.selected_addons || [], [stepData.selected_addons]);

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
        tax_rate: addon.tax_rate, // Individual tax rate from backend
        price_with_tax: addon.price_with_tax, // Pre-calculated price including tax
      };
      
      newSelectedAddons = [...selectedAddons, newAddon];
    }
    
    onDataChange({ selected_addons: newSelectedAddons });
  }, [selectedAddons, maxSelection, isAddonSelected, onDataChange]);

  // Handle quantity change - Fixed to use addon_id
  const handleQuantityChange = useCallback((addonId: number, delta: number) => {
    const newSelectedAddons = selectedAddons.map(addon => {
      if (addon.product_id === addonId) {
        const newQuantity = Math.max(1, addon.quantity + delta);
        return { ...addon, quantity: newQuantity };
      }
      return addon;
    });
    
    // Only update data, don't trigger navigation
    onDataChange({ selected_addons: newSelectedAddons });
  }, [selectedAddons, onDataChange]);

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
                              {addon.pricing_model === 'HOURLY' && (
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
                            
                            {isSelected && (
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
                                >
                                  <Add />
                                </IconButton>
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