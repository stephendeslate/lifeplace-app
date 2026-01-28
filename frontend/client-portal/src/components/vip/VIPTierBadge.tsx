// frontend/client-portal/src/components/vip/VIPTierBadge.tsx

import React from 'react';
import { Chip, Box } from '@mui/material';
import type { ChipProps } from '@mui/material';
import {
  PersonOutline as GuestIcon,
  Handshake as PartnerIcon,
  Star as PremierIcon,
} from '@mui/icons-material';
import type { VIPTier } from '../../types/vip.types';

// Tier configuration with colors and relational display names
const TIER_CONFIG: Record<string, {
  color: string;
  displayName: string;
  Icon: React.ComponentType<{ fontSize?: 'small' | 'medium' | 'large' | 'inherit' }>;
}> = {
  Guest: {
    color: '#6B7280',
    displayName: 'Guest',
    Icon: GuestIcon,
  },
  Partner: {
    color: '#3B82F6',
    displayName: 'Partner Member',
    Icon: PartnerIcon,
  },
  Premier: {
    color: '#F59E0B',
    displayName: 'Premier Member',
    Icon: PremierIcon,
  },
};

interface VIPTierBadgeProps {
  tier: VIPTier;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const sizeMap: Record<string, { chipSize: ChipProps['size']; iconSize: 'small' | 'medium' }> = {
  small: { chipSize: 'small', iconSize: 'small' },
  medium: { chipSize: 'medium', iconSize: 'small' },
  large: { chipSize: 'medium', iconSize: 'medium' },
};

export const VIPTierBadge: React.FC<VIPTierBadgeProps> = ({
  tier,
  size = 'medium',
  showLabel = true,
}) => {
  const config = TIER_CONFIG[tier.name] || TIER_CONFIG.Guest;
  const { chipSize, iconSize } = sizeMap[size];
  const { Icon, color, displayName } = config;

  if (!showLabel) {
    // Icon-only mode
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size === 'small' ? 24 : size === 'medium' ? 32 : 40,
          height: size === 'small' ? 24 : size === 'medium' ? 32 : 40,
          borderRadius: '50%',
          backgroundColor: `${color}20`,
          color: color,
        }}
        aria-label={displayName}
      >
        <Icon fontSize={iconSize} />
      </Box>
    );
  }

  return (
    <Chip
      icon={<Icon fontSize={iconSize} />}
      label={displayName}
      size={chipSize}
      sx={{
        backgroundColor: `${color}20`,
        color: color,
        fontWeight: 600,
        borderColor: `${color}40`,
        border: '1px solid',
        '& .MuiChip-icon': {
          color: color,
        },
        ...(size === 'large' && {
          height: 36,
          fontSize: '0.95rem',
          '& .MuiChip-icon': {
            fontSize: '1.25rem',
          },
        }),
      }}
      aria-label={`VIP Tier: ${displayName}`}
    />
  );
};

export default VIPTierBadge;
