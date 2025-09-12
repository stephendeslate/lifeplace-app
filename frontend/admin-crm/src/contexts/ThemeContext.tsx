import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { Theme } from '@mui/material/styles';
import { createModernTheme } from '../design-system/theme/modernTheme';
import { injectDesignTokens } from '@shared/design-system';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  effectiveMode: 'light' | 'dark';
  theme: Theme;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'lifeplace-theme-mode';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to read theme preference from localStorage:', error);
    }
    
    return 'system';
  });

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const effectiveMode = mode === 'system' ? systemPreference : mode;
  const theme = React.useMemo(() => createModernTheme(effectiveMode), [effectiveMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Set theme attribute and color scheme
      root.setAttribute('data-theme', effectiveMode);
      root.style.colorScheme = effectiveMode;
      
      // Inject design system tokens
      injectDesignTokens();
    }
  }, [effectiveMode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const contextValue: ThemeContextType = {
    mode,
    effectiveMode,
    theme,
    toggleMode,
    setMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};