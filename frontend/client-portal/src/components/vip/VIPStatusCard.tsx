// frontend/client-portal/src/components/vip/VIPStatusCard.tsx

import React from 'react';
import { Box, Typography, Button, Divider, alpha } from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  Celebration as CelebrationIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { VIPTierBadge } from './VIPTierBadge';
import { VIPProgressBar } from './VIPProgressBar';
import { VIPBenefitCard } from './VIPBenefitCard';
import type { ClientVIPStatus, VIPTier } from '../../types/vip.types';

// Default Guest tier for clients without VIP status
const DEFAULT_GUEST_TIER: VIPTier = {
  id: 0,
  name: 'Guest',
  level: 0,
  color: '#6B7280',
  is_default: true,
};

interface VIPStatusCardProps {
  status: ClientVIPStatus;
  onViewAllBenefits?: () => void;
}

export const VIPStatusCard: React.FC<VIPStatusCardProps> = ({ status, onViewAllBenefits }) => {
  const currentTier = status.current_tier || DEFAULT_GUEST_TIER;
  const isGuest = currentTier.level === 0 || currentTier.name === 'Guest';
  const isPremier = currentTier.level === 2 || currentTier.name === 'Premier';
  const benefits = status.benefits || [];
  const displayBenefits = benefits.slice(0, 3);
  const hasMoreBenefits = benefits.length > 3;

  return (
    <GlassCard variant="gold" intensity="subtle" hover={false} sx={{ p: 3 }}>
      {/* Header with Tier Badge */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            LifePlace Rewards
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <VIPTierBadge tier={currentTier} size="large" />
          </Box>
        </Box>
        {isPremier && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              backgroundColor: alpha('#F59E0B', 0.1),
              color: '#F59E0B',
            }}
          >
            <CelebrationIcon fontSize="small" />
            <Typography variant="caption" fontWeight={600}>
              Top Tier
            </Typography>
          </Box>
        )}
      </Box>

      {/* Guest Tier - Encouraging Message */}
      {isGuest && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            p: 2,
            mb: 2,
            borderRadius: 2,
            backgroundColor: alpha('#3B82F6', 0.08),
          }}
        >
          <TrendingUpIcon sx={{ color: '#3B82F6', mt: 0.25 }} />
          <Box>
            <Typography variant="body2" fontWeight={500} color="text.primary">
              Start your journey to Partner Member
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Complete your first bookings to unlock exclusive benefits and become a valued Partner
              Member.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Progress Bar (only if not at highest tier) */}
      {!isPremier && status.next_tier && (
        <Box sx={{ mb: 2 }}>
          <VIPProgressBar
            progress={status.progress_to_next_tier}
            nextTier={status.next_tier}
            currentTier={currentTier}
          />
        </Box>
      )}

      {/* Premier Tier - Celebration Message */}
      {isPremier && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%)',
            border: '1px solid',
            borderColor: alpha('#F59E0B', 0.2),
          }}
        >
          <Typography variant="body2" color="text.primary" fontWeight={500}>
            You have reached our highest tier!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Thank you for being a valued Premier Member. Enjoy all the exclusive benefits of our top
            tier.
          </Typography>
        </Box>
      )}

      {/* Benefits Preview */}
      {displayBenefits.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            Your Benefits
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {displayBenefits.map((benefit) => (
              <VIPBenefitCard key={benefit.id} benefit={benefit} compact />
            ))}
          </Box>
        </>
      )}

      {/* View All Benefits Link */}
      {(hasMoreBenefits || benefits.length > 0) && onViewAllBenefits && (
        <Button
          onClick={onViewAllBenefits}
          endIcon={<ChevronRightIcon />}
          sx={{
            mt: 2,
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'transparent',
            },
          }}
        >
          {hasMoreBenefits ? `View all ${benefits.length} benefits` : 'View all benefits'}
        </Button>
      )}

      {/* Booking Stats (subtle, not prominently showing points) */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            {status.completed_bookings_count}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Completed Bookings
          </Typography>
        </Box>
      </Box>
    </GlassCard>
  );
};

export default VIPStatusCard;
