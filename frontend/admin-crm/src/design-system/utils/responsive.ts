// Responsive Design Utilities
// Helper functions for creating consistent responsive layouts

import { tokens } from '../tokens';
import type { Breakpoint } from '../tokens/spacing';

// Breakpoint utilities
export const breakpoints = tokens.spacing.breakpoints;

// Create media queries
export const mediaQueries = {
  up: (bp: Breakpoint) => `@media (min-width: ${breakpoints[bp]})`,
  down: (bp: Breakpoint) => {
    const breakpointValues = Object.values(breakpoints).map((val) => parseInt(val));
    const currentIndex = Object.keys(breakpoints).indexOf(bp);
    const maxWidth = currentIndex > 0 ? breakpointValues[currentIndex - 1] - 1 : 0;
    return `@media (max-width: ${maxWidth}px)`;
  },
  between: (min: Breakpoint, max: Breakpoint) =>
    `@media (min-width: ${breakpoints[min]}) and (max-width: ${breakpoints[max]})`,
  only: (bp: Breakpoint) => {
    const keys = Object.keys(breakpoints) as Breakpoint[];
    const currentIndex = keys.indexOf(bp);
    const nextBreakpoint = keys[currentIndex + 1];

    if (!nextBreakpoint) {
      return mediaQueries.up(bp);
    }

    return mediaQueries.between(bp, nextBreakpoint);
  },
} as const;

// Responsive value type with proper constraint
export type ResponsiveValue<T extends string | number> =
  | {
      xs?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
      xxl?: T;
    }
  | T;

// Convert responsive values to CSS media query styles
export const createResponsiveStyles = <T extends string | number>(
  property: string,
  values: ResponsiveValue<T>,
): Record<string, string | number | Record<string, string | number>> => {
  if (typeof values !== 'object' || values === null) {
    return { [property]: values };
  }

  const styles: Record<string, string | number | Record<string, string | number>> = {};
  const breakpointKeys = Object.keys(breakpoints) as Breakpoint[];

  // Add base value (xs or first defined value)
  const responsiveValues = values as Record<string, T>;
  const baseValue = responsiveValues.xs || Object.values(responsiveValues)[0];
  if (baseValue !== undefined) {
    styles[property] = baseValue;
  }

  // Add media query styles for each breakpoint
  breakpointKeys.forEach((bp) => {
    const responsiveValues = values as Record<string, T>;
    const value = responsiveValues[bp];
    if (value !== undefined && bp !== 'xs') {
      styles[mediaQueries.up(bp)] = {
        [property]: value,
      };
    }
  });

  return styles;
};

// Common responsive patterns
export const responsivePatterns = {
  // Responsive padding
  padding: (values: ResponsiveValue<string>) => createResponsiveStyles('padding', values),

  // Responsive margin
  margin: (values: ResponsiveValue<string>) => createResponsiveStyles('margin', values),

  // Responsive font size
  fontSize: (values: ResponsiveValue<string>) => createResponsiveStyles('fontSize', values),

  // Responsive width
  width: (values: ResponsiveValue<string>) => createResponsiveStyles('width', values),

  // Responsive height
  height: (values: ResponsiveValue<string>) => createResponsiveStyles('height', values),

  // Responsive display
  display: (values: ResponsiveValue<string>) => createResponsiveStyles('display', values),

  // Responsive flex direction
  flexDirection: (values: ResponsiveValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>) =>
    createResponsiveStyles('flexDirection', values),

  // Responsive grid columns
  gridColumns: (values: ResponsiveValue<string | number>) => {
    if (typeof values === 'object' && values !== null) {
      const gridValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          typeof value === 'number' ? `repeat(${value}, 1fr)` : value,
        ]),
      ) as ResponsiveValue<string>;
      return createResponsiveStyles('gridTemplateColumns', gridValues);
    }
    const gridValue = typeof values === 'number' ? `repeat(${values}, 1fr)` : values;
    return createResponsiveStyles('gridTemplateColumns', gridValue);
  },
};

