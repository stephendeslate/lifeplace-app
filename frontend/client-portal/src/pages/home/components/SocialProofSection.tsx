// pages/home/components/SocialProofSection.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { SocialProofBadge, TrustIndicators } from '../../../design-system/components/SocialProof';
import type { SocialProofStats } from '../types/home.types';

export const SocialProofSection: React.FC = () => {
  // Static social proof data - no live updates or popups
  const socialProofStats: SocialProofStats = {
    totalEvents: 2450,
    completedEvents: 2000,
    activeEvents: 23,
    eventsThisMonth: 156,
    clientSatisfactionRate: 98,
  };

  return (
    <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'grey.50', width: '100vw' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <Stack spacing={4} alignItems="center">
            <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main', textAlign: 'center' }}>
              Trusted by Hundreds of Families
            </Typography>
            
            {/* Social proof stats without popups */}
            <SocialProofBadge stats={socialProofStats} compact={false} />
            
            {/* Trust indicators */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <TrustIndicators compact={false} />
            </Box>
          </Stack>
        </AnimatedElement>
      </Box>
    </Box>
  );
};