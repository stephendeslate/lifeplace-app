// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowPreview.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Phone as MobileIcon,
  Computer as DesktopIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  Block as DisabledIcon,
  CheckCircle,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  Quiz as QuestionnaireIcon,
  Inventory as PackageIcon,
  Add as AddonIcon,
  ContactMail as ContactIcon,
  Celebration as ConfirmationIcon,
  Info as IntroIcon,
  Schedule as PricingIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../../../utils/currency';
import type { 
  BookingFlowDetail, 
  BookingFlowStep,
  IntroductionStepConfiguration,
  DateTimeStepConfiguration,
  QuestionnaireStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  ContactInfoStepConfiguration,
  PaymentInfoStepConfiguration,
  ConfirmationStepConfiguration,
} from '../../../types/bookingflows.types';

interface BookingFlowPreviewProps {
  flow: BookingFlowDetail;
  compact?: boolean;
  showMobileView?: boolean;
}

interface StepPreviewProps {
  step: BookingFlowStep;
  isActive: boolean;
  isCompleted: boolean;
  compact?: boolean;
}

const StepPreview: React.FC<StepPreviewProps> = ({ 
  step, 
  isActive, 
  isCompleted, 
  compact = false 
}) => {
  const getStepIcon = () => {
    if (!step.is_enabled) return <DisabledIcon color="disabled" />;
    if (isCompleted) return <CompletedIcon color="success" />;
    
    const iconProps = { color: isActive ? 'primary' : 'action' } as const;
    
    switch (step.step_type) {
      case 'introduction': {
        return <IntroIcon {...iconProps} />;
      }
      case 'date_time': {
        return <CalendarIcon {...iconProps} />;
      }
      case 'questionnaire': {
        return <QuestionnaireIcon {...iconProps} />;
      }
      case 'package_selection': {
        return <PackageIcon {...iconProps} />;
      }
      case 'addon_selection': {
        return <AddonIcon {...iconProps} />;
      }
      case 'pricing_summary': {
        return <PricingIcon {...iconProps} />;
      }
      case 'contact_info': {
        return <ContactIcon {...iconProps} />;
      }
      case 'payment_info': {
        return <PaymentIcon {...iconProps} />;
      }
      case 'confirmation': {
        return <ConfirmationIcon {...iconProps} />;
      }
      default: {
        return isActive ? <StartIcon color="primary" /> : <PendingIcon color="action" />;
      }
    }
  };

  const getStepContent = () => {
    const config = step.configuration_data;

    switch (step.step_type) {
      case 'introduction': {
        const introConfig = config as IntroductionStepConfiguration;
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {introConfig?.title || 'Welcome to Our Booking System'}
            </Typography>
            <Typography color="text.secondary">
              {introConfig?.content || "We're excited to help you plan your perfect event! This booking process will guide you through all the details we need."}
            </Typography>
            {introConfig?.show_event_details && (
              <Box mt={2}>
                <Chip label="Event Details Shown" size="small" color="info" variant="outlined" />
              </Box>
            )}
            {introConfig?.show_pricing_overview && (
              <Box mt={1}>
                <Chip label="Pricing Overview Shown" size="small" color="info" variant="outlined" />
              </Box>
            )}
          </Box>
        );
      }

      case 'date_time': {
        const dateTimeConfig = config as DateTimeStepConfiguration;
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select your event date & time
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Selected Date & Time</Typography>
              <Typography>Saturday, March 15, 2024 at 2:00 PM</Typography>
            </Box>
            
            {/* Show availability features if enabled */}
            {dateTimeConfig?.enable_real_time_availability && (
              <Box mb={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip 
                    label="Real-time Availability" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    icon={<TimeIcon />}
                  />
                  {dateTimeConfig.show_availability_status && (
                    <Chip label="Availability Status" size="small" color="info" variant="outlined" />
                  )}
                  {dateTimeConfig.auto_check_conflicts && (
                    <Chip label="Auto Conflict Check" size="small" color="warning" variant="outlined" />
                  )}
                </Stack>
              </Box>
            )}
            
            {dateTimeConfig?.allow_multi_day && (
              <Typography variant="caption" color="text.secondary">
                Multi-day events supported
              </Typography>
            )}
          </Box>
        );
      }

      case 'questionnaire': {
        const questionnaireConfig = config as QuestionnaireStepConfiguration;
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Additional Information
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Please answer a few questions to help us customize your experience.
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
              {questionnaireConfig?.questionnaire_items?.length ? (
                <Chip 
                  label={`${questionnaireConfig.questionnaire_items.length} Questionnaire${questionnaireConfig.questionnaire_items.length > 1 ? 's' : ''}`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              ) : (
                <Chip label="Custom Questions" size="small" color="primary" variant="outlined" />
              )}
              {questionnaireConfig?.allow_file_uploads && (
                <Chip label="File Uploads Allowed" size="small" color="info" variant="outlined" />
              )}
            </Box>
          </Box>
        );
      }

      case 'package_selection': {
        const packageConfig = config as PackageSelectionStepConfiguration;
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Choose your package
            </Typography>
            {packageConfig?.selection_type === 'MULTIPLE' && (
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Multiple packages can be selected
              </Typography>
            )}
            <Stack spacing={2}>
              {['Basic Package', 'Premium Package', 'Deluxe Package'].map((pkg, index) => (
                <Box 
                  key={pkg}
                  sx={{ 
                    border: 1, 
                    borderColor: index === 1 ? 'primary.main' : 'divider', 
                    borderRadius: 1, 
                    p: 2,
                    backgroundColor: index === 1 ? 'primary.50' : 'transparent'
                  }}
                >
                  <Typography fontWeight="medium">{pkg}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Starting at ${(index + 1) * 500}
                  </Typography>
                  {packageConfig?.show_descriptions && (
                    <Typography variant="caption" color="text.secondary">
                      Includes premium features and services
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
            
            {packageConfig && (
              <Box mt={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {packageConfig.show_pricing && (
                    <Chip label="Pricing Shown" size="small" color="info" variant="outlined" />
                  )}
                  {packageConfig.enable_comparison && (
                    <Chip label="Comparison Tool" size="small" color="info" variant="outlined" />
                  )}
                  {packageConfig.enable_dynamic_pricing && (
                    <Chip label="Dynamic Pricing" size="small" color="warning" variant="outlined" />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );
      }

      case 'addon_selection': {
        const addonConfig = config as AddonSelectionStepConfiguration;
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Add-on Services
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Enhance your event with additional services (optional)
            </Typography>
            <Stack spacing={1}>
              {['Photography', 'Catering Upgrade', 'Decoration'].map((addon) => (
                <Box key={addon} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Typography variant="body2">{addon}</Typography>
                </Box>
              ))}
            </Stack>
            
            {addonConfig && (
              <Box mt={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {addonConfig.group_by_category && (
                    <Chip label="Grouped by Category" size="small" color="info" variant="outlined" />
                  )}
                  {addonConfig.show_recommendations && (
                    <Chip label="Recommendations" size="small" color="success" variant="outlined" />
                  )}
                  {addonConfig.min_selection > 0 && (
                    <Chip 
                      label={`Min: ${addonConfig.min_selection}`} 
                      size="small" 
                      color="warning" 
                      variant="outlined" 
                    />
                  )}
                  {addonConfig.max_selection > 0 && (
                    <Chip 
                      label={`Max: ${addonConfig.max_selection}`} 
                      size="small" 
                      color="error" 
                      variant="outlined" 
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );
      }

      case 'pricing_summary': {
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Pricing Summary
            </Typography>
            <Box sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider'
            }}>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Premium Package</Typography>
                  <Typography variant="body2">{formatCurrency(1000, 'PHP')}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Photography Add-on</Typography>
                  <Typography variant="body2">{formatCurrency(250, 'PHP')}</Typography>
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight="bold">Total</Typography>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    {formatCurrency(1250, 'PHP')}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        );
      }

      case 'contact_info': {
        const contactConfig = config as ContactInfoStepConfiguration;
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Contact Information
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography>John Doe</Typography>
              </Box>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography>john.doe@example.com</Typography>
              </Box>
              {contactConfig?.require_phone && (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography>+1 (555) 123-4567</Typography>
                </Box>
              )}
              {contactConfig?.require_address && (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Address</Typography>
                  <Typography>123 Main St, City, State 12345</Typography>
                </Box>
              )}
            </Stack>
            
            {contactConfig && (
              <Box mt={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {contactConfig.require_full_name && (
                    <Chip label="Full Name Required" size="small" color="error" variant="outlined" />
                  )}
                  {contactConfig.require_email && (
                    <Chip label="Email Required" size="small" color="error" variant="outlined" />
                  )}
                  {contactConfig.offer_account_creation && (
                    <Chip label="Account Creation Offered" size="small" color="info" variant="outlined" />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );
      }

      case 'payment_info': {
        const paymentConfig = config as PaymentInfoStepConfiguration;
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Payment Information
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Secure payment processing
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Amount</Typography>
              <Typography variant="h6" color="primary">{formatCurrency(1250, 'PHP')}</Typography>
            </Box>
            
            {paymentConfig && (
              <Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {paymentConfig.accept_full_payment && (
                    <Chip label="Full Payment" size="small" color="success" variant="outlined" />
                  )}
                  {paymentConfig.accept_deposit && (
                    <Chip
                      label="Deposit Payment"
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  )}
                  {paymentConfig.require_immediate_payment && (
                    <Chip label="Immediate Payment Required" size="small" color="warning" variant="outlined" />
                  )}
                  {paymentConfig.allow_payment_plans && (
                    <Chip label="Payment Plans Available" size="small" color="info" variant="outlined" />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );
      }

      case 'confirmation': {
        const confirmationConfig = config as ConfirmationStepConfiguration;
        return (
          <Box textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {confirmationConfig?.title || 'Booking Confirmed!'}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              {confirmationConfig?.message || 'Thank you for your booking. We\'ll be in touch soon with next steps.'}
            </Typography>
            
            {confirmationConfig && (
              <Box mt={3}>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                  {confirmationConfig.send_confirmation_email && (
                    <Chip label="Confirmation Email Sent" size="small" color="success" variant="outlined" />
                  )}
                  {confirmationConfig.send_calendar_invite && (
                    <Chip label="Calendar Invite Sent" size="small" color="info" variant="outlined" />
                  )}
                  {confirmationConfig.create_event_immediately && (
                    <Chip label="Event Created" size="small" color="primary" variant="outlined" />
                  )}
                  {confirmationConfig.show_next_steps && confirmationConfig.next_steps_content && (
                    <Chip label="Next Steps Shown" size="small" color="info" variant="outlined" />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );
      }

      default: {
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {step.step_type_display}
            </Typography>
            <Typography color="text.secondary">
              {step.description || `This is the ${step.step_type_display.toLowerCase()} step.`}
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="caption">
                Preview not available for step type: {step.step_type}
              </Typography>
            </Alert>
          </Box>
        );
      }
    }
  };

  return (
    <Box 
      sx={{ 
        opacity: step.is_enabled ? 1 : 0.5,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {getStepIcon()}
        <Box display="flex" alignItems="center" gap={1} flex={1}>
          <Typography
            variant={compact ? "body2" : "subtitle1"}
            fontWeight={isActive ? "bold" : "medium"}
            color={!step.is_enabled ? "text.disabled" : isActive ? "primary" : "text.primary"}
          >
            {step.step_type_display}
          </Typography>
        </Box>
        
        <Box display="flex" gap={0.5}>
          {!step.is_enabled && (
            <Chip label="Disabled" size="small" color="default" variant="outlined" />
          )}
          {step.is_required && (
            <Chip label="Required" size="small" color="error" variant="outlined" />
          )}
          {step.is_skippable && (
            <Chip label="Skippable" size="small" color="info" variant="outlined" />
          )}
        </Box>
      </Box>
      
      {isActive && !compact && (
        <Box sx={{
          p: 2,
          mb: 2,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider'
        }}>
          {getStepContent()}
        </Box>
      )}
    </Box>
  );
};

export const BookingFlowPreview: React.FC<BookingFlowPreviewProps> = ({
  flow,
  compact = false,
  showMobileView = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMobileView, setIsMobileView] = useState(showMobileView);

  // Get enabled steps only, sorted by order
  const enabledSteps = flow.steps?.filter(step => step.is_enabled).sort((a, b) => a.order - b.order) || [];
  const currentStep = enabledSteps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < enabledSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
  };

  const progressPercentage = enabledSteps.length > 0 
    ? Math.round(((currentStepIndex + 1) / enabledSteps.length) * 100)
    : 0;

  // Check for deprecated step types
  const hasDeprecatedSteps = flow.steps?.some(step => 
    String(step.step_type) === 'availability_check' || String(step.step_type) === 'event_details'
  ) || false;

  if (!flow.steps || flow.steps.length === 0) {
    return (
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PreviewIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Steps to Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add steps to this booking flow to see the preview
          </Typography>
        </Box>
      </Box>
    );
  }

  if (enabledSteps.length === 0) {
    return (
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Alert severity="warning">
          All steps in this booking flow are disabled. Enable at least one step to preview the client experience.
        </Alert>
        {hasDeprecatedSteps && (
          <Alert severity="error" sx={{ mt: 2 }}>
            This flow contains deprecated step types (availability_check, event_details).
            Please migrate or remove these steps for the flow to function properly.
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 1,
        bgcolor: 'background.paper',
        maxWidth: isMobileView ? 375 : '100%',
        mx: isMobileView ? 'auto' : 0,
        transition: 'max-width 0.3s ease-in-out'
      }}
    >
      {/* Preview Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <PreviewIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {flow.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Preview Mode
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={isMobileView ? "Desktop View" : "Mobile View"}>
              <IconButton
                size="small"
                onClick={() => setIsMobileView(!isMobileView)}
                color={isMobileView ? "primary" : "default"}
              >
                {isMobileView ? <DesktopIcon /> : <MobileIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Restart Preview">
              <IconButton size="small" onClick={handleRestart}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Step {currentStepIndex + 1} of {enabledSteps.length}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {progressPercentage}% Complete
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Flow Info */}
        <Box display="flex" flexWrap="wrap" gap={1}>
          {flow.event_type_name && flow.event_type_name !== 'Any Event Type' ? (
            <Chip
              label={flow.event_type_name}
              size="small"
              color="primary"
              variant="outlined"
              icon={<CalendarIcon />}
            />
          ) : (
            <Chip
              label="Any Event Type"
              size="small"
              variant="outlined"
              color="default"
            />
          )}
          {flow.allow_guest_booking && (
            <Chip
              label="Guest Booking Allowed"
              size="small"
              color="info"
              variant="outlined"
            />
          )}
          <Chip
            label={`${enabledSteps.length} Active Steps`}
            size="small"
            variant="outlined"
          />
          {flow.is_test_mode && (
            <Chip
              label="Test Mode"
              size="small"
              color="warning"
              variant="filled"
            />
          )}
        </Box>

        {/* Deprecated Steps Warning */}
        {hasDeprecatedSteps && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              This flow contains deprecated step types that may not function properly. 
              Please review and update the flow configuration.
            </Typography>
          </Alert>
        )}
      </Box>

      <Box sx={{ p: 3 }}>
        {compact ? (
          /* Compact View - List all steps */
          <Stack spacing={1}>
            {enabledSteps.map((step, index) => (
              <StepPreview
                key={step.id}
                step={step}
                isActive={index === currentStepIndex}
                isCompleted={index < currentStepIndex}
                compact={true}
              />
            ))}
          </Stack>
        ) : (
          /* Full View - Show current step */
          <>
            {currentStep && (
              <StepPreview
                step={currentStep}
                isActive={true}
                isCompleted={false}
                compact={false}
              />
            )}

            {/* Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <Button
                startIcon={<BackIcon />}
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                variant="outlined"
              >
                Previous
              </Button>

              <Typography variant="body2" color="text.secondary" textAlign="center" flex={1}>
                {currentStep?.step_type_display}
              </Typography>

              <Button
                endIcon={<NextIcon />}
                onClick={handleNext}
                disabled={currentStepIndex === enabledSteps.length - 1}
                variant="contained"
              >
                {currentStepIndex === enabledSteps.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </Box>
          </>
        )}

        {/* Preview Notice */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            This is a preview of the client booking experience. Interactive elements are simulated and non-functional.
            {isMobileView && ' Viewing in mobile format.'}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};