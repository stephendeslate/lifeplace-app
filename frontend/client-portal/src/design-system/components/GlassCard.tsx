// design-system/components/GlassCard.tsx

import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { BoxProps } from '@mui/material';
import { tokens } from '../tokens';

export type GlassVariant = 'light' | 'dark' | 'forest' | 'earth' | 'gold';
export type GlassIntensity = 'subtle' | 'medium' | 'strong';

interface GlassCardProps extends BoxProps {
  variant?: GlassVariant;
  intensity?: GlassIntensity;
  hover?: boolean;
  gradient?: boolean;
  overflow?: 'hidden' | 'visible' | 'auto';
  children?: React.ReactNode;
}

const intensityMap = {
  subtle: {
    blur: '6px',
    opacity: 0.1,
  },
  medium: {
    blur: '10px',
    opacity: 0.15,
  },
  strong: {
    blur: '20px',
    opacity: 0.25,
  },
};

const StyledGlassCard = styled(Box, {
  shouldForwardProp: (prop) =>
    !['variant', 'intensity', 'hover', 'gradient', 'overflow'].includes(prop as string),
})<GlassCardProps>(({ variant = 'light', intensity = 'medium', hover = true, gradient = false, overflow = 'hidden' }) => {
  const getGlassEffect = () => {
    switch (variant) {
      case 'dark':
        return tokens.color.glass.darkGlass;
      case 'forest':
        return tokens.color.glass.coloredGlass.forest;
      case 'earth':
        return tokens.color.glass.coloredGlass.earth;
      case 'gold':
        return tokens.color.glass.coloredGlass.gold;
      default:
        return tokens.color.glass.lightGlass;
    }
  };

  const glass = getGlassEffect();
  const intensitySettings = intensityMap[intensity];

  return {
    position: 'relative',
    background: gradient 
      ? `${tokens.color.gradients.glassOverlay}, ${glass.background}`
      : glass.background,
    backdropFilter: `blur(${intensitySettings.blur})`,
    WebkitBackdropFilter: `blur(${intensitySettings.blur})`,
    border: glass.border,
    borderRadius: tokens.spacing.radius.card,
    padding: tokens.spacing.space[3],
    transition: tokens.animation.transition.all,
    overflow,
    
    '&::before': gradient ? {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: tokens.color.gradients.glassOverlay,
      pointerEvents: 'none',
      zIndex: 0,
    } : {},
    
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },
    
    ...(hover && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: tokens.shadow.elevation.xl,
        background: gradient
          ? `${tokens.color.gradients.glassOverlay}, rgba(255, 255, 255, ${intensitySettings.opacity + 0.05})`
          : `rgba(255, 255, 255, ${intensitySettings.opacity + 0.05})`,
      },
    }),
  };
});

export const GlassCard: React.FC<GlassCardProps> = ({ children, ...props }) => {
  return (
    <StyledGlassCard {...props}>
      {children}
    </StyledGlassCard>
  );
};

export default GlassCard;