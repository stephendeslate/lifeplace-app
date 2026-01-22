// frontend/client-portal/src/components/accessibility/useAccessibility.ts
// Hook for accessing accessibility context - extracted for fast refresh compatibility

import { createContext, useContext } from 'react';

export interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusRing: boolean;
}

export interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  announceToScreenReader: (message: string) => void;
  isAccessibilityPanelOpen: boolean;
  toggleAccessibilityPanel: () => void;
}

export const defaultSettings: AccessibilitySettings = {
  fontSize: 1,
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: true,
  focusRing: true,
};

export const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
