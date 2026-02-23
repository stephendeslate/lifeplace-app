// frontend/client-portal/src/components/vip/VIPBenefitCard.tsx

import React from 'react';
import { Card, CardContent, Typography, Chip, Box, alpha } from '@mui/material';
import {
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
  Schedule as HoursIcon,
  MoneyOff as WaiveIcon,
  EventAvailable as PriorityIcon,
  LockOpen as EarlyAccessIcon,
  CardGiftcard as ExclusiveIcon,
  Redeem as AddonIcon,
  Star as DefaultIcon,
} from '@mui/icons-material';
import type { VIPBenefit, VIPBenefitType } from '../../types/vip.types';

// Icon mapping for benefit types
const BENEFIT_ICONS: Record<
  VIPBenefitType,
  React.ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>
> = {
  PERCENTAGE_DISCOUNT: PercentIcon,
  FIXED_DISCOUNT: MoneyIcon,
  FREE_HOURS: HoursIcon,
  WAIVE_SERVICE_CHARGE: WaiveIcon,
  WAIVE_LATE_FEE: WaiveIcon,
  WAIVE_RESCHEDULING_FEE: WaiveIcon,
  PRIORITY_BOOKING: PriorityIcon,
  EARLY_ACCESS: EarlyAccessIcon,
  EXCLUSIVE_PACKAGE: ExclusiveIcon,
  COMPLIMENTARY_ADDON: AddonIcon,
};

// Color mapping for benefit types
const BENEFIT_COLORS: Record<VIPBenefitType, string> = {
  PERCENTAGE_DISCOUNT: '#10B981',
  FIXED_DISCOUNT: '#10B981',
  FREE_HOURS: '#3B82F6',
  WAIVE_SERVICE_CHARGE: '#8B5CF6',
  WAIVE_LATE_FEE: '#8B5CF6',
  WAIVE_RESCHEDULING_FEE: '#8B5CF6',
  PRIORITY_BOOKING: '#F59E0B',
  EARLY_ACCESS: '#EC4899',
  EXCLUSIVE_PACKAGE: '#F59E0B',
  COMPLIMENTARY_ADDON: '#06B6D4',
};

interface VIPBenefitCardProps {
  benefit: VIPBenefit;
  compact?: boolean;
}

export const VIPBenefitCard: React.FC<VIPBenefitCardProps> = ({ benefit, compact = false }) => {
  const Icon = BENEFIT_ICONS[benefit.benefit_type] || DefaultIcon;
  const color = BENEFIT_COLORS[benefit.benefit_type] || '#6B7280';
  const isAutomatic = benefit.application_mode === 'AUTOMATIC';

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 1,
            backgroundColor: alpha(color, 0.1),
            color: color,
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {benefit.display_name}
          </Typography>
        </Box>
        <Chip
          label={isAutomatic ? 'Active' : 'Redeemable'}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 500,
            backgroundColor: isAutomatic ? alpha('#10B981', 0.1) : alpha('#3B82F6', 0.1),
            color: isAutomatic ? '#10B981' : '#3B82F6',
            flexShrink: 0,
          }}
        />
      </Box>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: alpha(color, 0.4),
          boxShadow: `0 4px 12px ${alpha(color, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              color: color,
              flexShrink: 0,
            }}
          >
            <Icon fontSize="medium" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mb: 0.5,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                {benefit.display_name}
              </Typography>
              <Chip
                label={isAutomatic ? 'Active' : 'Redeemable'}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  backgroundColor: isAutomatic ? alpha('#10B981', 0.1) : alpha('#3B82F6', 0.1),
                  color: isAutomatic ? '#10B981' : '#3B82F6',
                  flexShrink: 0,
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {benefit.description}
            </Typography>
            {benefit.value && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                Value: {benefit.value}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VIPBenefitCard;
