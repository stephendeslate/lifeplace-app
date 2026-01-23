// design-system/tokens/shadows.ts
// Modern Organic Luxury Shadow System

export const shadows = {
  // Subtle elevation shadows - warm tones
  none: 'none',
  xs: '0px 1px 2px rgba(46, 42, 40, 0.04), 0px 1px 3px rgba(46, 42, 40, 0.02)',
  sm: '0px 2px 4px rgba(46, 42, 40, 0.06), 0px 2px 8px rgba(46, 42, 40, 0.03)',
  md: '0px 4px 8px rgba(46, 42, 40, 0.08), 0px 4px 16px rgba(46, 42, 40, 0.04)',
  lg: '0px 8px 16px rgba(46, 42, 40, 0.10), 0px 8px 24px rgba(46, 42, 40, 0.05)',
  xl: '0px 12px 24px rgba(46, 42, 40, 0.12), 0px 12px 40px rgba(46, 42, 40, 0.06)',
  xxl: '0px 24px 48px rgba(46, 42, 40, 0.15), 0px 24px 60px rgba(46, 42, 40, 0.08)',

  // Colored shadows - subtle, brand-aligned
  sage: '0px 8px 24px rgba(125, 133, 112, 0.15), 0px 4px 12px rgba(125, 133, 112, 0.08)',
  terracotta: '0px 8px 24px rgba(200, 115, 86, 0.18), 0px 4px 12px rgba(200, 115, 86, 0.10)',
  gold: '0px 8px 24px rgba(212, 165, 116, 0.20), 0px 4px 12px rgba(212, 165, 116, 0.12)',
  clay: '0px 8px 24px rgba(166, 124, 94, 0.16), 0px 4px 12px rgba(166, 124, 94, 0.09)',

  // Glass/overlay shadows - very subtle
  glass: '0px 8px 32px rgba(46, 42, 40, 0.08)',
  glassHover: '0px 12px 40px rgba(46, 42, 40, 0.12)',

  // Inset shadows for depth
  insetXs: 'inset 0px 1px 2px rgba(46, 42, 40, 0.04)',
  insetSm: 'inset 0px 2px 4px rgba(46, 42, 40, 0.06)',
  insetMd: 'inset 0px 4px 8px rgba(46, 42, 40, 0.08)',
  insetLg: 'inset 0px 8px 16px rgba(46, 42, 40, 0.10)',

  // Soft, organic shadows for cards/images
  card: '0px 2px 8px rgba(46, 42, 40, 0.06), 0px 8px 24px rgba(46, 42, 40, 0.04)',
  cardHover: '0px 4px 12px rgba(46, 42, 40, 0.08), 0px 12px 32px rgba(46, 42, 40, 0.06)',
  image: '0px 8px 32px rgba(46, 42, 40, 0.12)',
  imageHover: '0px 12px 48px rgba(46, 42, 40, 0.16)',

  // Focus rings - accessible and elegant
  focusRing: '0 0 0 3px rgba(125, 133, 112, 0.25)',
  focusRingTerracotta: '0 0 0 3px rgba(200, 115, 86, 0.25)',
  focusRingGold: '0 0 0 3px rgba(212, 165, 116, 0.30)',

  // Legacy shadows (keeping for backward compatibility)
  forest: '0px 8px 24px rgba(125, 133, 112, 0.15), 0px 4px 12px rgba(125, 133, 112, 0.08)',
  earth: '0px 8px 24px rgba(166, 124, 94, 0.16), 0px 4px 12px rgba(166, 124, 94, 0.09)',
  leaf: '0px 4px 20px rgba(125, 133, 112, 0.10), 0px 2px 4px rgba(125, 133, 112, 0.06)',
  canopy: '0px 20px 60px rgba(125, 133, 112, 0.12), 0px 8px 16px rgba(125, 133, 112, 0.08)',
};

export const blurs = {
  none: 'blur(0px)',
  xs: 'blur(2px)',
  sm: 'blur(4px)',
  md: 'blur(8px)',
  lg: 'blur(12px)',
  xl: 'blur(20px)',
  xxl: 'blur(40px)',

  // Glass effect blurs - minimal for modern look
  glass: 'blur(8px)',
  glassFrosted: 'blur(12px)',
  glassSubtle: 'blur(6px)',
};

export const glows = {
  // Subtle glows for accents - use sparingly
  sage: '0 0 16px rgba(125, 133, 112, 0.20)',
  terracotta: '0 0 16px rgba(200, 115, 86, 0.25)',
  gold: '0 0 20px rgba(212, 165, 116, 0.30)',
  clay: '0 0 16px rgba(166, 124, 94, 0.22)',

  // Semantic glows
  success: '0 0 16px rgba(91, 168, 114, 0.25)',
  warning: '0 0 16px rgba(232, 149, 55, 0.25)',
  error: '0 0 16px rgba(217, 79, 61, 0.25)',
  info: '0 0 16px rgba(74, 127, 160, 0.25)',

  // Legacy glows (mapped to new colors)
  forest: '0 0 16px rgba(125, 133, 112, 0.20)',
  earth: '0 0 16px rgba(166, 124, 94, 0.22)',
};