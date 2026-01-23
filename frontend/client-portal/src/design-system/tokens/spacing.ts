// design-system/tokens/spacing.ts

export const spacing = {
  // Base spacing scale (8px base)
  0: '0px',
  0.5: '4px',
  1: '8px',
  1.5: '12px',
  2: '16px',
  2.5: '20px',
  3: '24px',
  3.5: '28px',
  4: '32px',
  5: '40px',
  6: '48px',
  7: '56px',
  8: '64px',
  9: '72px',
  10: '80px',
  12: '96px',
  14: '112px',
  16: '128px',
  20: '160px',
  24: '192px',
  28: '224px',
  32: '256px',
  
  // Semantic spacing
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
  
  // Component-specific spacing
  buttonPadding: {
    sm: '8px 16px',
    md: '12px 24px',
    lg: '16px 32px',
  },
  cardPadding: {
    sm: '16px',
    md: '24px',
    lg: '32px',
  },
  sectionPadding: {
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '96px',
  },
  containerPadding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
    wide: '48px',
  },
};

export const layoutComponents = {
  // Header heights
  header: {
    height: '64px',
    heightMobile: '56px',
  },
  // Sidebar dimensions
  sidebar: {
    width: '280px',
    widthCollapsed: '64px',
  },
  // Header padding offsets (for content below fixed header)
  contentOffset: {
    mobile: '120px',
    desktop: '140px',
  },
};

export const layout = {
  // Container widths
  maxWidth: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
    content: '1200px',
    narrow: '800px',
    wide: '1400px',
  },
  
  // Breakpoints
  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
  },
  
  // Grid system
  grid: {
    columns: 12,
    gap: {
      sm: '16px',
      md: '24px',
      lg: '32px',
    },
  },
  
  // Common aspect ratios
  aspectRatio: {
    square: '1 / 1',
    video: '16 / 9',
    ultrawide: '21 / 9',
    portrait: '3 / 4',
    landscape: '4 / 3',
    golden: '1.618 / 1',
  },
};

export const borderRadius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
  xxxl: '32px',
  full: '9999px',

  // Organic shapes - subtle for modern aesthetic
  organic: {
    sm: '6px 12px 6px 12px',
    md: '12px 18px 12px 18px',
    lg: '18px 24px 18px 24px',
  },

  // Component specific - refined values
  button: '8px',         // More subtle, modern
  buttonPill: '24px',    // For pill-style buttons
  card: '16px',          // Softer than before
  cardLarge: '20px',     // For hero cards
  input: '8px',          // Subtle, clean
  chip: '16px',          // Pill-shaped
  avatar: '50%',
  dialog: '20px',
  image: '12px',         // For image containers
};

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  loading: 90,
  max: 100,
  
  // MUI overrides
  appBar: 1100,
  drawer: 1200,
  modalBackdrop: 1300,
  modalContent: 1400,
  snackbar: 1500,
};