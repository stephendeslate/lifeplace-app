// frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Skeleton,
  Fade,
} from '@mui/material';
import { 
  Receipt, 
  LocalOffer, 
  CheckCircle,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { useSimplePricing } from '../../../hooks/booking/useSimplePricing';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import type {
  PricingSummaryStepData,
  PricingSummaryStepConfiguration,
} from '../../../types/booking';

interface PricingSummaryStepProps {
  stepData?: PricingSummaryStepData;
  config: PricingSummaryStepConfiguration | null; // Fixed: Proper type instead of any
  onDataChange: (data: PricingSummaryStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

export const PricingSummaryStep: React.FC<PricingSummaryStepProps> = ({
  stepData = {
    applied_discount_code: undefined, // Fixed: Match backend expectation
  },
  config,
  onDataChange,
  validationErrors,
  isValidating,
}) => {
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Get selected packages and addons from step data
  const selectedPackages = state.stepData.package_selection?.selected_packages || [];
  const selectedAddons = state.stepData.addon_selection?.selected_addons || [];

  // Use simplified unified pricing hook
  const {
    pricing,
    loading: calculatingPricing,
    error: pricingError,
    hasItems,
    totalItemCount,
    recalculate
  } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    stepData.applied_discount_code
  );


  // Update parent component with calculated pricing data
  const updatePricingData = useCallback(async () => {
    const newStepData: PricingSummaryStepData = {
      applied_discount_code: stepData.applied_discount_code || undefined,
    };
    
    // Only update if data has actually changed
    if (JSON.stringify(newStepData) === JSON.stringify(stepData)) {
      return;
    }
    
    try {
      // Update step data locally first
      onDataChange(newStepData);
      
      // Only update backend with the discount code
      await actions.updateStepData('pricing_summary', newStepData as Record<string, unknown>);
      
      // Update global total price if different
      const totalString = pricing.total.toFixed(2);
      if (state.totalPrice !== totalString) {
        await actions.updateTotalPrice(totalString);
      }
    } catch (error) {
      console.error('Failed to update pricing data:', error);
    }
  }, [stepData, onDataChange, pricing.total, state.totalPrice, actions]);

  // Update pricing data when total changes
  useEffect(() => {
    if (hasItems && !calculatingPricing) {
      const timeoutId = setTimeout(() => {
        updatePricingData();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [pricing.total, hasItems, calculatingPricing, updatePricingData]);

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return;
    
    setValidatingDiscount(true);
    setDiscountError(null);
    
    try {
      // Here you would validate the discount code via API
      // For now, just simulate a successful application
      const newStepData = {
        ...stepData,
        applied_discount_code: discountCodeInput.trim()
      };
      onDataChange(newStepData);
      setDiscountCodeInput('');
      recalculate();
    } catch (_error) {
      setDiscountError('Invalid discount code');
    } finally {
      setValidatingDiscount(false);
    }
  };

  // Handle discount removal
  const handleRemoveDiscount = () => {
    const newStepData = {
      ...stepData,
      applied_discount_code: undefined
    };
    onDataChange(newStepData);
    setDiscountError(null);
    setDiscountCodeInput('');
    recalculate();
  };

  // Handle discount code input changes
  const handleDiscountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCodeInput(event.target.value);
    setDiscountError(null);
  };

  // Show loading state on initial load
  if (calculatingPricing && !hasItems) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Calculating pricing...
        </Typography>
      </Box>
    );
  }

  // Show error if pricing calculation failed and no items
  if (pricingError && !hasItems) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Pricing Calculation Error</Typography>
        <Typography variant="body2">{pricingError}</Typography>
        <Button variant="outlined" size="small" sx={{ mt: 1 }} onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </Alert>
    );
  }

  // Show message if no items selected
  if (!hasItems && !calculatingPricing) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6">No Items Selected</Typography>
        <Typography variant="body2">
          Please go back and select packages or add-ons to see the pricing summary.
        </Typography>
      </Alert>
    );
  }

  // Determine if we're updating prices
  const isUpdatingPrices = calculatingPricing && hasItems;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt />
        {config?.header_text || 'Pricing Summary'}
        <Fade in={isUpdatingPrices}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Updating prices...
            </Typography>
          </Box>
        </Fade>
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your selected items and total cost. You can apply a discount code if you have one.
      </Typography>

      {/* Show pricing error as warning if we have items */}
      {pricingError && hasItems && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pricingError}
        </Alert>
      )}

      {/* Selected Packages */}
      {config?.show_package_breakdown !== false && selectedPackages.length > 0 && (
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
                  // Find matching line item for excess hour details
                  const lineItem = pricing.lineItems?.find(item => item.product_id === pkg.product_id);
                  const hasExcessHours = lineItem?.excess_hours && lineItem.excess_hours > 0;
                  const basePrice = lineItem?.base_unit_price ? parseFloat(lineItem.base_unit_price) : parseFloat(pkg.price);
                  const unitPrice = lineItem?.total_unit_price ? parseFloat(lineItem.total_unit_price) : parseFloat(pkg.price);

                  return (
                    <TableRow key={pkg.product_id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {pkg.name}
                          </Typography>
                          {hasExcessHours && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Base: {formatAmount(basePrice.toString())}
                              {lineItem.excess_hours && lineItem.excess_hour_price && (
                                <> + {lineItem.excess_hours}h excess @ {formatAmount(lineItem.excess_hour_price)}/h</>
                              )}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{pkg.quantity}</TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {isUpdatingPrices ? (
                              <Skeleton width={60} animation="wave" />
                            ) : (
                              formatAmount(unitPrice.toString())
                            )}
                          </Typography>
                          {hasExcessHours && lineItem.excess_cost && parseFloat(lineItem.excess_cost) > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              (+{formatAmount((parseFloat(lineItem.excess_cost) / pkg.quantity).toString())} excess)
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {isUpdatingPrices ? (
                          <Skeleton width={80} animation="wave" />
                        ) : (
                          formatAmount((unitPrice * pkg.quantity).toString())
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Selected Add-ons */}
      {config?.show_addon_breakdown !== false && selectedAddons.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Add-ons
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Add-on</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedAddons.map((addon) => {
                  // Find matching line item (for future-proofing if addons support excess hours)
                  const lineItem = pricing.lineItems?.find(item => item.product_id === addon.product_id);
                  const unitPrice = lineItem?.total_unit_price ? parseFloat(lineItem.total_unit_price) : parseFloat(addon.price);

                  return (
                    <TableRow key={addon.product_id}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell align="center">{addon.quantity}</TableCell>
                      <TableCell align="right">
                        {isUpdatingPrices ? (
                          <Skeleton width={60} animation="wave" />
                        ) : (
                          formatAmount(unitPrice.toString())
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {isUpdatingPrices ? (
                          <Skeleton width={80} animation="wave" />
                        ) : (
                          formatAmount((unitPrice * addon.quantity).toString())
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Discount Code Section */}
      {config?.show_discount_field !== false && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOffer />
            Discount Code
          </Typography>
          
          {stepData.applied_discount_code ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={stepData.applied_discount_code}
                icon={<CheckCircle />}
                color="success"
                onDelete={handleRemoveDiscount}
                deleteIcon={<CloseIcon />}
              />
              <Typography variant="body2" color="success.main">
                Discount Applied
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                placeholder={config?.discount_help_text || "Enter discount code"}
                value={discountCodeInput}
                onChange={handleDiscountInputChange}
                error={!!discountError || !!validationErrors.applied_discount_code}
                helperText={
                  discountError || 
                  validationErrors.applied_discount_code?.join(', ') ||
                  ''
                }
                sx={{ flexGrow: 1 }}
                disabled={validatingDiscount}
              />
              <Button
                variant="outlined"
                onClick={handleApplyDiscount}
                disabled={!discountCodeInput.trim() || validatingDiscount}
                startIcon={validatingDiscount ? <CircularProgress size={16} /> : null}
              >
                Apply
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Pricing Summary */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Order Summary
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {config?.show_subtotal !== false && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Subtotal ({totalItemCount} items)</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  pricing.formattedSubtotal
                )}
              </Typography>
            </Box>
          )}
          
          {config?.show_tax_breakdown !== false && pricing.tax > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Tax</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  pricing.formattedTax
                )}
              </Typography>
            </Box>
          )}
          
          {pricing.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
              <Typography>Discount</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  `-${pricing.formattedDiscount}`
                )}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Total</Typography>
            <Typography variant="h6" color="primary">
              {isUpdatingPrices ? (
                <Skeleton width={100} animation="wave" />
              ) : (
                pricing.formattedTotal
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Footer text */}
      {config?.footer_text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {config.footer_text}
        </Typography>
      )}

      {/* Validation state indicator */}
      {isValidating && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Validating pricing...
          </Typography>
        </Box>
      )}
    </Box>
  );
};