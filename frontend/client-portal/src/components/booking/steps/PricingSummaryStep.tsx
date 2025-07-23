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
  IconButton,
  Chip,
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
} from '../../../types/booking';

interface PricingSummaryStepProps {
  stepData?: PricingSummaryStepData;
  config: any;
  onDataChange: (data: PricingSummaryStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

export const PricingSummaryStep: React.FC<PricingSummaryStepProps> = ({
  stepData = {
    subtotal: '0.00',
    tax: '0.00',
    discount: '0.00',
    total: '0.00',
    applied_discount: null,
  },
  config,
  onDataChange,
  validationErrors,
  isValidating,
}) => {
  const { state, actions } = useBooking();
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');

  // Get selected packages and addons from step data
  const selectedPackages = state.stepData.package_selection?.selected_packages || [];
  const selectedAddons = state.stepData.addon_selection?.selected_addons || [];
  const eventDuration = state.stepData.date_time?.duration;

  // Use the corrected pricing hook
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
  } = usePricingSummaryStep(
    selectedPackages,
    selectedAddons,
    eventDuration,
    stepData.applied_discount
  );

  // Update parent component with calculated pricing data
  const updatePricingData = useCallback(async () => {
    const newStepData = getStepData();
    
    // Update step data
    onDataChange(newStepData);
    
    // Update the global total price in the booking context
    if (state.totalPrice !== newStepData.total) {
      try {
        // Update session with total price
        await actions.updateStepData('pricing_summary', newStepData);
      } catch (error) {
        console.error('Failed to update total price:', error);
      }
    }
  }, [getStepData, onDataChange, state.totalPrice, actions]);

  // Update pricing data when breakdown changes
  useEffect(() => {
    if (hasItems) {
      updatePricingData();
    }
  }, [updatePricingData, hasItems]);

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (discountCodeInput.trim()) {
      await applyDiscountCode(discountCodeInput.trim());
      setDiscountCodeInput(''); // Clear input on successful application
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
    setDiscountCode(event.target.value); // Update the hook's internal state
  };

  // Show loading state while calculating
  if (calculatingPricing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Calculating pricing...
        </Typography>
      </Box>
    );
  }

  // Show error if pricing calculation failed
  if (pricingError) {
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
  if (!hasItems) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6">No Items Selected</Typography>
        <Typography variant="body2">
          Please go back and select packages or add-ons to see the pricing summary.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt />
        Pricing Summary
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your selected items and total cost. You can apply a discount code if you have one.
      </Typography>

      {/* Items Summary */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="h6">Selected Items ({totalItemCount} items)</Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Package Items */}
              {breakdown.packages.map((pkg) => (
                <TableRow key={`package-${pkg.id}`}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {pkg.name}
                      </Typography>
                      <Chip label="Package" size="small" color="primary" variant="outlined" />
                      {pkg.includedHours && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          <AccessTime fontSize="inherit" sx={{ mr: 0.5 }} />
                          {pkg.includedHours}h included
                          {pkg.excessHours && ` + ${pkg.excessHours}h excess`}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{pkg.quantity}</TableCell>
                  <TableCell align="right">
                    {new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(pkg.unitPrice)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(pkg.total)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Addon Items */}
              {breakdown.addons.map((addon) => (
                <TableRow key={`addon-${addon.id}`}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {addon.name}
                      </Typography>
                      <Chip label="Add-on" size="small" color="secondary" variant="outlined" />
                    </Box>
                  </TableCell>
                  <TableCell align="center">{addon.quantity}</TableCell>
                  <TableCell align="right">
                    {new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(addon.unitPrice)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(addon.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Discount Code Section */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalOffer />
          Discount Code
        </Typography>

        {appliedDiscount ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<CheckCircle />}
              label={`${discountCode} - ${appliedDiscount.name}`}
              color="success"
              variant="outlined"
            />
            <IconButton
              size="small"
              onClick={handleRemoveDiscount}
              color="error"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Enter discount code"
              variant="outlined"
              size="small"
              value={discountCodeInput}
              onChange={handleDiscountInputChange}
              error={!!discountError}
              helperText={discountError}
              disabled={validatingDiscount}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={handleApplyDiscount}
              disabled={!discountCodeInput.trim() || validatingDiscount}
              startIcon={validatingDiscount ? <CircularProgress size={16} /> : <LocalOffer />}
            >
              Apply
            </Button>
          </Box>
        )}
      </Paper>

      {/* Pricing Totals */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Total Cost
        </Typography>
        
        <Box sx={{ space: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography variant="body1">Subtotal</Typography>
            <Typography variant="body1">{formattedBreakdown.subtotal}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography variant="body1">Tax</Typography>
            <Typography variant="body1">{formattedBreakdown.tax}</Typography>
          </Box>
          
          {breakdown.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography variant="body1" color="success.main">Discount</Typography>
              <Typography variant="body1" color="success.main">
                -{formattedBreakdown.discount}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Total
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {formattedBreakdown.total}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Please fix the following errors:
          </Typography>
          <ul>
            {Object.entries(validationErrors).map(([field, errors]) => (
              <li key={field}>
                {field}: {errors.join(', ')}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
};