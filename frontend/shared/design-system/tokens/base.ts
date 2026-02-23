// Base Design Tokens for LifePlace
export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface LegacyColorVariant {
  main: string;
  light: string;
  dark: string;
}

export interface SemanticColors {
  success: ColorShades;
  warning: ColorShades;
  error: ColorShades;
  info: ColorShades;
}

export interface ColorToken {
  // Modern color structure used in the design system
  brand: {
    primary: ColorShades;
    secondary: ColorShades;
  };
  neutral: ColorShades;
  semantic: SemanticColors;

  // Legacy structure for backwards compatibility
  primary: LegacyColorVariant;
  secondary: LegacyColorVariant;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface SpacingToken {
  space: {
    [key: number]: number;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  breakpoints: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export interface ShadowToken {
  elevation: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    low: string; // Legacy - keep for backwards compatibility
    medium: string; // Legacy - keep for backwards compatibility
    high: string; // Legacy - keep for backwards compatibility
  };
  glass: {
    light: string;
    medium: string;
    strong: string;
  };
}

export interface AnimationToken {
  transitions: {
    all: string;
    opacity: string;
    transform: string;
  };
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
}

export type GlassColor = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

export interface GlassEffectVariant {
  background: string;
  border: string;
  blur: string;
}

export interface GlassToken {
  light: {
    subtle: GlassEffectVariant;
    medium: GlassEffectVariant;
    strong: GlassEffectVariant;
  };
  dark: {
    subtle: GlassEffectVariant;
    medium: GlassEffectVariant;
    strong: GlassEffectVariant;
  };
  colored: Record<GlassColor, GlassEffectVariant>;
}

export interface LegacyGlassToken {
  blur: string;
  glass: string;
  frosted: string;
}

export interface ZIndexToken {
  modal: number;
  drawer: number;
  appBar: number;
  tooltip: number;
}

export interface DesignTokens {
  colors: ColorToken;
  typography: TypographyToken;
  spacing: SpacingToken;
  shadows: ShadowToken;
  animations: AnimationToken;
  glass: GlassToken;
  effects: LegacyGlassToken; // Legacy - keep for backwards compatibility
  zIndex: ZIndexToken;
}

export const designTokens: DesignTokens = {
  colors: {
    // Modern brand colors with full shade ranges
    brand: {
      primary: {
        50: '#e3f2fd',
        100: '#bbdefb',
        200: '#90caf9',
        300: '#64b5f6',
        400: '#42a5f5',
        500: '#2196f3',
        600: '#1e88e5',
        700: '#1976d2',
        800: '#1565c0',
        900: '#0d47a1',
        950: '#0a3d91',
      },
      secondary: {
        50: '#fce4ec',
        100: '#f8bbd9',
        200: '#f48fb1',
        300: '#f06292',
        400: '#ec407a',
        500: '#e91e63',
        600: '#d81b60',
        700: '#c2185b',
        800: '#ad1457',
        900: '#880e4f',
        950: '#7a0d44',
      },
    },

    // Neutral color palette
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      950: '#0f0f0f',
    },

    // Semantic colors
    semantic: {
      success: {
        50: '#e8f5e8',
        100: '#c8e6c9',
        200: '#a5d6a7',
        300: '#81c784',
        400: '#66bb6a',
        500: '#4caf50',
        600: '#43a047',
        700: '#388e3c',
        800: '#2e7d32',
        900: '#1b5e20',
        950: '#155317',
      },
      warning: {
        50: '#fff3e0',
        100: '#ffe0b2',
        200: '#ffcc80',
        300: '#ffb74d',
        400: '#ffa726',
        500: '#ff9800',
        600: '#fb8c00',
        700: '#f57c00',
        800: '#ef6c00',
        900: '#e65100',
        950: '#d84315',
      },
      error: {
        50: '#ffebee',
        100: '#ffcdd2',
        200: '#ef9a9a',
        300: '#e57373',
        400: '#ef5350',
        500: '#f44336',
        600: '#e53935',
        700: '#d32f2f',
        800: '#c62828',
        900: '#b71c1c',
        950: '#a71818',
      },
      info: {
        50: '#e1f5fe',
        100: '#b3e5fc',
        200: '#81d4fa',
        300: '#4fc3f7',
        400: '#29b6f6',
        500: '#03a9f4',
        600: '#039be5',
        700: '#0288d1',
        800: '#0277bd',
        900: '#01579b',
        950: '#014d87',
      },
    },

    // Legacy structure for backwards compatibility
    primary: {
      main: '#2196f3',
      light: '#42a5f5',
      dark: '#1976d2',
    },
    secondary: {
      main: '#e91e63',
      light: '#f06292',
      dark: '#c2185b',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    space: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
    },
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    breakpoints: {
      xs: '320px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  shadows: {
    elevation: {
      none: 'none',
      sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      // Legacy values for backwards compatibility
      low: '0 1px 3px rgba(0,0,0,0.12)',
      medium: '0 4px 6px rgba(0,0,0,0.15)',
      high: '0 8px 24px rgba(0,0,0,0.18)',
    },
    glass: {
      light: '0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 4px rgba(0, 0, 0, 0.03)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05)',
      strong: '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
    },
  },
  animations: {
    transitions: {
      all: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
  },
  glass: {
    light: {
      subtle: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
        blur: 'blur(8px)',
      },
      medium: {
        background: 'rgba(255, 255, 255, 0.15)',
        border: 'rgba(255, 255, 255, 0.3)',
        blur: 'blur(12px)',
      },
      strong: {
        background: 'rgba(255, 255, 255, 0.25)',
        border: 'rgba(255, 255, 255, 0.4)',
        blur: 'blur(16px)',
      },
    },
    dark: {
      subtle: {
        background: 'rgba(0, 0, 0, 0.1)',
        border: 'rgba(255, 255, 255, 0.1)',
        blur: 'blur(8px)',
      },
      medium: {
        background: 'rgba(0, 0, 0, 0.15)',
        border: 'rgba(255, 255, 255, 0.15)',
        blur: 'blur(12px)',
      },
      strong: {
        background: 'rgba(0, 0, 0, 0.25)',
        border: 'rgba(255, 255, 255, 0.2)',
        blur: 'blur(16px)',
      },
    },
    colored: {
      primary: {
        background: 'rgba(25, 118, 210, 0.15)',
        border: 'rgba(25, 118, 210, 0.3)',
        blur: 'blur(12px)',
      },
      success: {
        background: 'rgba(46, 125, 50, 0.15)',
        border: 'rgba(46, 125, 50, 0.3)',
        blur: 'blur(12px)',
      },
      warning: {
        background: 'rgba(237, 108, 2, 0.15)',
        border: 'rgba(237, 108, 2, 0.3)',
        blur: 'blur(12px)',
      },
      error: {
        background: 'rgba(211, 47, 47, 0.15)',
        border: 'rgba(211, 47, 47, 0.3)',
        blur: 'blur(12px)',
      },
      neutral: {
        background: 'rgba(158, 158, 158, 0.15)',
        border: 'rgba(158, 158, 158, 0.3)',
        blur: 'blur(12px)',
      },
    },
  },
  effects: {
    blur: 'blur(8px)',
    glass: 'blur(16px)',
    frosted: 'blur(12px)',
  },
  zIndex: {
    modal: 1300,
    drawer: 1200,
    appBar: 1100,
    tooltip: 1500,
  },
};
