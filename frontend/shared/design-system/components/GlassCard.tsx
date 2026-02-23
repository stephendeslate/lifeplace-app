// Shared Glassmorphism Card Component
// Consistent glass effects across admin and client applications

import React from 'react';
import { Box, type BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens, type GlassColor } from '../tokens/base';

// Glass effect variants
export type GlassVariant = 'light' | 'dark' | 'colored';
export type GlassIntensity = 'subtle' | 'medium' | 'strong';

export interface GlassCardProps extends Omit<BoxProps, 'component'> {
  variant?: GlassVariant;
  intensity?: GlassIntensity;
  color?: GlassColor;
  hoverable?: boolean;
  elevated?: boolean;
  children?: React.ReactNode;
}

const StyledGlassCard = styled(Box, {
  shouldForwardProp: (prop) =>
    !['variant', 'intensity', 'color', 'hoverable', 'elevated'].includes(prop as string),
})<GlassCardProps>(({
  theme,
  variant = 'light',
  intensity = 'medium',
  color = 'neutral',
  hoverable = false,
  elevated = false,
}) => {
  const isDark = theme.palette.mode === 'dark';

  // Get glass effect based on theme mode and variant
  const getGlassEffect = () => {
    const themeVariant = isDark ? 'dark' : 'light';
    const glassEffect = designTokens.glass[themeVariant][intensity];

    if (variant === 'colored' && color !== 'neutral') {
      return {
        ...glassEffect,
        background: designTokens.glass.colored[color].background,
        border: `1px solid ${designTokens.glass.colored[color].border}`,
      };
    }

    return {
      ...glassEffect,
      border: `1px solid ${glassEffect.border}`,
    };
  };

  const glassEffect = getGlassEffect();

  // Calculate enhanced hover effects
  const getHoverEffect = () => {
    if (!hoverable) return {};

    const baseIntensity = intensity === 'subtle' ? 0.15 : intensity === 'medium' ? 0.2 : 0.3;
    const hoverOpacity = Math.min(baseIntensity + 0.05, 0.35);

    return {
      '&:hover': {
        transform: 'translateY(-2px)',
        backdropFilter: 'blur(20px)',
        backgroundColor: isDark
          ? `rgba(255, 255, 255, ${hoverOpacity * 0.4})`
          : `rgba(255, 255, 255, ${hoverOpacity})`,
        boxShadow: elevated ? designTokens.shadows.glass.strong : designTokens.shadows.glass.medium,
        borderColor:
          variant === 'colored' && color !== 'neutral'
            ? designTokens.glass.colored[color].border
            : isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.25)',
      },
    };
  };

  const elevatedShadow = elevated
    ? designTokens.shadows.glass.medium
    : designTokens.shadows.glass.light;

  return {
    position: 'relative',
    backgroundColor: glassEffect.background,
    backdropFilter: glassEffect.blur,
    WebkitBackdropFilter: glassEffect.blur, // Safari support
    border: glassEffect.border,
    borderRadius: Number(theme.shape.borderRadius) * 1.5,
    padding: designTokens.spacing.space[4],
    boxShadow: elevatedShadow,
    transition: designTokens.animations.transitions.all,
    cursor: hoverable ? 'pointer' : 'default',
    overflow: 'hidden',

    // Ensures content is positioned above the glass overlay
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },

    // Add subtle shimmer effect for enhanced glass appearance
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
      transition: 'left 0.5s ease',
      zIndex: 0,
    },

    // Shimmer animation on hover for interactive cards
    ...(hoverable && {
      '&:hover::before': {
        left: '100%',
      },
    }),

    ...getHoverEffect(),

    // Responsive adjustments
    [theme.breakpoints.down('sm')]: {
      padding: designTokens.spacing.space[3],
      borderRadius: theme.shape.borderRadius,
    },
  };
});

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'light',
  intensity = 'medium',
  color = 'neutral',
  hoverable = false,
  elevated = false,
  ...props
}) => {
  return (
    <StyledGlassCard
      variant={variant}
      intensity={intensity}
      color={color}
      hoverable={hoverable}
      elevated={elevated}
      {...props}
    >
      {children}
    </StyledGlassCard>
  );
};

// Convenience components for common use cases
export const GlassCardSubtle: React.FC<Omit<GlassCardProps, 'intensity'>> = (props) => (
  <GlassCard intensity="subtle" {...props} />
);

export const GlassCardMedium: React.FC<Omit<GlassCardProps, 'intensity'>> = (props) => (
  <GlassCard intensity="medium" {...props} />
);

export const GlassCardStrong: React.FC<Omit<GlassCardProps, 'intensity'>> = (props) => (
  <GlassCard intensity="strong" {...props} />
);

export const InteractiveGlassCard: React.FC<Omit<GlassCardProps, 'hoverable'>> = (props) => (
  <GlassCard hoverable elevated {...props} />
);

export const ColoredGlassCard: React.FC<GlassCardProps> = ({ color = 'primary', ...props }) => (
  <GlassCard variant="colored" color={color} {...props} />
);

export default GlassCard;
