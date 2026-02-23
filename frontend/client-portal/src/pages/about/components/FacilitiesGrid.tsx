// pages/about/components/FacilitiesGrid.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Church, Home as HomeIcon, Nature, Hotel, Landscape, Groups } from '@mui/icons-material';
import { Section, Container, ModernCard, AnimatedElement, tokens } from '../../../design-system';
import type { FacilityInfo } from '../types/about.types';

/**
 * FacilitiesGrid Component
 *
 * Displays venue facilities in a responsive grid layout using Modern Organic Luxury design system.
 *
 * Features:
 * - Modern card design with elevation hover effects
 * - Staggered slideUp animations for visual interest
 * - Responsive grid layout (1/2/3 columns)
 * - Icon-based facility representation
 * - WCAG AA compliant color contrast
 * - Design token integration throughout
 */
export const FacilitiesGrid: React.FC = () => {
  const facilities: FacilityInfo[] = [
    {
      id: 'sanctuary',
      name: 'Sanctuary',
      description: 'Chapel - Suitable for church weddings',
      capacity: '',
      icon: <Church sx={{ fontSize: 48, color: tokens.color.base.sage[600] }} />,
    },
    {
      id: 'cabanas',
      name: 'Cabanas',
      description: '4 total - Each accommodates 6-10 people',
      capacity: '',
      icon: <Hotel sx={{ fontSize: 48, color: tokens.color.base.terracotta[600] }} />,
    },
    {
      id: 'pavilion',
      name: 'The Pavilion',
      description: 'Multipurpose hall - Capacity: 100-200 people (depending on setup)',
      capacity: '',
      icon: <HomeIcon sx={{ fontSize: 48, color: tokens.color.base.sage[700] }} />,
    },
    {
      id: 'open-field',
      name: 'Open-Field',
      description: 'For larger gatherings',
      capacity: '',
      icon: <Landscape sx={{ fontSize: 48, color: tokens.color.base.sage[600] }} />,
    },
    {
      id: 'angelic-field',
      name: 'Angelic Field',
      description: 'Outdoor event space',
      capacity: '',
      icon: <Nature sx={{ fontSize: 48, color: tokens.color.base.sage[500] }} />,
    },
    {
      id: 'havila',
      name: 'Havila',
      description: '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
      capacity: '',
      icon: <Groups sx={{ fontSize: 48, color: tokens.color.base.terracotta[600] }} />,
    },
  ];

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="wide">
        <Stack spacing={{ xs: 4, md: 6 }}>
          {/* Section Title */}
          <AnimatedElement animation="slideUp" delay={100}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.color.base.sage[900],
                textAlign: 'center',
              }}
            >
              Facilities & Amenities
            </Typography>
          </AnimatedElement>

          {/* Facilities Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: {
                xs: tokens.spacing.space[3],
                sm: tokens.spacing.space[4],
                md: tokens.spacing.space[5],
              },
            }}
          >
            {facilities.map((facility, index) => (
              <AnimatedElement key={facility.id} animation="slideUp" delay={200 + index * 100}>
                <ModernCard
                  variant="elevated"
                  size="large"
                  hover
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Stack
                    spacing={3}
                    alignItems="center"
                    sx={{
                      textAlign: 'center',
                      flex: 1,
                    }}
                  >
                    {/* Icon Container */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '80px',
                        height: '80px',
                        borderRadius: tokens.spacing.radius.full,
                        backgroundColor: tokens.color.base.neutral[100],
                        transition: tokens.animation.transition.all,
                      }}
                      aria-hidden="true"
                    >
                      {facility.icon}
                    </Box>

                    {/* Facility Details */}
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: tokens.typography.weights.semibold,
                          color: tokens.color.base.sage[900],
                          mb: tokens.spacing.space[2],
                        }}
                      >
                        {facility.name}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: tokens.color.base.neutral[700],
                          lineHeight: tokens.typography.lineHeights.relaxed,
                        }}
                      >
                        {facility.description}
                      </Typography>
                    </Box>
                  </Stack>
                </ModernCard>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Container>
    </Section>
  );
};
