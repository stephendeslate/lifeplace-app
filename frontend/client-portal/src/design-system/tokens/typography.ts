// design-system/tokens/typography.ts
// Modern Organic Luxury Typography System

/**
 * Typography System
 *
 * Serif for elegant headings (Cormorant Garamond - available via Google Fonts)
 * Sans-serif for clean body text (Inter - available via Google Fonts)
 *
 * To use these fonts, add to your index.html:
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 * <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
 */

export const fontFamilies = {
  // Primary font stack for headings
  heading: "'Cormorant Garamond', 'Georgia', 'Times New Roman', serif",

  // Primary font stack for body text
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",

  // Monospace for code (if needed)
  mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",

  // Fallback system fonts
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
};

export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

export const fontSizes = {
  // Base scale (16px base)
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  md: '1.125rem',    // 18px
  lg: '1.25rem',     // 20px
  xl: '1.5rem',      // 24px
  '2xl': '1.875rem', // 30px
  '3xl': '2.25rem',  // 36px
  '4xl': '3rem',     // 48px
  '5xl': '3.75rem',  // 60px
  '6xl': '4.5rem',   // 72px
  '7xl': '6rem',     // 96px

  // Semantic sizing for components
  button: {
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
  },
  input: {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
  },
  label: '0.875rem',
  caption: '0.75rem',
  overline: '0.625rem', // 10px
};

export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 1.75,
  extendedextended: 2,

  // Semantic line heights
  heading: 1.2,
  body: 1.6,
  button: 1.5,
};

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',

  // Semantic tracking
  heading: '-0.02em',   // Tighter for elegance
  body: '0em',          // Normal for readability
  button: '0.025em',    // Slightly wide for prominence
  uppercase: '0.1em',   // Wide for all-caps
};

// Typography presets for common use cases
export const textStyles = {
  // Display styles - for marketing/hero sections
  display1: {
    fontFamily: fontFamilies.heading,
    fontSize: '6rem',          // 96px
    fontWeight: fontWeights.light,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  display2: {
    fontFamily: fontFamilies.heading,
    fontSize: '4.5rem',        // 72px
    fontWeight: fontWeights.regular,
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
  },

  // Heading styles
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: '3.75rem',       // 60px
    fontWeight: fontWeights.semibold,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: '3rem',          // 48px
    fontWeight: fontWeights.semibold,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontFamily: fontFamilies.heading,
    fontSize: '2.25rem',       // 36px
    fontWeight: fontWeights.semibold,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h4: {
    fontFamily: fontFamilies.heading,
    fontSize: '1.875rem',      // 30px
    fontWeight: fontWeights.medium,
    lineHeight: 1.35,
    letterSpacing: '0em',
  },
  h5: {
    fontFamily: fontFamilies.heading,
    fontSize: '1.5rem',        // 24px
    fontWeight: fontWeights.medium,
    lineHeight: 1.4,
    letterSpacing: '0em',
  },
  h6: {
    fontFamily: fontFamilies.heading,
    fontSize: '1.25rem',       // 20px
    fontWeight: fontWeights.medium,
    lineHeight: 1.4,
    letterSpacing: '0em',
  },

  // Body text styles
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: '1.125rem',      // 18px
    fontWeight: fontWeights.regular,
    lineHeight: 1.7,
    letterSpacing: '0em',
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: '1rem',          // 16px
    fontWeight: fontWeights.regular,
    lineHeight: 1.6,
    letterSpacing: '0em',
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: '0.875rem',      // 14px
    fontWeight: fontWeights.regular,
    lineHeight: 1.6,
    letterSpacing: '0em',
  },

  // UI text styles
  button: {
    fontFamily: fontFamilies.body,
    fontSize: '1rem',
    fontWeight: fontWeights.semibold,
    lineHeight: 1.5,
    letterSpacing: '0.025em',
    textTransform: 'none' as const,
  },
  buttonSmall: {
    fontFamily: fontFamilies.body,
    fontSize: '0.875rem',
    fontWeight: fontWeights.semibold,
    lineHeight: 1.5,
    letterSpacing: '0.025em',
    textTransform: 'none' as const,
  },
  buttonLarge: {
    fontFamily: fontFamilies.body,
    fontSize: '1.125rem',
    fontWeight: fontWeights.semibold,
    lineHeight: 1.5,
    letterSpacing: '0.025em',
    textTransform: 'none' as const,
  },

  // Utility styles
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: '0.75rem',       // 12px
    fontWeight: fontWeights.regular,
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  },
  overline: {
    fontFamily: fontFamilies.body,
    fontSize: '0.75rem',
    fontWeight: fontWeights.semibold,
    lineHeight: 1.5,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  label: {
    fontFamily: fontFamilies.body,
    fontSize: '0.875rem',
    fontWeight: fontWeights.medium,
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  },

  // Special styles
  quote: {
    fontFamily: fontFamilies.heading,
    fontSize: '1.5rem',
    fontWeight: fontWeights.regular,
    lineHeight: 1.6,
    letterSpacing: '0em',
    fontStyle: 'italic' as const,
  },
  link: {
    fontFamily: fontFamilies.body,
    fontSize: '1rem',
    fontWeight: fontWeights.medium,
    lineHeight: 1.5,
    letterSpacing: '0em',
    textDecoration: 'underline' as const,
  },
};

// Responsive typography - scales for mobile
export const responsiveTextStyles = {
  display1: {
    mobile: {
      fontSize: '3rem',        // 48px on mobile
      lineHeight: 1.15,
    },
    tablet: {
      fontSize: '4.5rem',      // 72px on tablet
      lineHeight: 1.1,
    },
    desktop: textStyles.display1,
  },
  display2: {
    mobile: {
      fontSize: '2.5rem',      // 40px on mobile
      lineHeight: 1.2,
    },
    tablet: {
      fontSize: '3.5rem',      // 56px on tablet
      lineHeight: 1.15,
    },
    desktop: textStyles.display2,
  },
  h1: {
    mobile: {
      fontSize: '2.25rem',     // 36px on mobile
      lineHeight: 1.25,
    },
    tablet: {
      fontSize: '3rem',        // 48px on tablet
      lineHeight: 1.2,
    },
    desktop: textStyles.h1,
  },
  h2: {
    mobile: {
      fontSize: '1.875rem',    // 30px on mobile
      lineHeight: 1.3,
    },
    tablet: {
      fontSize: '2.5rem',      // 40px on tablet
      lineHeight: 1.25,
    },
    desktop: textStyles.h2,
  },
  h3: {
    mobile: {
      fontSize: '1.5rem',      // 24px on mobile
      lineHeight: 1.35,
    },
    tablet: {
      fontSize: '2rem',        // 32px on tablet
      lineHeight: 1.3,
    },
    desktop: textStyles.h3,
  },
};

export const typography = {
  families: fontFamilies,
  weights: fontWeights,
  sizes: fontSizes,
  lineHeights,
  letterSpacing,
  styles: textStyles,
  responsive: responsiveTextStyles,
};

export default typography;
