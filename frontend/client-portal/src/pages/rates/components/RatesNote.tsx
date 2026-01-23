// pages/rates/components/RatesNote.tsx
// Modern Organic Luxury redesign of the Important Notes section

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import {
  Section,
  Container,
  ModernCard,
  AnimatedElement,
  tokens,
} from '../../../design-system';

/**
 * RatesNote Component
 *
 * Displays important information about rates and pricing policies.
 * Uses Modern Organic Luxury design system with warm, subtle backgrounds
 * and clear typography for optimal readability.
 *
 * Features:
 * - Warm gold background for informational tone
 * - Clear list of important notes about VAT, minimums, and add-ons
 * - Contact information prominently displayed
 * - fadeIn animation for smooth entrance
 * - Fully accessible with proper contrast ratios
 */
export const RatesNote: React.FC = () => {
  const notes = [
    {
      label: 'VAT',
      text: '12% VAT is not included in the quoted prices and will be added to your final bill.',
    },
    {
      label: 'Minimum Participants',
      text: 'Most packages require a minimum of 80 participants.',
    },
    {
      label: 'Cabanas & Function Halls',
      text: 'These are excluded from base package rates and can be added as upgrades.',
    },
    {
      label: 'Custom Packages',
      text: 'Contact us for customized packages tailored to your specific needs.',
    },
  ];

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="narrow">
        <AnimatedElement animation="fadeIn" delay={100}>
          <ModernCard variant="warm" size="large">
            <Stack spacing={4}>
              {/* Header with Info Icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: tokens.color.base.gold[100],
                  }}
                >
                  <InfoOutlined
                    sx={{
                      fontSize: 28,
                      color: tokens.color.base.gold[700],
                    }}
                  />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.color.base.neutral[900],
                  }}
                >
                  Important Notes
                </Typography>
              </Box>

              {/* Notes List */}
              <Stack spacing={3}>
                {notes.map((note, index) => (
                  <Box key={index}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: tokens.color.base.neutral[700],
                        lineHeight: 1.7,
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: tokens.typography.weights.semibold,
                          color: tokens.color.base.neutral[900],
                        }}
                      >
                        {note.label}:
                      </Typography>{' '}
                      {note.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {/* Contact Information */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: tokens.spacing.radius.xl,
                  backgroundColor: tokens.color.base.sage[50],
                  border: `1px solid ${tokens.color.base.sage[200]}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    color: tokens.color.base.neutral[700],
                    lineHeight: 1.7,
                  }}
                >
                  For inquiries and reservations, contact us at{' '}
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.color.base.sage[700],
                    }}
                  >
                    reservations.lifeplace@gmail.com
                  </Typography>{' '}
                  or call{' '}
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.color.base.sage[700],
                    }}
                  >
                    +63 993 526 0943
                  </Typography>
                </Typography>
              </Box>
            </Stack>
          </ModernCard>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
