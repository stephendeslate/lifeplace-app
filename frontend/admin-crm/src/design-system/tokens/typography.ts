// Modern LifePlace Admin Typography System
// Implementing a cohesive type scale with optical adjustments

export const typographyTokens = {
  // Font families with fallbacks
  fontFamily: {
    display:
      '"SF Pro Display", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", "JetBrains Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace',
  },

  // Font weights
  fontWeight: {
    thin: 100,
    extraLight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
    black: 900,
  },

  // Typography scale based on Major Third (1.25) with optical adjustments
  fontSize: {
    // Display sizes for heroes and large headings
    display: {
      xs: '3rem', // 48px
      sm: '3.5rem', // 56px
      md: '4rem', // 64px
      lg: '4.5rem', // 72px
      xl: '5rem', // 80px
    },

    // Heading sizes with proper hierarchy
    heading: {
      h1: '2.5rem', // 40px
      h2: '2rem', // 32px
      h3: '1.75rem', // 28px
      h4: '1.5rem', // 24px
      h5: '1.25rem', // 20px
      h6: '1.125rem', // 18px
    },

    // Body text sizes
    body: {
      xl: '1.25rem', // 20px - Large body
      lg: '1.125rem', // 18px - Medium body
      md: '1rem', // 16px - Default body
      sm: '0.875rem', // 14px - Small body
      xs: '0.75rem', // 12px - Tiny body
    },

    // UI element sizes
    ui: {
      button: '0.875rem', // 14px - Button text
      caption: '0.75rem', // 12px - Captions
      overline: '0.75rem', // 12px - Overlines
      label: '0.875rem', // 14px - Form labels
    },
  },

  // Line heights for optimal readability
  lineHeight: {
    none: '1',
    tight: '1.1',
    snug: '1.2',
    normal: '1.4',
    relaxed: '1.5',
    loose: '1.6',
    extraLoose: '1.8',
  },

  // Letter spacing for different contexts
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Complete typography styles combining all properties
  styles: {
    // Display styles for large impactful text
    displayXl: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontSize: '5rem',
      fontWeight: 700,
      lineHeight: '1.1',
      letterSpacing: '-0.025em',
    },

    displayLg: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontSize: '4.5rem',
      fontWeight: 700,
      lineHeight: '1.1',
      letterSpacing: '-0.025em',
    },

    displayMd: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontSize: '4rem',
      fontWeight: 600,
      lineHeight: '1.15',
      letterSpacing: '-0.025em',
    },

    displaySm: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontSize: '3.5rem',
      fontWeight: 600,
      lineHeight: '1.15',
      letterSpacing: '0em',
    },

    displayXs: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontSize: '3rem',
      fontWeight: 600,
      lineHeight: '1.2',
      letterSpacing: '0em',
    },

    // Heading styles for content hierarchy
    h1: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
    },

    h2: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },

    h3: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: '1.3',
      letterSpacing: '0em',
    },

    h4: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: '1.35',
      letterSpacing: '0em',
    },

    h5: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: '1.4',
      letterSpacing: '0em',
    },

    h6: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: '1.4',
      letterSpacing: '0em',
    },

    // Body text styles
    bodyXl: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.25rem',
      fontWeight: 400,
      lineHeight: '1.6',
      letterSpacing: '0em',
    },

    bodyLg: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: '1.5',
      letterSpacing: '0em',
    },

    bodyMd: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: '1.5',
      letterSpacing: '0em',
    },

    bodySm: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: '1.4',
      letterSpacing: '0em',
    },

    bodyXs: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: '1.4',
      letterSpacing: '0em',
    },

    // Emphasis variants
    lead: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1.25rem',
      fontWeight: 400,
      lineHeight: '1.6',
      letterSpacing: '0em',
      color: 'var(--color-neutral-600)',
    },

    subtitle1: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: '1.5',
      letterSpacing: '0em',
    },

    subtitle2: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: '1.4',
      letterSpacing: '0em',
    },

    // UI component styles
    button: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0.025em',
      textTransform: 'none' as const,
    },

    buttonLarge: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0.025em',
      textTransform: 'none' as const,
    },

    buttonSmall: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0.025em',
      textTransform: 'none' as const,
    },

    caption: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: '1.33',
      letterSpacing: '0.025em',
    },

    overline: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: '1.33',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
    },

    label: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: '1.25',
      letterSpacing: '0em',
    },

    // Code and monospace styles
    code: {
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: '1.4',
      letterSpacing: '0em',
    },

    codeSmall: {
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: '1.33',
      letterSpacing: '0em',
    },
  },
} as const;

// CSS Custom Properties for typography
export const typographyCssVariables = {
  // Font families
  '--font-display': typographyTokens.fontFamily.display,
  '--font-body': typographyTokens.fontFamily.body,
  '--font-mono': typographyTokens.fontFamily.mono,

  // Font weights
  '--font-weight-normal': typographyTokens.fontWeight.normal.toString(),
  '--font-weight-medium': typographyTokens.fontWeight.medium.toString(),
  '--font-weight-semibold': typographyTokens.fontWeight.semiBold.toString(),
  '--font-weight-bold': typographyTokens.fontWeight.bold.toString(),

  // Font sizes
  '--font-size-xs': typographyTokens.fontSize.body.xs,
  '--font-size-sm': typographyTokens.fontSize.body.sm,
  '--font-size-md': typographyTokens.fontSize.body.md,
  '--font-size-lg': typographyTokens.fontSize.body.lg,
  '--font-size-xl': typographyTokens.fontSize.body.xl,

  // Line heights
  '--line-height-tight': typographyTokens.lineHeight.tight,
  '--line-height-normal': typographyTokens.lineHeight.normal,
  '--line-height-relaxed': typographyTokens.lineHeight.relaxed,
} as const;

// Type definitions
export type FontFamily = keyof typeof typographyTokens.fontFamily;
export type FontWeight = keyof typeof typographyTokens.fontWeight;
export type FontSize = keyof typeof typographyTokens.fontSize;
export type TypographyStyle = keyof typeof typographyTokens.styles;

// Helper function to get typography style
export const getTypographyStyle = (styleName: TypographyStyle) => {
  return typographyTokens.styles[styleName];
};

// Helper function to create responsive typography
export const createResponsiveTypography = (
  mobile: TypographyStyle,
  tablet?: TypographyStyle,
  desktop?: TypographyStyle,
) => {
  const baseStyle = getTypographyStyle(mobile);
  const tabletStyle = tablet ? getTypographyStyle(tablet) : baseStyle;
  const desktopStyle = desktop ? getTypographyStyle(desktop) : tabletStyle;

  return {
    ...baseStyle,
    '@media (min-width: 768px)': tabletStyle,
    '@media (min-width: 1024px)': desktopStyle,
  };
};

export default typographyTokens;
