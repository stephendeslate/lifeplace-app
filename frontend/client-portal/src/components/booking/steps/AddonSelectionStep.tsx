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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import { 
  Add, 
  Remove, 
  ExpandMore,
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
  const availableAddons = config?.available_addons_details || [];
  const minSelection = config?.min_selection || 0;
  const maxSelection = config?.max_selection || 0; // 0 means unlimited
  const groupByCategory = config?.group_by_category || false;

  // Use props stepData as single source of truth
  const selectedAddons = stepData.selected_addons || [];

  // Group addons by category if enabled
  const groupedAddons = useMemo(() => {
    if (!groupByCategory) {
      return { 'All Add-ons': availableAddons };
    }
    return ProductsApi.groupProductsByCategory(availableAddons);
  }, [availableAddons, groupByCategory]);

  // Check if addon is selected
  const isAddonSelected = useCallback((addonId: number) => {
    return selectedAddons.some(a => a.id === addonId);
  }, [selectedAddons]);

  // Get selected addon details
  const getSelectedAddon = useCallback((addonId: number) => {
    return selectedAddons.find(a => a.id === addonId);
  }, [selectedAddons]);

  // Handle addon toggle
  const handleAddonToggle = useCallback((addon: ProductOption) => {
    let newSelectedAddons: SelectedAddon[];
    
    if (isAddonSelected(addon.id)) {
      // Remove addon
      newSelectedAddons = selectedAddons.filter(a => a.id !== addon.id);
    } else {
      // Check max selection limit
      if (maxSelection > 0 && selectedAddons.length >= maxSelection) {
        return; // Don't add if at max
      }
      
      // Add addon
      const newAddon: SelectedAddon = {
        id: addon.id,
        name: addon.name,
        price: addon.base_price,
        quantity: 1,
      };
      
      newSelectedAddons = [...selectedAddons, newAddon];
    }
    
    onDataChange({ selected_addons: newSelectedAddons });
  }, [selectedAddons, maxSelection, isAddonSelected, onDataChange]);

  // Handle quantity change
  const handleQuantityChange = useCallback((addonId: number, delta: number) => {
    const newSelectedAddons = selectedAddons.map(addon => {
      if (addon.id === addonId) {
        const newQuantity = Math.max(1, addon.quantity + delta);
        return { ...addon, quantity: newQuantity };
      }
      return addon;
    });
    
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
          : `Choose additional services to enhance your event. ${minSelection > 0 ? `Minimum ${minSelection} required.` : 'All optional.'}`
        }
      </Typography>

      {/* Display validation errors */}
      {!validationStatus.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationStatus.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {/* Selection summary */}
      {totalAddons > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2">
            <ShoppingCart sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            {selectedCount} of {totalAddons} add-ons selected
            {maxSelection > 0 && ` (max ${maxSelection})`}
          </Typography>
        </Box>
      )}

      {totalAddons === 0 ? (
        <Alert severity="info">
          No add-on services are currently available for this event type.
        </Alert>
      ) : (
        <Box>
          {Object.entries(groupedAddons).map(([categoryName, addons]) => {
            const CategoryContent = (
              <Box display="flex" flexWrap="wrap" gap={2}>
                {addons.map((addon: ProductOption) => {
                  const isSelected = isAddonSelected(addon.id);
                  const selectedAddon = getSelectedAddon(addon.id);

                  return (
                    <Box key={addon.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.333% - 11px)' }, minWidth: 0 }}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          border: isSelected ? 2 : 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          position: 'relative',
                        }}
                      >
                        {addon.is_featured && (
                          <Chip
                            icon={<Star />}
                            label="Recommended"
                            color="secondary"
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1,
                            }}
                          />
                        )}

                        <CardContent sx={{ pb: 1 }}>
                          <Typography variant="subtitle1" component="h3" gutterBottom>
                            {addon.name}
                          </Typography>

                          {addon.description && (
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {addon.description}
                            </Typography>
                          )}

                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h6" color="primary">
                              {formatPrice(addon.base_price)}
                            </Typography>
                          </Box>

                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Button
                              variant={isSelected ? "contained" : "outlined"}
                              size="small"
                              onClick={() => handleAddonToggle(addon)}
                              disabled={isValidating || (!isSelected && maxSelection > 0 && selectedCount >= maxSelection)}
                            >
                              {isSelected ? "Added" : "Add"}
                            </Button>

                            {isSelected && addon.allow_multiple && selectedAddon && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleQuantityChange(addon.id, -1)}
                                  disabled={selectedAddon.quantity <= 1}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                
                                <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                                  {selectedAddon.quantity}
                                </Typography>
                                
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleQuantityChange(addon.id, 1)}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            );

            return groupByCategory && Object.keys(groupedAddons).length > 1 ? (
              <Accordion key={categoryName} defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {categoryName} ({addons.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {CategoryContent}
                </AccordionDetails>
              </Accordion>
            ) : (
              <Box key={categoryName}>
                {Object.keys(groupedAddons).length > 1 && (
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    {categoryName}
                  </Typography>
                )}
                {CategoryContent}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Selected addons summary */}
      {selectedAddons.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Add-ons
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {selectedAddons.map((addon) => (
            <Box key={addon.id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2">
                {addon.name} {addon.quantity > 1 && `× ${addon.quantity}`}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatPrice((parseFloat(addon.price) * addon.quantity).toString())}
              </Typography>
            </Box>
          ))}
          
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Add-ons Subtotal</Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              {totals.formatted}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};