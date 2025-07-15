// frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx

import React, { useState, useCallback, useMemo } from 'react';
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
} from '@mui/material';
import { 
  Receipt, 
  LocalOffer, 
  CheckCircle,
  Close as CloseIcon
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { ProductsApi } from '../../../apis/booking/products.api';
import type {
  PricingSummaryStepData,
  Discount,
  SelectedPackage,
  SelectedAddon,
} from '../../../types/booking';

interface PricingSummaryStepProps {
  stepData?: PricingSummaryStepData;
  config: any; // Configuration not yet implemented in backend
  onDataChange: (data: PricingSummaryStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

interface PricingBreakdown {
  packages: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    includedHours?: number;
    excessHours?: number;
    excessCost?: number;
  }>;
  addons: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
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
  const { state } = useBooking();
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Get selected packages and addons from step data
  const selectedPackages = state.stepData.package_selection?.selected_packages || [];
  const selectedAddons = state.stepData.addon_selection?.selected_addons || [];
  const eventDuration = state.stepData.date_time?.duration;

  // Use stepData's applied_discount as single source of truth
  const appliedDiscount = stepData.applied_discount;

  // Calculate pricing breakdown
  const breakdown = useMemo((): PricingBreakdown => {
    let subtotal = 0;
    const calculatedPackages = [];
    const calculatedAddons = [];

    // Calculate packages with duration considerations
    for (const pkg of selectedPackages) {
      const unitPrice = parseFloat(pkg.price);
      let packageTotal = unitPrice * pkg.quantity;
      let excessHours = 0;
      let excessCost = 0;

      // Handle excess hours if package has this feature and duration is provided
      if (eventDuration && pkg.included_hours && pkg.excess_hour_price) {
        if (eventDuration > pkg.included_hours) {
          excessHours = eventDuration - pkg.included_hours;
          excessCost = excessHours * parseFloat(pkg.excess_hour_price) * pkg.quantity;
          packageTotal += excessCost;
        }
      }

      const packageItem = {
        id: pkg.id,
        name: pkg.name,
        quantity: pkg.quantity,
        unitPrice: unitPrice,
        total: packageTotal,
        includedHours: pkg.included_hours,
        excessHours: excessHours > 0 ? excessHours : undefined,
        excessCost: excessCost > 0 ? excessCost : undefined,
      };

      calculatedPackages.push(packageItem);
      subtotal += packageTotal;
    }

    // Calculate addons
    for (const addon of selectedAddons) {
      const unitPrice = parseFloat(addon.price);
      const addonTotal = unitPrice * addon.quantity;

      const addonItem = {
        id: addon.id,
        name: addon.name,
        quantity: addon.quantity,
        unitPrice: unitPrice,
        total: addonTotal,
      };

      calculatedAddons.push(addonItem);
      subtotal += addonTotal;
    }

    // Calculate discount
    let discountAmount = 0;
    if (appliedDiscount) {
      switch (appliedDiscount.discount_type) {
        case 'PERCENTAGE':
          const percentage = parseFloat(appliedDiscount.value.toString());
          discountAmount = subtotal * (percentage / 100);
          break;
        
        case 'FIXED':
          const fixedAmount = parseFloat(appliedDiscount.value.toString());
          discountAmount = Math.min(fixedAmount, subtotal); // Don't exceed subtotal
          break;
        
        case 'FREE_HOURS':
          // For MVP, we'll just return 0 for free hours discounts
          // This could be enhanced later to calculate based on hourly rates
          discountAmount = 0;
          break;
      }
    }

    // Calculate tax (applied after discount)
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * 0.12; // 12% tax rate

    // Calculate total
    const total = subtotal + taxAmount - discountAmount;

    return {
      packages: calculatedPackages,
      addons: calculatedAddons,
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total: Math.max(0, total), // Ensure total is not negative
    };
  }, [selectedPackages, selectedAddons, eventDuration, appliedDiscount]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return ProductsApi.formatPrice(amount.toString());
  };

  // Get formatted breakdown for display
  const formattedBreakdown = useMemo(() => ({
    packages: breakdown.packages,
    addons: breakdown.addons,
    subtotal: formatCurrency(breakdown.subtotal),
    tax: formatCurrency(breakdown.tax),
    discount: formatCurrency(breakdown.discount),
    total: formatCurrency(breakdown.total),
    rawTotal: breakdown.total,
  }), [breakdown]);

  // Update parent with calculated values when breakdown changes
  const updatePricingData = useCallback(() => {
    const newStepData: PricingSummaryStepData = {
      subtotal: breakdown.subtotal.toFixed(2),
      tax: breakdown.tax.toFixed(2),
      discount: breakdown.discount.toFixed(2),
      total: breakdown.total.toFixed(2),
      applied_discount: appliedDiscount,
    };
    
    // Only update if values have actually changed
    if (
      newStepData.total !== stepData.total ||
      newStepData.subtotal !== stepData.subtotal ||
      newStepData.tax !== stepData.tax ||
      newStepData.discount !== stepData.discount ||
      JSON.stringify(newStepData.applied_discount) !== JSON.stringify(stepData.applied_discount)
    ) {
      onDataChange(newStepData);
    }
  }, [breakdown, appliedDiscount, stepData, onDataChange]);

  // Update pricing data when breakdown changes
  React.useEffect(() => {
    updatePricingData();
  }, [updatePricingData]);

  // Apply discount code
  const handleApplyDiscount = async () => {
    const code = discountCodeInput.trim();
    if (!code) return;

    setValidatingDiscount(true);
    setDiscountError(null);

    try {
      // Mock discount validation - in real app this would call API
      const mockDiscount: Discount = {
        id: 1,
        name: 'Test Discount',
        code: code,
        description: '10% off your booking',
        discount_type: 'PERCENTAGE',
        application_type: 'CODE_REQUIRED',
        value: '10',
        currency: 'PHP',
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_until: null,
        max_uses: null,
        max_uses_per_client: null,
        current_uses: 0,
        minimum_order_amount: null,
        minimum_hours: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update step data with new discount
      const newStepData: PricingSummaryStepData = {
        ...stepData,
        applied_discount: mockDiscount,
      };
      onDataChange(newStepData);
      
      setDiscountCodeInput(''); // Clear input on success
    } catch (error) {
      setDiscountError('Invalid discount code');
    } finally {
      setValidatingDiscount(false);
    }
  };

  // Remove discount
  const handleRemoveDiscount = () => {
    const newStepData: PricingSummaryStepData = {
      ...stepData,
      applied_discount: null,
    };
    onDataChange(newStepData);
    setDiscountCodeInput('');
    setDiscountError(null);
  };

  // Check if there are any items selected
  const hasItems = selectedPackages.length > 0 || selectedAddons.length > 0;
  const totalItemCount = selectedPackages.reduce((total, pkg) => total + pkg.quantity, 0) +
                        selectedAddons.reduce((total, addon) => total + addon.quantity, 0);

  // Show loading state
  if (isValidating && !hasItems) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Calculating pricing...
        </Typography>
      </Box>
    );
  }

  // Show message if no items selected
  if (!hasItems) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
          Pricing Summary
        </Typography>

        <Alert severity="info" sx={{ textAlign: 'center' }}>
          No packages or add-ons have been selected yet. Please go back to the previous steps to make your selections.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Pricing Summary
      </Typography>

      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Review your event pricing breakdown
      </Typography>

      {/* Show validation errors if any */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {Object.values(validationErrors).flat().map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {/* Pricing Breakdown Table */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Receipt color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Price Breakdown
          </Typography>
          {isValidating && <CircularProgress size={16} />}
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Packages */}
              {breakdown.packages.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 600, backgroundColor: 'grey.50' }}>
                      Packages
                    </TableCell>
                  </TableRow>
                  {breakdown.packages.map((pkg) => (
                    <React.Fragment key={pkg.id}>
                      <TableRow>
                        <TableCell>
                          {pkg.name}
                          {pkg.includedHours && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Includes {pkg.includedHours} hours
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">{pkg.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(pkg.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(pkg.total)}</TableCell>
                      </TableRow>
                      {/* Show excess hours if applicable */}
                      {pkg.excessHours && pkg.excessCost && (
                        <TableRow>
                          <TableCell sx={{ pl: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              + {pkg.excessHours} excess hours
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {pkg.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(pkg.excessCost / (pkg.excessHours * pkg.quantity))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(pkg.excessCost)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </>
              )}

              {/* Add-ons */}
              {breakdown.addons.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 600, backgroundColor: 'grey.50' }}>
                      Add-ons
                    </TableCell>
                  </TableRow>
                  {breakdown.addons.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell align="center">{addon.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(addon.unitPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(addon.total)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* Subtotal */}
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 600, textAlign: 'right', pt: 2 }}>
                  Subtotal
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, pt: 2 }}>
                  {formattedBreakdown.subtotal}
                </TableCell>
              </TableRow>

              {/* Discount */}
              {breakdown.discount > 0 && (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'right', color: 'success.main' }}>
                    Discount
                    {appliedDiscount && (
                      <Typography variant="caption" display="block">
                        ({appliedDiscount.name})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    -{formattedBreakdown.discount}
                  </TableCell>
                </TableRow>
              )}

              {/* Tax */}
              <TableRow>
                <TableCell colSpan={3} sx={{ textAlign: 'right' }}>
                  Tax (12%)
                </TableCell>
                <TableCell align="right">
                  {formattedBreakdown.tax}
                </TableCell>
              </TableRow>

              {/* Total */}
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '1.1rem', textAlign: 'right', pt: 2 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main', pt: 2 }}>
                  {formattedBreakdown.total}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Discount Code Section - Show by default since allow_discounts defaults to true in backend */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LocalOffer color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Discount Code
          </Typography>
        </Box>

        {appliedDiscount ? (
          <Alert 
            severity="success" 
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={handleRemoveDiscount}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Discount Applied: {appliedDiscount.name}
              </Typography>
              <Typography variant="body2">
                {appliedDiscount.description}
              </Typography>
            </Box>
          </Alert>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Enter discount code"
                value={discountCodeInput}
                onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                size="small"
                disabled={validatingDiscount}
                error={!!discountError}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyDiscount();
                  }
                }}
              />
              <Button
                variant="outlined"
                onClick={handleApplyDiscount}
                disabled={!discountCodeInput.trim() || validatingDiscount}
                sx={{ minWidth: 100 }}
              >
                {validatingDiscount ? <CircularProgress size={20} /> : 'Apply'}
              </Button>
            </Box>
            
            {discountError && (
              <Typography variant="caption" color="error">
                {discountError}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Event Details Summary */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Event Summary
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {state.stepData.date_time?.start_date && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Event Date:
              </Typography>
              <Typography variant="body2">
                {new Date(state.stepData.date_time.start_date).toLocaleDateString()}
              </Typography>
            </Box>
          )}

          {state.stepData.date_time?.start_time && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Event Time:
              </Typography>
              <Typography variant="body2">
                {state.stepData.date_time.start_time}
              </Typography>
            </Box>
          )}

          {state.stepData.date_time?.duration && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Duration:
              </Typography>
              <Typography variant="body2">
                {state.stepData.date_time.duration} hours
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Total Items:
            </Typography>
            <Typography variant="body2">
              {totalItemCount}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Total Amount:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {formattedBreakdown.total}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Important Notes - FIXED: Removed ul from Typography component */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" component="div">
          <strong>Please Note:</strong>
        </Typography>
        <Box component="ul" sx={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>All prices are inclusive of applicable taxes unless otherwise stated</li>
          <li>Final pricing may be subject to additional fees based on specific requirements</li>
          <li>Payment options will be available in the next step</li>
          {eventDuration && breakdown.packages.some(p => p.excessHours) && (
            <li>Additional hours beyond the included time will be charged separately</li>
          )}
        </Box>
      </Alert>
    </Box>
  );
};