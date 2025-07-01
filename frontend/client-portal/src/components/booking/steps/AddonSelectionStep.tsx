// frontend/client-portal/src/components/booking/steps/AddonSelectionStep.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Chip,
  IconButton,
  Alert,
  Skeleton,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  Remove,
  ShoppingCart,
  Info,
  CheckCircle,
  Category,
  AttachMoney,
  Group,
  Schedule,
} from '@mui/icons-material';
import { useStepProducts, useCalculatePricing } from '../../../hooks/useBookingFlow';
import { useToastActions } from '../../../contexts/ToastContext';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  ProductSelectionItem,
  ProductOption,
} from '../../../types/bookingflow.types';

interface AddonSelectionStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

interface AddonSelection {
  id: number;
  product: ProductOption;
  quantity: number;
  calculated_price: number;
}

const AddonSelectionStep: React.FC<AddonSelectionStepProps> = ({
  step,
  session,
  data,
  validationErrors,
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showError, showSuccess } = useToastActions();

  // Local state for addon selections
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([]);
  const [localPricing, setLocalPricing] = useState({
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  // API hooks
  const {
    data: availableAddons = [],
    isLoading: isLoadingAddons,
    error: addonsError,
  } = useStepProducts(step.id, {
    type: 'PRODUCT', // Addons are typically products, not packages
    guest_count: data.guest_count,
  });

  const calculatePricingMutation = useCalculatePricing();

  // Initialize selected addons from session data
  useEffect(() => {
    if (data.selected_addons && Array.isArray(data.selected_addons)) {
      const addonSelections: AddonSelection[] = data.selected_addons.map((addon: any) => {
        const product = availableAddons.find(p => p.id === addon.id);
        return {
          id: addon.id,
          product: product!,
          quantity: addon.quantity || 1,
          calculated_price: parseFloat(addon.price || '0'),
        };
      }).filter(addon => addon.product); // Filter out addons where product wasn't found

      setSelectedAddons(addonSelections);
    }
  }, [data.selected_addons, availableAddons]);

  // Calculate total pricing when selections change
  useEffect(() => {
    if (selectedAddons.length > 0) {
      const updatedData = {
        ...data,
        selected_addons: selectedAddons.map(addon => ({
          id: addon.id,
          quantity: addon.quantity,
          price: addon.calculated_price.toString(),
          options: {},
        })),
      };

      // Calculate pricing via API
      calculatePricingMutation.mutate({
        sessionId: session.session_id,
        updates: updatedData,
      }, {
        onSuccess: (pricingData) => {
          setLocalPricing({
            subtotal: pricingData.subtotal,
            tax_amount: pricingData.tax_amount,
            total_amount: pricingData.total_amount,
          });
        },
        onError: (error) => {
          console.error('Pricing calculation failed:', error);
        },
      });
    } else {
      setLocalPricing({ subtotal: 0, tax_amount: 0, total_amount: 0 });
    }
  }, [selectedAddons, session.session_id, calculatePricingMutation]);

  // Update parent component when selections change
  useEffect(() => {
    const addonData = selectedAddons.map(addon => ({
      id: addon.id,
      quantity: addon.quantity,
      price: addon.calculated_price.toString(),
      options: {},
    }));

    onChange({
      selected_addons: addonData,
    });
  }, [selectedAddons, onChange]);

  // Handle addon selection
  const handleAddonSelect = (product: ProductOption) => {
    if (isReadOnly) return;

    const existingIndex = selectedAddons.findIndex(addon => addon.id === product.id);
    
    if (existingIndex >= 0) {
      // Already selected, increase quantity or remove if not allow_multiple
      if (product.allow_multiple) {
        const updated = [...selectedAddons];
        updated[existingIndex].quantity += 1;
        updated[existingIndex].calculated_price = parseFloat(product.price_with_tax) * updated[existingIndex].quantity;
        setSelectedAddons(updated);
      } else {
        // Remove the addon
        setSelectedAddons(prev => prev.filter(addon => addon.id !== product.id));
        showSuccess('Addon Removed', `${product.name} has been removed from your selection.`);
      }
    } else {
      // New selection
      const newAddon: AddonSelection = {
        id: product.id,
        product,
        quantity: 1,
        calculated_price: parseFloat(product.price_with_tax),
      };
      
      setSelectedAddons(prev => [...prev, newAddon]);
      showSuccess('Addon Added', `${product.name} has been added to your selection.`);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (addonId: number, change: number) => {
    if (isReadOnly) return;

    setSelectedAddons(prev => prev.map(addon => {
      if (addon.id === addonId) {
        const newQuantity = Math.max(0, addon.quantity + change);
        
        if (newQuantity === 0) {
          return null; // Will be filtered out
        }
        
        return {
          ...addon,
          quantity: newQuantity,
          calculated_price: parseFloat(addon.product.price_with_tax) * newQuantity,
        };
      }
      return addon;
    }).filter(Boolean) as AddonSelection[]);
  };

  // Validation
  const validate = (): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    // Check if addon selection is required
    if (step.is_required && selectedAddons.length === 0) {
      errors.selected_addons = ['Please select at least one addon to continue.'];
    }

    // Check individual addon requirements
    selectedAddons.forEach(addon => {
      if (addon.product.requires_approval) {
        // Could add specific validation for approval-required products
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Group addons by category
  const groupedAddons = useMemo(() => {
    const groups: Record<string, ProductOption[]> = {};
    
    availableAddons.forEach(addon => {
      const categoryName = addon.category_name || 'Other';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(addon);
    });

    return groups;
  }, [availableAddons]);

  // Get selected addon for a product
  const getSelectedAddon = (productId: number) => {
    return selectedAddons.find(addon => addon.id === productId);
  };

  // Loading state
  if (isLoadingAddons) {
    return (
      <Box sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Skeleton variant="text" height={60} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[...Array(6)].map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width={isMobile ? '100%' : 300}
                height={200}
                sx={{ borderRadius: 2 }}
              />
            ))}
          </Box>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (addonsError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Unable to Load Addons
        </Typography>
        <Typography variant="body2">
          We're having trouble loading the available addons. Please refresh the page or try again later.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Enhance Your Experience
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Choose from our selection of add-ons to make your event even more special.
          {!step.is_required && ' This step is optional - you can skip if you prefer.'}
        </Typography>

        {/* Selection Summary */}
        {selectedAddons.length > 0 && (
          <Box
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ShoppingCart sx={{ color: 'primary.main' }} />
              <Typography variant="h6" color="primary.main">
                Selected Add-ons ({selectedAddons.length})
              </Typography>
            </Stack>
            
            <Stack spacing={1}>
              {selectedAddons.map(addon => (
                <Box
                  key={addon.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {addon.product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${addon.product.formatted_price} × {addon.quantity}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!isReadOnly && addon.product.allow_multiple && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(addon.id, -1)}
                          disabled={isLoading}
                        >
                          <Remove />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                          {addon.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(addon.id, 1)}
                          disabled={isLoading}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                    )}
                    
                    <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                      ${addon.calculated_price.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            {/* Pricing Summary */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Add-ons Total:
              </Typography>
              <Typography variant="h6" color="primary.main">
                ${localPricing.total_amount.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Available Addons */}
      {Object.keys(groupedAddons).length === 0 ? (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Add-ons Available
          </Typography>
          <Typography variant="body2">
            There are no add-ons available for your selected package and event details.
            You can proceed to the next step.
          </Typography>
        </Alert>
      ) : (
        <Stack spacing={4}>
          {Object.entries(groupedAddons).map(([categoryName, addons]) => (
            <Box key={categoryName}>
              {/* Category Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Category sx={{ color: 'text.secondary' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {categoryName}
                </Typography>
                <Chip
                  label={`${addons.length} option${addons.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {/* Addon Cards */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 3,
                }}
              >
                {addons.map(addon => {
                  const selectedAddon = getSelectedAddon(addon.id);
                  const isSelected = !!selectedAddon;

                  return (
                    <Box
                      key={addon.id}
                      sx={{
                        flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)', lg: '1 1 calc(33.333% - 16px)' },
                        minWidth: { xs: '100%', sm: 280 },
                        maxWidth: { xs: '100%', md: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' },
                      }}
                    >
                      <Card
                        elevation={isSelected ? 4 : 1}
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: isReadOnly ? 'default' : 'pointer',
                          transition: 'all 0.3s ease',
                          border: isSelected 
                            ? `2px solid ${theme.palette.primary.main}` 
                            : '2px solid transparent',
                          '&:hover': !isReadOnly ? {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[8],
                          } : {},
                        }}
                        onClick={() => !isReadOnly && handleAddonSelect(addon)}
                      >
                        <CardContent sx={{ flex: 1, p: 3 }}>
                          <Stack spacing={2}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 600,
                                  lineHeight: 1.3,
                                  flex: 1,
                                }}
                              >
                                {addon.name}
                              </Typography>
                              
                              {isSelected && (
                                <CheckCircle
                                  sx={{
                                    color: 'primary.main',
                                    ml: 1,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Box>

                            {/* Description */}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {addon.description}
                            </Typography>

                            {/* Features */}
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoney sx={{ fontSize: 18, color: 'success.main' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {addon.formatted_price}
                                </Typography>
                              </Box>

                              {addon.included_hours && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Schedule sx={{ fontSize: 18, color: 'info.main' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {addon.included_hours} hours included
                                  </Typography>
                                </Box>
                              )}

                              {addon.allow_multiple && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Group sx={{ fontSize: 18, color: 'primary.main' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Multiple quantities available
                                  </Typography>
                                </Box>
                              )}

                              {addon.requires_approval && (
                                <Chip
                                  label="Requires Approval"
                                  size="small"
                                  icon={<Info />}
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          </Stack>
                        </CardContent>

                        <CardActions sx={{ p: 3, pt: 0 }}>
                          {isSelected ? (
                            <Box sx={{ width: '100%' }}>
                              {addon.allow_multiple ? (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 1,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography variant="body2" color="primary.main">
                                    Selected: {selectedAddon.quantity}
                                  </Typography>
                                  
                                  {!isReadOnly && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuantityChange(addon.id, -1);
                                        }}
                                        disabled={isLoading}
                                      >
                                        <Remove />
                                      </IconButton>
                                      <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                                        {selectedAddon.quantity}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuantityChange(addon.id, 1);
                                        }}
                                        disabled={isLoading}
                                      >
                                        <Add />
                                      </IconButton>
                                    </Box>
                                  )}
                                </Box>
                              ) : (
                                <Button
                                  variant="contained"
                                  fullWidth
                                  startIcon={<CheckCircle />}
                                  disabled={isReadOnly}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddonSelect(addon);
                                  }}
                                >
                                  Selected
                                </Button>
                              )}
                            </Box>
                          ) : (
                            <Button
                              variant="outlined"
                              fullWidth
                              startIcon={<Add />}
                              disabled={isReadOnly || isLoading}
                            >
                              Add to Selection
                            </Button>
                          )}
                        </CardActions>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {/* Validation Errors */}
      {validationErrors?.selected_addons && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="body2">
            {validationErrors.selected_addons[0]}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default AddonSelectionStep;