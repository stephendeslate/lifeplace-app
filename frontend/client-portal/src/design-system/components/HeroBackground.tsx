// design-system/components/HeroBackground.tsx
/**
 * HeroBackground Component
 *
 * A modern, versatile hero background component with support for:
 * - 8 warm, sophisticated gradient variants
 * - Smooth gradient animations (GPU accelerated)
 * - Optional video backgrounds with fallback
 * - Optional image backgrounds
 * - Configurable overlays for text readability
 * - Responsive min-height support
 * - Backward compatibility with legacy gradient names
 *
 * @example
 * ```tsx
 * // Simple gradient with animation
 * <HeroBackground gradient="warmSage" animated>
 *   <Typography variant="h1">Welcome</Typography>
 * </HeroBackground>
 *
 * // Video background with dark overlay
 * <HeroBackground video="/hero.mp4" overlay="dark">
 *   <Typography variant="h1">Experience</Typography>
 * </HeroBackground>
 *
 * // Responsive height
 * <HeroBackground
 *   gradient="sunsetGlow"
 *   minHeight={{ xs: '60vh', md: '100vh' }}
 * >
 *   <Typography variant="h1">Responsive</Typography>
 * </HeroBackground>
 * ```
 */

import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { SxProps } from '@mui/material';
import { tokens } from '../tokens';

export type HeroGradient =
  | 'warmSage'
  | 'sunsetGlow'
  | 'goldenHour'
  | 'earthToSky'
  | 'terracottaWarmth'
  | 'heroWarm'
  | 'heroNatural'
  | 'heroSunset';

export type OverlayType = 'none' | 'light' | 'dark' | 'gradient';

export interface HeroBackgroundProps {
  gradient?: HeroGradient;
  animated?: boolean;
  overlay?: OverlayType;
  video?: string; // Optional video URL
  image?: string; // Optional image URL
  minHeight?: string | { xs?: string; sm?: string; md?: string; lg?: string; xl?: string };
  children?: React.ReactNode;
  sx?: SxProps;
}

// Backward compatibility mapping from old gradient names
const gradientMap: Record<string, HeroGradient> = {
  forest: 'warmSage',
  earth: 'earthToSky',
  sunset: 'sunsetGlow',
  sunrise: 'sunsetGlow',
  mist: 'heroWarm',
  sky: 'heroNatural',
  meadow: 'earthToSky',
};

interface StyledBackgroundProps {
  $gradient: HeroGradient;
  $animated: boolean;
  $overlay: OverlayType;
  $hasVideo: boolean;
  $hasImage: boolean;
  $minHeight: string;
}

const StyledHeroBackground = styled(Box, {
  shouldForwardProp: (prop) =>
    !['$gradient', '$animated', '$overlay', '$hasVideo', '$hasImage', '$minHeight'].includes(prop as string),
})<StyledBackgroundProps>(({
  $gradient,
  $animated,
  $overlay,
  $hasVideo,
  $hasImage,
  $minHeight = '100vh',
}) => {
  const getGradient = () => {
    return tokens.color.gradients[$gradient] || tokens.color.gradients.heroWarm;
  };

  const getOverlayStyles = () => {
    if ($overlay === 'none') return {};

    const overlayConfig = {
      light: tokens.color.overlays.light,
      dark: tokens.color.overlays.darkMedium,
      gradient: tokens.color.overlays.gradientDark,
    };

    return {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: overlayConfig[$overlay as keyof typeof overlayConfig],
        pointerEvents: 'none',
        zIndex: 1,
      },
    };
  };

  return {
    position: 'relative',
    background: $hasVideo || $hasImage ? 'transparent' : getGradient(),
    backgroundSize: $animated ? '400% 400%' : '100% 100%',
    minHeight: $minHeight,
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    // Animation for gradients (GPU accelerated)
    ...($animated && !$hasVideo && !$hasImage && {
      animation: 'heroGradientShift 15s ease infinite',
      '@keyframes heroGradientShift': {
        '0%': {
          backgroundPosition: '0% 50%',
        },
        '50%': {
          backgroundPosition: '100% 50%',
        },
        '100%': {
          backgroundPosition: '0% 50%',
        },
      },
    }),

    // Radial gradient overlay for depth (when not using video/image)
    ...(!$hasVideo && !$hasImage && {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: tokens.color.gradients.radialWarm,
        pointerEvents: 'none',
        zIndex: 0,
      },
    }),

    // Overlay styles
    ...getOverlayStyles(),
  };
});

const VideoBackground = styled('video')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  minWidth: '100%',
  minHeight: '100%',
  width: 'auto',
  height: 'auto',
  transform: 'translate(-50%, -50%)',
  objectFit: 'cover',
  zIndex: 0,
});

const ImageBackground = styled('div')<{ $imageUrl: string }>(({ $imageUrl }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: `url(${$imageUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  zIndex: 0,
}));

const ContentWrapper = styled(Box)({
  position: 'relative',
  zIndex: 2,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * HeroBackground Component
 *
 * Modern hero background component with support for:
 * - Warm, sophisticated gradient backgrounds
 * - Optional video backgrounds
 * - Optional image backgrounds
 * - Smooth gradient animations
 * - Multiple overlay types for text readability
 * - Responsive min-height support
 *
 * @example
 * ```tsx
 * // Simple gradient background
 * <HeroBackground gradient="warmSage" animated>
 *   <Typography variant="h1">Welcome</Typography>
 * </HeroBackground>
 *
 * // Video background with overlay
 * <HeroBackground
 *   video="/videos/hero.mp4"
 *   overlay="dark"
 *   minHeight="80vh"
 * >
 *   <Typography variant="h1">Welcome</Typography>
 * </HeroBackground>
 *
 * // Responsive min-height
 * <HeroBackground
 *   gradient="sunsetGlow"
 *   minHeight={{ xs: '60vh', md: '80vh', lg: '100vh' }}
 * >
 *   <Typography variant="h1">Welcome</Typography>
 * </HeroBackground>
 * ```
 */
export const HeroBackground: React.FC<HeroBackgroundProps> = ({
  gradient = 'heroWarm',
  animated = false,
  overlay = 'none',
  video,
  image,
  minHeight = '100vh',
  children,
  sx,
}) => {
  // Map legacy gradient names to new ones
  const mappedGradient = (gradientMap[gradient] || gradient) as HeroGradient;

  // Handle responsive minHeight through sx
  const minHeightValue = typeof minHeight === 'string' ? minHeight : '100vh';
  const combinedSx = typeof minHeight === 'object' && minHeight
    ? { ...(sx as object || {}), minHeight }
    : sx;

  return (
    <StyledHeroBackground
      $gradient={mappedGradient}
      $animated={animated}
      $overlay={overlay}
      $hasVideo={!!video}
      $hasImage={!!image}
      $minHeight={minHeightValue}
      sx={combinedSx}
    >
      {/* Video Background */}
      {video && (
        <VideoBackground
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src={video} type="video/mp4" />
        </VideoBackground>
      )}

      {/* Image Background */}
      {image && !video && (
        <ImageBackground $imageUrl={image} aria-hidden="true" />
      )}

      {/* Gradient Fallback for Video/Image */}
      {(video || image) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: tokens.color.gradients[mappedGradient],
            zIndex: -1,
          }}
        />
      )}

      {/* Content */}
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </StyledHeroBackground>
  );
};

export default HeroBackground;
