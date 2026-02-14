// frontend/client-portal/src/pages/booking/BookingFlow.tsx

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Button,
  useTheme,
  alpha,
  Avatar,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Celebration as CelebrationIcon,
  Event as EventIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Support as SupportIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import { BookingProvider, useBooking } from "../../contexts/BookingContext";
import { BookingContainer } from "../../components/booking/BookingContainer";
import { StepRenderer } from "../../components/booking/StepRenderer";
import { CleanEventTypeSelection } from "../../components/booking/CleanEventTypeSelection";
import { SessionRecoveryDialog } from "../../components/booking/SessionRecoveryDialog";
import { GlassCard } from "../../design-system/components/GlassCard";
import { AnimatedElement } from "../../design-system/components/AnimatedElement";
import type { EventType } from "../../types/booking";

// Event Type Selection Component using the proper hook
const EventTypeSelectionContainer: React.FC = () => {
  const { actions } = useBooking();
  // EventTypeSelection now manages its own data loading

  const handleSelectEventType = async (eventType: EventType) => {
    try {
      await actions.selectEventType(eventType);
    } catch (error) {
      // Error is handled by the booking context
      if (import.meta.env.DEV)
        console.error("Failed to select event type:", error);
    }
  };

  return <CleanEventTypeSelection onSelectEventType={handleSelectEventType} />;
};

// Main booking flow component
const BookingFlowContent: React.FC = () => {
  const { state, actions } = useBooking();
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  // Show recovery dialog when recoverable session found and no current flow
  useEffect(() => {
    if (
      state.recoverableSession &&
      !state.currentFlow &&
      !state.currentSession
    ) {
      setShowRecoveryDialog(true);
    }
  }, [state.recoverableSession, state.currentFlow, state.currentSession]);

  const handleRestoreSession = () => {
    if (state.recoverableSession) {
      // Navigate to booking with session_id to restore the session
      window.location.href = `/booking?session_id=${state.recoverableSession.sessionId}`;
    }
  };

  const handleDiscardSession = () => {
    if (state.recoverableSession) {
      // Clear the session from localStorage and state
      actions.clearRecoverableSession(state.recoverableSession.sessionId);
    }
    setShowRecoveryDialog(false);
  };

  const handleCloseDialog = () => {
    setShowRecoveryDialog(false);
  };

  // Show loading state
  if (state.ui.isLoading && !state.currentFlow) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading booking flow...
        </Typography>
      </Container>
    );
  }

  // Show event type selection if no flow is selected
  if (!state.currentFlow) {
    return (
      <>
        <SessionRecoveryDialog
          open={showRecoveryDialog}
          recoveryInfo={{
            canRecover: Boolean(state.recoverableSession),
            lastUpdated: state.recoverableSession?.lastUpdated,
            currentStep: state.recoverableSession?.stepName,
            progressPercentage:
              state.recoverableSession?.progressPercentage ?? 0,
          }}
          onRestore={handleRestoreSession}
          onDiscard={handleDiscardSession}
          onClose={handleCloseDialog}
        />
        <EventTypeSelectionContainer />
      </>
    );
  }

  // Show the booking flow
  return (
    <BookingContainer>
      <StepRenderer />
    </BookingContainer>
  );
};

// Main booking page designed to work within PublicLayout
export const BookingPage: React.FC = () => {
  return (
    <>
      <BookingProvider>
        {/* No background styling here - handled by PublicLayout */}
        <BookingFlowContent />
      </BookingProvider>
    </>
  );
};

