// Modern Card Component
// Clean, sophisticated card using Modern Organic Luxury design system
// Replaces heavy glassmorphism with subtle elevation

import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { tokens } from '../tokens';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CardVariant = 'subtle' | 'elevated' | 'warm' | 'terracotta' | 'sage' | 'outlined';
export type CardSize = 'small' | 'medium' | 'large';

export interface ModernCardProps {
  /**
   * Visual variant of the card
   * - subtle: Warm cream background, minimal shadow
   * - elevated: White/cream with medium shadow
   * - warm: Terracotta tint, warm shadow
   * - terracotta: Terracotta background gradient
   * - sage: Sage background gradient
   * - outlined: Border only, no background
   */
  variant?: CardVariant;

  /**
   * Size determines padding
   * - small: 16px padding
   * - medium: 24px padding (default)
   * - large: 32px padding
   */
  size?: CardSize;

  /**
   * Enable hover effect with elevation and transform
   */
  hover?: boolean;

  /**
   * Make card clickable with pointer cursor and enhanced hover
   */
  clickable?: boolean;

  /**
   * Click handler (automatically sets clickable to true)
   */
  onClick?: () => void;

  /**
   * Card content
   */
  children: React.ReactNode;

  /**
   * Additional MUI sx styles
   */
  sx?: SxProps<Theme>;

  /**
   * Additional className for custom styling
   */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get padding based on size
 */
const getSizePadding = (size: CardSize): string => {
  const paddingMap: Record<CardSize, string> = {
    small: tokens.spacing.space[4],   // 16px
    medium: tokens.spacing.space[6],  // 24px
    large: tokens.spacing.space[8],   // 32px
  };
  return paddingMap[size];
};

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: CardVariant) => {
  const variantStyles: Record<CardVariant, SxProps<Theme>> = {
    subtle: {
      backgroundColor: tokens.color.base.neutral[50],
      boxShadow: tokens.shadow.elevation.xs,
      border: 'none',
    },
    elevated: {
      backgroundColor: '#FFFFFF',
      boxShadow: tokens.shadow.elevation.card,
      border: 'none',
    },
    warm: {
      backgroundColor: `${tokens.color.base.neutral[50]}`,
      backgroundImage: 'linear-gradient(135deg, rgba(251, 207, 232, 0.1) 0%, rgba(244, 224, 210, 0.15) 100%)',
      boxShadow: '0 2px 8px rgba(236, 72, 153, 0.08)',
      border: 'none',
    },
    terracotta: {
      backgroundColor: '#FBE5D6',
      backgroundImage: 'linear-gradient(135deg, #FBE5D6 0%, #F4E0D2 100%)',
      boxShadow: '0 2px 12px rgba(217, 119, 6, 0.15)',
      border: 'none',
    },
    sage: {
      backgroundColor: '#E8F4E8',
      backgroundImage: 'linear-gradient(135deg, #E8F4E8 0%, #DFF0DF 100%)',
      boxShadow: '0 2px 12px rgba(34, 197, 94, 0.12)',
      border: 'none',
    },
    outlined: {
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: `1px solid ${tokens.color.base.neutral[200]}`,
    },
  };

  return variantStyles[variant];
};

/**
 * Get hover styles
 */
const getHoverStyles = (variant: CardVariant, clickable: boolean): SxProps<Theme> => {
  if (!clickable) {
    return {
      '&:hover': {
        boxShadow: tokens.shadow.elevation.cardHover,
        transform: 'translateY(-2px)',
      },
    };
  }

  // Enhanced hover for clickable cards
  const hoverShadowMap: Record<CardVariant, string> = {
    subtle: tokens.shadow.elevation.md,
    elevated: tokens.shadow.elevation.lg,
    warm: '0 4px 16px rgba(236, 72, 153, 0.15)',
    terracotta: '0 4px 20px rgba(217, 119, 6, 0.25)',
    sage: '0 4px 20px rgba(34, 197, 94, 0.2)',
    outlined: tokens.shadow.elevation.md,
  };

  return {
    '&:hover': {
      boxShadow: hoverShadowMap[variant],
      transform: 'translateY(-4px)',
      cursor: 'pointer',
    },
    '&:active': {
      transform: 'translateY(-1px)',
      boxShadow: tokens.shadow.elevation.sm,
    },
  };
};

// ============================================================================
// Component
// ============================================================================

/**
 * ModernCard - A sophisticated card component using the Modern Organic Luxury design system
 *
 * Features:
 * - Six variants: subtle, elevated, warm, terracotta, sage, outlined
 * - Three sizes: small, medium, large
 * - Smooth hover animations with elevation changes
 * - Clickable state with enhanced interactions
 * - Full design token integration (no hardcoded values)
 *
 * @example
 * ```tsx
 * <ModernCard variant="elevated" size="medium" hover>
 *   <Typography variant="h6">Card Title</Typography>
 *   <Typography>Card content goes here</Typography>
 * </ModernCard>
 * ```
 */
export const ModernCard: React.FC<ModernCardProps> = ({
  variant = 'elevated',
  size = 'medium',
  hover = false,
  clickable = false,
  onClick,
  children,
  sx = {},
  className,
}) => {
  // If onClick is provided, automatically make it clickable
  const isClickable = clickable || !!onClick;

  // Build combined styles using array format (MUI preferred)
  const combinedSx = [
    {
      borderRadius: tokens.spacing.radius.xxl,
      padding: getSizePadding(size),
      position: 'relative',
      transition: tokens.animation.transition.smooth,
    },
    getVariantStyles(variant),
    hover || isClickable ? getHoverStyles(variant, isClickable) : {},
    ...(Array.isArray(sx) ? sx : [sx]),
  ] as SxProps<Theme>;

  return (
    <Box
      className={className}
      onClick={onClick}
      sx={combinedSx}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </Box>
  );
};

// ============================================================================
// Export
// ============================================================================

export default ModernCard;
