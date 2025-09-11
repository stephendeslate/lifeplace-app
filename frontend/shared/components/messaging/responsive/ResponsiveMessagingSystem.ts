// Responsive Design System for Messaging Components
// Unified breakpoint and layout management for both Admin CRM and Client Portal

import { Theme, useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

// === UNIFIED BREAKPOINT SYSTEM ===

export const messagingBreakpoints = {
  xs: 0,      // Mobile portrait
  sm: 600,    // Mobile landscape / Small tablets
  md: 960,    // Tablets / Small laptops
  lg: 1280,   // Laptops / Desktops
  xl: 1920,   // Large desktops
} as const;

export type BreakpointKey = keyof typeof messagingBreakpoints;

// === RESPONSIVE LAYOUT CONFIGURATIONS ===

export interface ResponsiveLayoutConfig {
  // Container behavior
  container: {
    maxWidth: string;
    padding: string;
    margin: string;
    borderRadius: string;
  };
  
  // Thread list behavior
  threadList: {
    width: string;
    minWidth: string;
    collapsed: boolean;
    overlay: boolean; // Mobile overlay behavior
  };
  
  // Message thread behavior  
  messageThread: {
    flex: string;
    minWidth: string;
    padding: string;
  };
  
  // Message bubble sizes
  messageBubble: {
    maxWidth: string;
    padding: string;
    fontSize: string;
    borderRadius: string;
  };
  
  // Composer behavior
  composer: {
    position: 'static' | 'sticky' | 'fixed';
    bottom?: string;
    padding: string;
    background?: string;
    backdrop?: string;
  };
  
  // Navigation behavior
  navigation: {
    type: 'tabs' | 'drawer' | 'bottom-sheet' | 'hidden';
    persistent: boolean;
  };
}

// Admin CRM responsive configurations
export const adminResponsiveLayouts: Record<BreakpointKey, ResponsiveLayoutConfig> = {
  xs: {
    container: {
      maxWidth: '100vw',
      padding: '0',
      margin: '0',
      borderRadius: '0',
    },
    threadList: {
      width: '100%',
      minWidth: '100%',
      collapsed: false,
      overlay: true,
    },
    messageThread: {
      flex: '1',
      minWidth: '0',
      padding: '8px',
    },
    messageBubble: {
      maxWidth: '85%',
      padding: '10px 14px',
      fontSize: '0.875rem',
      borderRadius: '16px',
    },
    composer: {
      position: 'sticky',
      bottom: '0',
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdrop: 'blur(20px)',
    },
    navigation: {
      type: 'bottom-sheet',
      persistent: false,
    },
  },
  
  sm: {
    container: {
      maxWidth: '100vw',
      padding: '8px',
      margin: '0',
      borderRadius: '12px 12px 0 0',
    },
    threadList: {
      width: '300px',
      minWidth: '280px',
      collapsed: false,
      overlay: true,
    },
    messageThread: {
      flex: '1',
      minWidth: '0',
      padding: '12px',
    },
    messageBubble: {
      maxWidth: '80%',
      padding: '12px 16px',
      fontSize: '0.9rem',
      borderRadius: '18px',
    },
    composer: {
      position: 'sticky',
      bottom: '0',
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.9)',
      backdrop: 'blur(16px)',
    },
    navigation: {
      type: 'drawer',
      persistent: false,
    },
  },
  
  md: {
    container: {
      maxWidth: '1200px',
      padding: '16px',
      margin: '0 auto',
      borderRadius: '20px',
    },
    threadList: {
      width: '350px',
      minWidth: '320px',
      collapsed: false,
      overlay: false,
    },
    messageThread: {
      flex: '1',
      minWidth: '400px',
      padding: '16px',
    },
    messageBubble: {
      maxWidth: '75%',
      padding: '12px 16px',
      fontSize: '1rem',
      borderRadius: '18px',
    },
    composer: {
      position: 'static',
      padding: '16px',
    },
    navigation: {
      type: 'tabs',
      persistent: true,
    },
  },
  
  lg: {
    container: {
      maxWidth: '1400px',
      padding: '24px',
      margin: '0 auto',
      borderRadius: '24px',
    },
    threadList: {
      width: '380px',
      minWidth: '350px',
      collapsed: false,
      overlay: false,
    },
    messageThread: {
      flex: '1',
      minWidth: '500px',
      padding: '20px',
    },
    messageBubble: {
      maxWidth: '70%',
      padding: '14px 18px',
      fontSize: '1rem',
      borderRadius: '20px',
    },
    composer: {
      position: 'static',
      padding: '20px',
    },
    navigation: {
      type: 'tabs',
      persistent: true,
    },
  },
  
  xl: {
    container: {
      maxWidth: '1600px',
      padding: '32px',
      margin: '0 auto',
      borderRadius: '28px',
    },
    threadList: {
      width: '400px',
      minWidth: '380px',
      collapsed: false,
      overlay: false,
    },
    messageThread: {
      flex: '1',
      minWidth: '600px',
      padding: '24px',
    },
    messageBubble: {
      maxWidth: '65%',
      padding: '16px 20px',
      fontSize: '1rem',
      borderRadius: '22px',
    },
    composer: {
      position: 'static',
      padding: '24px',
    },
    navigation: {
      type: 'tabs',
      persistent: true,
    },
  },
};

