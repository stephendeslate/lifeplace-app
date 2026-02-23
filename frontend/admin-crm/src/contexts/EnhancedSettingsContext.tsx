import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  SettingsContextValue,
  SettingsFavorite,
  ThemeSettings,
} from '../types/enhanced-settings.types';
import { tokens } from '../design-system';

const STORAGE_KEYS = {
  FAVORITES: 'settings_favorites',
  THEME: 'settings_theme',
};

const defaultTheme: ThemeSettings = {
  mode: 'light',
  primaryColor: tokens.color.primary[500],
  accentColor: tokens.color.secondary[500],
  fontScale: 1,
  animations: true,
  reducedMotion: false,
};

const EnhancedSettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const useEnhancedSettings = () => {
  const context = useContext(EnhancedSettingsContext);
  if (!context) {
    throw new Error('useEnhancedSettings must be used within EnhancedSettingsProvider');
  }
  return context;
};

interface EnhancedSettingsProviderProps {
  children: React.ReactNode;
}

export const EnhancedSettingsProvider: React.FC<EnhancedSettingsProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<SettingsFavorite[]>([]);
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }

      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme) {
        setThemeState(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading settings preferences:', error);
    }
  }, []);

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));

    // Apply theme to document
    if (
      theme.mode === 'dark' ||
      (theme.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [theme]);

  const addFavorite = useCallback((item: SettingsFavorite) => {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === item.id);
      if (exists) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== id));
  }, []);

  const setTheme = useCallback((newTheme: Partial<ThemeSettings>) => {
    setThemeState((prev) => ({ ...prev, ...newTheme }));
  }, []);

  const value: SettingsContextValue = {
    favorites,
    addFavorite,
    removeFavorite,
    theme,
    setTheme,
  };

  return (
    <EnhancedSettingsContext.Provider value={value}>{children}</EnhancedSettingsContext.Provider>
  );
};
