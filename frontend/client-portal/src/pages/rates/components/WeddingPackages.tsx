// pages/rates/components/WeddingPackages.tsx

import React from 'react';
import { Box, Typography, Stack, Button, Chip } from '@mui/material';
import { ArrowForward, Check, Favorite } from '@mui/icons-material';
import { Section } from '../../../design-system/components/Section';
import { Container } from '../../../design-system/components/Container';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { tokens } from '../../../design-system/tokens';
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
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Section background="cream" spacing="xlarge">
      <Container maxWidth="wide">
        <Stack spacing={8}>
          {/* Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Favorite sx={{ fontSize: 40, color: tokens.color.semantic.error.main }} />
                <Typography
                  sx={{
                    ...tokens.typography.styles.h2,
                    fontSize: {
                      xs: tokens.typography.responsive.h2.mobile.fontSize,
                      sm: tokens.typography.responsive.h2.tablet.fontSize,
                      md: tokens.typography.responsive.h2.desktop.fontSize,
                    },
                    lineHeight: {
                      xs: tokens.typography.responsive.h2.mobile.lineHeight,
                      sm: tokens.typography.responsive.h2.tablet.lineHeight,
                      md: tokens.typography.responsive.h2.desktop.lineHeight,
                    },
                    color: tokens.color.base.sage[900],
                  }}
                >
                  Wedding Packages
                </Typography>
              </Box>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[700],
                  maxWidth: 700,
                }}
              >
                Create your perfect wedding day with our exclusive venue packages and all-inclusive options.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Venue-Only Options */}
          <Box>
            <AnimatedElement animation="fadeIn" delay={150}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h4,
                  color: tokens.color.base.sage[900],
                  mb: 4,
                }}
              >
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
                gap: tokens.spacing.layout.grid.gap.lg,
              }}
            >
              {weddingVenues.map((venue, index) => (
                <AnimatedElement key={venue.id} animation="slideUp" delay={200 + index * 50}>
                  <Box
                    sx={{
                      height: '100%',
                      backgroundColor: '#FFFFFF',
                      borderRadius: tokens.spacing.radius.card,
                      padding: tokens.spacing.space.cardPadding.lg,
                      boxShadow: tokens.shadow.elevation.sm,
                      transition: `all ${tokens.animation.duration.normal}ms ${tokens.animation.transition.smooth}`,
                      '&:hover': {
                        boxShadow: tokens.shadow.elevation.md,
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Stack spacing={2}>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.h5,
                          color: tokens.color.base.sage[900],
                        }}
                      >
                        {venue.name}
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.h4,
                          color: tokens.color.base.sage[700],
                          fontWeight: tokens.typography.weights.bold,
                        }}
                      >
                        {formatPrice(venue.price)}
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.bodySmall,
                          color: tokens.color.base.neutral[600],
                        }}
                      >
                        {venue.duration} • {venue.capacity}
                      </Typography>
                      {venue.includes.length > 0 && (
                        <Stack spacing={0.5}>
                          {venue.includes.map((item, idx) => (
                            <Typography
                              key={idx}
                              sx={{
                                ...tokens.typography.styles.caption,
                                color: tokens.color.base.neutral[600],
                              }}
                            >
                              • {item}
                            </Typography>
                          ))}
                        </Stack>
                      )}
                      {venue.excessHourRate && (
                        <Typography
                          sx={{
                            ...tokens.typography.styles.caption,
                            color: tokens.color.base.neutral[600],
                          }}
                        >
                          Excess hour: {formatPrice(venue.excessHourRate)}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </AnimatedElement>
              ))}
            </Box>
          </Box>

          {/* Combination Packages */}
          <Box>
            <AnimatedElement animation="fadeIn" delay={150}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h4,
                  color: tokens.color.base.sage[900],
                  mb: 4,
                }}
              >
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
                gap: tokens.spacing.layout.grid.gap.lg,
              }}
            >
              {weddingCombos.map((combo, index) => (
                <AnimatedElement key={combo.id} animation="slideUp" delay={200 + index * 50}>
                  <Box
                    sx={{
                      height: '100%',
                      backgroundColor: '#FFFFFF',
                      borderRadius: tokens.spacing.radius.card,
                      padding: tokens.spacing.space.cardPadding.lg,
                      boxShadow: tokens.shadow.elevation.sm,
                      transition: `all ${tokens.animation.duration.normal}ms ${tokens.animation.transition.smooth}`,
                      '&:hover': {
                        boxShadow: tokens.shadow.elevation.md,
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Stack spacing={2}>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.h5,
                          color: tokens.color.base.sage[900],
                        }}
                      >
                        {combo.name}
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.h4,
                          color: tokens.color.base.sage[700],
                          fontWeight: tokens.typography.weights.bold,
                        }}
                      >
                        {formatPrice(combo.price)}
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.bodySmall,
                          color: tokens.color.base.neutral[600],
                        }}
                      >
                        {combo.duration}
                      </Typography>
                      <Stack spacing={0.5}>
                        {combo.includes.map((item, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Check
                              sx={{
                                fontSize: 16,
                                color: tokens.color.semantic.success.main,
                              }}
                            />
                            <Typography
                              sx={{
                                ...tokens.typography.styles.bodySmall,
                                color: tokens.color.base.neutral[600],
                              }}
                            >
                              {item}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>
                  </Box>
                </AnimatedElement>
              ))}
            </Box>
          </Box>

          {/* All-In Wedding Packages */}
          <Box>
            <AnimatedElement animation="fadeIn" delay={150}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h4,
                  color: tokens.color.base.sage[900],
                  mb: 4,
                }}
              >
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
                gap: tokens.spacing.layout.grid.gap.lg,
              }}
            >
              {allInPackages.map((pkg, index) => (
                <AnimatedElement key={pkg.id} animation="slideUp" delay={200 + index * 100}>
                  <Box
                    sx={{
                      height: '100%',
                      backgroundColor: '#FFFFFF',
                      borderRadius: tokens.spacing.radius.card,
                      padding: tokens.spacing.space.cardPadding.lg,
                      boxShadow: tokens.shadow.elevation.md,
                      transition: `all ${tokens.animation.duration.normal}ms ${tokens.animation.transition.smooth}`,
                      '&:hover': {
                        boxShadow: tokens.shadow.elevation.lg,
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Stack spacing={3} sx={{ height: '100%' }}>
                      <Box>
                        <Chip
                          label="All-Inclusive"
                          size="small"
                          sx={{
                            mb: 2,
                            backgroundColor: tokens.color.base.sage[100],
                            color: tokens.color.base.sage[900],
                            fontWeight: tokens.typography.weights.semibold,
                          }}
                        />
                        <Typography
                          sx={{
                            ...tokens.typography.styles.h4,
                            color: tokens.color.base.sage[900],
                          }}
                        >
                          {pkg.guestCount} Guests
                        </Typography>
                        <Typography
                          sx={{
                            ...tokens.typography.styles.bodySmall,
                            color: tokens.color.base.neutral[600],
                          }}
                        >
                          {pkg.venues}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            ...tokens.typography.styles.caption,
                            color: tokens.color.base.neutral[600],
                          }}
                        >
                          Starting at
                        </Typography>
                        <Typography
                          sx={{
                            ...tokens.typography.styles.h3,
                            color: tokens.color.base.sage[700],
                            fontWeight: tokens.typography.weights.bold,
                          }}
                        >
                          {formatPrice(pkg.startingPrice)}
                        </Typography>
                      </Box>

                      <Stack spacing={1} sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            ...tokens.typography.styles.label,
                            color: tokens.color.base.sage[900],
                          }}
                        >
                          Major Inclusions:
                        </Typography>
                        {pkg.includes.map((item, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Check
                              sx={{
                                fontSize: 18,
                                color: tokens.color.semantic.success.main,
                              }}
                            />
                            <Typography
                              sx={{
                                ...tokens.typography.styles.bodySmall,
                                color: tokens.color.base.neutral[600],
                              }}
                            >
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
                        sx={{
                          mt: 'auto',
                          backgroundColor: tokens.color.base.sage[700],
                          color: '#FFFFFF',
                          padding: tokens.spacing.space.buttonPadding.md,
                          borderRadius: tokens.spacing.radius.button,
                          textTransform: 'none',
                          fontWeight: tokens.typography.weights.semibold,
                          '&:hover': {
                            backgroundColor: tokens.color.base.sage[800],
                          },
                        }}
                      >
                        Inquire Now
                      </Button>
                    </Stack>
                  </Box>
                </AnimatedElement>
              ))}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Section>
  );
};
