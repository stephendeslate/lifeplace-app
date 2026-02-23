// Modern LifePlace Admin Spacing & Layout System
// Based on 8px grid with golden ratio progression

export const spacingTokens = {
  // Base spacing scale (8px base unit)
  space: {
    0: '0px', // 0
    1: '4px', // 0.5 units
    2: '8px', // 1 unit
    3: '12px', // 1.5 units
    4: '16px', // 2 units
    5: '20px', // 2.5 units
    6: '24px', // 3 units
    7: '28px', // 3.5 units
    8: '32px', // 4 units
    10: '40px', // 5 units
    12: '48px', // 6 units
    14: '56px', // 7 units
    16: '64px', // 8 units
    20: '80px', // 10 units
    24: '96px', // 12 units
    28: '112px', // 14 units
    32: '128px', // 16 units
    40: '160px', // 20 units
    48: '192px', // 24 units
    56: '224px', // 28 units
    64: '256px', // 32 units
  },

  // Semantic spacing for specific use cases
  semantic: {
    // Component internal spacing
    xs: '4px', // Tight spacing within components
    sm: '8px', // Small component spacing
    md: '16px', // Default component spacing
    lg: '24px', // Generous component spacing
    xl: '32px', // Large component spacing
    xxl: '48px', // Extra large spacing
    xxxl: '64px', // Maximum component spacing

    // Layout spacing
    sectionGap: '48px', // Between major sections
    containerGap: '32px', // Between containers
    cardGap: '24px', // Between cards
    itemGap: '16px', // Between list items
    elementGap: '12px', // Between inline elements
    inlineGap: '8px', // Between inline elements
    tightGap: '4px', // Tight spacing

    // Padding presets
    pageDefault: '32px', // Default page padding
    pageMobile: '16px', // Mobile page padding
    cardDefault: '24px', // Default card padding
    cardCompact: '16px', // Compact card padding
    cardGenerous: '32px', // Generous card padding
    buttonDefault: '16px', // Default button padding
    inputDefault: '12px', // Default input padding
  },

  // Border radius scale
  radius: {
    none: '0px',
    sm: '4px', // Small radius
    md: '6px', // Default radius
    lg: '8px', // Large radius
    xl: '12px', // Extra large radius
    xxl: '16px', // Card radius
    xxxl: '24px', // Container radius
    full: '9999px', // Pill/circular
  },

  // Container and layout dimensions
  container: {
    // Max widths for different contexts
    sm: '640px', // Small container
    md: '768px', // Medium container
    lg: '1024px', // Large container
    xl: '1280px', // Extra large container
    xxl: '1536px', // Maximum container

    // Page containers
    page: '1200px', // Main page content
    dashboard: '1400px', // Dashboard specific
    modal: '600px', // Modal dialogs
    sidebar: '280px', // Sidebar width
    sidebarCollapsed: '64px', // Collapsed sidebar
    header: '64px', // Header height
  },

  // Z-index scale for layering
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },

  // Breakpoints for responsive design
  breakpoints: {
    xs: '320px', // Mobile portrait
    sm: '768px', // Tablet portrait
    md: '1024px', // Tablet landscape / small laptop
    lg: '1280px', // Desktop
    xl: '1440px', // Large desktop
    xxl: '1920px', // Ultra-wide
  },

  // Component-specific spacing patterns
  components: {
    // Button spacing
    button: {
      padding: {
        small: { x: '12px', y: '6px' },
        medium: { x: '16px', y: '8px' },
        large: { x: '24px', y: '12px' },
      },
      gap: '8px', // Between button elements
    },

    // Card spacing
    card: {
      padding: {
        compact: '16px',
        default: '24px',
        generous: '32px',
      },
      gap: '16px', // Between card elements
      marginBottom: '24px',
    },

    // Form spacing
    form: {
      fieldGap: '20px', // Between form fields
      sectionGap: '32px', // Between form sections
      labelGap: '8px', // Between label and input
      helperGap: '4px', // Between input and helper text
      buttonGap: '12px', // Between form buttons
    },

    // List spacing
    list: {
      itemGap: '12px', // Between list items
      sectionGap: '24px', // Between list sections
      indentSize: '24px', // List indentation
    },

    // Navigation spacing
    navigation: {
      itemGap: '4px', // Between nav items
      sectionGap: '16px', // Between nav sections
      iconGap: '12px', // Between icon and text
      badgeGap: '8px', // Between text and badge
    },

    // Table spacing
    table: {
      cellPadding: '12px', // Table cell padding
      rowGap: '0px', // Between table rows
      headerPadding: '16px', // Table header padding
    },

    // Modal/Dialog spacing
    dialog: {
      padding: '24px', // Dialog content padding
      buttonGap: '12px', // Between dialog buttons
      titleGap: '16px', // Between title and content
    },

    // Toast/Alert spacing
    toast: {
      padding: '16px', // Toast padding
      gap: '12px', // Between toast elements
      margin: '8px', // Between toasts
    },
  },
} as const;

