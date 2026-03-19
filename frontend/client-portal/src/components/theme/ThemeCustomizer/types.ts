import type React from 'react';

export interface ThemeCustomization {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  glassIntensity: number;
  blurStrength: number;
  borderOpacity: number;
  animationSpeed: number;
  borderRadius: number;
  fontSize: number;
  compactMode: boolean;
  highContrast: boolean;
  reducedTransparency: boolean;
}

export interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  preview: string;
}

export interface ThemeCustomizerContextType {
  customization: ThemeCustomization;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
  resetToDefault: () => void;
  isCustomizerOpen: boolean;
  toggleCustomizer: () => void;
  applyTheme: (theme: Record<string, unknown>) => void;
}

export interface ThemeCustomizerProviderProps {
  children: React.ReactNode;
}

export const defaultCustomization: ThemeCustomization = {
  mode: 'auto',
  primaryColor: '#2d5016',
  secondaryColor: '#8b4513',
  glassIntensity: 0.1,
  blurStrength: 20,
  borderOpacity: 0.1,
  animationSpeed: 1,
  borderRadius: 12,
  fontSize: 14,
  compactMode: false,
  highContrast: false,
  reducedTransparency: false,
};

export const colorPresets: ColorPreset[] = [
  {
    name: 'Deep Forest',
    primary: '#2d5016',
    secondary: '#8b4513',
    preview: 'linear-gradient(45deg, #2d5016, #8b4513)',
  },
  {
    name: 'Sunset Orange',
    primary: '#ff6b35',
    secondary: '#ff8a65',
    preview: 'linear-gradient(45deg, #ff6b35, #ff8a65)',
  },
  {
    name: 'Forest Green',
    primary: '#2e7d32',
    secondary: '#66bb6a',
    preview: 'linear-gradient(45deg, #2e7d32, #66bb6a)',
  },
  {
    name: 'Royal Purple',
    primary: '#7b1fa2',
    secondary: '#ba68c8',
    preview: 'linear-gradient(45deg, #7b1fa2, #ba68c8)',
  },
  {
    name: 'Rose Gold',
    primary: '#e91e63',
    secondary: '#f8bbd9',
    preview: 'linear-gradient(45deg, #e91e63, #f8bbd9)',
  },
  {
    name: 'Midnight',
    primary: '#263238',
    secondary: '#37474f',
    preview: 'linear-gradient(45deg, #263238, #37474f)',
  },
  {
    name: 'Coral Reef',
    primary: '#ff7043',
    secondary: '#ffab91',
    preview: 'linear-gradient(45deg, #ff7043, #ffab91)',
  },
  {
    name: 'Sage Green',
    primary: '#5a7c47',
    secondary: '#7a9469',
    preview: 'linear-gradient(45deg, #5a7c47, #7a9469)',
  },
];
