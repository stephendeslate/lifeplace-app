// pages/rates/components/PackageCard.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { CheckCircle, Star } from '@mui/icons-material';
import { ModernCard, AnimatedElement, tokens } from '../../../design-system';
import { Button } from '../../../design-system';
import type { PackageCardProps } from '../types/rates.types';

export const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, index = 0 }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Determine if this is a premium package (has badge or marked as popular)
  const isPremium = pkg.badge || pkg.tiers.some(tier => tier.isPopular);
  const accentColor = isPremium ? tokens.color.base.gold : tokens.color.base.sage;

  return (
    <AnimatedElement animation="slideUp" delay={100 + index * 150}>
      <ModernCard
        variant="elevated"
        size="large"
        hover={true}
        sx={{
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Premium Badge */}
        {pkg.badge && (
          <Box
            sx={{
              position: 'absolute',
              top: tokens.spacing.space[6],
              right: tokens.spacing.space[6],
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.space[2],
              backgroundColor: accentColor[500],
              color: tokens.color.base.neutral[50],
              px: tokens.spacing.space[4],
              py: tokens.spacing.space[2],
              borderRadius: tokens.spacing.radius.full,
              fontWeight: tokens.typography.weights.semibold,
              fontSize: tokens.typography.sizes.sm,
              boxShadow: tokens.shadow.elevation.sm,
            }}
          >
            <Star sx={{ fontSize: 16 }} />
            {pkg.badge}
          </Box>
        )}

        <Stack spacing={tokens.spacing.space[6]} sx={{ flex: 1 }}>
          {/* Header */}
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: tokens.typography.families.heading,
                fontWeight: tokens.typography.weights.bold,
                fontSize: tokens.typography.sizes['3xl'],
                color: tokens.color.base.neutral[900],
                mb: tokens.spacing.space[2],
              }}
            >
              {pkg.name}
            </Typography>
            {pkg.minimumParticipants && (
              <Typography
                variant="body2"
                sx={{
                  fontFamily: tokens.typography.families.body,
                  fontSize: tokens.typography.sizes.sm,
                  color: tokens.color.base.neutral[600],
                }}
              >
                Minimum {pkg.minimumParticipants} participants
              </Typography>
            )}
          </Box>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              fontFamily: tokens.typography.families.body,
              fontSize: tokens.typography.sizes.base,
              color: tokens.color.base.neutral[700],
              lineHeight: tokens.typography.lineHeights.relaxed,
            }}
          >
            {pkg.description}
          </Typography>

          {/* Price Tiers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: tokens.spacing.space[4],
            }}
          >
            {pkg.tiers.map((tier, tierIdx) => (
              <Box
                key={tierIdx}
                sx={{
                  p: tokens.spacing.space[4],
                  borderRadius: tokens.spacing.radius.lg,
                  backgroundColor: tier.isPopular
                    ? `${accentColor[50]}`
                    : tokens.color.base.neutral[100],
                  border: tier.isPopular
                    ? `2px solid ${accentColor[500]}`
                    : `1px solid ${tokens.color.base.neutral[200]}`,
                  position: 'relative',
                  transition: tokens.animation.transition.all,
                  '&:hover': tier.isPopular ? {
                    boxShadow: `0 4px 12px ${accentColor[200]}`,
                  } : {},
                }}
              >
                {tier.isPopular && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: accentColor[500],
                      color: tokens.color.base.neutral[50],
                      px: tokens.spacing.space[3],
                      py: tokens.spacing.space[1],
                      borderRadius: tokens.spacing.radius.full,
                      fontSize: tokens.typography.sizes.xs,
                      fontWeight: tokens.typography.weights.bold,
                      letterSpacing: '0.5px',
                      boxShadow: tokens.shadow.elevation.sm,
                    }}
                  >
                    POPULAR
                  </Box>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: tokens.typography.families.body,
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.color.base.neutral[600],
                    mb: tokens.spacing.space[1],
                  }}
                >
                  {tier.duration}
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: tokens.typography.families.heading,
                    fontWeight: tokens.typography.weights.bold,
                    fontSize: tokens.typography.sizes['2xl'],
                    color: tokens.color.base.neutral[900],
                  }}
                >
                  {formatPrice(tier.price)}
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: tokens.typography.families.body,
                      fontSize: tokens.typography.sizes.xs,
                      color: tokens.color.base.neutral[600],
                      fontWeight: tokens.typography.weights.regular,
                      ml: tokens.spacing.space[1],
                    }}
                  >
                    /person
                  </Typography>
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Includes */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: tokens.typography.families.heading,
                fontWeight: tokens.typography.weights.semibold,
                fontSize: tokens.typography.sizes.base,
                color: tokens.color.base.neutral[900],
                mb: tokens.spacing.space[4],
              }}
            >
              What's Included:
            </Typography>
            <Stack spacing={tokens.spacing.space[3]}>
              {pkg.includes.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: tokens.spacing.space[3],
                  }}
                >
                  <CheckCircle
                    sx={{
                      fontSize: 20,
                      color: tokens.color.semantic.success.main,
                      mt: '2px',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: tokens.typography.families.body,
                      fontSize: tokens.typography.sizes.sm,
                      color: tokens.color.base.neutral[700],
                      lineHeight: tokens.typography.lineHeights.relaxed,
                    }}
                  >
                    {item}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Notes */}
          {pkg.notes && pkg.notes.length > 0 && (
            <Box
              sx={{
                p: tokens.spacing.space[4],
                borderRadius: tokens.spacing.radius.lg,
                backgroundColor: tokens.color.semantic.warning.subtle,
                border: `1px solid ${tokens.color.semantic.warning.light}`,
              }}
            >
              {pkg.notes.map((note, idx) => (
                <Typography
                  key={idx}
                  variant="caption"
                  sx={{
                    fontFamily: tokens.typography.families.body,
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.color.base.neutral[700],
                    display: 'block',
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    '&:not(:last-child)': {
                      mb: tokens.spacing.space[1],
                    },
                  }}
                >
                  * {note}
                </Typography>
              ))}
            </Box>
          )}

          {/* CTA Button */}
          <Button
            variant="terracotta"
            size="large"
            fullWidth
            sx={{
              mt: 'auto',
              fontFamily: tokens.typography.families.body,
              fontWeight: tokens.typography.weights.semibold,
            }}
            ariaLabel={`Select ${pkg.name} package`}
          >
            Select Package
          </Button>
        </Stack>
      </ModernCard>
    </AnimatedElement>
  );
};
