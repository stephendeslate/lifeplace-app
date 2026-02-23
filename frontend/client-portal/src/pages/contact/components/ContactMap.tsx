// pages/contact/components/ContactMap.tsx

import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { tokens, Section, Container, ModernCard, AnimatedElement } from '../../../design-system';

/**
 * ContactMap Component
 *
 * Displays an interactive map section for the Contact page, showing the venue location
 * in Alfonso, Cavite with a link to open in Google Maps.
 *
 * Redesigned with Modern Organic Luxury design system.
 *
 * Features:
 * - Section wrapper with sage background for earthy feel
 * - Container for content constraint and responsive padding
 * - ModernCard variant='elevated' for clean, sophisticated map container
 * - Typography using design tokens for consistent hierarchy
 * - Button variant='outline' for subtle CTA styling
 * - AnimatedElement for fadeIn animation
 * - WCAG AA compliant with proper color contrast and focus states
 */
export const ContactMap: React.FC = () => {
  const handleOpenMap = () => {
    window.open(
      'https://www.google.com/maps/search/?api=1&query=Patutong+Malaki+North+Alfonso+Cavite+4120',
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <Section background="sage" spacing="large">
      <Container maxWidth="content">
        <AnimatedElement animation="fadeIn" delay={100}>
          <ModernCard variant="elevated" size="large">
            <Stack spacing={4}>
              {/* Heading */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: tokens.typography.families.heading,
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.color.base.sage[900],
                    mb: 1,
                  }}
                >
                  Find Us
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: tokens.color.base.neutral[600],
                    fontSize: tokens.typography.sizes.lg,
                  }}
                >
                  Located in the serene hills of Alfonso, Cavite, near Tagaytay
                </Typography>
              </Box>

              {/* Embedded Map */}
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 300, sm: 350, md: 400 },
                  borderRadius: tokens.spacing.radius.xl,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  title="LifePlace Alfonso Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3870.4747777777777!2d120.84999999999999!3d14.14!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDA4JzI0LjAiTiAxMjDCsDUxJzAwLjAiRQ!5e0!3m2!1sen!2sph!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Box>

              {/* Directions Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  size="large"
                  endIcon={<OpenInNew />}
                  onClick={handleOpenMap}
                  aria-label="Open location in Google Maps in a new window"
                  sx={{
                    color: tokens.color.base.sage[700],
                    borderColor: tokens.color.base.sage[500],
                    fontWeight: tokens.typography.weights.semibold,
                    px: 4,
                    '&:hover': {
                      backgroundColor: tokens.color.base.sage[50],
                      borderColor: tokens.color.base.sage[600],
                    },
                  }}
                >
                  Open in Google Maps
                </Button>
              </Box>

              {/* Additional Info */}
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'center',
                  color: tokens.color.base.neutral[600],
                  fontSize: tokens.typography.sizes.sm,
                  lineHeight: tokens.typography.lineHeights.relaxed,
                }}
              >
                Just a short drive from Tagaytay City, LifePlace Alfonso offers easy access while
                providing a peaceful retreat from the busy city life.
              </Typography>
            </Stack>
          </ModernCard>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