// Layout utilities
export const layoutUtils = {
  // Container with max-width and responsive padding
  container: (maxWidth: keyof typeof tokens.spacing.container = 'page') => ({
    maxWidth: tokens.spacing.container[maxWidth],
    marginLeft: 'auto',
    marginRight: 'auto',
    ...responsivePatterns.padding({
      xs: tokens.spacing.semantic.pageDefault,
      sm: tokens.spacing.semantic.pageDefault,
      md: tokens.spacing.semantic.pageDefault,
      lg: tokens.spacing.semantic.pageDefault,
    }),
  }),

  // Responsive grid layout
  grid: (
    columns: ResponsiveValue<number> = { xs: 1, sm: 2, md: 3, lg: 4 },
    gap: string = tokens.spacing.semantic.cardGap,
  ) => ({
    display: 'grid',
    gap,
    ...responsivePatterns.gridColumns(columns),
  }),

  // Responsive flex layout
  flex: (
    direction: ResponsiveValue<'row' | 'column'> = 'row',
    gap: string = tokens.spacing.semantic.elementGap,
  ) => ({
    display: 'flex',
    gap,
    ...responsivePatterns.flexDirection(direction),
  }),

  // Stack layout (vertical flex)
  stack: (gap: string = tokens.spacing.semantic.elementGap) => ({
    display: 'flex',
    flexDirection: 'column',
    gap,
  }),

  // Inline layout (horizontal flex)
  inline: (gap: string = tokens.spacing.semantic.inlineGap) => ({
    display: 'flex',
    alignItems: 'center',
    gap,
  }),

  // Center content
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Responsive aspect ratio
  aspectRatio: (ratio: ResponsiveValue<string> = '16/9') =>
    createResponsiveStyles('aspectRatio', ratio),

  // Hide on specific breakpoints
  hideOn: (...breakpoints: Breakpoint[]) => {
    const styles: Record<string, unknown> = {};
    breakpoints.forEach((bp) => {
      styles[mediaQueries.only(bp)] = {
        display: 'none',
      };
    });
    return styles;
  },

  // Show only on specific breakpoints
  showOnly: (...breakpoints: Breakpoint[]) => {
    const allBreakpoints = Object.keys(tokens.spacing.breakpoints) as Breakpoint[];
    const hideBreakpoints = allBreakpoints.filter((bp) => !breakpoints.includes(bp));

    const styles: Record<string, unknown> = {};
    hideBreakpoints.forEach((bp) => {
      styles[mediaQueries.only(bp)] = {
        display: 'none',
      };
    });
    return styles;
  },
};

// Typography responsive utilities
export const typographyResponsive = {
  // Responsive text scaling
  fluidText: (
    minSize: string,
    maxSize: string,
    minViewport: string = '320px',
    maxViewport: string = '1200px',
  ) => ({
    fontSize: `clamp(${minSize}, calc(${minSize} + (${parseFloat(maxSize)} - ${parseFloat(minSize)}) * ((100vw - ${minViewport}) / (${parseFloat(maxViewport)} - ${parseFloat(minViewport)}))), ${maxSize})`,
  }),

  // Common responsive text patterns
  headingScale: {
    xs: tokens.typography.fontSize.heading.h6,
    sm: tokens.typography.fontSize.heading.h5,
    md: tokens.typography.fontSize.heading.h4,
    lg: tokens.typography.fontSize.heading.h3,
    xl: tokens.typography.fontSize.heading.h2,
    xxl: tokens.typography.fontSize.heading.h1,
  },

  bodyScale: {
    xs: tokens.typography.fontSize.body.xs,
    sm: tokens.typography.fontSize.body.sm,
    md: tokens.typography.fontSize.body.md,
    lg: tokens.typography.fontSize.body.lg,
    xl: tokens.typography.fontSize.body.xl,
  },
};

