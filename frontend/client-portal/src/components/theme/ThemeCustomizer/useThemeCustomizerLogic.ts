import { useState, useEffect } from 'react';
import { createTheme } from '@mui/material';
import type { ThemeCustomization, ThemeCustomizerContextType } from './types';
import { defaultCustomization } from './types';

export function useThemeCustomizerLogic() {
  const [customization, setCustomization] = useState<ThemeCustomization>(() => {
    const saved = localStorage.getItem('theme-customization');
    return saved ? { ...defaultCustomization, ...JSON.parse(saved) } : defaultCustomization;
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const updateCustomization = (updates: Partial<ThemeCustomization>) => {
    setCustomization((prev) => {
      const newCustomization = { ...prev, ...updates };
      localStorage.setItem('theme-customization', JSON.stringify(newCustomization));
      return newCustomization;
    });
  };

  const resetToDefault = () => {
    setCustomization(defaultCustomization);
    localStorage.setItem('theme-customization', JSON.stringify(defaultCustomization));
  };

  const toggleCustomizer = () => {
    setIsCustomizerOpen((prev) => !prev);
  };

  // Apply theme based on system preference if auto mode
  useEffect(() => {
    if (customization.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Theme will be automatically updated through the applyTheme function
        document.documentElement.setAttribute(
          'data-theme-mode',
          mediaQuery.matches ? 'dark' : 'light',
        );
      };

      handleChange(); // Set initial value
      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      document.documentElement.setAttribute('data-theme-mode', customization.mode);
    }
  }, [customization.mode]);

  // Apply global CSS variables
  useEffect(() => {
    const root = document.documentElement;

    // Color variables
    root.style.setProperty('--primary-color', customization.primaryColor);
    root.style.setProperty('--secondary-color', customization.secondaryColor);

    // Glass morphism variables
    root.style.setProperty('--glass-intensity', customization.glassIntensity.toString());
    root.style.setProperty('--blur-strength', `${customization.blurStrength}px`);
    root.style.setProperty('--border-opacity', customization.borderOpacity.toString());

    // Layout variables
    root.style.setProperty('--border-radius', `${customization.borderRadius}px`);
    root.style.setProperty('--font-size', `${customization.fontSize}px`);

    // Animation variables
    root.style.setProperty('--animation-duration', `${1 / customization.animationSpeed}s`);

    // Conditional classes
    root.classList.toggle('compact-mode', customization.compactMode);
    root.classList.toggle('high-contrast', customization.highContrast);
    root.classList.toggle('reduced-transparency', customization.reducedTransparency);
  }, [customization]);

  const applyTheme = (theme: Record<string, unknown>) => {
    const isDark =
      customization.mode === 'dark' ||
      (customization.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return createTheme({
      ...theme,
      palette: {
        ...(theme.palette as object),
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: customization.primaryColor,
        },
        secondary: {
          main: customization.secondaryColor,
        },
        background: {
          default: isDark ? '#0a0a0a' : '#f8f9fa',
          paper: isDark ? '#1a1a1a' : '#ffffff',
        },
      },
      typography: {
        ...(theme.typography as object),
        fontSize: customization.fontSize,
        fontFamily: customization.compactMode
          ? '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
          : (theme.typography as unknown as { fontFamily?: string }).fontFamily,
      },
      shape: {
        borderRadius: customization.borderRadius,
      },
      transitions: {
        ...(theme.transitions as object),
        duration: {
          ...((theme.transitions as unknown as { duration?: object }).duration || {}),
          standard: Math.round(300 / customization.animationSpeed),
          short: Math.round(150 / customization.animationSpeed),
        },
      },
      components: {
        ...(theme.components as object),
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: customization.borderRadius,
              backdropFilter: customization.reducedTransparency
                ? 'none'
                : `blur(${customization.blurStrength}px)`,
            },
          },
        },
      },
    });
  };

  const contextValue: ThemeCustomizerContextType = {
    customization,
    updateCustomization,
    resetToDefault,
    isCustomizerOpen,
    toggleCustomizer,
    applyTheme,
  };

  return {
    customization,
    updateCustomization,
    resetToDefault,
    isCustomizerOpen,
    setIsCustomizerOpen,
    contextValue,
  };
}
