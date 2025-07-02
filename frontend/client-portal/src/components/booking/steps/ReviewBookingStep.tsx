// frontend/client-portal/src/components/booking/steps/ReviewBookingStep.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Divider,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  ShoppingCart as ShoppingCartIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import type { BaseStepProps } from '../../../types/booking-steps.types';
import type { ReviewBookingStepData } from '../../../types/booking-session.types';

interface ReviewBookingStepProps extends BaseStepProps<ReviewBookingStepData> {}

const ReviewBookingStep: React.FC<ReviewBookingStepProps> = ({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSave,
  isLoading = false,
  validationErrors = {},
  canGoPrevious = true,
  showSaveButton = false,
}) => {
  const {
    session,
    getPricing,
    completeBooking,
    isCompleting,
    error: sessionError,
  } = useBookingSessionContext();

  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [pricingData, setPricingData] = useState<{
    total_price: string;
    breakdown: any;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract booking data from session
  const bookingData = session?.booking_data || {};

  // Load pricing on component mount
  useEffect(() => {
    const loadPricing = async () => {
      setIsLoadingPricing(true);
      try {
        const pricing = await getPricing();
        setPricingData(pricing);
      } catch (error) {
        console.error('Failed to load pricing:', error);
      } finally {
        setIsLoadingPricing(false);
      }
    };

    loadPricing();
  }, [getPricing]);

  // Parse booking data from session
  const parsedBookingData = useMemo(() => {
    const parsed = {
      dateTime: null as any,
      contact: null as any,
      packages: [] as any[],
      addons: [] as any[],
      questionnaire: null as any,
      payment: null as any,
    };

    // Parse data from each step
    Object.values(bookingData).forEach((stepData) => {
      if (typeof stepData === 'object' && stepData !== null) {
        // Date/time data
        if ('start_date' in stepData) {
          parsed.dateTime = {
            start_date: stepData.start_date,
            start_time: stepData.start_time,
            end_date: stepData.end_date,
            end_time: stepData.end_time,
            guest_count: stepData.guest_count,
            venue_preference: stepData.venue_preference,
            duration: stepData.duration,
            special_requirements: stepData.special_requirements,
          };
        }

        // Contact data
        if ('full_name' in stepData || 'email' in stepData) {
          parsed.contact = {
            full_name: stepData.full_name,
            email: stepData.email,
            phone: stepData.phone,
            address: stepData.address,
            company: stepData.company,
            create_account: stepData.create_account,
            marketing_consent: stepData.marketing_consent,
          };
        }

        // Package data
        if ('selected_packages' in stepData && Array.isArray(stepData.selected_packages)) {
          parsed.packages = stepData.selected_packages;
        }

        // Addon data
        if ('selected_addons' in stepData && Array.isArray(stepData.selected_addons)) {
          parsed.addons = stepData.selected_addons;
        }

        // Questionnaire data
        if ('responses' in stepData) {
          parsed.questionnaire = stepData.responses;
        }

        // Payment data
        if ('gateway_id' in stepData) {
          parsed.payment = {
            gateway_id: stepData.gateway_id,
            payment_type: stepData.payment_type,
            amount: stepData.amount,
            billing_address: stepData.billing_address,
          };
        }
      }
    });

    return parsed;
  }, [bookingData]);

  // Handle form data updates
  const handleUpdate = (field: keyof ReviewBookingStepData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  // Handle save progress
  const handleSave = () => {
    onSave();
  };

  // Handle form submission (complete booking)
  const handleSubmit = async () => {
    // Validate required fields
    if (!data.terms_accepted) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Update session with review data
      await onNext();
      
      // Complete the booking
      const result = await completeBooking();
      
      if (result) {
        // Booking completed successfully - navigation will be handled by parent
        console.log('Booking completed:', result);
      }
    } catch (error) {
      console.error('Failed to complete booking:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 2, 
          textAlign: 'center',
          fontWeight: 600,
          color: 'primary.main'
        }}
      >
        Review Your Booking
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 4, 
          textAlign: 'center',
          color: 'text.secondary',
          maxWidth: 600,
          mx: 'auto'
        }}
      >
        Please review all the details of your booking before confirming. 
        You can go back to make changes if needed.
      </Typography>

      <Stack spacing={3}>
        {/* Event Details */}
        {parsedBookingData.dateTime && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Event Details
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body1">
                    <strong>Date:</strong> {formatDate(parsedBookingData.dateTime.start_date)}
                  </Typography>
                </Box>
                
                {parsedBookingData.dateTime.start_time && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      <strong>Time:</strong> {formatTime(parsedBookingData.dateTime.start_time)}
                      {parsedBookingData.dateTime.end_time && 
                        ` - ${formatTime(parsedBookingData.dateTime.end_time)}`
                      }
                    </Typography>
                  </Box>
                )}
                
                {parsedBookingData.dateTime.guest_count && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      <strong>Guests:</strong> {parsedBookingData.dateTime.guest_count}
                    </Typography>
                  </Box>
                )}
                
                {parsedBookingData.dateTime.venue_preference && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      <strong>Venue:</strong> {parsedBookingData.dateTime.venue_preference}
                    </Typography>
                  </Box>
                )}
                
                {parsedBookingData.dateTime.special_requirements && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    <strong>Special Requirements:</strong> {parsedBookingData.dateTime.special_requirements}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        {parsedBookingData.contact && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Contact Information
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                {parsedBookingData.contact.full_name && (
                  <Typography variant="body1">
                    <strong>Name:</strong> {parsedBookingData.contact.full_name}
                  </Typography>
                )}
                
                {parsedBookingData.contact.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      <strong>Email:</strong> {parsedBookingData.contact.email}
                    </Typography>
                  </Box>
                )}
                
                {parsedBookingData.contact.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      <strong>Phone:</strong> {parsedBookingData.contact.phone}
                    </Typography>
                  </Box>
                )}
                
                {parsedBookingData.contact.company && (
                  <Typography variant="body1">
                    <strong>Company:</strong> {parsedBookingData.contact.company}
                  </Typography>
                )}
                
                {parsedBookingData.contact.create_account && (
                  <Chip 
                    label="Account will be created"
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Packages & Add-ons */}
        {(parsedBookingData.packages.length > 0 || parsedBookingData.addons.length > 0) && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShoppingCartIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Selected Items
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                {parsedBookingData.packages.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Packages:
                    </Typography>
                    {parsedBookingData.packages.map((pkg: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {pkg.name} {pkg.quantity > 1 && `(x${pkg.quantity})`}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(pkg.price)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {parsedBookingData.addons.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Add-ons:
                    </Typography>
                    {parsedBookingData.addons.map((addon: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {addon.name} {addon.quantity > 1 && `(x${addon.quantity})`}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(addon.price)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Pricing Summary */}
        {pricingData && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PaymentIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Pricing Summary
                </Typography>
              </Box>
              
              {isLoadingPricing ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Stack spacing={1}>
                  {pricingData.breakdown.packages.map((pkg: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {pkg.name} {pkg.quantity > 1 && `(x${pkg.quantity})`}
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(pkg.price)}
                      </Typography>
                    </Box>
                  ))}
                  
                  {pricingData.breakdown.addons.map((addon: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {addon.name} {addon.quantity > 1 && `(x${addon.quantity})`}
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(addon.price)}
                      </Typography>
                    </Box>
                  ))}
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      Subtotal:
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(pricingData.breakdown.subtotal)}
                    </Typography>
                  </Box>
                  
                  {pricingData.breakdown.discounts.map((discount: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                      <Typography variant="body2">
                        {discount.name}:
                      </Typography>
                      <Typography variant="body2">
                        -{formatCurrency(discount.amount)}
                      </Typography>
                    </Box>
                  ))}
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Total:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {formatCurrency(pricingData.total_price)}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Information */}
        {parsedBookingData.questionnaire && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Additional Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Questionnaire responses collected during booking process.
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Special Requests */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Special Requests
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Any special requests or additional information you'd like us to know..."
              value={data.special_requests || ''}
              onChange={(e) => handleUpdate('special_requests', e.target.value)}
              variant="outlined"
            />
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Terms and Conditions
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={data.terms_accepted || false}
                  onChange={(e) => handleUpdate('terms_accepted', e.target.checked)}
                  color="primary"
                />
              }
              label="I agree to the terms and conditions and privacy policy"
              sx={{ mb: 2 }}
            />
            
            {validationErrors.terms_accepted && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {validationErrors.terms_accepted[0]}
              </Alert>
            )}
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={data.marketing_consent || false}
                  onChange={(e) => handleUpdate('marketing_consent', e.target.checked)}
                  color="primary"
                />
              }
              label="I would like to receive updates and promotional emails (optional)"
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {sessionError && (
          <Alert severity="error">
            {sessionError.message || 'An error occurred. Please try again.'}
          </Alert>
        )}

        {/* Navigation Buttons */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={onPrevious}
            disabled={!canGoPrevious || isLoading || isSubmitting || isCompleting}
            size="large"
          >
            Back
          </Button>
          
          <Stack direction="row" spacing={2}>
            {showSaveButton && (
              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={isLoading || isSubmitting || isCompleting}
                size="large"
              >
                Save Progress
              </Button>
            )}
            
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!data.terms_accepted || isLoading || isSubmitting || isCompleting}
              size="large"
              sx={{ minWidth: 160 }}
            >
              {isSubmitting || isCompleting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Completing...
                </>
              ) : (
                'Complete Booking'
              )}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ReviewBookingStep;