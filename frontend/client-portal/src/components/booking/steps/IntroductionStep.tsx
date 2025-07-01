// frontend/client-portal/src/components/booking/steps/IntroductionStep.tsx

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Event as EventIcon,
  Schedule,
  People,
  AttachMoney,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  IntroductionStepConfig,
} from '../../../types/bookingflow.types';

interface IntroductionStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const IntroductionStep: React.FC<IntroductionStepProps> = ({
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
  
  // Get step configuration
  const config = step.configuration_data as IntroductionStepConfig | undefined;
  
  // Default content if no configuration is provided
  const title = config?.title || `Welcome to ${session.booking_flow_details.name}`;
  const content = config?.content || 'Thank you for choosing us for your special event. Let\'s get started with your booking process.';
  const showEventDetails = config?.show_event_details ?? true;
  const showPricingOverview = config?.show_pricing_overview ?? false;

  // This step typically doesn't collect data, but we'll track that user has seen intro
  React.useEffect(() => {
    if (!data.introduction_viewed) {
      onChange({
        ...data,
        introduction_viewed: true,
        viewed_at: new Date().toISOString(),
      });
    }
  }, [data, onChange]);

  // Validation is always successful for introduction step
  React.useEffect(() => {
    if (onValidate) {
      onValidate(data);
    }
  }, [data, onValidate]);

  const bookingFlow = session.booking_flow_details;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Stack spacing={4}>
        {/* Hero Section */}
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            px: 3,
            borderRadius: 3,
            background: config?.custom_css 
              ? undefined 
              : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
          className={config?.custom_css ? 'introduction-step-custom-css' : undefined}
        >
        {config?.custom_css && (
          <style>
            {`.introduction-step-custom-css { ${config.custom_css} }`}
          </style>
        )}
          {/* Background Image */}
          {config?.background_image && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${config.background_image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.1,
                zIndex: 0,
              }}
            />
          )}
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
                borderRadius: '50%',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                mb: 3,
              }}
            >
              <EventIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            </Box>
            
            <Typography
              variant="h3"
              sx={{
                fontWeight: 600,
                mb: 2,
                color: 'primary.main',
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              {title}
            </Typography>
            
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {content}
            </Typography>

            {/* Event Type Badge */}
            <Box sx={{ mt: 3 }}>
              <Chip
                label={bookingFlow.event_type_name || 'Any Event Type'}
                color="primary"
                size="medium"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Event Details Overview */}
        {showEventDetails && (
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'primary.main' }}>
                About This Booking Process
              </Typography>
              
              <Stack spacing={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Schedule sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {bookingFlow.total_steps} Easy Steps
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Simple process designed to capture all your event details
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <People sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Personalized Experience
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tailored specifically for {bookingFlow.event_type_name || 'your event type'}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Save Progress Anytime
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your progress is automatically saved as you go
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Pricing Overview */}
        {showPricingOverview && (
          <Card 
            elevation={2}
            sx={{ 
              border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
              backgroundColor: alpha(theme.palette.info.main, 0.02),
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
                <AttachMoney sx={{ color: 'info.main', fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                  Transparent Pricing
                </Typography>
              </Box>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                We believe in honest, upfront pricing. As you progress through the booking process, 
                you'll see real-time pricing updates based on your selections. No hidden fees, 
                no surprises.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    ✓ Real-time pricing updates
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    ✓ No hidden fees
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    ✓ Flexible payment options
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Getting Started */}
        <Card 
          elevation={1}
          sx={{ 
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="flex-start" gap={2}>
              <Info sx={{ color: 'primary.main', fontSize: 24, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                  Ready to Get Started?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Click "Next" below to begin the booking process. You can save your progress 
                  at any time and return later to complete your booking. If you have any 
                  questions during the process, don't hesitate to contact our team.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        <Box
          sx={{
            textAlign: 'center',
            py: 2,
            px: 3,
            backgroundColor: alpha(theme.palette.grey[500], 0.05),
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Step 1 of {bookingFlow.total_steps} • {step.name}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default IntroductionStep;