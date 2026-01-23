// design-system/components/Section.tsx
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { tokens } from '../tokens';

export interface SectionProps {
  background?: 'cream' | 'white' | 'sage' | 'terracotta' | 'gradient';
  spacing?: 'small' | 'medium' | 'large' | 'xlarge';
  fullWidth?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Section component - Wraps page sections with consistent spacing and backgrounds
 *
 * Purpose: Provides consistent section spacing, backgrounds, and responsive behavior
 * across all pages.
 *
 * Features:
 * - Background colors from design tokens (cream, white, sage, terracotta, gradient)
 * - Consistent vertical spacing (small: 32px, medium: 48px, large: 64px, xlarge: 96px)
 * - Responsive padding that reduces on mobile devices
 * - Optional gradient backgrounds for visual interest
 * - Full-width or constrained layout options
 *
 * Usage:
 * ```tsx
 * <Section background="cream" spacing="large">
 *   <Container>
 *     <Typography>Your content here</Typography>
 *   </Container>
 * </Section>
 * ```
 */
export const Section = ({
  background = 'cream',
  spacing = 'medium',
  fullWidth = false,
  children,
  sx = {},
}: SectionProps) => {
  // Map spacing prop to token values
  const spacingMap = {
    small: tokens.spacing.space.sectionPadding.sm,
    medium: tokens.spacing.space.sectionPadding.md,
    large: tokens.spacing.space.sectionPadding.lg,
    xlarge: tokens.spacing.space.sectionPadding.xl,
  };

  // Map background prop to colors from tokens
  const getBackground = () => {
    switch (background) {
      case 'white':
        return '#FFFFFF';
      case 'cream':
        return tokens.color.base.neutral[50]; // Warm Cream
      case 'sage':
        return tokens.color.base.sage[50];
      case 'terracotta':
        return tokens.color.base.terracotta[50];
      case 'gradient':
        return tokens.color.gradients.heroNatural;
      default:
        return tokens.color.base.neutral[50];
    }
  };

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        background: getBackground(),
        py: {
          xs: `calc(${spacingMap[spacing]} * 0.6)`, // 60% on mobile
          sm: `calc(${spacingMap[spacing]} * 0.75)`, // 75% on tablet
          md: spacingMap[spacing], // Full spacing on desktop
        },
        ...(fullWidth && {
          px: 0,
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
