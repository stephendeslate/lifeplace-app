// frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  IconButton,
  Chip,
  Skeleton,
  Fade,
} from '@mui/material';
import { 
  Receipt, 
  LocalOffer, 
  CheckCircle,
  Close as CloseIcon,
  AccessTime,
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { usePricingSummaryStep } from '../../../hooks/booking/usePricingSummary';
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
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Use refs to track previous values and prevent unnecessary updates
  const previousTotalRef = useRef<string>('0.00');
  const isUpdatingRef = useRef(false);

  // Get selected packages and addons from step data
  const selectedPackages = state.stepData.package_selection?.selected_packages || [];
  const selectedAddons = state.stepData.addon_selection?.selected_addons || [];
  const eventDuration = state.stepData.date_time?.duration;

  // Use the corrected pricing hook with discount code
  const {
    breakdown,
    formattedBreakdown,
    hasItems,
    totalItemCount,
    appliedDiscount,
    discountCode,
    setDiscountCode,
    applyDiscountCode,
    removeDiscount,
    calculatingPricing,
    validatingDiscount,
    pricingError,
    discountError,
    getStepData,
    serverPricing
  } = usePricingSummaryStep(
    selectedPackages,
    selectedAddons,
    eventDuration,
    stepData.applied_discount_code
  );

  // Track when we've loaded initial data
  useEffect(() => {
    if (!calculatingPricing && hasItems && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [calculatingPricing, hasItems, hasInitiallyLoaded]);

  // Update parent component with calculated pricing data
  const updatePricingData = useCallback(async () => {
    // Prevent concurrent updates
    if (isUpdatingRef.current) {
      return;
    }
    
    const newStepData = getStepData();
    
    // Only update if data has actually changed
    if (JSON.stringify(newStepData) === JSON.stringify(stepData)) {
      return;
    }
    
    isUpdatingRef.current = true;
    
    try {
      // Update step data locally first
      onDataChange(newStepData);
      
      // Only update backend with the discount code
      await actions.updateStepData('pricing_summary', newStepData);
      
      // Update global total price if different
      const totalString = breakdown.total.toFixed(2);
      if (state.totalPrice !== totalString) {
        await actions.updateTotalPrice(totalString);
      }
      
      previousTotalRef.current = totalString;
    } catch (error) {
      console.error('Failed to update pricing data:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [getStepData, stepData, onDataChange, breakdown.total, state.totalPrice, actions]);

  useEffect(() => {
    console.log('Selected packages:', selectedPackages);
    console.log('Breakdown total:', breakdown.total);
    console.log('Formatted breakdown total:', formattedBreakdown.total);
    console.log('Server pricing:', serverPricing);
  }, [selectedPackages, breakdown, formattedBreakdown, serverPricing]);

  // Update pricing data only when breakdown actually changes
  useEffect(() => {
    if (hasItems && !calculatingPricing && !isUpdatingRef.current) {
      // Use a small delay to debounce rapid updates
      const timeoutId = setTimeout(() => {
        updatePricingData();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [breakdown.total, hasItems, calculatingPricing, updatePricingData]);

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (discountCodeInput.trim()) {
      await applyDiscountCode(discountCodeInput.trim());
      setDiscountCodeInput('');
    }
  };

  // Handle discount removal
  const handleRemoveDiscount = () => {
    removeDiscount();
    setDiscountCodeInput('');
  };

  // Handle discount code input changes
  const handleDiscountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCodeInput(event.target.value);
    setDiscountCode(event.target.value);
  };

  // Show loading state only on initial load
  if (calculatingPricing && !hasInitiallyLoaded && !hasItems) {
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

  // Determine if we're updating prices (after initial load)
  const isUpdatingPrices = calculatingPricing && hasInitiallyLoaded;

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
      {config?.show_package_breakdown !== false && formattedBreakdown.packages.length > 0 && (
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
                {formattedBreakdown.packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      {pkg.name}
                      {pkg.includedHours && eventDuration && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                          {pkg.includedHours} hours included
                          {pkg.excessHours ? ` (+${pkg.excessHours} excess hours)` : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{pkg.quantity}</TableCell>
                    <TableCell align="right">
                      {isUpdatingPrices ? (
                        <Skeleton width={60} animation="wave" />
                      ) : (
                        `₱${pkg.unitPrice.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isUpdatingPrices ? (
                        <Skeleton width={80} animation="wave" />
                      ) : (
                        <>
                          ₱{pkg.total.toFixed(2)}
                          {pkg.excessCost && pkg.excessCost > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              (includes ₱{pkg.excessCost.toFixed(2)} excess)
                            </Typography>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Selected Add-ons */}
      {config?.show_addon_breakdown !== false && formattedBreakdown.addons.length > 0 && (
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
                {formattedBreakdown.addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>{addon.name}</TableCell>
                    <TableCell align="center">{addon.quantity}</TableCell>
                    <TableCell align="right">
                      {isUpdatingPrices ? (
                        <Skeleton width={60} animation="wave" />
                      ) : (
                        `₱${addon.unitPrice.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isUpdatingPrices ? (
                        <Skeleton width={80} animation="wave" />
                      ) : (
                        `₱${addon.total.toFixed(2)}`
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
          
          {appliedDiscount ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${appliedDiscount.code} - ${appliedDiscount.name}`}
                icon={<CheckCircle />}
                color="success"
                onDelete={handleRemoveDiscount}
                deleteIcon={<CloseIcon />}
              />
              <Typography variant="body2" color="success.main">
                {appliedDiscount.discount_type === 'PERCENTAGE' 
                  ? `${appliedDiscount.value}% off`
                  : `₱${appliedDiscount.value} off`}
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
                  formattedBreakdown.subtotal
                )}
              </Typography>
            </Box>
          )}
          
          {config?.show_tax_breakdown !== false && breakdown.tax > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Tax</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  formattedBreakdown.tax
                )}
              </Typography>
            </Box>
          )}
          
          {breakdown.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
              <Typography>Discount</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  `-${formattedBreakdown.discount}`
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
                formattedBreakdown.total
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