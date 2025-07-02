// frontend/client-portal/src/components/booking/steps/ConfirmationStep.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import { formatCurrency } from '../../../utils/payment-helpers';
import type { 
  ConfirmationStepConfiguration 
} from '../../../types/booking.types';
import type { 
  ConfirmationStepData,
  CompleteBookingResponse 
} from '../../../types/booking-session.types';
import type { BaseStepProps } from '../../../types/booking-steps.types';

interface ConfirmationStepProps extends BaseStepProps<ConfirmationStepData> {
  completedBooking?: CompleteBookingResponse | null;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  step,
  data,
  onUpdate,
  completedBooking,
  isLoading = false,
}) => {
  const { session } = useBookingSessionContext();
  const [isAcknowledged, setIsAcknowledged] = useState(data.acknowledged || false);
  const [feedback, setFeedback] = useState(data.feedback || '');

  // Get step configuration
  const config = step.configuration_data as ConfirmationStepConfiguration;

  // Update parent data when local state changes
  useEffect(() => {
    onUpdate({
      acknowledged: isAcknowledged,
      feedback: feedback,
    });
  }, [isAcknowledged, feedback, onUpdate]);

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
  };

  const handleFeedbackChange = (newFeedback: string) => {
    setFeedback(newFeedback);
  };

  // Extract booking details from session or completed booking
  const bookingDetails = React.useMemo(() => {
    if (completedBooking?.event) {
      return {
        eventName: completedBooking.event.name,
        eventId: completedBooking.event.id,
        startDate: completedBooking.event.start_date,
        endDate: completedBooking.event.end_date,
        status: completedBooking.event.status,
        totalPrice: completedBooking.event.total_price,
      };
    }

    if (session?.booking_data) {
      // Extract details from session data
      let eventName = 'Your Event';
      let startDate = '';
      let endDate = '';
      let totalPrice = session.total_price;

      // Look through session data for event details
      Object.values(session.booking_data).forEach(stepData => {
        if (typeof stepData === 'object' && stepData !== null) {
          if ('event_name' in stepData && stepData.event_name) {
            eventName = stepData.event_name as string;
          }
          if ('start_date' in stepData && stepData.start_date) {
            startDate = stepData.start_date as string;
          }
          if ('end_date' in stepData && stepData.end_date) {
            endDate = stepData.end_date as string;
          }
        }
      });

      return {
        eventName,
        startDate,
        endDate,
        totalPrice,
        status: session.is_completed ? 'CONFIRMED' : 'PENDING',
      };
    }

    return null;
  }, [completedBooking, session]);

  // Extract contact information from session
  const contactInfo = React.useMemo(() => {
    if (!session?.booking_data) return null;

    let email = '';
    let phone = '';
    let fullName = '';

    Object.values(session.booking_data).forEach(stepData => {
      if (typeof stepData === 'object' && stepData !== null) {
        if ('email' in stepData && stepData.email) {
          email = stepData.email as string;
        }
        if ('phone' in stepData && stepData.phone) {
          phone = stepData.phone as string;
        }
        if ('full_name' in stepData && stepData.full_name) {
          fullName = stepData.full_name as string;
        }
      }
    });

    return { email, phone, fullName };
  }, [session?.booking_data]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Format date and time for display
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Processing your booking...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Success Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <CheckCircleIcon 
          sx={{ 
            fontSize: 80, 
            color: 'success.main',
            mb: 2 
          }} 
        />
        
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 600,
            color: 'success.main',
            mb: 2
          }}
        >
          {config?.title || 'Booking Confirmed!'}
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          {config?.message || 'Thank you for your booking. We\'ll be in touch soon with more details about your event.'}
        </Typography>
      </Box>

      {/* Booking Summary */}
      {config?.show_booking_summary && bookingDetails && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon color="primary" />
              Booking Summary
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Event Name:
                </Typography>
                <Typography variant="body1">
                  {bookingDetails.eventName}
                </Typography>
              </Box>

              {bookingDetails.eventId && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Booking ID:
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    #{bookingDetails.eventId}
                  </Typography>
                </Box>
              )}

              {bookingDetails.startDate && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Event Date:
                  </Typography>
                  <Typography variant="body1">
                    {bookingDetails.endDate ? 
                      `${formatDate(bookingDetails.startDate)} - ${formatDate(bookingDetails.endDate)}` :
                      formatDateTime(bookingDetails.startDate)
                    }
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Status:
                </Typography>
                <Chip 
                  label={bookingDetails.status}
                  color={bookingDetails.status === 'CONFIRMED' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>

              {bookingDetails.totalPrice && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Total:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {formatCurrency(bookingDetails.totalPrice)}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.fullName) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Contact Information
            </Typography>

            <Stack spacing={2}>
              {contactInfo.fullName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PersonIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="body1">
                    {contactInfo.fullName}
                  </Typography>
                </Box>
              )}

              {contactInfo.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmailIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="body1">
                    {contactInfo.email}
                  </Typography>
                </Box>
              )}

              {contactInfo.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PhoneIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="body1">
                    {contactInfo.phone}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {config?.show_next_steps && config.next_steps_content && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="primary" />
              What Happens Next
            </Typography>

            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {config.next_steps_content}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Email Notice */}
      {config?.send_confirmation_email && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            A confirmation email has been sent to {contactInfo?.email || 'your email address'} with all the details of your booking.
          </Typography>
        </Alert>
      )}

      {/* Calendar Invite Notice */}
      {config?.send_calendar_invite && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            A calendar invite will be sent to help you keep track of your event date.
          </Typography>
        </Alert>
      )}

      {/* Action Buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          onClick={() => window.location.href = '/'}
          sx={{ flex: 1 }}
        >
          Return to Home
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<DownloadIcon />}
          onClick={() => {
            // This would typically generate and download a booking confirmation PDF
            // For now, we'll just acknowledge the action
            handleAcknowledge();
          }}
          sx={{ flex: 1 }}
        >
          Download Confirmation
        </Button>
      </Stack>

      {/* Feedback Section (if enabled) */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            How was your booking experience?
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Your feedback helps us improve our booking process for future clients.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            {['Excellent', 'Good', 'Fair', 'Needs Improvement'].map((rating) => (
              <Button
                key={rating}
                variant={feedback === rating ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleFeedbackChange(rating)}
              >
                {rating}
              </Button>
            ))}
          </Stack>

          {feedback && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Thank you for your feedback! We appreciate you taking the time to help us improve.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConfirmationStep;