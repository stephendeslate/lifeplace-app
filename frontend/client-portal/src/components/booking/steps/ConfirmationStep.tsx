// frontend/client-portal/src/components/booking/steps/ConfirmationStep.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Divider,
  Chip,
  Alert,
  IconButton,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  CalendarToday,
  Email,
  Phone,
  LocationOn,
  People,
  Receipt,
  Share,
  ExpandMore,
  ExpandLess,
  Home,
  Dashboard,
  Print,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastActions } from '../../../contexts/ToastContext';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  ConfirmationStepConfig,
} from '../../../types/bookingflow.types';

interface ConfirmationStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  step,
  session,
  data,
  onChange,
  onValidate,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  // @ts-ignore
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showInfo } = useToastActions();

  const [showDetails, setShowDetails] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(true);

  // Extract configuration from step
  const config = step.configuration_data as ConfirmationStepConfig | undefined;

  // Extract booking details from session data
  const bookingData = session.booking_data || {};
  const {
    event_name,
    start_date,
    start_time,
    end_date,
    end_time,
    guest_count,
    venue_preference,
    full_name,
    email,
    phone,
    company,
    selected_packages = [],
    selected_addons = [],
    applied_discount,
  } = bookingData;

  // Calculate pricing from session
  const totalPrice = parseFloat(session.total_price || '0');
  const discountAmount = applied_discount?.amount ? parseFloat(applied_discount.amount) : 0;
  const subtotal = totalPrice + discountAmount;

  // Validation - this step is always valid as it's read-only
  useEffect(() => {
    if (onValidate) {
      const result: StepValidationResult = {
        isValid: true,
        errors: {},
      };
      
      const validationResult = onValidate(data);
      if (validationResult.isValid !== result.isValid) {
        onChange(data); // Trigger validation update
      }
    }
  }, [data, onValidate, onChange]);

  // Handle navigation actions
  const handleGoToDashboard = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
    showInfo('Booking Complete', 'Your booking has been successfully submitted!');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handlePrintConfirmation = () => {
    window.print();
  };

  const handleShareBooking = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My LifePlace Booking',
        text: `I've booked ${event_name || 'an event'} at LifePlace Alfonso!`,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showSuccess('Link Copied', 'Booking link copied to clipboard!');
    }
  };

  // Format date display
  const formatDate = (date: string, time?: string) => {
    if (!date) return 'Not specified';
    
    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    let formatted = dateObj.toLocaleDateString('en-US', options);
    
    if (time) {
      const timeObj = new Date(`2000-01-01T${time}`);
      const timeFormatted = timeObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      formatted += ` at ${timeFormatted}`;
    }
    
    return formatted;
  };

  // Format duration
  const formatDuration = () => {
    if (!start_date || !end_date) return null;
    
    const start = new Date(`${start_date}T${start_time || '00:00'}`);
    const end = new Date(`${end_date}T${end_time || '23:59'}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours} hour${hours !== 1 ? 's' : ''}` : ''}`;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Success Header */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 4,
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
        }}
      >
        <CheckCircle
          sx={{
            fontSize: 80,
            color: 'success.main',
            mb: 2,
          }}
        />
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'success.main',
            fontSize: { xs: '2rem', md: '3rem' },
          }}
        >
          {config?.title || 'Booking Confirmed!'}
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}
        >
          {config?.message || 
            'Your event booking has been successfully submitted. We\'ll be in touch soon to confirm all the details.'}
        </Typography>
        
        {session.session_id && (
          <Chip
            label={`Booking Reference: ${session.session_id.slice(-8).toUpperCase()}`}
            color="primary"
            variant="outlined"
            sx={{ mt: 2, fontFamily: 'monospace', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Booking Summary */}
      {config?.show_booking_summary !== false && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt color="primary" />
                Booking Summary
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </Box>

            {/* Basic Info */}
            <Stack spacing={2}>
              {event_name && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Event Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {event_name}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {start_date && (
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <CalendarToday sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                      Event Date
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(start_date, start_time)}
                    </Typography>
                    {end_date && end_date !== start_date && (
                      <Typography variant="body2" color="text.secondary">
                        Ends: {formatDate(end_date, end_time)}
                      </Typography>
                    )}
                    {formatDuration() && (
                      <Typography variant="body2" color="text.secondary">
                        Duration: {formatDuration()}
                      </Typography>
                    )}
                  </Box>
                )}

                {guest_count && (
                  <Box sx={{ flex: 1, minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <People sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                      Guest Count
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {guest_count} {guest_count === 1 ? 'guest' : 'guests'}
                    </Typography>
                  </Box>
                )}

                {venue_preference && (
                  <Box sx={{ flex: 1, minWidth: 150 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                      Venue Preference
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {venue_preference}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Contact Information */}
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Contact Information
                </Typography>
                <Stack spacing={1}>
                  {full_name && (
                    <Typography variant="body1">
                      <strong>Name:</strong> {full_name}
                    </Typography>
                  )}
                  {email && (
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email sx={{ fontSize: 16 }} />
                      {email}
                    </Typography>
                  )}
                  {phone && (
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone sx={{ fontSize: 16 }} />
                      {phone}
                    </Typography>
                  )}
                  {company && (
                    <Typography variant="body1">
                      <strong>Company:</strong> {company}
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Detailed Information */}
              <Collapse in={showDetails}>
                <Box sx={{ pt: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* Selected Packages */}
                  {selected_packages.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Selected Packages
                      </Typography>
                      <Stack spacing={1}>
                        {selected_packages.map((pkg: any, index: number) => (
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
                                {pkg.name || `Package ${index + 1}`}
                              </Typography>
                              {pkg.quantity > 1 && (
                                <Typography variant="body2" color="text.secondary">
                                  Quantity: {pkg.quantity}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              ${parseFloat(pkg.price || '0').toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Selected Add-ons */}
                  {selected_addons.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Selected Add-ons
                      </Typography>
                      <Stack spacing={1}>
                        {selected_addons.map((addon: any, index: number) => (
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
                                {addon.name || `Add-on ${index + 1}`}
                              </Typography>
                              {addon.quantity > 1 && (
                                <Typography variant="body2" color="text.secondary">
                                  Quantity: {addon.quantity}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              ${parseFloat(addon.price || '0').toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Pricing Breakdown */}
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.info.main, 0.05),
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Pricing Summary
                    </Typography>
                    <Stack spacing={1}>
                      {discountAmount > 0 && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Subtotal</Typography>
                            <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="success.main">
                              Discount ({applied_discount?.code})
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              -${discountAmount.toFixed(2)}
                            </Typography>
                          </Box>
                        </>
                      )}
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Total Amount
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          ${totalPrice.toFixed(2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              </Collapse>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {config?.show_next_steps !== false && (
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                What Happens Next?
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowNextSteps(!showNextSteps)}
              >
                {showNextSteps ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={showNextSteps}>
              <Box>
                {config?.next_steps_content ? (
                  <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {config.next_steps_content}
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    <Alert severity="info" variant="outlined">
                      <Typography variant="body2">
                        <strong>Confirmation Email:</strong> You'll receive a detailed confirmation email shortly with all your booking information.
                      </Typography>
                    </Alert>
                    
                    <Alert severity="success" variant="outlined">
                      <Typography variant="body2">
                        <strong>Team Contact:</strong> Our events team will contact you within 1-2 business days to discuss final details and arrangements.
                      </Typography>
                    </Alert>
                    
                    <Alert severity="warning" variant="outlined">
                      <Typography variant="body2">
                        <strong>Payment:</strong> Final payment details and schedules will be confirmed during our follow-up call.
                      </Typography>
                    </Alert>
                  </Stack>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Primary Actions */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'center' }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<Dashboard />}
            onClick={handleGoToDashboard}
            sx={{ minWidth: 200 }}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go to Home'}
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<Print />}
            onClick={handlePrintConfirmation}
            sx={{ minWidth: 200 }}
          >
            Print Confirmation
          </Button>
        </Stack>

        {/* Secondary Actions */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'center' }}
        >
          <Button
            variant="text"
            startIcon={<Share />}
            onClick={handleShareBooking}
            size="small"
          >
            Share Booking
          </Button>
          
          <Button
            variant="text"
            startIcon={<Home />}
            onClick={handleGoHome}
            size="small"
          >
            Back to Home
          </Button>
        </Stack>
      </Box>

      {/* Contact Information */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          textAlign: 'center',
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
          Questions About Your Booking?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Our team is here to help with any questions or special requests.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            📞 (02) 123-4567
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ✉️ events@lifeplacealfonso.com
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default ConfirmationStep;