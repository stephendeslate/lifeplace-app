// frontend/client-portal/src/components/booking/steps/ReviewBookingStep.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Stack,
  Chip,
  Divider,
  Button,
  TextField,
  Alert,
  Skeleton,
  alpha,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import {
  Event,
  Person,
  Phone,
  Email,
  LocationOn,
  Schedule,
  Group,
  ShoppingCart,
  Receipt,
  LocalOffer,
  ExpandMore,
  ExpandLess,
  Edit,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useCalculatePricing, useValidateDiscount, useCompleteBooking } from '../../../hooks/useBookingFlow';
import { useToastActions } from '../../../contexts/ToastContext';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
} from '../../../types/bookingflow.types';

interface ReviewBookingStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

interface PricingData {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  pricing_breakdown: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

const ReviewBookingStep: React.FC<ReviewBookingStepProps> = ({
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
  const { showSuccess, showError, showWarning } = useToastActions();

  // Local state
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [showPricingBreakdown, setShowPricingBreakdown] = useState(false);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);

  // API hooks
  const calculatePricingMutation = useCalculatePricing();
  const validateDiscountMutation = useValidateDiscount();
  const completeBookingMutation = useCompleteBooking();

  // Load pricing data on component mount
  useEffect(() => {
    setIsLoadingPricing(true);
    calculatePricingMutation.mutate({
      sessionId: session.session_id,
    }, {
      onSuccess: (pricing) => {
        setPricingData(pricing);
        setIsLoadingPricing(false);
      },
      onError: (error) => {
        console.error('Failed to calculate pricing:', error);
        setIsLoadingPricing(false);
      },
    });
  }, [session.session_id, calculatePricingMutation]);

  // Handle discount code application
  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      showWarning('Invalid Code', 'Please enter a discount code.');
      return;
    }

