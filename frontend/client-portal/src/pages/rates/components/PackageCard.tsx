// pages/rates/components/PackageCard.tsx

import React from 'react';
import { Box, Typography, Stack, Chip, alpha, useTheme } from '@mui/material';
import { Check, Star } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { PackageCardProps } from '../types/rates.types';

export const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, index = 0 }) => {
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
    <AnimatedElement animation="fadeIn" delay={200 + index * 100}>
      <GlassCard
        variant="light"
        intensity="medium"
        hover={true}
        sx={{ height: '100%', position: 'relative' }}
      >
        {/* Badge */}
        {pkg.badge && (
          <Chip
            icon={<Star sx={{ fontSize: 16 }} />}
            label={pkg.badge}
            color="primary"
            size="small"
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              fontWeight: 600,
            }}
          />
        )}

        <Stack spacing={3} sx={{ p: 4, height: '100%' }}>
          {/* Header */}
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {pkg.name}
            </Typography>
            {pkg.minimumParticipants && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Minimum {pkg.minimumParticipants} participants
              </Typography>
            )}
          </Box>

          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {pkg.description}
          </Typography>

          {/* Price Tiers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            {pkg.tiers.map((tier, tierIdx) => (
              <Box
                key={tierIdx}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: tier.isPopular
                    ? alpha(theme.palette.primary.main, 0.1)
                    : alpha(theme.palette.grey[500], 0.05),
                  border: tier.isPopular
                    ? `2px solid ${theme.palette.primary.main}`
                    : '1px solid',
                  borderColor: tier.isPopular ? 'primary.main' : 'divider',
                  position: 'relative',
                }}
              >
                {tier.isPopular && (
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontWeight: 600,
                    }}
                  >
                    POPULAR
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {tier.duration}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatPrice(tier.price)}
                  <Typography component="span" variant="caption" color="text.secondary">
                    /person
                  </Typography>
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Includes */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              What's Included:
            </Typography>
            <Stack spacing={1}>
              {pkg.includes.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Check sx={{ fontSize: 18, color: 'success.main', mt: 0.25 }} />
                  <Typography variant="body2" color="text.secondary">
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
                p: 2,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
              }}
            >
              {pkg.notes.map((note, idx) => (
                <Typography key={idx} variant="caption" color="text.secondary" display="block">
                  * {note}
                </Typography>
              ))}
            </Box>
          )}
        </Stack>
      </GlassCard>
    </AnimatedElement>
  );
};
