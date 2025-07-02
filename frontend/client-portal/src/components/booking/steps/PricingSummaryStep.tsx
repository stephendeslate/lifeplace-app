// frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  TextField,
  Button,
  Alert,
  Stack,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocalOffer as DiscountIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import type { 
  BookingFlowStep 
} from '../../../types/booking.types';
import type { 
  PricingSummaryStepData 
} from '../../../types/booking-session.types';
import { formatCurrency } from '../../../utils/payment-helpers';

interface PricingSummaryStepProps {
  step: BookingFlowStep;
  onNext: () => void;
  onPrevious: () => void;
}

const PricingSummaryStep: React.FC<PricingSummaryStepProps> = ({
  step,
  onNext,
  onPrevious,
}) => {
  const {
    session,
    updateSessionData,
    getPricing,
    isUpdating,
    validationErrors,
    clearValidation,
  } = useBookingSessionContext();

  // Local state
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: string;
    type: 'PERCENTAGE' | 'FIXED';
  } | null>(null);
  const [pricingData, setPricingData] = useState<{
    total_price: string;
    breakdown: {
      packages: Array<{ name: string; quantity: number; price: string }>;
      addons: Array<{ name: string; quantity: number; price: string }>;
      subtotal: string;
      discounts: Array<{ name: string; amount: string; type: string }>;
      total: string;
    };
  } | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Get current step data from session
  const currentStepData = session?.booking_data?.[`step_${step.id}`] as PricingSummaryStepData | undefined;

  // Load pricing data on component mount
  useEffect(() => {
    loadPricingData();
  }, []);

  // Initialize state from session data
  useEffect(() => {
    if (currentStepData) {
      if (currentStepData.discount_code) {
        setDiscountCode(currentStepData.discount_code);
      }
      if (currentStepData.applied_discount) {
        setAppliedDiscount(currentStepData.applied_discount);
      }
    }
  }, [currentStepData]);

  const loadPricingData = useCallback(async () => {
    try {
      setIsLoadingPricing(true);
      const pricing = await getPricing();
      if (pricing) {
        setPricingData(pricing);
      }
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setIsLoadingPricing(false);
    }
  }, [getPricing]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    try {
      setIsApplyingDiscount(true);
      setDiscountError(null);
      clearValidation();

      // Update session with discount code attempt
      const stepData: PricingSummaryStepData = {
        ...currentStepData,
        discount_code: discountCode.trim(),
        acknowledged: currentStepData?.acknowledged,
      };

      await updateSessionData(step.id, stepData, false);

      // Note: In a real implementation, the backend would validate the discount code
      // and return either success with discount details or an error
      // For now, we'll simulate this based on the session validation response

      // Check if there are validation errors for the discount
      if (validationErrors?.discount_code) {
        const errorMessage = Array.isArray(validationErrors.discount_code) 
          ? validationErrors.discount_code[0] 
          : validationErrors.discount_code;
        setDiscountError(errorMessage);
      } else {
        // Simulate successful discount application
        // In reality, this would come from the backend response
        const mockDiscount = {
          code: discountCode.trim(),
          amount: '50.00', // This would come from backend
          type: 'FIXED' as const,
        };
        
        setAppliedDiscount(mockDiscount);
        
        // Update session with applied discount
        const updatedStepData: PricingSummaryStepData = {
          ...stepData,
          applied_discount: mockDiscount,
        };
        
        await updateSessionData(step.id, updatedStepData, false);
        
        // Reload pricing to reflect discount
        await loadPricingData();
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      setDiscountError('Failed to apply discount code. Please try again.');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    try {
      setAppliedDiscount(null);
      setDiscountCode('');
      setDiscountError(null);

      const stepData: PricingSummaryStepData = {
        ...currentStepData,
        discount_code: '',
        applied_discount: undefined,
        acknowledged: currentStepData?.acknowledged,
      };

      await updateSessionData(step.id, stepData, false);
      await loadPricingData();
    } catch (error) {
      console.error('Error removing discount:', error);
    }
  };

  const handleAcknowledge = async () => {
    try {
      const stepData: PricingSummaryStepData = {
        ...currentStepData,
        acknowledged: true,
        discount_code: discountCode,
        applied_discount: appliedDiscount || undefined,
      };

      await updateSessionData(step.id, stepData, true);
      onNext();
    } catch (error) {
      console.error('Error acknowledging pricing:', error);
    }
  };

  const calculateSubtotal = (): number => {
    if (!pricingData) return 0;
    
    let subtotal = 0;
    
    // Add package prices
    pricingData.breakdown.packages.forEach(pkg => {
      subtotal += parseFloat(pkg.price) * pkg.quantity;
    });
    
    // Add addon prices
    pricingData.breakdown.addons.forEach(addon => {
      subtotal += parseFloat(addon.price) * addon.quantity;
    });
    
    return subtotal;
  };

  const calculateDiscountAmount = (): number => {
    if (!appliedDiscount) return 0;
    
    const discountValue = parseFloat(appliedDiscount.amount);
    
    if (appliedDiscount.type === 'PERCENTAGE') {
      const subtotal = calculateSubtotal();
      return (subtotal * discountValue) / 100;
    }
    
    return discountValue;
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    return Math.max(0, subtotal - discountAmount);
  };

  if (isLoadingPricing) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading pricing information...
        </Typography>
      </Box>
    );
  }

  if (!pricingData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to load pricing information. Please try again.
        </Alert>
        <Button variant="outlined" onClick={loadPricingData}>
          Retry
        </Button>
      </Box>
    );
  }

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscountAmount();
  const total = calculateTotal();
  const hasItems = pricingData.breakdown.packages.length > 0 || pricingData.breakdown.addons.length > 0;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 3, 
          textAlign: 'center',
          fontWeight: 600,
          color: 'primary.main'
        }}
      >
        Pricing Summary
      </Typography>

      {!hasItems && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No packages or add-ons have been selected yet. Please go back to make your selections.
        </Alert>
      )}

      {hasItems && (
        <>
          {/* Main Pricing Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {/* Summary Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Order Summary
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  endIcon={showBreakdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  {showBreakdown ? 'Hide' : 'Show'} Details
                </Button>
              </Box>

              {/* Detailed Breakdown */}
              <Collapse in={showBreakdown}>
                <Box sx={{ mb: 2 }}>
                  {/* Packages */}
                  {pricingData.breakdown.packages.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                        Packages
                      </Typography>
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableBody>
                          {pricingData.breakdown.packages.map((pkg, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ border: 'none', pl: 0 }}>
                                {pkg.name}
                              </TableCell>
                              <TableCell sx={{ border: 'none', textAlign: 'center' }}>
                                ×{pkg.quantity}
                              </TableCell>
                              <TableCell sx={{ border: 'none', textAlign: 'right', pr: 0 }}>
                                {formatCurrency(parseFloat(pkg.price) * pkg.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {/* Add-ons */}
                  {pricingData.breakdown.addons.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                        Add-ons
                      </Typography>
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableBody>
                          {pricingData.breakdown.addons.map((addon, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ border: 'none', pl: 0 }}>
                                {addon.name}
                              </TableCell>
                              <TableCell sx={{ border: 'none', textAlign: 'center' }}>
                                ×{addon.quantity}
                              </TableCell>
                              <TableCell sx={{ border: 'none', textAlign: 'right', pr: 0 }}>
                                {formatCurrency(parseFloat(addon.price) * addon.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </Box>
              </Collapse>

              {/* Pricing Totals */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Subtotal</Typography>
                  <Typography variant="body1">{formatCurrency(subtotal)}</Typography>
                </Box>

                {appliedDiscount && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ color: 'success.main' }}>
                        Discount ({appliedDiscount.code})
                      </Typography>
                      <Chip
                        label={appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.amount}%` : 'Fixed'}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body1" sx={{ color: 'success.main' }}>
                      -{formatCurrency(discountAmount)}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {formatCurrency(total)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Discount Code Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DiscountIcon color="primary" />
                Discount Code
              </Typography>

              {appliedDiscount ? (
                <Box>
                  <Alert 
                    severity="success" 
                    icon={<CheckCircleIcon />}
                    action={
                      <Button 
                        color="inherit" 
                        size="small" 
                        onClick={handleRemoveDiscount}
                      >
                        Remove
                      </Button>
                    }
                  >
                    Discount code "{appliedDiscount.code}" applied successfully!
                  </Alert>
                </Box>
              ) : (
                <Box>
                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      placeholder="Enter discount code"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setDiscountError(null);
                      }}
                      error={!!discountError}
                      disabled={isApplyingDiscount}
                      size="small"
                    />
                    <Button
                      variant="outlined"
                      onClick={handleApplyDiscount}
                      disabled={isApplyingDiscount || !discountCode.trim()}
                      sx={{ minWidth: 100 }}
                    >
                      {isApplyingDiscount ? (
                        <CircularProgress size={20} />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </Stack>

                  {discountError && (
                    <Alert severity="error" icon={<ErrorIcon />}>
                      {discountError}
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={onPrevious}
              disabled={isUpdating}
            >
              Previous
            </Button>

            <Button
              variant="contained"
              onClick={handleAcknowledge}
              disabled={isUpdating}
              sx={{ minWidth: 120 }}
            >
              {isUpdating ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </Box>
        </>
      )}

      {!hasItems && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={onPrevious}
          >
            Go Back
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PricingSummaryStep;