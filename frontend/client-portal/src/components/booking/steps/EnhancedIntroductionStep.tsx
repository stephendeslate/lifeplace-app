// frontend/client-portal/src/components/booking/steps/EnhancedIntroductionStep.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  Chip,
  useTheme,
  alpha,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Groups as GroupsIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  Event as EventIcon,
  AttachMoney as PriceIcon,
  Verified as VerifiedIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import type { 
  IntroductionStepData, 
  IntroductionStepConfiguration 
} from '../../../types/booking';

interface EnhancedIntroductionStepProps {
  stepData?: IntroductionStepData;
  config: IntroductionStepConfiguration | null;
  onDataChange: (data: IntroductionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  eventTypeName?: string;
}

interface ProcessStep {
  label: string;
  description: string;
  icon: React.ReactNode;
  estimated_time: string;
}

interface VenueFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const EnhancedIntroductionStep: React.FC<EnhancedIntroductionStepProps> = ({
  stepData = { acknowledged: false },
  config,
  onDataChange,
  validationErrors: externalValidationErrors,
  isValidating: externalIsValidating,
  eventTypeName = 'Your Event',
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  const [showProcessPreview, setShowProcessPreview] = useState(false);

  const data = stepData;

  const handleAcknowledgment = useCallback((acknowledged: boolean) => {
    onDataChange({ acknowledged });
    if (acknowledged) {
      announceToScreenReader('Terms and conditions acknowledged. You can now proceed to the next step.');
    }
  }, [onDataChange, announceToScreenReader]);

  const getFieldError = useCallback((fieldName: string) => {
    return externalValidationErrors[fieldName]?.[0];
  }, [externalValidationErrors]);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!(externalValidationErrors[fieldName]?.length > 0);
  }, [externalValidationErrors]);

  const isProcessing = externalIsValidating;
  const isComplete = data.acknowledged === true;

  // Process steps for booking flow preview - simplified generic steps
  const processSteps: ProcessStep[] = [
    {
      label: 'Event Details',
      description: 'Configure your event preferences',
      icon: <EventIcon fontSize="small" />,
      estimated_time: '2-3 minutes',
    },
    {
      label: 'Contact Information',
      description: 'Provide your contact details',
      icon: <GroupsIcon fontSize="small" />,
      estimated_time: '2 minutes',
    },
    {
      label: 'Review & Confirm',
      description: 'Review and confirm your booking',
      icon: <PriceIcon fontSize="small" />,
      estimated_time: '1-2 minutes',
    },
  ];

  // Generic venue features - can be customized via configuration
  const venueFeatures: VenueFeature[] = [
    {
      title: 'Professional Service',
      description: 'Expert event coordination and support',
      icon: <SupportIcon />,
    },
    {
      title: 'Secure Booking',
      description: 'Protected payment processing and confirmation',
      icon: <SecurityIcon />,
    },
  ];

  useEffect(() => {
    // Auto-expand process preview after a delay to engage users
    const timer = setTimeout(() => {
      setShowProcessPreview(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box>
      {/* Welcome Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 3,
            }}
          >
            <CelebrationIcon sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            {config?.title || `Welcome to Your Event Booking!`}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
            {config?.content || 
              `We're excited to help you plan your perfect ${eventTypeName.toLowerCase()}. This booking process will guide you through the necessary steps to complete your reservation.`
            }
          </Typography>
          
          <Chip
            label={`Booking: ${eventTypeName}`}
            color="primary"
            variant="outlined"
            sx={{
              mt: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              fontWeight: 600,
            }}
          />
        </Box>
      </AnimatedElement>

      {/* Venue Features */}
      <AnimatedElement animation="slideUp" delay={300}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 4,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
              Why Choose LifePlace Alfonso?
            </Typography>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3
            }}>
              {venueFeatures.map((feature, index) => (
                <AnimatedElement key={feature.title} animation="slideRight" delay={400 + index * 100}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar
                      sx={{
                        backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                        color: theme.palette.secondary.main,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </AnimatedElement>
              ))}
            </Box>
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Process Preview */}
      <AnimatedElement animation="slideUp" delay={500}>
        <Accordion
          expanded={showProcessPreview}
          onChange={(_, expanded) => setShowProcessPreview(expanded)}
          sx={{
            mb: 4,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
            borderRadius: 3,
            '&:before': { display: 'none' },
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              p: 3,
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
                gap: 2,
              },
            }}
          >
            <ScheduleIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Booking Process Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                See what to expect in the next steps (approximately 10-15 minutes)
              </Typography>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails sx={{ p: 3, pt: 0 }}>
            <Stepper orientation="vertical">
              {processSteps.map((step) => (
                <Step key={step.label} active={true}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          color: theme.palette.primary.main,
                          width: 32,
                          height: 32,
                        }}
                      >
                        {step.icon}
                      </Avatar>
                    )}
                  >
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {step.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                      <Chip
                        label={step.estimated_time}
                        size="small"
                        sx={{
                          mt: 1,
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </AccordionDetails>
        </Accordion>
      </AnimatedElement>

      {/* Event Details Preview */}
      {config?.show_event_details && (
        <AnimatedElement animation="slideUp" delay={600}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              mb: 4,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
            }}
          >
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <VerifiedIcon color="success" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  About Our Venue
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 3 }}>
                LifePlace Alfonso offers a beautiful, serene environment perfect for weddings, 
                corporate events, celebrations, and retreats. Located in the heart of 
                Alfonso, Cavite, our venue combines natural beauty with modern amenities 
                to create unforgettable experiences.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {['Indoor Facilities', 'Outdoor Gardens', 'Catering Services', 'Event Coordination', 'Parking Available'].map((feature) => (
                  <Chip
                    key={feature}
                    label={feature}
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                    }}
                  />
                ))}
              </Box>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}

