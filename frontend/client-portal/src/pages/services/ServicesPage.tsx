// pages/services/ServicesPage.tsx

import React from 'react';
import { Box, Typography, Stack, useTheme } from '@mui/material';
import {
  NaturePeople,
  Groups,
  School,
  Favorite,
} from '@mui/icons-material';
import { SEO } from '../../hooks/useSEO';
import { ServicesHero } from './components/ServicesHero';
import { ServiceCard } from './components/ServiceCard';
import { ServicesCTA } from './components/ServicesCTA';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { Section, Container } from '../../design-system';
import type { ServicesPageProps, ServiceInfo } from './types/services.types';

const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigateToBooking }) => {
  const theme = useTheme();

  const services: ServiceInfo[] = [
    {
      id: 'camps-retreats',
      name: 'Camps & Retreats',
      description:
        'Transform your youth camps, church retreats, and leadership training into unforgettable experiences. Our spacious grounds and versatile facilities provide the perfect backdrop for spiritual growth and team bonding.',
      features: [
        'Spacious outdoor areas for activities',
        'Chapel for worship and reflection',
        'Dormitory accommodations for up to 300 guests',
        'Multipurpose halls for sessions',
        'Scenic natural environment',
      ],
      icon: <NaturePeople sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
    },
    {
      id: 'team-building',
      name: 'Team Building',
      description:
        'Strengthen your organization with our comprehensive team building venue. From trust exercises to strategic workshops, our facilities support activities that foster creativity, collaboration, and innovation.',
      features: [
        'Capacity for up to 500 participants',
        'Open fields for outdoor activities',
        'State-of-the-art audio visual equipment',
        'Partnered with professional facilitators',
        'Customizable packages available',
      ],
      icon: <Groups sx={{ fontSize: 48, color: theme.palette.info.main }} />,
    },
    {
      id: 'workshops',
      name: 'Workshops',
      description:
        'Discover new skills and grow your creativity in our inspiring workshop venues. Whether for educational seminars, skill development sessions, or creative workshops, we provide the ideal learning environment.',
      features: [
        'Sanctuary venue for intimate gatherings',
        'Pavilion for larger sessions',
        'Cozy natural ambiance',
        'Flexible setup options',
        'Peaceful environment for learning',
      ],
      icon: <School sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
    },
    {
      id: 'weddings',
      name: 'Weddings',
      description:
        'Celebrate your love story at our exclusive wedding venue. With breathtaking natural beauty, elegant facilities, and all-in-one packages, we create the perfect setting for your special day.',
      features: [
        'Only one event per day - exclusive booking',
        'Multiple ceremony and reception venues',
        'Chapel for church weddings',
        'Garden settings with string lights',
        'All-in-one wedding packages available',
      ],
      icon: <Favorite sx={{ fontSize: 48, color: '#E91E63' }} />,
    },
  ];

  return (
    <>
      <SEO
        title="Our Services | LifePlace Alfonso"
        description="Discover our services: camps, retreats, team building, workshops, and weddings at LifePlace Alfonso, Cavite."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
        <ServicesHero />

        {/* Services Grid Section */}
        <Section background="white" spacing="large">
          <Container maxWidth="wide">
            <Stack spacing={6}>
              <AnimatedElement animation="fadeIn" delay={100}>
                <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    What We Offer
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ maxWidth: 700 }}
                  >
                    Comprehensive event solutions tailored to your needs, from intimate gatherings
                    to grand celebrations.
                  </Typography>
                </Stack>
              </AnimatedElement>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, 1fr)',
                  },
                  gap: 4,
                }}
              >
                {services.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))}
              </Box>
            </Stack>
          </Container>
        </Section>

        <ServicesCTA onNavigateToBooking={onNavigateToBooking} />
      </Box>
    </>
  );
};

export default ServicesPage;
