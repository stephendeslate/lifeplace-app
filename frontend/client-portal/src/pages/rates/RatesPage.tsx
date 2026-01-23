// pages/rates/RatesPage.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { SEO } from '../../hooks/useSEO';
import { RatesHero } from './components/RatesHero';
import { PackageCard } from './components/PackageCard';
import { WeddingPackages } from './components/WeddingPackages';
import { RatesNote } from './components/RatesNote';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { Section, Container } from '../../design-system';
import type { RatesPageProps, PackageInfo } from './types/rates.types';

const RatesPage: React.FC<RatesPageProps> = ({ onNavigateToBooking }) => {
  const packages: PackageInfo[] = [
    {
      id: 'budget',
      name: 'Budget Package',
      description: 'Our most affordable option for groups seeking basic outdoor venue rental.',
      minimumParticipants: 80,
      tiers: [
        { duration: 'Day Trip', price: 450 },
        { duration: 'Overnight', price: 650 },
      ],
      includes: [
        'Use of all venue facilities',
        'Camping tent accommodation (overnight)',
      ],
      notes: [
        'Kitchen use: ₱5,000/day',
        'Swimming pool: ₱150/person/day',
        'Cabana: Starting at ₱3,300/night',
        'A/C function halls: ₱10,000 full day or ₱5,000 half-day',
      ],
    },
    {
      id: 'basic',
      name: 'Basic Package',
      description: 'A popular choice with comfortable accommodations and comprehensive amenities.',
      minimumParticipants: 80,
      tiers: [
        { duration: 'Day Trip', price: 640 },
        { duration: '2D1N', price: 1980 },
        { duration: '3D2N', price: 3650, isPopular: true },
        { duration: '4D3N', price: 5150 },
      ],
      includes: [
        'Use of Havilah accommodations',
        'Use of all facilities',
        'Swimming pool access',
        'Upgraded sound system',
        'Service charge included',
        'Meals (2-10 depending on duration)',
      ],
      notes: [
        'Cabanas start at ₱3,300/night',
        'A/C function halls: ₱10,000 full day or ₱5,000 half-day',
      ],
    },
    {
      id: 'premium',
      name: 'Premium Package',
      description: 'Our comprehensive package with all facilities and premium amenities included.',
      minimumParticipants: 80,
      badge: 'Staff Pick',
      tiers: [
        { duration: 'Day Trip', price: 800 },
        { duration: '2D1N', price: 2280 },
        { duration: '3D2N', price: 4130 },
        { duration: '4D3N', price: 5850 },
      ],
      includes: [
        'Use of Havilah accommodations',
        'Access to all venue facilities',
        'Swimming pool privileges',
        'Upgraded sound system',
        'Four cabanas included',
        'Function hall usage',
        'Service charge included',
        'Meals (2-10 depending on duration)',
      ],
    },
    {
      id: 'team-building',
      name: 'Team-Building Package',
      description: 'Professional team-building experience with facilitation by our partner MZone Team Building.',
      minimumParticipants: 80,
      tiers: [
        { duration: 'Under 100 pax', price: 1750 },
        { duration: '100+ pax', price: 1450 },
      ],
      includes: [
        'Professional team-building facilitator',
        'Certificates for participants',
        'Activity materials and supplies',
        'Game prizes',
        'Evaluation summary documentation',
        'Raw photos/videos',
      ],
      notes: [
        'Partnered with MZone Team Building (www.mzoneteambuilding.com)',
      ],
    },
    {
      id: 'all-in-team-building',
      name: 'All-In Team-Building Package',
      description: 'Complete team-building solution with accommodations, meals, and professional facilitation.',
      minimumParticipants: 80,
      tiers: [
        { duration: 'Day Trip', price: 2390 },
        { duration: '2D1N', price: 3730 },
        { duration: '3D2N', price: 7150 },
      ],
      includes: [
        'Facility access and swimming pool',
        'Plated meals (quantity varies by duration)',
        'Professional team-building facilitation',
        'Audio and visual equipment',
        'Certificates of participation',
        'Activity materials and game prizes',
        'Evaluation summary documentation',
        'Raw photos and video footage',
      ],
      notes: [
        'Partnered with MZone Team Building',
      ],
    },
  ];

  return (
    <>
      <SEO
        title="Rates & Packages | LifePlace Alfonso"
        description="View our rates and packages for events, retreats, and weddings at LifePlace Alfonso."
      />
      <Box sx={{ minHeight: '100vh', width: '100%' }}>
        <RatesHero />

      {/* Packages Section */}
      <Section background="white" spacing="large">
        <Container maxWidth="wide">
          <Stack spacing={6}>
            <AnimatedElement animation="fadeIn" delay={100}>
              <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Event Packages
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ maxWidth: 700 }}
                >
                  Choose from our range of packages designed for camps, retreats, and team-building events.
                </Typography>
              </Stack>
            </AnimatedElement>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'repeat(2, 1fr)',
                },
                gap: 4,
              }}
            >
              {packages.map((pkg, index) => (
                <PackageCard key={pkg.id} package={pkg} index={index} />
              ))}
            </Box>
          </Stack>
        </Container>
      </Section>

      {/* Wedding Packages */}
      <WeddingPackages onNavigateToBooking={onNavigateToBooking} />

        {/* Important Notes */}
        <RatesNote />
      </Box>
    </>
  );
};

export default RatesPage;
