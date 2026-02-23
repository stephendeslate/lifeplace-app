// Responsive Design Utilities
// Consistent responsive patterns across applications

import { type Theme } from '@mui/material/styles';
import { designTokens } from '../tokens/base';

// Breakpoint utilities
export const breakpoints = {
  xs: designTokens.spacing.breakpoints.xs,
  sm: designTokens.spacing.breakpoints.sm,
  md: designTokens.spacing.breakpoints.md,
  lg: designTokens.spacing.breakpoints.lg,
  xl: designTokens.spacing.breakpoints.xl,
  '2xl': designTokens.spacing.breakpoints['2xl'],
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Media query generators
export const mediaQuery = {
  up: (breakpoint: Breakpoint) => `@media (min-width: ${breakpoints[breakpoint]})`,
  down: (breakpoint: Breakpoint) => {
    const bpValue = parseInt(breakpoints[breakpoint].replace('px', ''), 10);
    return `@media (max-width: ${bpValue - 1}px)`;
  },
  between: (min: Breakpoint, max: Breakpoint) =>
    `@media (min-width: ${breakpoints[min]}) and (max-width: ${parseInt(breakpoints[max].replace('px', ''), 10) - 1}px)`,
  only: (breakpoint: Breakpoint) => {
    const breakpointKeys = Object.keys(breakpoints) as Breakpoint[];
    const currentIndex = breakpointKeys.indexOf(breakpoint);
    const nextBreakpoint = breakpointKeys[currentIndex + 1];

    if (!nextBreakpoint) {
      return mediaQuery.up(breakpoint);
    }

    return mediaQuery.between(breakpoint, nextBreakpoint);
  },
} as const;

// Responsive value types with proper constraint
export type ResponsiveValue<T extends string | number> =
  | T
  | {
      xs?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    };

// Helper to create responsive CSS properties
export const createResponsiveValue = <T extends string | number>(
  value: ResponsiveValue<T>,
  property: string,
  transform?: (val: T) => string | number,
): Record<string, string | number | Record<string, unknown>> => {
  if (typeof value !== 'object' || value === null) {
    const finalValue = transform ? transform(value as T) : (value as T);
    return { [property]: finalValue };
  }

  const styles: Record<string, string | number | Record<string, unknown>> = {};

  // Base value (xs is default)
  const responsiveValue = value as { xs?: T; sm?: T; md?: T; lg?: T; xl?: T };
  if (responsiveValue.xs !== undefined) {
    const finalValue = transform ? transform(responsiveValue.xs) : responsiveValue.xs;
    styles[property] = finalValue;
  }

  // Apply breakpoint-specific values
  Object.entries(responsiveValue).forEach(([breakpoint, val]) => {
    if (breakpoint !== 'xs' && val !== undefined && breakpoint in breakpoints) {
      const mediaQueryKey = mediaQuery.up(breakpoint as Breakpoint);
      const finalValue = transform ? transform(val) : val;

      if (!styles[mediaQueryKey]) {
        styles[mediaQueryKey] = {} as Record<string, unknown>;
      }
      (styles[mediaQueryKey] as Record<string, unknown>)[property] = finalValue;
    }
  });

  return styles;
};

// Container width utilities
export const containerWidths = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const createContainer = (maxWidth?: Breakpoint) => ({
  width: '100%',
  paddingLeft: designTokens.spacing.space[4],
  paddingRight: designTokens.spacing.space[4],
  marginLeft: 'auto',
  marginRight: 'auto',
  ...(maxWidth && {
    maxWidth: containerWidths[maxWidth],
  }),
  [mediaQuery.up('sm')]: {
    paddingLeft: designTokens.spacing.space[6],
    paddingRight: designTokens.spacing.space[6],
  },
  [mediaQuery.up('lg')]: {
    paddingLeft: designTokens.spacing.space[8],
    paddingRight: designTokens.spacing.space[8],
  },
});

// Grid utilities
export const createGrid = (columns: ResponsiveValue<number>, gap?: string) => ({
  display: 'grid',
  gap: gap || designTokens.spacing.space[4],
  ...createResponsiveValue(columns, 'gridTemplateColumns', (cols) => `repeat(${cols}, 1fr)`),
});

// Flexbox utilities
export const flex = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  between: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  start: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  end: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  columnCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const;

// Typography scaling utilities
export const createResponsiveTypography = (
  baseSize: keyof typeof designTokens.typography.fontSize,
  scales?: { [K in Breakpoint]?: keyof typeof designTokens.typography.fontSize },
) => {
  const styles = {
    fontSize: designTokens.typography.fontSize[baseSize],
  };

  if (scales) {
    Object.entries(scales).forEach(([breakpoint, size]) => {
      if (size) {
        const mediaQueryKey = mediaQuery.up(breakpoint as Breakpoint);
        (styles as Record<string, unknown>)[mediaQueryKey] = {
          fontSize: designTokens.typography.fontSize[size],
        };
      }
    });
  }

  return styles;
};

// Spacing utilities
export const spacing = {
  // Consistent spacing scale
  ...designTokens.spacing.space,

  // Semantic spacing helpers
  component: designTokens.spacing.space[4],
  section: designTokens.spacing.space[8],
  page: designTokens.spacing.space[12],

  // Responsive spacing
  responsive: (
    base: keyof typeof designTokens.spacing.space,
    multiplier: ResponsiveValue<number> = 1,
  ) =>
    createResponsiveValue(
      multiplier,
      'padding',
      (mult) => `calc(${designTokens.spacing.space[base]} * ${mult})`,
    ),
};

// Visibility utilities
export const visibility = {
  showOnMobile: {
    display: 'block',
    [mediaQuery.up('md')]: {
      display: 'none',
    },
  },
  hideOnMobile: {
    display: 'none',
    [mediaQuery.up('md')]: {
      display: 'block',
    },
  },
  showOnTablet: {
    display: 'none',
    [mediaQuery.between('md', 'lg')]: {
      display: 'block',
    },
  },
  showOnDesktop: {
    display: 'none',
    [mediaQuery.up('lg')]: {
      display: 'block',
    },
  },
} as const;

// Theme-based responsive utilities
export const createThemeResponsive = (theme: Theme) => ({
  // Use theme breakpoints
  up: theme.breakpoints.up,
  down: theme.breakpoints.down,
  between: theme.breakpoints.between,
  only: theme.breakpoints.only,

  // Responsive spacing using theme spacing function
  space: (base: number, multipliers?: ResponsiveValue<number>) => {
    if (typeof multipliers !== 'object' || multipliers === null) {
      return theme.spacing(base * ((multipliers as number) || 1));
    }

    const styles: Record<string, string | Record<string, string>> = {};

    // Base value
    const responsiveMultipliers = multipliers as {
      xs?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };
    if (responsiveMultipliers.xs !== undefined) {
      styles.padding = theme.spacing(base * responsiveMultipliers.xs);
    }

    // Responsive values
    Object.entries(responsiveMultipliers).forEach(([breakpoint, mult]) => {
      if (breakpoint !== 'xs' && mult !== undefined) {
        const breakpointKey = breakpoint as keyof typeof theme.breakpoints.values;
        if (breakpointKey !== 'xs' && theme.breakpoints.up) {
          const mediaQueryKey = theme.breakpoints.up(breakpointKey);
          styles[mediaQueryKey] = {
            padding: theme.spacing(base * mult),
          };
        }
      }
    });

    return styles;
  },
});

// Hook for responsive values (to be used in React components)
export const useResponsiveValue = <T extends string | number>(
  value: ResponsiveValue<T>,
  defaultValue: T,
): T => {
  // This would typically use useMediaQuery hooks in a React component
  // For now, return the default or base value
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }

  const responsiveValue = value as { xs?: T; sm?: T; md?: T; lg?: T; xl?: T };
  return (
    responsiveValue.xs ??
    responsiveValue.sm ??
    responsiveValue.md ??
    responsiveValue.lg ??
    responsiveValue.xl ??
    defaultValue
  );
};

export default {
  breakpoints,
  mediaQuery,
  createResponsiveValue,
  createContainer,
  createGrid,
  flex,
  createResponsiveTypography,
  spacing,
  visibility,
  createThemeResponsive,
  useResponsiveValue,
};
