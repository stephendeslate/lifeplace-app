import React from 'react';
import { Box, Container, Typography, Button, Avatar, useTheme, alpha } from '@mui/material';
import { Info as InfoIcon, Phone as PhoneIcon, Email as EmailIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { GlassSpinner } from '@/components/loading';
import type { EventType } from '@/types/booking';
import { useEventTypeSelectionLogic } from './useEventTypeSelectionLogic';
import { EventTypeCard } from './EventTypeCard';
import { EventTypeDetailDialog } from './EventTypeDetailDialog';

interface EventTypeSelectionProps {
  onSelectEventType: (eventType: EventType) => Promise<void>;
}

export const EventTypeSelection: React.FC<EventTypeSelectionProps> = ({ onSelectEventType }) => {
  const theme = useTheme();
  const {
    eventTypes,
    loading,
    error,
    selectedEventType,
    isDetailDialogOpen,
    isSelecting,
    handleCardClick,
    handleSelectEventType,
    handleCloseDialog,
  } = useEventTypeSelectionLogic(onSelectEventType);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <GlassSpinner size={60} message="Loading event types..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <AnimatedElement animation="slideUp" delay={100}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            <Avatar
              sx={{
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                color: theme.palette.error.main,
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
              }}
            >
              <InfoIcon sx={{ fontSize: 32 }} />
            </Avatar>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Unable to Load Event Types
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {error}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Please contact us directly for assistance:
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
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
                (02) 123-4567
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
                Email Us
              </Button>
            </Box>
          </GlassCard>
        </AnimatedElement>
      </Container>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <AnimatedElement animation="slideUp" delay={100}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              No Event Types Available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We're currently updating our event offerings. Please check back later or contact us
              directly.
            </Typography>
          </GlassCard>
        </AnimatedElement>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        pt: 0, // Remove top padding - BookingLayout handles spacing
        pb: 6,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <AnimatedElement animation="slideDown" delay={100}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: 'primary.main',
                textShadow: '0 2px 10px rgba(0,0,0,0.1)',
              }}
            >
              Choose Your Event Type
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}
            >
              Select the perfect event type for your special occasion at LifePlace Alfonso
            </Typography>
          </Box>
        </AnimatedElement>

        {/* Event Type Cards */}
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: eventTypes.length >= 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            },
            maxWidth: 1200,
            mx: 'auto',
            mb: 6,
          }}
        >
          {eventTypes.map((eventType, index) => (
            <EventTypeCard
              key={eventType.id}
              eventType={eventType}
              index={index}
              onCardClick={handleCardClick}
            />
          ))}
        </Box>

        {/* Contact Information */}
        <AnimatedElement animation="slideUp" delay={600}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 600,
              mx: 'auto',
              backgroundColor: alpha('#fff', 0.05),
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Need Help Choosing?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Our event specialists are here to help you find the perfect event type for your
              special occasion.
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
                (02) 123-4567
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
                info@lifeplacealfonso.com
              </Button>
            </Box>
          </GlassCard>
        </AnimatedElement>
      </Container>

      {/* Event Type Detail Dialog */}
      <EventTypeDetailDialog
        open={isDetailDialogOpen}
        eventType={selectedEventType}
        isSelecting={isSelecting}
        onClose={handleCloseDialog}
        onSelect={handleSelectEventType}
      />
    </Box>
  );
};
