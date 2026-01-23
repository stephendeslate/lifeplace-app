// design-system/components/ImageWithOverlay.tsx
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { tokens } from '../tokens';

export interface ImageWithOverlayProps {
  image: string;
  alt: string;
  overlay?: 'none' | 'light' | 'dark' | 'gradient';
  overlayOpacity?: number;
  height?: string | { xs?: string; sm?: string; md?: string; lg?: string };
  objectFit?: 'cover' | 'contain';
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * ImageWithOverlay component - Display images with text overlays for hero sections
 *
 * Purpose: Provides a consistent way to display images with overlays for improved
 * text readability in hero sections and feature areas.
 *
 * Features:
 * - Responsive image display with optimized loading
 * - Multiple overlay types (none, light, dark, gradient)
 * - Gradient overlays for enhanced text readability
 * - Customizable opacity for fine-tuned contrast
 * - Content positioning with z-index management
 * - Border radius from design tokens
 * - Flexible height control (string or responsive object)
 *
 * Usage:
 * ```tsx
 * <ImageWithOverlay
 *   image="/path/to/image.jpg"
 *   alt="Beautiful venue"
 *   overlay="gradient"
 *   height={{ xs: '400px', md: '600px' }}
 * >
 *   <Typography variant="h1" color="white">
 *     Welcome to LifePlace
 *   </Typography>
 * </ImageWithOverlay>
 * ```
 */
export const ImageWithOverlay = ({
  image,
  alt,
  overlay = 'none',
  overlayOpacity,
  height = '500px',
  objectFit = 'cover',
  children,
  sx = {},
}: ImageWithOverlayProps) => {
  // Get overlay style from tokens
  const getOverlayBackground = () => {
    if (overlay === 'none') return 'transparent';

    const baseOverlay = {
      light: tokens.color.overlays.medium,
      dark: tokens.color.overlays.darkMedium,
      gradient: tokens.color.overlays.gradientDark,
    }[overlay];

    // Apply custom opacity if provided
    if (overlayOpacity !== undefined && overlay !== 'gradient') {
      const baseColor = overlay === 'light'
        ? `rgba(250, 247, 242, ${overlayOpacity})`
        : `rgba(46, 42, 40, ${overlayOpacity})`;
      return baseColor;
    }

    return baseOverlay;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        borderRadius: tokens.spacing.radius.image,
        ...sx,
      }}
    >
      {/* Image */}
      <Box
        component="img"
        src={image}
        alt={alt}
        loading="lazy"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition: 'center',
        }}
      />

      {/* Overlay */}
      {overlay !== 'none' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: getOverlayBackground(),
            zIndex: tokens.spacing.zIndex.base + 1,
          }}
        />
      )}

      {/* Content */}
      {children && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: tokens.spacing.zIndex.base + 2,
            p: {
              xs: tokens.spacing.space.containerPadding.mobile,
              sm: tokens.spacing.space.containerPadding.tablet,
              md: tokens.spacing.space.containerPadding.desktop,
            },
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};
