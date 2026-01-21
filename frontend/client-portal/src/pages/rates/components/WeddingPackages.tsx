// pages/rates/components/WeddingPackages.tsx

import React from 'react';
import { Box, Typography, Stack, Button, Chip, alpha, useTheme } from '@mui/material';
import { ArrowForward, Check, Favorite } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { WeddingPackagesProps, WeddingVenue, WeddingCombo, AllInWeddingPackage } from '../types/rates.types';

const weddingVenues: WeddingVenue[] = [
  {
    id: 'open-field',
    name: 'The Open Field',
    price: 70000,
    duration: '3 hours',
    capacity: '130-150 guests',
    includes: ['Free prenup venue', 'Ceiling treatment available (₱40,000)'],
    excessHourRate: 10000,
  },
  {
    id: 'pavilion',
    name: 'The Pavilion',
    price: 23200,
    duration: '3 hours',
    capacity: '100-130 guests',
    includes: ['Free prenup venue'],
    excessHourRate: 7000,
  },
  {
    id: 'angelic-field',
    name: 'The Angelic Field',
    price: 26400,
    duration: '3 hours',
    capacity: '150-200 guests',
    includes: ['Free prenup venue', 'String lights included'],
    excessHourRate: 5000,
  },
  {
    id: 'sanctuary',
    name: 'The Sanctuary',
    price: 36000,
    duration: '3 hours',
    capacity: 'Ceremony venue',
    includes: ['White draping', 'Basic styling', 'Basic sound system'],
    excessHourRate: 13000,
  },
  {
    id: 'pool',
    name: 'The Pool',
    price: 45000,
    duration: '3 hours',
    capacity: '70-80 guests',
    includes: ['String lights included'],
    excessHourRate: 10000,
  },
  {
    id: 'al-fresco',
    name: 'The Al Fresco',
    price: 7000,
    duration: '3 hours',
    capacity: 'Intimate dining',
    includes: [],
    excessHourRate: 2000,
  },
];

const weddingCombos: WeddingCombo[] = [
  {
    id: 'sanctuary-open-field',
    name: 'Sanctuary + Open Field',
    price: 110000,
    duration: '6 hours',
    includes: ['Free prenup', '4 cabana rooms'],
  },
  {
    id: 'sanctuary-pavilion',
    name: 'Sanctuary + Pavilion',
    price: 66000,
    duration: '6 hours',
    includes: ['Free prenup', '4 cabana rooms'],
  },
  {
    id: 'angelic-open-field',
    name: 'Angelic Field + Open Field',
    price: 100000,
    duration: '6 hours',
    includes: ['Free prenup', '4 cabana rooms'],
  },
  {
    id: 'angelic-pavilion',
    name: 'Angelic Field + Pavilion',
    price: 60000,
    duration: '6 hours',
    includes: ['Free prenup', '4 cabana rooms'],
  },
];

const allInPackages: AllInWeddingPackage[] = [
  {
    id: 'all-in-100',
    name: 'All-In Wedding Package',
    startingPrice: 385770,
    guestCount: 100,
    venues: 'Sanctuary + Pavilion',
    includes: [
      'Catering with buffet selections',
      'Photography and videography',
      'Professional coordination team',
      'Lighting and sound equipment',
      'Floral arrangements',
      'Table setup with linens',
      'Host/emcee services',
    ],
  },
  {
    id: 'all-in-150',
    name: 'All-In Wedding Package',
    startingPrice: 517000,
    guestCount: 150,
    venues: 'Angelic Field + Open Field',
    includes: [
      'Catering with buffet selections',
      'Photography and videography',
      'Professional coordination team',
      'Lighting and sound equipment',
      'Floral arrangements',
      'Table setup with linens',
      'Host/emcee services',
    ],
  },
];

export const WeddingPackages: React.FC<WeddingPackagesProps> = ({ onNavigateToBooking }) => {
  const theme = useTheme();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: alpha(theme.palette.primary.main, 0.03),
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 'clamp(320px, 90vw, 1400px)', mx: 'auto' }}>
        <Stack spacing={8}>
          {/* Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Favorite sx={{ fontSize: 40, color: '#E91E63' }} />
                <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Wedding Packages
                </Typography>
              </Box>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 700 }}
              >
                Create your perfect wedding day with our exclusive venue packages and all-inclusive options.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Venue-Only Options */}
          <Box>
            <AnimatedElement animation="fadeIn" delay={150}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 4 }}>
                Venue-Only Options
              </Typography>
            </AnimatedElement>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              {weddingVenues.map((venue, index) => (
                <AnimatedElement key={venue.id} animation="fadeIn" delay={200 + index * 50}>
                  <GlassCard variant="light" intensity="medium" hover sx={{ height: '100%' }}>
                    <Stack spacing={2} sx={{ p: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {venue.name}
                      </Typography>
                      <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                        {formatPrice(venue.price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {venue.duration} • {venue.capacity}
                      </Typography>
                      {venue.includes.length > 0 && (
                        <Stack spacing={0.5}>
                          {venue.includes.map((item, idx) => (
                            <Typography key={idx} variant="caption" color="text.secondary">
                              • {item}
                            </Typography>
                          ))}
                        </Stack>
                      )}
                      {venue.excessHourRate && (
                        <Typography variant="caption" color="text.secondary">
                          Excess hour: {formatPrice(venue.excessHourRate)}
                        </Typography>
                      )}
                    </Stack>
                  </GlassCard>
                </AnimatedElement>
              ))}
            </Box>
          </Box>

          {/* Combination Packages */}
          <Box>
            <AnimatedElement animation="fadeIn" delay={150}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 4 }}>
                Combination Packages (6 Hours)
              </Typography>
            </AnimatedElement>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                },
                gap: 3,
              }}
            >
              {weddingCombos.map((combo, index) => (
                <AnimatedElement key={combo.id} animation="fadeIn" delay={200 + index * 50}>
                  <GlassCard variant="light" intensity="medium" hover sx={{ height: '100%' }}>
                    <Stack spacing={2} sx={{ p: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {combo.name}
                      </Typography>
                      <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                        {formatPrice(combo.price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {combo.duration}
                      </Typography>
                      <Stack spacing={0.5}>
                        {combo.includes.map((item, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Check sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              {item}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>
                  </GlassCard>
                </AnimatedElement>
              ))}
            </Box>
          </Box>

          {/* All-In Wedding Packages */}
          <Box>
            <AnimatedElement animation="fadeIn" delay={150}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 4 }}>
                All-In Wedding Packages
              </Typography>
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
              {allInPackages.map((pkg, index) => (
                <AnimatedElement key={pkg.id} animation="fadeIn" delay={200 + index * 100}>
                  <GlassCard variant="light" intensity="strong" hover sx={{ height: '100%' }}>
                    <Stack spacing={3} sx={{ p: 4 }}>
                      <Box>
                        <Chip label="All-Inclusive" color="primary" size="small" sx={{ mb: 2 }} />
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                          {pkg.guestCount} Guests
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pkg.venues}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Starting at
                        </Typography>
                        <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>
                          {formatPrice(pkg.startingPrice)}
                        </Typography>
                      </Box>

                      <Stack spacing={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Major Inclusions:
                        </Typography>
                        {pkg.includes.map((item, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Check sx={{ fontSize: 18, color: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              {item}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>

                      <Button
                        variant="contained"
                        endIcon={<ArrowForward />}
                        onClick={onNavigateToBooking}
                        fullWidth
                        sx={{ mt: 'auto' }}
                      >
                        Inquire Now
                      </Button>
                    </Stack>
                  </GlassCard>
                </AnimatedElement>
              ))}
            </Box>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};
