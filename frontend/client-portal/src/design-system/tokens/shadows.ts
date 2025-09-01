// design-system/tokens/shadows.ts

export const shadows = {
  // Elevation shadows
  xs: '0px 1px 3px rgba(45, 80, 22, 0.05)',
  sm: '0px 2px 8px rgba(45, 80, 22, 0.08)',
  md: '0px 4px 16px rgba(45, 80, 22, 0.12)',
  lg: '0px 8px 24px rgba(45, 80, 22, 0.15)',
  xl: '0px 12px 40px rgba(45, 80, 22, 0.18)',
  xxl: '0px 24px 60px rgba(45, 80, 22, 0.22)',
  
  // Colored shadows
  forest: '0px 8px 24px rgba(45, 80, 22, 0.25)',
  earth: '0px 8px 24px rgba(139, 69, 19, 0.25)',
  gold: '0px 8px 24px rgba(255, 215, 0, 0.20)',
  
  // Glass shadows
  glass: '0px 8px 32px rgba(31, 38, 135, 0.15)',
  glassHover: '0px 12px 40px rgba(31, 38, 135, 0.20)',
  
  // Inset shadows for depth
  insetSm: 'inset 0px 2px 4px rgba(0, 0, 0, 0.06)',
  insetMd: 'inset 0px 4px 8px rgba(0, 0, 0, 0.08)',
  insetLg: 'inset 0px 8px 16px rgba(0, 0, 0, 0.10)',
  
  // Nature-inspired soft shadows
  leaf: '0px 4px 20px rgba(45, 80, 22, 0.12), 0px 2px 4px rgba(45, 80, 22, 0.08)',
  canopy: '0px 20px 60px rgba(45, 80, 22, 0.15), 0px 8px 16px rgba(45, 80, 22, 0.10)',
  
  // Interactive shadows
  hover: {
    sm: 'translateY(-2px)',
    md: 'translateY(-4px)',
    lg: 'translateY(-6px)',
  },
  
  // Focus rings
  focusRing: '0 0 0 3px rgba(45, 80, 22, 0.2)',
  focusRingGold: '0 0 0 3px rgba(255, 215, 0, 0.3)',
};

export const blurs = {
  none: 'blur(0px)',
  sm: 'blur(4px)',
  md: 'blur(8px)',
  lg: 'blur(12px)',
  xl: 'blur(20px)',
  xxl: 'blur(40px)',
  
  // Glass effect blurs
  glass: 'blur(10px)',
  glassFrosted: 'blur(20px)',
  glassSubtle: 'blur(6px)',
};

export const glows = {
  forest: '0 0 20px rgba(45, 80, 22, 0.3)',
  earth: '0 0 20px rgba(139, 69, 19, 0.3)',
  gold: '0 0 30px rgba(255, 215, 0, 0.4)',
  success: '0 0 20px rgba(76, 175, 80, 0.3)',
  error: '0 0 20px rgba(244, 67, 54, 0.3)',
};