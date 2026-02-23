// frontend/admin-crm/src/components/analytics/KPICard.tsx
import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { tokens, createGlassColor } from '../../design-system';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  isLoading?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}

const colorMap = {
  primary: {
    bg: createGlassColor(tokens.color.primary[500], 0.1),
    text: tokens.color.primary[500],
  },
  secondary: {
    bg: createGlassColor(tokens.color.secondary[500], 0.1),
    text: tokens.color.secondary[500],
  },
  success: {
    bg: createGlassColor(tokens.color.success[500], 0.1),
    text: tokens.color.success[500],
  },
  warning: {
    bg: createGlassColor(tokens.color.warning[500], 0.1),
    text: tokens.color.warning[500],
  },
  error: { bg: createGlassColor(tokens.color.error[500], 0.1), text: tokens.color.error[500] },
  info: { bg: createGlassColor(tokens.color.info[500], 0.1), text: tokens.color.info[500] },
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  isLoading = false,
  color = 'primary',
  icon,
}) => {
  const colors = colorMap[color];

  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    if (trend > 0)
      return <TrendingUpIcon sx={{ fontSize: 16, color: tokens.color.success[500] }} />;
    if (trend < 0)
      return <TrendingDownIcon sx={{ fontSize: 16, color: tokens.color.error[500] }} />;
    return <TrendingFlatIcon sx={{ fontSize: 16, color: tokens.color.neutral[500] }} />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === null) return tokens.color.neutral[500];
    if (trend > 0) return tokens.color.success[500];
    if (trend < 0) return tokens.color.error[500];
    return tokens.color.neutral[500];
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 2.5, height: '100%' }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="80%" height={40} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: colors.text,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
        {icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: tokens.spacing.radius.sm,
              backgroundColor: colors.bg,
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, color: colors.text }}>
        {value}
      </Typography>

      {(subtitle || trend !== undefined) && (
        <Box display="flex" alignItems="center" gap={1} mt={1}>
          {trend !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {getTrendIcon()}
              <Typography variant="caption" color={getTrendColor()} fontWeight={500}>
                {trend > 0 ? '+' : ''}
                {trend}%
              </Typography>
            </Box>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {trendLabel || subtitle}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default KPICard;
