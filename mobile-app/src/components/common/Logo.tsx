/**
 * Logo Component
 *
 * Reusable LifePlace logo component supporting:
 * - Full logo (wheat icon + text + tagline)
 * - Icon only (wheat sheaf)
 * - Light and dark color variants
 * - Multiple sizes
 *
 * Usage:
 *   <Logo variant="full" color="dark" size="md" />
 *   <Logo variant="icon" color="white" size="sm" />
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

// =============================================================================
// ASSETS
// =============================================================================

const LOGO_ASSETS = {
  full: {
    dark: require('../../../assets/brand/logo-full-dark.png'),
    white: require('../../../assets/brand/logo-full-white.png'),
  },
  icon: {
    dark: require('../../../assets/brand/logo-icon-dark.png'),
    white: require('../../../assets/brand/logo-icon-white.png'),
  },
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type LogoVariant = 'full' | 'icon';
export type LogoColor = 'dark' | 'white';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  /** Logo variant: 'full' includes text, 'icon' is wheat sheaf only */
  variant?: LogoVariant;
  /** Color variant for different backgrounds */
  color?: LogoColor;
  /** Predefined size */
  size?: LogoSize;
  /** Custom width (overrides size) */
  width?: number;
  /** Custom height (overrides size) */
  height?: number;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

// Full logo aspect ratio (300x146 from original)
const FULL_LOGO_ASPECT_RATIO = 300 / 146;

// Icon is square (1:1)
const ICON_ASPECT_RATIO = 1;

const SIZES: Record<LogoSize, { full: { width: number }; icon: { width: number } }> = {
  xs: { full: { width: 80 }, icon: { width: 24 } },
  sm: { full: { width: 120 }, icon: { width: 32 } },
  md: { full: { width: 160 }, icon: { width: 44 } },
  lg: { full: { width: 200 }, icon: { width: 56 } },
  xl: { full: { width: 260 }, icon: { width: 72 } },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function Logo({
  variant = 'full',
  color = 'dark',
  size = 'md',
  width: customWidth,
  height: customHeight,
  style,
  testID,
}: LogoProps) {
  // Get the appropriate asset
  const source = LOGO_ASSETS[variant][color];

  // Calculate dimensions
  const aspectRatio = variant === 'full' ? FULL_LOGO_ASPECT_RATIO : ICON_ASPECT_RATIO;
  const defaultWidth = SIZES[size][variant].width;

  let finalWidth: number;
  let finalHeight: number;

  if (customWidth && customHeight) {
    finalWidth = customWidth;
    finalHeight = customHeight;
  } else if (customWidth) {
    finalWidth = customWidth;
    finalHeight = customWidth / aspectRatio;
  } else if (customHeight) {
    finalHeight = customHeight;
    finalWidth = customHeight * aspectRatio;
  } else {
    finalWidth = defaultWidth;
    finalHeight = defaultWidth / aspectRatio;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Image
        source={source}
        style={{
          width: finalWidth,
          height: finalHeight,
        }}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Logo;
