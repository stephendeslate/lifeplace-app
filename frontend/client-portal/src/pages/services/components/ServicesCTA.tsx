// pages/services/components/ServicesCTA.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { ArrowForward, Phone, Email } from '@mui/icons-material';
import { Section, Container, AnimatedElement, tokens } from '../../../design-system';
import { Button } from '../../../design-system';
import type { ServicesCTAProps } from '../types/services.types';

/**
 * ServicesCTA Component
 *
 * Prominent call-to-action section encouraging users to book events or contact LifePlace.
 * Features dual CTAs with contact information display.
 *
 * Design System Compliance:
 * - Section with sage background for visual prominence
 * - Container with narrow max-width for focused content
 * - Typography: h2 heading, bodyLarge description
 * - Buttons: Terracotta primary, outline secondary
 * - Animation: fadeIn with scaleUp effect for emphasis
 * - Generous spacing for visual impact
 * - WCAG AA compliant contrast ratios
 */
export const ServicesCTA: React.FC<ServicesCTAProps> = ({ onNavigateToBooking }) => {
  return (
    <Section background="sage" spacing="xlarge">
      <Container maxWidth="narrow">
        <AnimatedElement animation="fadeIn" delay={100}>
          <Stack spacing={4} alignItems="center" sx={{ textAlign: 'center' }}>
            {/* Heading */}
            <Typography
              sx={{
                ...tokens.typography.styles.h2,
                color: tokens.color.base.neutral[900],
                mb: 2,
              }}
            >
              Ready to Plan Your Event?
            </Typography>

            {/* Description */}
            <Typography
              sx={{
                ...tokens.typography.styles.bodyLarge,
                color: tokens.color.base.neutral[700],
                maxWidth: '600px',
                mb: 2,
              }}
            >
              Contact us today to discuss your event needs. Our team is ready to help
              you create an unforgettable experience at LifePlace Alfonso.
            </Typography>

            {/* CTA Buttons */}
            <AnimatedElement animation="scaleUp" delay={200}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  width: '100%',
                  justifyContent: 'center',
                  mt: 2,
                }}
              >
                <Button
                  variant="terracotta"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={onNavigateToBooking}
                  ariaLabel="Book your event at LifePlace Alfonso"
                >
                  Book Your Event
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Phone />}
                  onClick={() => window.location.href = 'tel:+639935260943'}
                  ariaLabel="Call LifePlace Alfonso at +63 993 526 0943"
                >
                  Call Us
                </Button>
              </Stack>
            </AnimatedElement>

            {/* Contact Information */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              sx={{
                pt: 3,
                borderTop: `1px solid ${tokens.color.base.sage[200]}`,
                mt: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone
                  fontSize="small"
                  sx={{ color: tokens.color.base.sage[600] }}
                />
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodySmall,
                    color: tokens.color.base.neutral[700],
                  }}
                >
                  +63 993 526 0943
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email
                  fontSize="small"
                  sx={{ color: tokens.color.base.sage[600] }}
                />
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodySmall,
                    color: tokens.color.base.neutral[700],
                  }}
                >
                  reservations.lifeplace@gmail.com
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
