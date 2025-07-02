// frontend/client-portal/src/components/booking/steps/AddonSelectionStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Alert,
  Skeleton,
  Stack,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { bookingFlowAPI } from '../../../apis/bookingflow.api';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import { formatCurrency } from '../../../utils/payment-helpers';
import type { 
  BookingFlowStep,
  ProductOption,
  AddonSelectionStepConfiguration 
} from '../../../types/booking.types';
import type { 
  AddonSelectionStepData,
  SelectedAddon 
} from '../../../types/booking-session.types';
import type { BaseStepProps } from '../../../types/booking-steps.types';

interface AddonSelectionStepProps extends BaseStepProps<AddonSelectionStepData> {
  step: BookingFlowStep;
}

interface AddonWithQuantity extends ProductOption {
  selectedQuantity: number;
}

const AddonSelectionStep: React.FC<AddonSelectionStepProps> = ({
  step,
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSave,
  isLoading = false,
  validationErrors = {},
  canGoNext = true,
  canGoPrevious = true,
  showSaveButton = false,
}) => {
  const { saveProgress } = useBookingSessionContext();
  
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>(data.selected_addons || []);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Get step configuration
  const config = step.configuration_data as AddonSelectionStepConfiguration;

  // Fetch available add-ons
  const {
    data: availableAddons,
    isLoading: isLoadingAddons,
    error: addonsError
  } = useQuery({
    queryKey: ['available-addons', step.id],
    queryFn: () => bookingFlowAPI.getAvailableAddons(step.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch available categories if grouping by category
  const {
    data: availableCategories,
    isLoading: isLoadingCategories,
    error: categoriesError
  } = useQuery({
    queryKey: ['available-categories', step.id],
    queryFn: () => bookingFlowAPI.getAvailableCategories(step.id),
    enabled: config?.group_by_category || false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Transform available add-ons to include quantity
  const addonsWithQuantity: AddonWithQuantity[] = React.useMemo(() => {
    if (!availableAddons) return [];
    
    return availableAddons.map(addon => ({
      ...addon,
      selectedQuantity: selectedAddons.find(selected => selected.id === addon.id)?.quantity || 0,
    }));
  }, [availableAddons, selectedAddons]);

  // Group add-ons by category if enabled
  const groupedAddons = React.useMemo(() => {
    if (!config?.group_by_category || !availableCategories) {
      return { ungrouped: addonsWithQuantity };
    }

    const grouped: Record<string, AddonWithQuantity[]> = {};
    const categoryMap = new Map(availableCategories.map(cat => [cat.id, cat.name]));

    addonsWithQuantity.forEach(addon => {
      const categoryName = categoryMap.get(addon.category) || 'Other';
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(addon);
    });

    return grouped;
  }, [addonsWithQuantity, availableCategories, config?.group_by_category]);

  // Auto-expand first category
  useEffect(() => {
    if (config?.group_by_category && availableCategories && expandedCategories.size === 0) {
      const firstCategory = availableCategories[0];
      if (firstCategory) {
        setExpandedCategories(new Set([firstCategory.id]));
      }
    }
  }, [config?.group_by_category, availableCategories, expandedCategories.size]);

  // Update parent component when selection changes
  useEffect(() => {
    const stepData: AddonSelectionStepData = {
      selected_addons: selectedAddons,
    };
    
    onUpdate(stepData);
  }, [selectedAddons, onUpdate]);

  const handleQuantityChange = useCallback(async (addon: ProductOption, newQuantity: number) => {
    setIsUpdating(true);
    
    try {
      let updatedAddons: SelectedAddon[];
      
      if (newQuantity <= 0) {
        // Remove addon
        updatedAddons = selectedAddons.filter(selected => selected.id !== addon.id);
      } else {
        // Add or update addon
        const existingIndex = selectedAddons.findIndex(selected => selected.id === addon.id);
        
        const newSelectedAddon: SelectedAddon = {
          id: addon.id,
          name: addon.name,
          quantity: newQuantity,
          price: addon.base_price,
          options: {}, // Could be expanded for addon-specific options
        };
        
        if (existingIndex >= 0) {
          updatedAddons = [...selectedAddons];
          updatedAddons[existingIndex] = newSelectedAddon;
        } else {
          updatedAddons = [...selectedAddons, newSelectedAddon];
        }
      }
      
      setSelectedAddons(updatedAddons);
      
      // Auto-save progress
      const stepData: AddonSelectionStepData = {
        selected_addons: updatedAddons,
      };
      
      await saveProgress(stepData);
    } catch (error) {
      console.warn('Failed to save addon selection progress:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedAddons, saveProgress]);

  const toggleCategoryExpansion = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleIncrement = (addon: AddonWithQuantity) => {
    const currentQuantity = addon.selectedQuantity;
    const maxAllowed = config?.max_selection || 999;
    const totalSelected = selectedAddons.reduce((sum, selected) => sum + selected.quantity, 0);
    
    if (totalSelected < maxAllowed) {
      handleQuantityChange(addon, currentQuantity + 1);
    }
  };

  const handleDecrement = (addon: AddonWithQuantity) => {
    const currentQuantity = addon.selectedQuantity;
    if (currentQuantity > 0) {
      handleQuantityChange(addon, currentQuantity - 1);
    }
  };

  const calculateTotalPrice = (): string => {
    const total = selectedAddons.reduce((sum, addon) => {
      const price = parseFloat(addon.price) || 0;
      return sum + (price * addon.quantity);
    }, 0);
    
    return total.toFixed(2);
  };

  const canSelectMore = (): boolean => {
    if (!config?.max_selection || config.max_selection === 0) return true;
    
    const totalSelected = selectedAddons.reduce((sum, selected) => sum + selected.quantity, 0);
    return totalSelected < config.max_selection;
  };

  const hasMinimumSelection = (): boolean => {
    if (!config?.min_selection) return true;
    
    const totalSelected = selectedAddons.reduce((sum, selected) => sum + selected.quantity, 0);
    return totalSelected >= config.min_selection;
  };

  // Show loading state
  if (isLoadingAddons || isLoadingCategories) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          <Skeleton width="60%" />
        </Typography>
        
        <Stack spacing={2}>
          {[1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="30%" height={20} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (addonsError || categoriesError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Unable to load available add-ons. Please try again or continue without add-ons.
        </Alert>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {canGoPrevious && (
            <Button variant="outlined" onClick={onPrevious}>
              Back
            </Button>
          )}
          <Button variant="contained" onClick={onNext}>
            Continue Without Add-ons
          </Button>
        </Box>
      </Box>
    );
  }

  const renderAddonCard = (addon: AddonWithQuantity) => (
    <Card 
      key={addon.id}
      sx={{ 
        mb: 2,
        opacity: (!canSelectMore() && addon.selectedQuantity === 0) ? 0.6 : 1,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {addon.name}
            </Typography>
            
            {addon.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {addon.description}
              </Typography>
            )}
            
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {formatCurrency(addon.base_price)}
            </Typography>
          </Box>
          
          {addon.selectedQuantity > 0 && (
            <Chip 
              label={`${addon.selectedQuantity} selected`}
              color="primary"
              size="small"
            />
          )}
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleDecrement(addon)}
            disabled={addon.selectedQuantity === 0 || isUpdating}
            sx={{ 
              border: 1, 
              borderColor: 'divider',
              '&:disabled': { opacity: 0.5 }
            }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          
          <Typography 
            sx={{ 
              minWidth: 40, 
              textAlign: 'center', 
              fontWeight: 600,
              fontSize: '1.1rem'
            }}
          >
            {addon.selectedQuantity}
          </Typography>
          
          <IconButton
            size="small"
            onClick={() => handleIncrement(addon)}
            disabled={(!canSelectMore() && addon.selectedQuantity === 0) || isUpdating}
            sx={{ 
              border: 1, 
              borderColor: 'divider',
              '&:disabled': { opacity: 0.5 }
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {addon.selectedQuantity > 0 && (
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Subtotal: {formatCurrency(parseFloat(addon.base_price) * addon.selectedQuantity)}
          </Typography>
        )}
      </CardActions>
    </Card>
  );

  const renderGroupedAddons = () => {
    if (!config?.group_by_category) {
      return (
        <Box>
          {groupedAddons.ungrouped?.map(renderAddonCard)}
        </Box>
      );
    }

    return (
      <Box>
        {Object.entries(groupedAddons).map(([categoryName, addons]) => {
          const category = availableCategories?.find(cat => cat.name === categoryName);
          const isExpanded = category ? expandedCategories.has(category.id) : true;
          
          return (
            <Box key={categoryName} sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: 2,
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => category && toggleCategoryExpansion(category.id)}
              >
                <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                  {categoryName}
                </Typography>
                
                <Chip 
                  label={`${addons.length} available`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                
                {category && (
                  isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                )}
              </Box>
              
              <Collapse in={isExpanded}>
                <Box sx={{ pl: 2 }}>
                  {addons.map(renderAddonCard)}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        {step.name}
      </Typography>
      
      {step.description && (
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          {step.description}
        </Typography>
      )}

      {/* Selection requirements */}
      {(config?.min_selection || config?.max_selection) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box>
            {config.min_selection && config.min_selection > 0 && (
              <Typography variant="body2" component="div">
                • Minimum selection: {config.min_selection} add-on{config.min_selection !== 1 ? 's' : ''}
              </Typography>
            )}
            {config.max_selection && config.max_selection > 0 && (
              <Typography variant="body2" component="div">
                • Maximum selection: {config.max_selection} add-on{config.max_selection !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {/* Validation errors */}
      {validationErrors.selected_addons && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {Array.isArray(validationErrors.selected_addons) 
            ? validationErrors.selected_addons.join(', ')
            : validationErrors.selected_addons}
        </Alert>
      )}

      {/* Add-ons selection */}
      {availableAddons && availableAddons.length > 0 ? (
        <>
          {renderGroupedAddons()}
          
          {/* Selection summary */}
          {selectedAddons.length > 0 && (
            <Card sx={{ mt: 3, bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Selected Add-ons ({selectedAddons.length})
                </Typography>
                
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {selectedAddons.map((addon) => (
                    <Box 
                      key={addon.id}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Typography variant="body2">
                        {addon.name} × {addon.quantity}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(parseFloat(addon.price) * addon.quantity)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total Add-ons:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {formatCurrency(calculateTotalPrice())}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            <Typography>No add-ons are available for this booking.</Typography>
          </Box>
        </Alert>
      )}

      {/* Minimum selection warning */}
      {config?.min_selection && config.min_selection > 0 && !hasMinimumSelection() && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Please select at least {config.min_selection} add-on{config.min_selection !== 1 ? 's' : ''} to continue.
        </Alert>
      )}

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
        {canGoPrevious && (
          <Button 
            variant="outlined" 
            onClick={onPrevious}
            disabled={isLoading || isUpdating}
          >
            Back
          </Button>
        )}
        
        {showSaveButton && (
          <Button 
            variant="outlined" 
            onClick={onSave}
            disabled={isLoading || isUpdating}
          >
            Save Progress
          </Button>
        )}
        
        <Button 
          variant="contained" 
          onClick={onNext}
          disabled={
            Boolean(
              isLoading || 
              isUpdating || 
              !canGoNext || 
              (config?.min_selection && config.min_selection > 0 && !hasMinimumSelection())
            )
          }
        >
          {selectedAddons.length > 0 ? 'Continue with Add-ons' : 'Continue Without Add-ons'}
        </Button>
      </Box>
    </Box>
  );
};

export default AddonSelectionStep;