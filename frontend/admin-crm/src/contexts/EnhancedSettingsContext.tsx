import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  SettingsContextValue,
  SettingsFavorite,
  SettingsRecentItem,
  SettingsLayoutMode,
  ThemeSettings,
  KeyboardShortcut
} from '../types/enhanced-settings.types';
import { tokens } from '../design-system';

const STORAGE_KEYS = {
  FAVORITES: 'settings_favorites',
  RECENT: 'settings_recent',
  LAYOUT: 'settings_layout',
  THEME: 'settings_theme',
};

const defaultLayoutMode: SettingsLayoutMode = {
  sidebarCollapsed: false,
  sidebarWidth: 'normal',
  contentLayout: 'cards',
  darkMode: false,
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
  const [recentItems, setRecentItems] = useState<SettingsRecentItem[]>([]);
  const [layoutMode, setLayoutModeState] = useState<SettingsLayoutMode>(defaultLayoutMode);
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }

      const savedRecent = localStorage.getItem(STORAGE_KEYS.RECENT);
      if (savedRecent) {
        setRecentItems(JSON.parse(savedRecent));
      }

      const savedLayout = localStorage.getItem(STORAGE_KEYS.LAYOUT);
      if (savedLayout) {
        setLayoutModeState(JSON.parse(savedLayout));
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

  // Persist recent items to localStorage (limit to 10)
  useEffect(() => {
    const limitedRecent = recentItems.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(limitedRecent));
  }, [recentItems]);

  // Persist layout mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(layoutMode));
  }, [layoutMode]);

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
    
    // Apply theme to document
    if (theme.mode === 'dark' || (theme.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [theme]);

  const addFavorite = useCallback((item: SettingsFavorite) => {
    setFavorites(prev => {
      const exists = prev.some(fav => fav.id === item.id);
      if (exists) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  }, []);

  const addRecentItem = useCallback((item: SettingsRecentItem) => {
    setRecentItems(prev => {
      const filtered = prev.filter(recent => recent.id !== item.id);
      return [{ ...item, visitedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
    });
  }, []);

  const setLayoutMode = useCallback((mode: Partial<SettingsLayoutMode>) => {
    setLayoutModeState(prev => ({ ...prev, ...mode }));
  }, []);

  const setTheme = useCallback((newTheme: Partial<ThemeSettings>) => {
    setThemeState(prev => ({ ...prev, ...newTheme }));
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => [...prev, shortcut]);
  }, []);

  const unregisterShortcut = useCallback((keys: string[]) => {
    setShortcuts(prev => prev.filter(s => s.keys.join('+') !== keys.join('+')));
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const keys = shortcut.keys.map(k => k.toLowerCase());
        const pressed: string[] = [];
        
        if (e.metaKey || e.ctrlKey) pressed.push('cmd');
        if (e.altKey) pressed.push('alt');
        if (e.shiftKey) pressed.push('shift');
        pressed.push(e.key.toLowerCase());
        
        if (keys.every((k: string) => pressed.includes(k))) {
          e.preventDefault();
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);

  const value: SettingsContextValue = {
    favorites,
    addFavorite,
    removeFavorite,
    recentItems,
    addRecentItem,
    layoutMode,
    setLayoutMode,
    theme,
    setTheme,
    shortcuts,
    registerShortcut,
    unregisterShortcut,
  };

  return (
    <EnhancedSettingsContext.Provider value={value}>
      {children}
    </EnhancedSettingsContext.Provider>
  );
};