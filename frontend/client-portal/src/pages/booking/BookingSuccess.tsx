// frontend/client-portal/src/pages/booking/BookingSuccess.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Container,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
  Share as ShareIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { bookingSessionAPI } from '../../apis/booking-session.api';
import { formatCurrency } from '../../utils/payment-helpers';
import type { BookingSession } from '../../types/booking-session.types';

interface BookingSuccessProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showPrintOption?: boolean;
  showShareOption?: boolean;
  onHomeNavigation?: () => void;
}

export const BookingSuccess: React.FC<BookingSuccessProps> = ({
  maxWidth = 'md',
  showPrintOption = true,
  showShareOption = false,
  onHomeNavigation,
}) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [downloadingConfirmation, setDownloadingConfirmation] = useState(false);

  // Fetch session data to display booking details
  const {
    data: session,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['booking-session-success', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID provided');
      return bookingSessionAPI.getSessionByUUID(sessionId);
    },
    enabled: !!sessionId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract booking details from session data
  const bookingDetails = React.useMemo(() => {
    if (!session?.booking_data) return null;

    let eventName = 'Your Event';
    let startDate = '';
    let endDate = '';
    let guestCount = 0;
    let venuePreference = '';
    let specialRequirements = '';

    // Extract event details from session data
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
        if ('guest_count' in stepData && stepData.guest_count) {
          guestCount = stepData.guest_count as number;
        }
        if ('venue_preference' in stepData && stepData.venue_preference) {
          venuePreference = stepData.venue_preference as string;
        }
        if ('special_requirements' in stepData && stepData.special_requirements) {
          specialRequirements = stepData.special_requirements as string;
        }
      }
    });

    return {
      eventName,
      startDate,
      endDate,
      guestCount,
      venuePreference,
      specialRequirements,
      totalPrice: session.total_price,
      status: session.is_completed ? 'CONFIRMED' : 'PENDING',
      sessionId: session.session_id,
    };
  }, [session]);

  // Extract contact information from session
  const contactInfo = React.useMemo(() => {
    if (!session?.booking_data) return null;

    let email = '';
    let phone = '';
    let fullName = '';
    let address = '';
    let company = '';

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
        if ('address' in stepData && stepData.address) {
          address = stepData.address as string;
        }
        if ('company' in stepData && stepData.company) {
          company = stepData.company as string;
        }
      }
    });

    return { email, phone, fullName, address, company };
  }, [session?.booking_data]);

  // Extract selected items from session
  const selectedItems = React.useMemo(() => {
    if (!session?.booking_data) return { packages: [], addons: [] };

    let packages: any[] = [];
    let addons: any[] = [];

    Object.values(session.booking_data).forEach(stepData => {
      if (typeof stepData === 'object' && stepData !== null) {
        if ('selected_packages' in stepData && Array.isArray(stepData.selected_packages)) {
          packages = stepData.selected_packages;
        }
        if ('selected_addons' in stepData && Array.isArray(stepData.selected_addons)) {
          addons = stepData.selected_addons;
        }
      }
    });

    return { packages, addons };
  }, [session?.booking_data]);

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

  // Format date and time for display
  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
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

  // Handle home navigation
  const handleHomeNavigation = () => {
    if (onHomeNavigation) {
      onHomeNavigation();
    } else {
      navigate('/');
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle share (basic Web Share API or fallback)
  const handleShare = async () => {
    const shareData = {
      title: 'Booking Confirmation',
      text: `My booking confirmation for ${bookingDetails?.eventName}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        // Could show a toast here if ToastContext is available
        console.log('Link copied to clipboard');
      } catch (error) {
        console.log('Failed to copy link');
      }
    }
  };

  // Handle download confirmation
  const handleDownloadConfirmation = async () => {
    setDownloadingConfirmation(true);
    
    try {
      // This would typically generate and download a PDF
      // For now, we'll simulate the action
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you might call an API endpoint
      // that generates a PDF confirmation and returns a download URL
      console.log('Downloading confirmation for session:', sessionId);
    } catch (error) {
      console.error('Failed to download confirmation:', error);
    } finally {
      setDownloadingConfirmation(false);
    }
  };

  // Redirect if no session ID
  useEffect(() => {
    if (!sessionId) {
      navigate('/booking');
    }
  }, [sessionId, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <Container maxWidth={maxWidth}>
        <Box sx={{ 
          minHeight: '50vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Loading your booking confirmation...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error || !session) {
    return (
      <Container maxWidth={maxWidth}>
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Unable to Load Booking Details
            </Typography>
            <Typography variant="body2">
              We couldn't find your booking confirmation. This might be due to an expired session or invalid booking ID.
            </Typography>
          </Alert>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => refetch()}
              startIcon={<CircularProgress size={16} />}
            >
              Try Again
            </Button>
            
            <Button
              variant="contained"
              onClick={handleHomeNavigation}
              startIcon={<HomeIcon />}
            >
              Return to Home
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={maxWidth}>
      <Box sx={{ py: 4 }}>
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
            Booking Confirmed!
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            Thank you for your booking. We've received your request and will be in touch soon with more details.
          </Typography>
        </Box>

        {/* Booking Summary */}
        {bookingDetails && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon color="primary" />
                Booking Summary
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Event:
                  </Typography>
                  <Typography variant="body1">
                    {bookingDetails.eventName}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Booking ID:
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {bookingDetails.sessionId}
                  </Typography>
                </Box>

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

                {bookingDetails.guestCount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Guests:
                    </Typography>
                    <Typography variant="body1">
                      {bookingDetails.guestCount}
                    </Typography>
                  </Box>
                )}

                {bookingDetails.venuePreference && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Venue:
                    </Typography>
                    <Typography variant="body1">
                      {bookingDetails.venuePreference}
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

                {bookingDetails.totalPrice && parseFloat(bookingDetails.totalPrice) > 0 && (
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

                {bookingDetails.specialRequirements && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                        Special Requirements:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {bookingDetails.specialRequirements}
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

                {contactInfo.company && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Company:
                    </Typography>
                    <Typography variant="body2">
                      {contactInfo.company}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Selected Items */}
        {(selectedItems.packages.length > 0 || selectedItems.addons.length > 0) && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Selected Items
              </Typography>

              {selectedItems.packages.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Packages:
                  </Typography>
                  {selectedItems.packages.map((pkg: any, index: number) => (
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

              {selectedItems.addons.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Add-ons:
                  </Typography>
                  {selectedItems.addons.map((addon: any, index: number) => (
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
            </CardContent>
          </Card>
        )}

        {/* Next Steps Information */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              What Happens Next?
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                • You will receive a confirmation email shortly with all the details
              </Typography>
              <Typography variant="body2">
                • Our team will contact you within 24 hours to confirm arrangements
              </Typography>
              <Typography variant="body2">
                • A calendar invite will be sent for your event date
              </Typography>
              <Typography variant="body2">
                • Any changes can be made by contacting our team directly
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleHomeNavigation}
            sx={{ flex: 1 }}
          >
            Return to Home
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={downloadingConfirmation ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleDownloadConfirmation}
            disabled={downloadingConfirmation}
            sx={{ flex: 1 }}
          >
            {downloadingConfirmation ? 'Preparing...' : 'Download Confirmation'}
          </Button>

          {showPrintOption && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ flex: 1 }}
            >
              Print
            </Button>
          )}

          {showShareOption && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              sx={{ flex: 1 }}
            >
              Share
            </Button>
          )}
        </Stack>
      </Box>
    </Container>
  );
};