    validateDiscountMutation.mutate({
      sessionId: session.session_id,
      discountCode: discountCode.trim(),
    }, {
      onSuccess: (result) => {
        if (result.valid) {
          setAppliedDiscount(result.discount);
          
          // Recalculate pricing with discount
          calculatePricingMutation.mutate({
            sessionId: session.session_id,
          }, {
            onSuccess: (pricing) => {
              setPricingData(pricing);
            },
          });
        }
      },
      onError: (error) => {
        console.error('Discount validation failed:', error);
      },
    });
  };

  // Handle booking completion
  const handleCompleteBooking = () => {
    if (!pricingData) {
      showError('Pricing Error', 'Unable to complete booking. Please refresh and try again.');
      return;
    }

    completeBookingMutation.mutate(session.session_id, {
      onSuccess: (result) => {
        showSuccess('Booking Complete!', 'Your event has been successfully booked.');
        
        // Update session data with completion status
        onChange({
          booking_completed: true,
          completed_at: new Date().toISOString(),
          event_id: result.event?.id,
        });
      },
      onError: (error: any) => {
        console.error('Booking completion failed:', error);
      },
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  // Validation
  const validate = (): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    // Check if pricing is loaded
    if (!pricingData) {
      errors.pricing = ['Pricing information is required to complete booking.'];
    }

    // Check if all previous steps have required data
    if (!session.booking_data.event_name) {
      errors.event_details = ['Event name is required.'];
    }

    if (!session.booking_data.start_date) {
      errors.date_time = ['Event date is required.'];
    }

    if (!session.booking_data.full_name || !session.booking_data.email) {
      errors.contact_info = ['Contact information is required.'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Extract data from session
  const bookingData = session.booking_data || {};
  const selectedPackages = bookingData.selected_packages || [];
  const selectedAddons = bookingData.selected_addons || [];

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
          Review Your Booking
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please review all the details below before confirming your booking.
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Event Details */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Event sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Event Details
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Event Name:
                </Typography>
                <Typography variant="body1">
                  {bookingData.event_name || 'Not specified'}
                </Typography>
              </Box>

              {bookingData.description && (
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                    Description:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bookingData.description}
                  </Typography>
                </Box>
              )}

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Date & Time:
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1">
                    {bookingData.start_date ? formatDate(bookingData.start_date) : 'Not selected'}
                  </Typography>
                  {bookingData.start_time && (
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(bookingData.start_time)}
                      {bookingData.duration_hours && ` (${bookingData.duration_hours} hours)`}
                    </Typography>
                  )}
                </Box>
              </Box>

              {bookingData.guest_count && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Guest Count:
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {bookingData.guest_count} guests
                  </Typography>
                </Box>
              )}

              {bookingData.venue_preference && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Venue:
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {bookingData.venue_preference}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Person sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Contact Information
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Name:
                </Typography>
                <Typography variant="body1">
                  {bookingData.full_name || 'Not provided'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Email:
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {bookingData.email || 'Not provided'}
                </Typography>
              </Box>

              {bookingData.phone && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Phone:
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {bookingData.phone}
                  </Typography>
                </Box>
              )}

              {bookingData.company && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Company:
                  </Typography>
                  <Typography variant="body1">
                    {bookingData.company}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Selected Services */}
        {(selectedPackages.length > 0 || selectedAddons.length > 0) && (
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ShoppingCart sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Selected Services
                </Typography>
              </Box>

              <Stack spacing={3}>
                {/* Packages */}
                {selectedPackages.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                      Packages
                    </Typography>
                    <Stack spacing={2}>
                      {selectedPackages.map((pkg: any, index: number) => (
                        <Box
                          key={index}
                          sx={{
                            p: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              Package #{pkg.id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Quantity: {pkg.quantity}
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            ${parseFloat(pkg.price || '0').toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Add-ons */}
                {selectedAddons.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'secondary.main' }}>
                      Add-ons
                    </Typography>
                    <Stack spacing={2}>
                      {selectedAddons.map((addon: any, index: number) => (
                        <Box
                          key={index}
                          sx={{
                            p: 2,
                            backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              Add-on #{addon.id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Quantity: {addon.quantity}
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            ${parseFloat(addon.price || '0').toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Discount Code Section */}
        {!appliedDiscount && (
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalOffer sx={{ color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Discount Code
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  fullWidth
                  placeholder="Enter discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  disabled={isReadOnly || validateDiscountMutation.status === 'pending'}
                  size="small"
                  sx={{ maxWidth: 300 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleApplyDiscount}
                  disabled={isReadOnly || !discountCode.trim() || validateDiscountMutation.status === 'pending'}
                  sx={{ minWidth: 100 }}
                >
                  {validateDiscountMutation.status === 'pending' ? 'Applying...' : 'Apply'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Applied Discount */}
        {appliedDiscount && (
          <Card elevation={1} sx={{ border: `2px solid ${theme.palette.success.main}` }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Discount Applied
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {appliedDiscount.name}
                  </Typography>
                  {appliedDiscount.code && (
                    <Typography variant="body2" color="text.secondary">
                      Code: {appliedDiscount.code}
                    </Typography>
                  )}
                </Box>
                <Typography variant="h6" color="success.main">
                  -${pricingData?.discount_amount.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Pricing Summary */}
        <Card elevation={3} sx={{ border: `2px solid ${theme.palette.primary.main}` }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Receipt sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Pricing Summary
              </Typography>
            </Box>

            {isLoadingPricing ? (
              <Stack spacing={2}>
                <Skeleton variant="text" height={40} />
                <Skeleton variant="text" height={40} />
                <Skeleton variant="text" height={60} />
              </Stack>
            ) : pricingData ? (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">
                    Subtotal:
                  </Typography>
                  <Typography variant="body1">
                    ${pricingData.subtotal.toFixed(2)}
                  </Typography>
                </Box>

                {pricingData.discount_amount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" color="success.main">
                      Discount:
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      -${pricingData.discount_amount.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">
                    Tax:
                  </Typography>
                  <Typography variant="body1">
                    ${pricingData.tax_amount.toFixed(2)}
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total Amount:
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    ${pricingData.total_amount.toFixed(2)}
                  </Typography>
                </Box>

                {/* Pricing Breakdown Toggle */}
                {pricingData.pricing_breakdown && pricingData.pricing_breakdown.length > 0 && (
                  <Box>
                    <Button
                      variant="text"
                      size="small"
                      startIcon={showPricingBreakdown ? <ExpandLess /> : <ExpandMore />}
                      onClick={() => setShowPricingBreakdown(!showPricingBreakdown)}
                      sx={{ mt: 1 }}
                    >
                      {showPricingBreakdown ? 'Hide' : 'Show'} Pricing Breakdown
                    </Button>

                    <Collapse in={showPricingBreakdown}>
                      <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                          Detailed Breakdown:
                        </Typography>
                        <Stack spacing={1}>
                          {pricingData.pricing_breakdown.map((item, index) => (
                            <Box
                              key={index}
                              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                {item.name} × {item.quantity}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ${item.total_price.toFixed(2)}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                )}
              </Stack>
            ) : (
              <Alert severity="warning">
                <Typography variant="body2">
                  Unable to calculate pricing. Please refresh the page and try again.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Warning sx={{ color: 'warning.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Important Notes
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                • By confirming this booking, you agree to our terms and conditions.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • A confirmation email will be sent to {bookingData.email}.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Changes to your booking may be subject to availability and additional fees.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Cancellation policy applies as per our terms of service.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Confirmation Button */}
        {!isReadOnly && (
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Ready to Confirm Your Booking?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please review all details above. Once confirmed, your event will be created
              and you'll receive a confirmation email.
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<CheckCircle />}
              onClick={handleCompleteBooking}
              disabled={isLoading || completeBookingMutation.status === 'pending' || !pricingData}
              sx={{
                minWidth: 200,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              {completeBookingMutation.status === 'pending'
                ? 'Processing...'
                : 'Confirm Booking'
              }
            </Button>
          </Paper>
        )}

        {/* Validation Errors */}
        {validationErrors && Object.keys(validationErrors).length > 0 && (
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Please Complete Required Information
            </Typography>
            <Stack spacing={1}>
              {Object.entries(validationErrors).map(([field, errors]) => (
                <Typography key={field} variant="body2">
                  • {errors[0]}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default ReviewBookingStep;