// CSS Custom Properties for spacing
export const spacingCssVariables = {
  // Base spacing
  '--space-1': spacingTokens.space[1],
  '--space-2': spacingTokens.space[2],
  '--space-3': spacingTokens.space[3],
  '--space-4': spacingTokens.space[4],
  '--space-6': spacingTokens.space[6],
  '--space-8': spacingTokens.space[8],
  '--space-12': spacingTokens.space[12],
  '--space-16': spacingTokens.space[16],
  '--space-20': spacingTokens.space[20],
  '--space-24': spacingTokens.space[24],

  // Semantic spacing
  '--spacing-xs': spacingTokens.semantic.xs,
  '--spacing-sm': spacingTokens.semantic.sm,
  '--spacing-md': spacingTokens.semantic.md,
  '--spacing-lg': spacingTokens.semantic.lg,
  '--spacing-xl': spacingTokens.semantic.xl,

  // Radius
  '--radius-sm': spacingTokens.radius.sm,
  '--radius-md': spacingTokens.radius.md,
  '--radius-lg': spacingTokens.radius.lg,
  '--radius-xl': spacingTokens.radius.xl,
  '--radius-xxl': spacingTokens.radius.xxl,
  '--radius-full': spacingTokens.radius.full,

  // Container sizes
  '--container-sidebar': spacingTokens.container.sidebar,
  '--container-sidebar-collapsed': spacingTokens.container.sidebarCollapsed,
  '--container-header': spacingTokens.container.header,

  // Z-index
  '--z-dropdown': spacingTokens.zIndex.dropdown,
  '--z-modal': spacingTokens.zIndex.modal,
  '--z-overlay': spacingTokens.zIndex.overlay,
  '--z-toast': spacingTokens.zIndex.toast,
} as const;

// Type definitions
export type SpaceScale = keyof typeof spacingTokens.space;
export type SemanticSpacing = keyof typeof spacingTokens.semantic;
export type RadiusScale = keyof typeof spacingTokens.radius;
export type ContainerSize = keyof typeof spacingTokens.container;
export type ZIndexLevel = keyof typeof spacingTokens.zIndex;
export type Breakpoint = keyof typeof spacingTokens.breakpoints;

// Helper functions for spacing
export const getSpace = (scale: SpaceScale): string => {
  return spacingTokens.space[scale];
};

export const getSemanticSpace = (semantic: SemanticSpacing): string => {
  return spacingTokens.semantic[semantic];
};

export const getRadius = (scale: RadiusScale): string => {
  return spacingTokens.radius[scale];
};

// Responsive spacing helper
export const createResponsiveSpacing = (mobile: string, tablet?: string, desktop?: string) => ({
  mobile,
  tablet: tablet || mobile,
  desktop: desktop || tablet || mobile,
});

// Padding/margin helper objects
export const padding = {
  xs: spacingTokens.semantic.xs,
  sm: spacingTokens.semantic.sm,
  md: spacingTokens.semantic.md,
  lg: spacingTokens.semantic.lg,
  xl: spacingTokens.semantic.xl,
  xxl: spacingTokens.semantic.xxl,
  xxxl: spacingTokens.semantic.xxxl,
};

export const margin = {
  xs: spacingTokens.semantic.xs,
  sm: spacingTokens.semantic.sm,
  md: spacingTokens.semantic.md,
  lg: spacingTokens.semantic.lg,
  xl: spacingTokens.semantic.xl,
  xxl: spacingTokens.semantic.xxl,
  xxxl: spacingTokens.semantic.xxxl,
};

// Gap helper for flexbox/grid
export const gap = {
  xs: spacingTokens.semantic.xs,
  sm: spacingTokens.semantic.sm,
  md: spacingTokens.semantic.md,
  lg: spacingTokens.semantic.lg,
  xl: spacingTokens.semantic.xl,
  xxl: spacingTokens.semantic.xxl,
  xxxl: spacingTokens.semantic.xxxl,
};

export default spacingTokens;
