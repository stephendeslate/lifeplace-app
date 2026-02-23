// frontend/admin-crm/src/contexts/BrandingContext.tsx

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useCompanySettings } from '../hooks/useSettings';
import { tokens } from '../design-system';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  primaryGradient: string;
  primaryGradientHover: string;
}

interface BrandingContextValue {
  colors: BrandColors;
  isLoading: boolean;
  error: Error | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  companyName: string;
}

const defaultColors: BrandColors = {
  primary: tokens.color.primary[500],
  secondary: tokens.color.secondary[500],
  accent: tokens.color.warning[500],
  primaryGradient: tokens.color.backgrounds.brandGradient,
  primaryGradientHover: tokens.color.backgrounds.brandHover,
};

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
};

// Helper to generate gradient from a single color
const generateGradient = (color: string): string => {
  // Darken the color slightly for the second stop
  return `linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -20)} 100%)`;
};

const generateHoverGradient = (color: string): string => {
  // Slightly lighter version for hover
  return `linear-gradient(135deg, ${adjustColorBrightness(color, -10)} 0%, ${adjustColorBrightness(color, -30)} 100%)`;
};

// Utility to adjust color brightness
const adjustColorBrightness = (hex: string, percent: number): string => {
  // Handle 3-character hex
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(Math.min((num >> 16) + amt, 255), 0);
  const G = Math.max(Math.min(((num >> 8) & 0x00ff) + amt, 255), 0);
  const B = Math.max(Math.min((num & 0x0000ff) + amt, 255), 0);

  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

interface BrandingProviderProps {
  children: React.ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const { companySettings, isLoading, error } = useCompanySettings();

  // Memoize brand colors based on company settings
  const colors = useMemo<BrandColors>(() => {
    if (!companySettings) {
      return defaultColors;
    }

    const primaryColor = companySettings.primary_color || defaultColors.primary;
    const secondaryColor = companySettings.secondary_color || defaultColors.secondary;
    const accentColor = companySettings.accent_color || defaultColors.accent;

    return {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      primaryGradient: generateGradient(primaryColor),
      primaryGradientHover: generateHoverGradient(primaryColor),
    };
  }, [companySettings]);

  // Update CSS custom properties when brand colors change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', colors.primary);
    root.style.setProperty('--brand-secondary', colors.secondary);
    root.style.setProperty('--brand-accent', colors.accent);
    root.style.setProperty('--brand-gradient', colors.primaryGradient);
    root.style.setProperty('--brand-gradient-hover', colors.primaryGradientHover);
  }, [colors]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      colors,
      isLoading,
      error: error as Error | null,
      logoUrl: companySettings?.logo || null,
      logoDarkUrl: companySettings?.logo_dark || null,
      faviconUrl: companySettings?.favicon || null,
      companyName: companySettings?.company_name || 'LifePlace',
    }),
    [colors, isLoading, error, companySettings],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

// Hook for getting brand colors without needing the full context
export const useBrandColors = (): BrandColors => {
  const { colors } = useBranding();
  return colors;
};
