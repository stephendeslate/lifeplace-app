// design-system/components/GradientBackground.tsx

import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { BoxProps } from '@mui/material';
import { tokens } from '../tokens';

export type GradientType = 
  | 'sunrise' 
  | 'sunset' 
  | 'forest' 
  | 'meadow' 
  | 'sky' 
  | 'earth' 
  | 'mist'
  | 'custom';

interface GradientBackgroundProps extends BoxProps {
  gradient?: GradientType;
  customGradient?: string;
  animated?: boolean;
  overlay?: boolean;
  children?: React.ReactNode;
}

const StyledGradientBackground = styled(Box, {
  shouldForwardProp: (prop) => 
    !['gradient', 'customGradient', 'animated', 'overlay'].includes(prop as string),
})<GradientBackgroundProps>(({ 
  gradient = 'forest', 
  customGradient, 
  animated = false, 
  overlay = true 
}) => {
  const getGradient = () => {
    if (gradient === 'custom' && customGradient) {
      return customGradient;
    }
    return tokens.color.gradients[gradient as keyof typeof tokens.color.gradients] || tokens.color.gradients.forest;
  };

  return {
    position: 'relative',
    background: getGradient(),
    backgroundSize: animated ? '200% 200%' : '100% 100%',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden',
    
    ...(animated && {
      animation: 'gradient 15s ease infinite',
      '@keyframes gradient': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
      },
    }),
    
    ...(overlay && {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
      },
    }),
  };
});

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  ...props
}) => {
  return (
    <StyledGradientBackground {...props}>
      <Box position="relative" zIndex={1} sx={{ width: '100%', height: '100%' }}>
        {children}
      </Box>
    </StyledGradientBackground>
  );
};

export default GradientBackground;