// Client Portal responsive configurations (more compact, consumer-friendly)
export const clientResponsiveLayouts: Record<BreakpointKey, ResponsiveLayoutConfig> = {
  xs: {
    container: {
      maxWidth: '100vw',
      padding: '0',
      margin: '0',
      borderRadius: '0',
    },
    threadList: {
      width: '100%',
      minWidth: '100%',
      collapsed: true,
      overlay: true,
    },
    messageThread: {
      flex: '1',
      minWidth: '0',
      padding: '12px',
    },
    messageBubble: {
      maxWidth: '88%',
      padding: '10px 14px',
      fontSize: '0.9rem',
      borderRadius: '18px',
    },
    composer: {
      position: 'sticky',
      bottom: '0',
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdrop: 'blur(10px)',
    },
    navigation: {
      type: 'bottom-sheet',
      persistent: false,
    },
  },
  
  sm: {
    container: {
      maxWidth: '100vw',
      padding: '8px',
      margin: '0',
      borderRadius: '16px 16px 0 0',
    },
    threadList: {
      width: '280px',
      minWidth: '260px',
      collapsed: true,
      overlay: true,
    },
    messageThread: {
      flex: '1',
      minWidth: '0',
      padding: '16px',
    },
    messageBubble: {
      maxWidth: '82%',
      padding: '12px 16px',
      fontSize: '0.9rem',
      borderRadius: '20px',
    },
    composer: {
      position: 'sticky',
      bottom: '0',
      padding: '16px',
      background: 'rgba(250, 255, 247, 0.9)',
      backdrop: 'blur(8px)',
    },
    navigation: {
      type: 'drawer',
      persistent: false,
    },
  },
  
  md: {
    container: {
      maxWidth: '1000px',
      padding: '16px',
      margin: '0 auto',
      borderRadius: '20px',
    },
    threadList: {
      width: '300px',
      minWidth: '280px',
      collapsed: false,
      overlay: false,
    },
    messageThread: {
      flex: '1',
      minWidth: '350px',
      padding: '20px',
    },
    messageBubble: {
      maxWidth: '75%',
      padding: '14px 18px',
      fontSize: '1rem',
      borderRadius: '20px',
    },
    composer: {
      position: 'static',
      padding: '20px',
    },
    navigation: {
      type: 'tabs',
      persistent: true,
    },
  },
  
  lg: {
    container: {
      maxWidth: '1200px',
      padding: '20px',
      margin: '0 auto',
      borderRadius: '24px',
    },
    threadList: {
      width: '320px',
      minWidth: '300px',
      collapsed: false,
      overlay: false,
    },
    messageThread: {
      flex: '1',
      minWidth: '400px',
      padding: '24px',
    },
    messageBubble: {
      maxWidth: '70%',
      padding: '14px 18px',
      fontSize: '1rem',
      borderRadius: '20px',
    },
    composer: {
      position: 'static',
      padding: '24px',
    },
    navigation: {
      type: 'tabs',
      persistent: true,
    },
  },
  
  xl: {
    container: {
      maxWidth: '1400px',
      padding: '24px',
      margin: '0 auto',
      borderRadius: '24px',
    },
    threadList: {
      width: '340px',
      minWidth: '320px',
      collapsed: false,
      overlay: false,
    },
    messageThread: {
      flex: '1',
      minWidth: '450px',
      padding: '28px',
    },
    messageBubble: {
      maxWidth: '68%',
      padding: '16px 20px',
      fontSize: '1rem',
      borderRadius: '22px',
    },
    composer: {
      position: 'static',
      padding: '28px',
    },
    navigation: {
      type: 'tabs',
      persistent: true,
    },
  },
};