// Component-specific responsive utilities
export const componentResponsive = {
  // Responsive card grid
  cardGrid: (minCardWidth: string = '280px', gap: string = tokens.spacing.semantic.cardGap) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}, 1fr))`,
    gap,
  }),

  // Responsive sidebar layout
  sidebarLayout: (
    sidebarWidth: string = tokens.spacing.container.sidebar,
    collapsedWidth: string = tokens.spacing.container.sidebarCollapsed,
    breakpoint: Breakpoint = 'md',
  ) => ({
    display: 'flex',

    '& .sidebar': {
      width: collapsedWidth,
      [mediaQueries.up(breakpoint)]: {
        width: sidebarWidth,
      },
    },

    '& .main-content': {
      flex: 1,
      marginLeft: collapsedWidth,
      [mediaQueries.up(breakpoint)]: {
        marginLeft: sidebarWidth,
      },
    },
  }),

  // Responsive form layout
  formLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.components.form.fieldGap,

    '& .form-row': {
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.semantic.elementGap,

      [mediaQueries.up('md')]: {
        flexDirection: 'row',
      },
    },

    '& .form-actions': {
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.semantic.elementGap,
      marginTop: tokens.spacing.components.form.sectionGap,

      [mediaQueries.up('sm')]: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
      },
    },
  },

  // Responsive modal
  modal: {
    width: '95vw',
    maxWidth: '90vw',

    [mediaQueries.up('sm')]: {
      width: 'auto',
      maxWidth: tokens.spacing.container.modal,
    },

    [mediaQueries.up('lg')]: {
      maxWidth: '800px',
    },
  },

  // Responsive table
  table: {
    // Mobile: stack table rows
    [mediaQueries.down('md')]: {
      '& tbody tr': {
        display: 'block',
        marginBottom: tokens.spacing.semantic.elementGap,
        padding: tokens.spacing.semantic.cardDefault,
        border: `1px solid ${tokens.color.borders.subtle}`,
        borderRadius: tokens.spacing.radius.lg,
        background: tokens.color.backgrounds.paper,
      },

      '& tbody td': {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${tokens.spacing.semantic.xs} 0`,
        borderBottom: 'none',

        '&::before': {
          content: 'attr(data-label)',
          fontWeight: 600,
          color: tokens.color.neutral[600],
        },
      },

      '& thead': {
        display: 'none',
      },
    },
  },
};

// Hook-like utility for responsive values
export const useResponsiveValue = <T extends string | number>(values: ResponsiveValue<T>): T => {
  if (typeof values !== 'object' || values === null) {
    return values as T;
  }

  // This would typically be used with a React hook to detect current breakpoint
  // For now, return the mobile value as default
  const responsiveValues = values as Record<string, T>;
  return responsiveValues.xs || Object.values(responsiveValues)[0];
};

// Utility to detect current breakpoint (for use in components)
export const getCurrentBreakpoint = (): Breakpoint => {
  if (typeof window === 'undefined') return 'xs';

  const width = window.innerWidth;
  const breakpointEntries = Object.entries(breakpoints) as [Breakpoint, string][];

  // Sort breakpoints by width (descending)
  const sortedBreakpoints = breakpointEntries
    .map(([key, value]) => ({ key, value: parseInt(value) }))
    .sort((a, b) => b.value - a.value);

  // Find the largest breakpoint that the screen width exceeds
  for (const { key, value } of sortedBreakpoints) {
    if (width >= value) {
      return key;
    }
  }

  return 'xs';
};

// CSS Grid utilities
export const gridUtils = {
  // Auto-fit grid with minimum column width
  autoFit: (minWidth: string = '250px', gap: string = tokens.spacing.semantic.cardGap) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
    gap,
  }),

  // Auto-fill grid
  autoFill: (minWidth: string = '250px', gap: string = tokens.spacing.semantic.cardGap) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    gap,
  }),

  // Responsive grid areas
  areas: (areas: ResponsiveValue<string>) => createResponsiveStyles('gridTemplateAreas', areas),

  // Grid span utilities
  span: (columns: ResponsiveValue<number>) => {
    if (typeof columns === 'object' && columns !== null) {
      const spanValues = Object.fromEntries(
        Object.entries(columns).map(([key, value]) => [key, `span ${value}`]),
      ) as ResponsiveValue<string>;
      return createResponsiveStyles('gridColumn', spanValues);
    }
    return createResponsiveStyles('gridColumn', `span ${columns}`);
  },
};

// Flexbox utilities
export const flexUtils = {
  // Responsive flex basis
  basis: (values: ResponsiveValue<string>) => createResponsiveStyles('flexBasis', values),

  // Responsive flex grow
  grow: (values: ResponsiveValue<number>) => createResponsiveStyles('flexGrow', values),

  // Responsive flex shrink
  shrink: (values: ResponsiveValue<number>) => createResponsiveStyles('flexShrink', values),

  // Responsive alignment
  align: (values: ResponsiveValue<string>) => createResponsiveStyles('alignItems', values),

  // Responsive justification
  justify: (values: ResponsiveValue<string>) => createResponsiveStyles('justifyContent', values),
};

export default {
  breakpoints,
  mediaQueries,
  createResponsiveStyles,
  responsivePatterns,
  layoutUtils,
  typographyResponsive,
  componentResponsive,
  useResponsiveValue,
  getCurrentBreakpoint,
  gridUtils,
  flexUtils,
};
