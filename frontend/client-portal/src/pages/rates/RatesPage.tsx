// pages/rates/RatesPage.tsx

import React from 'react';
import { Box, Typography, Stack, CircularProgress } from '@mui/material';
import { RatesHero } from './components/RatesHero';
import { PackageCard } from './components/PackageCard';
import { WeddingPackages } from './components/WeddingPackages';
import { RatesNote } from './components/RatesNote';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { Section, Container } from '../../design-system';
import { useRatesPageData } from '../../hooks/useRatesPage';
import type { RatesPageProps, PackageInfo } from './types/rates.types';

const RatesPage: React.FC<RatesPageProps> = ({ onNavigateToBooking }) => {
  const { data, isLoading, error } = useRatesPageData();

  const packages: PackageInfo[] = (data?.event_packages ?? []).map((pkg) => ({
    id: pkg.slug,
    name: pkg.name,
    description: pkg.description,
    minimumParticipants: pkg.minimum_participants ?? undefined,
    badge: pkg.badge || undefined,
    tiers: pkg.tiers.map((tier) => ({
      duration: tier.label,
      price: parseFloat(tier.price),
      isPopular: tier.is_highlighted,
    })),
    includes: pkg.includes,
    notes: pkg.notes.length > 0 ? pkg.notes : undefined,
  }));

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography color="error">Failed to load rates. Please try again later.</Typography>
      </Box>
    );
  }

  return (
    <>
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
                  <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700 }}>
                    Choose from our range of packages designed for camps, retreats, and
                    team-building events.
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
        <WeddingPackages
          onNavigateToBooking={onNavigateToBooking}
          weddingVenues={data?.wedding_venues}
          weddingCombos={data?.wedding_combos}
          allInWeddings={data?.all_in_weddings}
        />

        {/* Important Notes */}
        <RatesNote />
      </Box>
    </>
  );
};

export default RatesPage;
