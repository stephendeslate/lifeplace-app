// design-system/components/Container.tsx
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { tokens } from '../tokens';

export interface ContainerProps {
  maxWidth?: 'narrow' | 'content' | 'wide' | 'full';
  padding?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Container component - Constrains content width with responsive padding
 *
 * Purpose: Provides consistent max-width constraints and horizontal padding
 * to maintain optimal content readability and layout.
 *
 * Features:
 * - Max widths: narrow (800px), content (1200px), wide (1400px), full (100%)
 * - Responsive horizontal padding (mobile: 16px, tablet: 24px, desktop: 32px)
 * - Center alignment with margin auto
 * - Optional padding control
 *
 * Usage:
 * ```tsx
 * <Container maxWidth="content">
 *   <Typography variant="h1">Page Title</Typography>
 *   <Typography>Your content here</Typography>
 * </Container>
 * ```
 *
 * Typically used within Section components:
 * ```tsx
 * <Section background="cream" spacing="large">
 *   <Container maxWidth="content">
 *     <ContentHere />
 *   </Container>
 * </Section>
 * ```
 */
export const Container = ({
  maxWidth = 'content',
  padding = true,
  children,
  sx = {},
}: ContainerProps) => {
  // Map maxWidth prop to token values
  const maxWidthMap = {
    narrow: tokens.spacing.layout.maxWidth.narrow,
    content: tokens.spacing.layout.maxWidth.content,
    wide: tokens.spacing.layout.maxWidth.wide,
    full: '100%',
  };

  return (
    <Box
      sx={{
        maxWidth: maxWidthMap[maxWidth],
        width: '100%',
        mx: 'auto',
        ...(padding && {
          px: {
            xs: tokens.spacing.space.containerPadding.mobile,
            sm: tokens.spacing.space.containerPadding.tablet,
            md: tokens.spacing.space.containerPadding.desktop,
            lg: tokens.spacing.space.containerPadding.desktop,
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
