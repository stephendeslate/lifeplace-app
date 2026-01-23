// pages/home/components/VenuesSection.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  Church,
  Home as HomeIcon,
  Nature,
  Hotel,
  Landscape,
  Groups,
} from '@mui/icons-material';
import { tokens, Section, Container, AnimatedElement } from '../../../design-system';
import { Button } from '../../../design-system';
import { GlassCard } from '../../../design-system/components/GlassCard';
import type { VenueInfo } from '../types/home.types';

export const VenuesSection: React.FC = () => {
  const venues: VenueInfo[] = [
    {
      id: 'sanctuary',
      icon: <Church sx={{ fontSize: 48 }} />,
      title: 'Sanctuary',
      description: 'Chapel - Suitable for church weddings',
      capacity: '',
    },
    {
      id: 'cabanas',
      icon: <Hotel sx={{ fontSize: 48 }} />,
      title: 'Cabanas',
      description: '4 total - Each accommodates 6-10 people',
      capacity: '',
    },
    {
      id: 'pavilion',
      icon: <HomeIcon sx={{ fontSize: 48 }} />,
      title: 'The Pavilion',
      description: 'Multipurpose hall - Capacity: 100-200 people (depending on setup)',
      capacity: '',
    },
    {
      id: 'open-field',
      icon: <Landscape sx={{ fontSize: 48 }} />,
      title: 'Open-Field',
      description: 'For larger gatherings',
      capacity: '',
    },
    {
      id: 'angelic-field',
      icon: <Nature sx={{ fontSize: 48 }} />,
      title: 'Angelic Field',
      description: 'Outdoor event space',
      capacity: '',
    },
    {
      id: 'havila',
      icon: <Groups sx={{ fontSize: 48 }} />,
      title: 'Havila',
      description: '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
      capacity: '',
    },
  ];

  return (
    <Section background="white" spacing="large">
      <Container maxWidth="wide">
        <Stack spacing={{ xs: 4, md: 6 }}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={0}>
            <Box sx={{ textAlign: 'center', mb: { xs: 2, md: 4 } }}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h2,
                  color: tokens.color.base.neutral[900],
                  mb: 2,
                }}
              >
                Facilities & Amenities
              </Typography>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[700],
                  maxWidth: '700px',
                  mx: 'auto',
                }}
              >
                Discover our diverse range of venues, each thoughtfully designed to accommodate events of every size and style.
              </Typography>
            </Box>
          </AnimatedElement>

          {/* Venues Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: { xs: 3, md: 4 },
            }}
          >
            {venues.map((venue, index) => (
              <AnimatedElement key={venue.id} animation="slideUp" delay={100 + index * 100}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  hover={true}
                  sx={{
                    height: '100%',
                    transition: tokens.animation.transition.all,
                  }}
                >
                  <Stack
                    spacing={3}
                    alignItems="center"
                    sx={{
                      p: { xs: 3, md: 4 },
                      textAlign: 'center',
                      height: '100%',
                    }}
                  >
                    {/* Icon Container */}
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: '50%',
                        backgroundColor: tokens.color.base.sage[50],
                        color: tokens.color.base.sage[600],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: tokens.animation.transition.all,
                        '&:hover': {
                          backgroundColor: tokens.color.base.sage[100],
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      {venue.icon}
                    </Box>

                    {/* Venue Content */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.h5,
                          color: tokens.color.base.neutral[900],
                        }}
                      >
                        {venue.title}
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.body,
                          color: tokens.color.base.neutral[700],
                          lineHeight: 1.7,
                        }}
                      >
                        {venue.description}
                      </Typography>
                    </Box>
                  </Stack>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Box>

          {/* Call to Action */}
          <AnimatedElement animation="fadeIn" delay={800}>
            <Box sx={{ textAlign: 'center', mt: { xs: 2, md: 4 } }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => window.location.href = '/facilities'}
                sx={{
                  px: { xs: 4, md: 6 },
                }}
              >
                Explore All Facilities
              </Button>
            </Box>
          </AnimatedElement>
        </Stack>
      </Container>
    </Section>
  );
};