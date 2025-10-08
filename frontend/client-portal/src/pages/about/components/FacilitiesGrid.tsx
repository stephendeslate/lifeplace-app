// pages/about/components/FacilitiesGrid.tsx

import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import {
  Church,
  Home as HomeIcon,
  Nature,
  Hotel,
  Landscape,
  Groups,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { FacilityInfo } from '../types/about.types';

export const FacilitiesGrid: React.FC = () => {
  const theme = useTheme();

  const facilities: FacilityInfo[] = [
    {
      id: 'sanctuary',
      name: 'Sanctuary Chapel',
      description: 'A beautiful chapel designed for intimate wedding ceremonies and spiritual gatherings. Perfect for saying your vows in a sacred, picturesque setting.',
      capacity: 'Up to 150 guests',
      icon: <Church sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
    },
    {
      id: 'pavilion',
      name: 'The Pavilion',
      description: 'Our spacious multipurpose hall accommodates larger celebrations and events with modern amenities and flexible seating arrangements.',
      capacity: '100-200 guests',
      icon: <HomeIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
    },
    {
      id: 'open-field',
      name: 'Open-Field',
      description: 'A versatile outdoor space perfect for daytime events, team building activities, and outdoor celebrations surrounded by nature.',
      capacity: 'Flexible outdoor capacity',
      icon: <Landscape sx={{ fontSize: 48, color: theme.palette.success.main }} />,
    },
    {
      id: 'angelic-field',
      name: 'Angelic Field',
      description: 'Our premium outdoor venue offers stunning natural surroundings, ideal for garden weddings and elegant outdoor receptions.',
      capacity: 'Large outdoor events',
      icon: <Nature sx={{ fontSize: 48, color: '#4CAF50' }} />,
    },
    {
      id: 'cabanas',
      name: 'Cabanas',
      description: 'Four comfortable cabanas providing cozy overnight accommodations for your guests, each designed for small groups.',
      capacity: '6-10 guests per cabana',
      icon: <Hotel sx={{ fontSize: 48, color: theme.palette.info.main }} />,
    },
    {
      id: 'havila-hostel',
      name: 'Havila Hostel',
      description: 'Our largest accommodation facility, perfect for retreats, team building events, and group stays with modern amenities.',
      capacity: '150-300 overnight guests',
      icon: <Groups sx={{ fontSize: 48, color: '#FF9800' }} />,
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100vw',
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={3} textAlign="center">
              <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Our Facilities
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
                From intimate ceremonies to grand celebrations, we offer versatile venues and
                comfortable accommodations to make your event truly memorable
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {facilities.map((facility, index) => (
              <AnimatedElement key={facility.id} animation="fadeIn" delay={200 + index * 100}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  hover={true}
                  sx={{ height: '100%' }}
                >
                  <Stack spacing={3} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      }}
                    >
                      {facility.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                        {facility.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="primary.main"
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        {facility.capacity}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {facility.description}
                      </Typography>
                    </Box>
                  </Stack>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};