      {/* Pricing Overview */}
      {config?.show_pricing_overview && (
        <AnimatedElement animation="slideUp" delay={700}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              mb: 4,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            }}
          >
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <PriceIcon color="info" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Transparent Pricing
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 3 }}>
                We offer competitive and transparent pricing with various packages to suit 
                your needs and budget. No hidden fees - all costs will be clearly displayed 
                as you make your selections throughout the booking process.
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                    ✓
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    No Hidden Fees
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                    ✓
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Flexible Packages
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                    ✓
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Payment Plans
                  </Typography>
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}

      {/* Terms and Conditions */}
      <AnimatedElement animation="slideUp" delay={800}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 4,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: hasFieldError('acknowledged') 
              ? `2px solid ${theme.palette.error.main}` 
              : `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Terms & Conditions
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              By proceeding with this booking, you acknowledge that you have read and agree to our 
              terms and conditions, cancellation policy, and privacy policy. We are committed to 
              protecting your information and providing exceptional service.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={data.acknowledged}
                  onChange={(e) => handleAcknowledgment(e.target.checked)}
                  disabled={isProcessing}
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={
                <Typography variant="body1" sx={{ fontWeight: isComplete ? 600 : 400 }}>
                  I acknowledge that I have read and agree to the{' '}
                  <Button
                    variant="text"
                    size="small"
                    sx={{ 
                      textDecoration: 'underline',
                      minWidth: 'auto',
                      p: 0,
                      verticalAlign: 'baseline',
                      fontSize: 'inherit',
                    }}
                    onClick={() => window.open('/terms', '_blank')}
                  >
                    terms and conditions
                  </Button>
                  {', '}
                  <Button
                    variant="text"
                    size="small"
                    sx={{ 
                      textDecoration: 'underline',
                      minWidth: 'auto',
                      p: 0,
                      verticalAlign: 'baseline',
                      fontSize: 'inherit',
                    }}
                    onClick={() => window.open('/privacy', '_blank')}
                  >
                    privacy policy
                  </Button>
                  , and{' '}
                  <Button
                    variant="text"
                    size="small"
                    sx={{ 
                      textDecoration: 'underline',
                      minWidth: 'auto',
                      p: 0,
                      verticalAlign: 'baseline',
                      fontSize: 'inherit',
                    }}
                    onClick={() => window.open('/cancellation', '_blank')}
                  >
                    cancellation policy
                  </Button>
                </Typography>
              }
              sx={{ alignItems: 'flex-start', mb: 2 }}
            />

            {hasFieldError('acknowledged') && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                {getFieldError('acknowledged')}
              </Typography>
            )}

            {isComplete && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mt: 2,
                p: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  Thank you! You can now proceed to the next step.
                </Typography>
              </Box>
            )}
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Contact Information */}
      <AnimatedElement animation="slideUp" delay={900}>
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            backgroundColor: alpha('#fff', 0.05),
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Questions? We're Here to Help!
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Our event specialists are available to assist you with any questions about your booking.
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<PhoneIcon />}
                href="tel:+63212345067"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                Call Us: (02) 123-4567
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                href="mailto:info@lifeplacealfonso.com"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                Email Support
              </Button>
            </Box>
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Processing Indicator */}
      {isProcessing && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress 
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: alpha('#fff', 0.1),
              '& .MuiLinearProgress-bar': {
                backgroundColor: theme.palette.primary.main,
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Processing your acknowledgment...
          </Typography>
        </Box>
      )}
    </Box>
  );
};