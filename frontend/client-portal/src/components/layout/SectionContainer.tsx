// components/layout/SectionContainer.tsx

import React from 'react';
import { Box, Container, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface SectionContainerProps {
  children: React.ReactNode;
  /** Background color or gradient for the full-width section */
  background?: string;
  /** Use theme palette color (e.g., 'primary.main', 'background.default') */
  bgcolor?: string;
  /** Maximum width for content - defaults to 1400px */
  maxWidth?: number | string;
  /** Vertical padding */
  py?: { xs?: number; sm?: number; md?: number; lg?: number } | number;
  /** Horizontal padding for inner content */
  px?: { xs?: number; sm?: number; md?: number; lg?: number } | number;
  /** Add subtle edge vignette on ultra-wide screens */
  edgeVignette?: boolean;
  /** Additional styles for the outer wrapper */
  wrapperSx?: SxProps<Theme>;
  /** Additional styles for the inner container */
  containerSx?: SxProps<Theme>;
  /** HTML element type for semantic markup */
  component?: React.ElementType;
  /** Text color for the section */
  color?: string;
}

/**
 * SectionContainer - Handles full-width backgrounds with centered max-width content.
 *
 * On screens wider than maxWidth, the background extends edge-to-edge while
 * content stays centered. Optionally adds a subtle vignette effect on the edges
 * to reduce the "floating content" appearance on ultra-wide monitors.
 */
export const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  background,
  bgcolor,
  maxWidth = 1400,
  py = { xs: 8, md: 12 },
  px = { xs: 2, sm: 3, md: 4 },
  edgeVignette = false,
  wrapperSx,
  containerSx,
  component = 'section',
  color,
}) => {
  const theme = useTheme();

  return (
    <Box
      component={component}
      sx={{
        width: '100%',
        position: 'relative',
        ...(background && { background }),
        ...(bgcolor && { bgcolor }),
        ...(color && { color }),
        py,
        // Edge vignette creates subtle darkening at the sides on ultra-wide screens
        ...(edgeVignette && {
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: { xs: 0, xl: '10%' },
            pointerEvents: 'none',
            zIndex: 1,
          },
          '&::before': {
            left: 0,
            background: `linear-gradient(to right, ${alpha(theme.palette.common.black, 0.03)}, transparent)`,
          },
          '&::after': {
            right: 0,
            background: `linear-gradient(to left, ${alpha(theme.palette.common.black, 0.03)}, transparent)`,
          },
        }),
        ...wrapperSx,
      }}
    >
      <Box
        sx={{
          maxWidth,
          mx: 'auto',
          px,
          position: 'relative',
          zIndex: 2,
          ...containerSx,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

/**
 * Alternative using MUI Container for more control
 */
export const SectionWithContainer: React.FC<SectionContainerProps> = ({
  children,
  background,
  bgcolor,
  maxWidth = 'lg', // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  py = { xs: 8, md: 12 },
  px = { xs: 2, sm: 3, md: 4 },
  wrapperSx,
  containerSx,
  component = 'section',
  color,
}) => {
  return (
    <Box
      component={component}
      sx={{
        width: '100%',
        ...(background && { background }),
        ...(bgcolor && { bgcolor }),
        ...(color && { color }),
        py,
        ...wrapperSx,
      }}
    >
      <Container
        maxWidth={maxWidth as 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false}
        sx={{
          px,
          ...containerSx,
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default SectionContainer;
