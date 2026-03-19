// Welcome-back banner shown when user is authenticated

import React from 'react';
import { Box, Typography, Avatar, Chip, alpha, useTheme } from '@mui/material';
import { Verified as VerifiedIcon, Star as StarIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface AuthenticatedUserBannerProps {
  firstName: string;
}

export const AuthenticatedUserBanner: React.FC<AuthenticatedUserBannerProps> = ({ firstName }) => {
  const theme = useTheme();

  return (
    <AnimatedElement animation="slideRight" delay={250}>
      <GlassCard
        variant="light"
        intensity="subtle"
        sx={{
          mb: 4,
          backgroundColor: alpha(theme.palette.success.main, 0.1),
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.15),
              color: theme.palette.success.main,
            }}
          >
            <VerifiedIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Welcome back, {firstName}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We've pre-filled your information from your account
            </Typography>
          </Box>
          <Chip
            label="Verified User"
            size="small"
            icon={<StarIcon />}
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.2),
              color: theme.palette.success.main,
            }}
          />
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};