// === RESPONSIVE HOOKS ===

export interface ResponsiveMessagingState {
  breakpoint: BreakpointKey;
  layout: ResponsiveLayoutConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  
  // Layout flags
  shouldCollapseThreadList: boolean;
  shouldUseOverlay: boolean;
  shouldStickyComposer: boolean;
  shouldShowBottomNavigation: boolean;
  
  // Interaction capabilities
  hasTouch: boolean;
  hasHover: boolean;
  prefersReducedMotion: boolean;
}

// Hook for Admin CRM responsive behavior
export const useAdminResponsiveMessaging = (): ResponsiveMessagingState => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.between('lg', 'xl'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const hasTouch = useMediaQuery('(pointer: coarse)');
  const hasHover = useMediaQuery('(hover: hover)');
  
  // Determine current breakpoint
  let breakpoint: BreakpointKey = 'lg';
  if (isXs) breakpoint = 'xs';
  else if (isSm) breakpoint = 'sm';  
  else if (isMd) breakpoint = 'md';
  else if (isLg) breakpoint = 'lg';
  else if (isXl) breakpoint = 'xl';
  
  const layout = adminResponsiveLayouts[breakpoint];
  
  return {
    breakpoint,
    layout,
    isMobile: isXs || isSm,
    isTablet: isMd,
    isDesktop: isLg || isXl,
    orientation: isLandscape ? 'landscape' : 'portrait',
    
    // Layout behavior
    shouldCollapseThreadList: layout.threadList.collapsed,
    shouldUseOverlay: layout.threadList.overlay,
    shouldStickyComposer: layout.composer.position !== 'static',
    shouldShowBottomNavigation: layout.navigation.type === 'bottom-sheet',
    
    // Device capabilities
    hasTouch,
    hasHover,
    prefersReducedMotion,
  };
};

// Hook for Client Portal responsive behavior
export const useClientResponsiveMessaging = (): ResponsiveMessagingState => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.between('lg', 'xl'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const hasTouch = useMediaQuery('(pointer: coarse)');
  const hasHover = useMediaQuery('(hover: hover)');
  
  // Determine current breakpoint
  let breakpoint: BreakpointKey = 'lg';
  if (isXs) breakpoint = 'xs';
  else if (isSm) breakpoint = 'sm';
  else if (isMd) breakpoint = 'md';
  else if (isLg) breakpoint = 'lg';
  else if (isXl) breakpoint = 'xl';
  
  const layout = clientResponsiveLayouts[breakpoint];
  
  return {
    breakpoint,
    layout,
    isMobile: isXs || isSm,
    isTablet: isMd,
    isDesktop: isLg || isXl,
    orientation: isLandscape ? 'landscape' : 'portrait',
    
    // Layout behavior  
    shouldCollapseThreadList: layout.threadList.collapsed,
    shouldUseOverlay: layout.threadList.overlay,
    shouldStickyComposer: layout.composer.position !== 'static',
    shouldShowBottomNavigation: layout.navigation.type === 'bottom-sheet',
    
    // Device capabilities
    hasTouch,
    hasHover,
    prefersReducedMotion,
  };
};

// === RESPONSIVE CSS GENERATORS ===