// Booking completion page with modern glass morphism design
export const BookingComplete: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const theme = useTheme();

  // Extract booking reference from session ID if available
  const bookingReference = sessionId ? sessionId.slice(-8).toUpperCase() : null;

  return (
    <Container maxWidth="md" sx={{ py: 8, position: "relative" }}>
      {/* Success Hero Section */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              backgroundColor: alpha(theme.palette.success.main, 0.15),
              color: theme.palette.success.main,
              mx: "auto",
              mb: 3,
              border: `3px solid ${alpha(theme.palette.success.main, 0.3)}`,
              boxShadow: `0 0 40px ${alpha(theme.palette.success.main, 0.3)}`,
            }}
          >
            <CelebrationIcon sx={{ fontSize: 50 }} />
          </Avatar>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Booking Confirmed!
          </Typography>

          <Typography
            variant="h6"
            sx={{
              mb: 3,
              color: "text.secondary",
              maxWidth: 600,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            Thank you for choosing LifePlace Alfonso. Your event has been
            successfully booked and we're excited to help make your special day
            unforgettable.
          </Typography>

          {bookingReference && (
            <AnimatedElement animation="fadeIn" delay={200}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  display: "inline-block",
                  px: 4,
                  py: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  backdropFilter: "blur(20px)",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ display: "block", mb: 1, color: "text.secondary" }}
                >
                  Booking Reference
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.success.main,
                    fontFamily: "monospace",
                    letterSpacing: 2,
                  }}
                >
                  {bookingReference}
                </Typography>
              </GlassCard>
            </AnimatedElement>
          )}
        </Box>
      </AnimatedElement>

      {/* What's Next Section */}
      <AnimatedElement animation="slideUp" delay={300}>
        <GlassCard
          variant="light"
          intensity="strong"
          sx={{
            mb: 4,
            backgroundColor: alpha("#fff", 0.08),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha("#fff", 0.1)}`,
          }}
        >
          <Box sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 4,
                textAlign: "center",
                color: "primary.main",
              }}
            >
              What Happens Next?
            </Typography>

            <Stack spacing={3}>
              {/* Step 1: Confirmation Email */}
              <AnimatedElement animation="slideRight" delay={400}>
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                  <Avatar
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                    }}
                  >
                    <EmailIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      1. Confirmation Email
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      You'll receive a detailed confirmation email within the
                      next few minutes with all your booking details, payment
                      information, and important dates.
                    </Typography>
                    <Chip
                      label="Within 5 minutes"
                      size="small"
                      sx={{
                        mt: 1,
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        color: theme.palette.info.main,
                      }}
                    />
                  </Box>
                </Box>
              </AnimatedElement>

              {/* Step 2: Personal Contact */}
              <AnimatedElement animation="slideRight" delay={500}>
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                  <Avatar
                    sx={{
                      backgroundColor: alpha(
                        theme.palette.secondary.main,
                        0.15,
                      ),
                      color: theme.palette.secondary.main,
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                    }}
                  >
                    <PhoneIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      2. Personal Contact
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      Our dedicated event coordinator will contact you within 24
                      hours to discuss your requirements, answer questions, and
                      begin personalizing your event experience.
                    </Typography>
                    <Chip
                      label="Within 24 hours"
                      size="small"
                      sx={{
                        mt: 1,
                        backgroundColor: alpha(theme.palette.warning.main, 0.1),
                        color: theme.palette.warning.main,
                      }}
                    />
                  </Box>
                </Box>
              </AnimatedElement>

              {/* Step 3: Event Preparation */}
              <AnimatedElement animation="slideRight" delay={600}>
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                  <Avatar
                    sx={{
                      backgroundColor: alpha(theme.palette.success.main, 0.15),
                      color: theme.palette.success.main,
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                    }}
                  >
                    <EventIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      3. Event Preparation
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      We'll work closely with you throughout the planning
                      process.
                    </Typography>
                    <Chip
                      label="Ongoing support"
                      size="small"
                      sx={{
                        mt: 1,
                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                      }}
                    />
                  </Box>
                </Box>
              </AnimatedElement>
            </Stack>
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Important Information */}
      <AnimatedElement animation="slideUp" delay={700}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 4,
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            backdropFilter: "blur(15px)",
          }}
        >
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <CheckIcon sx={{ color: theme.palette.info.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Important Information
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <CalendarIcon
                  sx={{ fontSize: 20, color: "text.secondary", mt: 0.5 }}
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Event Date Confirmation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your selected date has been reserved. Any changes must be
                    made at least 14 days in advance.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <PaymentIcon
                  sx={{ fontSize: 20, color: "text.secondary", mt: 0.5 }}
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Payment Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Payment details and schedules will be outlined in your
                    confirmation email. Flexible payment plans are available
                    upon request.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <LocationIcon
                  sx={{ fontSize: 20, color: "text.secondary", mt: 0.5 }}
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Venue Access
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Venue access details, parking information, and setup times
                    will be coordinated with your event specialist.
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Contact Support */}
      <AnimatedElement animation="slideUp" delay={800}>
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            mb: 4,
            backgroundColor: alpha("#fff", 0.05),
            border: `1px solid ${alpha("#fff", 0.1)}`,
            backdropFilter: "blur(10px)",
          }}
        >
          <Box sx={{ p: 4, textAlign: "center" }}>
            <SupportIcon sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Need Immediate Assistance?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Our customer support team is available for any questions.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  px: 3,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor: alpha("#fff", 0.08),
                  border: `1px solid ${alpha("#fff", 0.15)}`,
                }}
              >
                <PhoneIcon sx={{ fontSize: 20, color: "primary.main" }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Phone
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    (02) 123-4567
                  </Typography>
                </Box>
              </GlassCard>

              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  px: 3,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor: alpha("#fff", 0.08),
                  border: `1px solid ${alpha("#fff", 0.15)}`,
                }}
              >
                <EmailIcon sx={{ fontSize: 20, color: "primary.main" }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Email
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    info@lifeplacealfonso.com
                  </Typography>
                </Box>
              </GlassCard>

              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  px: 3,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor: alpha("#fff", 0.08),
                  border: `1px solid ${alpha("#fff", 0.15)}`,
                }}
              >
                <TimeIcon sx={{ fontSize: 20, color: "primary.main" }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Hours
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    8AM - 8PM Daily
                  </Typography>
                </Box>
              </GlassCard>
            </Stack>
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Action Buttons */}
      <AnimatedElement animation="fadeIn" delay={900}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
            mt: 6,
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<DashboardIcon />}
            endIcon={<ArrowForwardIcon />}
            onClick={() => (window.location.href = "/dashboard")}
            sx={{
              px: 4,
              py: 1.5,
              backgroundColor: theme.palette.primary.main,
              color: "white",
              fontWeight: 600,
              fontSize: "1rem",
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              minWidth: 180,
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
                transform: "translateY(-2px)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              },
              transition: "all 0.3s ease",
            }}
          >
            View Dashboard
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<HomeIcon />}
            onClick={() => (window.location.href = "/")}
            sx={{
              px: 4,
              py: 1.5,
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha("#fff", 0.05),
              backdropFilter: "blur(10px)",
              fontWeight: 600,
              fontSize: "1rem",
              borderRadius: 2,
              borderWidth: 2,
              minWidth: 180,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                borderWidth: 2,
                borderColor: theme.palette.primary.main,
                transform: "translateY(-2px)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Return Home
          </Button>
        </Box>
      </AnimatedElement>
    </Container>
  );
};
