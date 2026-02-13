// frontend/client-portal/src/components/booking/BookingContainer.tsx

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  LinearProgress,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  Backdrop,
  CircularProgress,
  alpha,
  Collapse,
} from "@mui/material";
import { GlassCard } from "../../design-system/components/GlassCard";
import { AnimatedElement } from "../../design-system/components/AnimatedElement";
import {
  ArrowBack,
  ArrowForward,
  SkipNext,
  Close,
  Schedule,
  Warning,
  KeyboardArrowDown,
  RequestQuote,
} from "@mui/icons-material";
import { useBooking } from "../../contexts/BookingContext";
import { useSessionTimer } from "../../hooks/booking/useBookingCore";
import { useCurrencySettings } from "../../hooks/useCurrency";
import type { PaymentInfoStepConfiguration } from "../../types/booking/stepConfigurations.types";

interface BookingContainerProps {
  children: React.ReactNode;
}

export const BookingContainer: React.FC<BookingContainerProps> = ({
  children,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();
  const [priceDetailsExpanded, setPriceDetailsExpanded] = useState(false);

  // Use session timer hook for expiry tracking
  const { isExpiringSoon, expired, formatTimeRemaining } = useSessionTimer(
    state.currentSession?.expires_at,
  );

  // Scroll to top when the booking step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.currentSession?.current_step?.id]);

  // Get current step info
  const getCurrentStepInfo = (): { stepName: string; stepIndex: number } => {
    if (!state.currentFlow || !state.currentSession?.current_step) {
      return { stepName: "Loading...", stepIndex: 0 };
    }

    const currentStep = state.currentSession.current_step;
    const stepIndex = state.currentFlow.enabled_steps.findIndex(
      (step) => step.id === currentStep.id,
    );

    return {
      stepName: String(currentStep.step_type_display || "Step"),
      stepIndex: Math.max(0, stepIndex),
    };
  };

  const { stepName, stepIndex } = getCurrentStepInfo();

  // Quick Quote exit ramp visibility
  const QUICK_QUOTE_ELIGIBLE_STEPS = [
    "venue_selection",
    "package_selection",
    "addon_selection",
  ];
  const currentStepType = state.currentSession?.current_step?.step_type as
    | string
    | undefined;
  const paymentStep = state.currentFlow?.enabled_steps?.find(
    (s) => s.step_type === "payment_info",
  );
  const paymentConfig =
    paymentStep?.configuration_data as PaymentInfoStepConfiguration | null;
  const showQuickQuoteExitRamp =
    !!currentStepType &&
    QUICK_QUOTE_ELIGIBLE_STEPS.includes(currentStepType) &&
    !!paymentConfig?.allow_quote_request &&
    !state.quickQuoteMode;

  // Handle exit confirmation
  const handleExit = () => {
    if (
      window.confirm(
        "Are you sure you want to exit? Your progress will be saved but you will need to start over.",
      )
    ) {
      actions.resetBooking();
    }
  };

  // Handle expired session
  const handleExpiredSession = () => {
    alert("Your booking session has expired. Please start a new booking.");
    actions.resetBooking();
  };

  // Show expired session alert
  if (expired) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleExpiredSession}>
              Start New Booking
            </Button>
          }
        >
          Your booking session has expired. Please start a new booking to
          continue.
        </Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: "#fff", zIndex: theme.zIndex.drawer + 1 }}
        open={state.ui.isLoading || state.ui.isSubmitting}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress color="inherit" size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            {state.ui.isSubmitting ? "Processing..." : "Loading..."}
          </Typography>
        </Box>
      </Backdrop>

      {/* Combined Booking Progress Header with Step Navigation */}
      <AnimatedElement animation="slideDown" delay={100}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            backgroundColor: alpha("#fff", 0.1),
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${alpha("#fff", 0.1)}`,
            py: 2,
            position: "sticky",
            top: { xs: 120, md: 140 }, // Account for BookingLayout header height + generous spacing
            zIndex: 100,
            borderRadius: 0,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              {/* Left: Title and Progress */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
                >
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 600, color: "primary.main" }}
                  >
                    Book Your Event
                  </Typography>

                  {state.selectedEventType && (
                    <Chip
                      label={state.selectedEventType.name}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>

                {/* Progress Info */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Step {stepIndex + 1} of {state.progress.totalSteps}:{" "}
                    {stepName}
                  </Typography>

                  {state.currentSession && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Schedule
                        sx={{
                          fontSize: 16,
                          color: isExpiringSoon
                            ? "warning.main"
                            : "text.secondary",
                        }}
                      />
                      <Typography
                        variant="caption"
                        color={
                          isExpiringSoon ? "warning.main" : "text.secondary"
                        }
                        sx={{ fontWeight: isExpiringSoon ? 600 : 400 }}
                      >
                        {formatTimeRemaining()} remaining
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Right: Exit Button */}
              <IconButton onClick={handleExit} sx={{ color: "text.secondary" }}>
                <Close />
              </IconButton>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ mt: 2, mb: !isMobile && state.currentFlow ? 3 : 0 }}>
              <LinearProgress
                variant="determinate"
                value={state.currentSession?.progress_percentage || 0}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 3,
                  },
                }}
              />
            </Box>

            {/* Step Navigation - Desktop Stepper */}
            {!isMobile && state.currentFlow && (
              <Box sx={{ mt: 2 }}>
                <Stepper activeStep={stepIndex} alternativeLabel>
                  {state.currentFlow.enabled_steps.map((step, index) => (
                    <Step
                      key={step.id}
                      completed={state.progress.completedSteps.includes(
                        step.id,
                      )}
                    >
                      <StepLabel
                        sx={{
                          "& .MuiStepLabel-label": {
                            fontSize: "0.875rem",
                            fontWeight: index === stepIndex ? 600 : 400,
                          },
                        }}
                      >
                        {step.step_type_display}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>
            )}

            {/* Mobile Progress Indicator */}
            {isMobile && state.currentFlow && (
              <Box
                sx={{
                  mt: 2,
                  px: 2,
                  py: 1.5,
                  textAlign: "center",
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500, mb: 1 }}
                >
                  Step {stepIndex + 1} of {state.progress.totalSteps}
                </Typography>
                <Typography
                  variant="subtitle2"
                  color="primary.main"
                  sx={{ fontWeight: 600 }}
                >
                  {stepName}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={((stepIndex + 1) / state.progress.totalSteps) * 100}
                  sx={{
                    mt: 1.5,
                    borderRadius: 1,
                    height: 8,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 1,
                      backgroundColor: theme.palette.primary.main,
                    },
                  }}
                />
              </Box>
            )}
          </Container>
        </GlassCard>
      </AnimatedElement>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 4, position: "relative", zIndex: 2 }}>
        {/* Error Display */}
        {state.ui.error && (
          <AnimatedElement animation="slideDown" delay={100}>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={actions.clearErrors}
                >
                  Dismiss
                </Button>
              }
            >
              {state.ui.error}
            </Alert>
          </AnimatedElement>
        )}

        {/* Quick Quote Mode Banner */}
        {state.quickQuoteMode && (
          <AnimatedElement animation="slideDown" delay={100}>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                backgroundColor: alpha(theme.palette.info.main, 0.1),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
              icon={<RequestQuote />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={actions.exitQuickQuoteMode}
                  disabled={state.ui.isSubmitting}
                >
                  Cancel
                </Button>
              }
            >
              Quote Request Mode — Fill in your contact info and we&apos;ll send
              you a personalized quote.
            </Alert>
          </AnimatedElement>
        )}

        {/* Expiring Soon Warning */}
        {isExpiringSoon && !expired && (
          <AnimatedElement animation="slideDown" delay={150}>
            <Alert
              severity="warning"
              sx={{
                mb: 3,
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              }}
              icon={<Warning />}
            >
              Your session will expire in {formatTimeRemaining()}. Please
              complete your booking soon.
            </Alert>
          </AnimatedElement>
        )}

        {/* Main Content Paper */}
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            hover={false}
            sx={{
              p: { xs: 3, md: 4 },
              border: `1px solid ${alpha("#fff", 0.1)}`,
              minHeight: 400,
              backgroundColor: alpha("#fff", 0.08),
              backdropFilter: "blur(20px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
            }}
          >
            {children}
          </GlassCard>
        </AnimatedElement>

        {/* Navigation Buttons */}
        <AnimatedElement animation="slideUp" delay={400}>
          <Box
            sx={{
              mt: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Back Button */}
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={actions.previousStep}
              disabled={!state.progress.canGoBack || state.ui.isSubmitting}
              sx={{ minWidth: 120 }}
            >
              Back
            </Button>

            {/* Center: Skip Button */}
            <Box sx={{ flex: 1, textAlign: "center" }}>
              {state.progress.canSkip && (
                <Button
                  variant="text"
                  startIcon={<SkipNext />}
                  onClick={actions.skipStep}
                  disabled={state.ui.isSubmitting}
                  sx={{
                    color: "text.secondary",
                    backgroundColor: alpha("#fff", 0.05),
                    backdropFilter: "blur(5px)",
                    "&:hover": {
                      backgroundColor: alpha("#fff", 0.1),
                    },
                  }}
                >
                  Skip This Step
                </Button>
              )}
            </Box>

            {/* Next Button - Hidden on confirmation step */}
            {state.currentSession?.current_step?.step_type !==
              "confirmation" && (
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={actions.nextStep}
                disabled={
                  !state.progress.canGoNext ||
                  state.ui.isSubmitting ||
                  state.ui.isValidating
                }
                sx={{
                  minWidth: 120,
                  backgroundColor: alpha(theme.palette.primary.main, 0.9),
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 1),
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 35px rgba(0,0,0,0.2)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                {state.quickQuoteMode && currentStepType === "payment_info"
                  ? "Submit Quote Request"
                  : stepIndex === state.progress.totalSteps - 1
                    ? "Complete"
                    : "Next"}
              </Button>
            )}
          </Box>

          {/* Quick Quote Exit Ramp */}
          {showQuickQuoteExitRamp && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                variant="text"
                size="small"
                startIcon={<RequestQuote sx={{ fontSize: 16 }} />}
                onClick={actions.requestQuote}
                disabled={state.ui.isSubmitting}
                sx={{
                  color: "text.secondary",
                  textTransform: "none",
                  fontWeight: 400,
                  fontSize: "0.85rem",
                  "&:hover": {
                    color: "primary.main",
                    backgroundColor: "transparent",
                  },
                }}
              >
                Not ready to decide? Request a personalized quote instead
              </Button>
            </Box>
          )}
        </AnimatedElement>

        {/* Pricing Summary (if available) */}
        {state.totalPrice !== "0.00" && (
          <GlassCard
            variant="light"
            intensity="subtle"
            onClick={() => setPriceDetailsExpanded(!priceDetailsExpanded)}
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: alpha(theme.palette.success.main, 0.12),
              },
              "&:active": {
                transform: "scale(0.99)",
              },
            }}
          >
            {/* Subtotal row - always show if we have breakdown data */}
            {state.pricingBreakdown.formattedSubtotal && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Subtotal:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {state.pricingBreakdown.formattedSubtotal}
                </Typography>
              </Box>
            )}

            {/* Collapsible Tax and Discount details */}
            <Collapse in={priceDetailsExpanded} timeout="auto">
              {/* Tax row - only show if we have tax data */}
              {state.pricingBreakdown.formattedTax &&
                parseFloat(state.pricingBreakdown.tax) > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Tax:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {state.pricingBreakdown.formattedTax}
                    </Typography>
                  </Box>
                )}

              {/* Discount row - only show if discount exists */}
              {state.pricingBreakdown.formattedDiscount &&
                parseFloat(state.pricingBreakdown.discount) > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "success.main" }}>
                      Discount:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "success.main" }}>
                      -{state.pricingBreakdown.formattedDiscount}
                    </Typography>
                  </Box>
                )}
            </Collapse>

            {/* Divider if we have breakdown details */}
            {state.pricingBreakdown.formattedSubtotal && (
              <Box
                sx={{
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  my: 1,
                }}
              />
            )}

            {/* Total row with expand indicator */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontWeight: state.pricingBreakdown.formattedSubtotal
                      ? 500
                      : 400,
                  }}
                >
                  {state.pricingBreakdown.formattedSubtotal
                    ? "Total:"
                    : "Current Total:"}
                </Typography>
                {/* Show expand hint if there's tax or discount to reveal */}
                {((state.pricingBreakdown.formattedTax &&
                  parseFloat(state.pricingBreakdown.tax) > 0) ||
                  (state.pricingBreakdown.formattedDiscount &&
                    parseFloat(state.pricingBreakdown.discount) > 0)) && (
                  <KeyboardArrowDown
                    sx={{
                      fontSize: 18,
                      color: "text.secondary",
                      transform: priceDetailsExpanded
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s ease",
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "primary.main" }}
              >
                {formatAmount(state.totalPrice || "0")}
              </Typography>
            </Box>
          </GlassCard>
        )}
      </Container>
    </Box>
  );
};