export const generateResponsiveStyles = (
  layouts: Record<BreakpointKey, ResponsiveLayoutConfig>,
  theme: Theme
) => {
  return {
    // Container responsive styles
    container: {
      [theme.breakpoints.down('sm')]: {
        ...layouts.xs.container,
      },
      [theme.breakpoints.between('sm', 'md')]: {
        ...layouts.sm.container,
      },
      [theme.breakpoints.between('md', 'lg')]: {
        ...layouts.md.container,
      },
      [theme.breakpoints.between('lg', 'xl')]: {
        ...layouts.lg.container,
      },
      [theme.breakpoints.up('xl')]: {
        ...layouts.xl.container,
      },
    },
    
    // Thread list responsive styles
    threadList: {
      [theme.breakpoints.down('sm')]: {
        width: layouts.xs.threadList.width,
        minWidth: layouts.xs.threadList.minWidth,
        ...(layouts.xs.threadList.overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          transform: 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&.open': {
            transform: 'translateX(0)',
          },
        }),
      },
      [theme.breakpoints.between('sm', 'md')]: {
        width: layouts.sm.threadList.width,
        minWidth: layouts.sm.threadList.minWidth,
      },
      [theme.breakpoints.between('md', 'lg')]: {
        width: layouts.md.threadList.width,
        minWidth: layouts.md.threadList.minWidth,
      },
      [theme.breakpoints.between('lg', 'xl')]: {
        width: layouts.lg.threadList.width,
        minWidth: layouts.lg.threadList.minWidth,
      },
      [theme.breakpoints.up('xl')]: {
        width: layouts.xl.threadList.width,
        minWidth: layouts.xl.threadList.minWidth,
      },
    },
    
    // Message thread responsive styles
    messageThread: {
      [theme.breakpoints.down('sm')]: layouts.xs.messageThread,
      [theme.breakpoints.between('sm', 'md')]: layouts.sm.messageThread,
      [theme.breakpoints.between('md', 'lg')]: layouts.md.messageThread,
      [theme.breakpoints.between('lg', 'xl')]: layouts.lg.messageThread,
      [theme.breakpoints.up('xl')]: layouts.xl.messageThread,
    },
    
    // Message bubble responsive styles
    messageBubble: {
      [theme.breakpoints.down('sm')]: layouts.xs.messageBubble,
      [theme.breakpoints.between('sm', 'md')]: layouts.sm.messageBubble,
      [theme.breakpoints.between('md', 'lg')]: layouts.md.messageBubble,
      [theme.breakpoints.between('lg', 'xl')]: layouts.lg.messageBubble,
      [theme.breakpoints.up('xl')]: layouts.xl.messageBubble,
    },
    
    // Composer responsive styles
    composer: {
      [theme.breakpoints.down('sm')]: {
        ...layouts.xs.composer,
        ...(layouts.xs.composer.position === 'sticky' && {
          position: 'sticky',
          bottom: layouts.xs.composer.bottom || '0',
          background: layouts.xs.composer.background,
          backdropFilter: layouts.xs.composer.backdrop,
          zIndex: 5,
        }),
      },
      [theme.breakpoints.between('sm', 'md')]: layouts.sm.composer,
      [theme.breakpoints.between('md', 'lg')]: layouts.md.composer,
      [theme.breakpoints.between('lg', 'xl')]: layouts.lg.composer,
      [theme.breakpoints.up('xl')]: layouts.xl.composer,
    },
  };
};

// === TOUCH AND GESTURE SUPPORT ===

export interface TouchGestureConfig {
  // Swipe gestures
  enableSwipeToReveal: boolean;
  enableSwipeToDelete: boolean;
  enableSwipeNavigation: boolean;
  
  // Touch thresholds
  touchThreshold: number;
  swipeThreshold: number;
  longPressThreshold: number;
  
  // Visual feedback
  enableRippleEffect: boolean;
  enableHapticFeedback: boolean;
}

export const touchGestureDefaults: TouchGestureConfig = {
  enableSwipeToReveal: true,
  enableSwipeToDelete: true,
  enableSwipeNavigation: true,
  touchThreshold: 10,
  swipeThreshold: 50,
  longPressThreshold: 500,
  enableRippleEffect: true,
  enableHapticFeedback: true,
};

// === VIEWPORT AND ORIENTATION UTILITIES ===

export const getViewportDimensions = () => {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080 };
  }
  
  return {
    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
  };
};

export const getEffectiveViewportHeight = () => {
  if (typeof window === 'undefined') return 1080;
  
  // Account for mobile browser UI (address bar, etc.)
  return window.visualViewport?.height || window.innerHeight;
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(display-mode: standalone)').matches ||
         // @ts-ignore - Safari specific
         window.navigator.standalone === true;
};

// === PERFORMANCE OPTIMIZATIONS ===

export const shouldUseVirtualization = (itemCount: number, isMobile: boolean): boolean => {
  // Use virtualization for large lists, especially on mobile
  return itemCount > (isMobile ? 20 : 50);
};

export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top')) || 0,
    right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right')) || 0,
    bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom')) || 0,
    left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left')) || 0,
  };
};

// Export everything as default for easy consumption
export default {
  breakpoints: messagingBreakpoints,
  adminLayouts: adminResponsiveLayouts,
  clientLayouts: clientResponsiveLayouts,
  useAdminResponsive: useAdminResponsiveMessaging,
  useClientResponsive: useClientResponsiveMessaging,
  generateStyles: generateResponsiveStyles,
  touchDefaults: touchGestureDefaults,
  utils: {
    getViewportDimensions,
    getEffectiveViewportHeight,
    isStandalonePWA,
    shouldUseVirtualization,
    getSafeAreaInsets,
  },
};