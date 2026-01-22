// frontend/client-portal/src/components/accessibility/AccessibilityProvider.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  TextIncrease as TextIncreaseIcon,
  TextDecrease as TextDecreaseIcon,
  Contrast as ContrastIcon,
  Visibility as VisibilityIcon,
  VolumeUp as VolumeUpIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { alpha } from '@mui/material/styles';
import {
  AccessibilityContext,
  defaultSettings,
  type AccessibilitySettings,
  type AccessibilityContextType,
} from './useAccessibility';

// Re-export hook for backwards compatibility
export { useAccessibility } from './useAccessibility';

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const theme = useTheme();
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [isAccessibilityPanelOpen, setIsAccessibilityPanelOpen] = useState(false);

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const announceToScreenReader = useCallback((message: string) => {
    // Use the aria-live region for screen reader announcements only
    const liveRegion = document.getElementById('accessibility-announcements');
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  const toggleAccessibilityPanel = useCallback(() => {
    setIsAccessibilityPanelOpen(prev => !prev);
    announceToScreenReader(
      isAccessibilityPanelOpen 
        ? 'Accessibility panel closed' 
        : 'Accessibility panel opened. Use arrow keys to navigate options.'
    );
  }, [isAccessibilityPanelOpen, announceToScreenReader]);

  // Apply global accessibility styles
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size scaling
    root.style.fontSize = `${settings.fontSize * 100}%`;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('accessibility-reduced-motion');
    } else {
      root.classList.remove('accessibility-reduced-motion');
    }

    // Focus ring visibility
    if (settings.focusRing) {
      root.classList.add('accessibility-focus-ring');
    } else {
      root.classList.remove('accessibility-focus-ring');
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('accessibility-keyboard-nav');
    } else {
      root.classList.remove('accessibility-keyboard-nav');
    }
  }, [settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + A: Toggle accessibility panel
      if (event.altKey && event.key === 'a') {
        event.preventDefault();
        toggleAccessibilityPanel();
      }
      
      // Alt + Plus: Increase font size
      if (event.altKey && event.key === '=') {
        event.preventDefault();
        const newSize = Math.min(settings.fontSize + 0.1, 2);
        updateSetting('fontSize', newSize);
        announceToScreenReader(`Font size increased to ${Math.round(newSize * 100)}%`);
      }
      
      // Alt + Minus: Decrease font size
      if (event.altKey && event.key === '-') {
        event.preventDefault();
        const newSize = Math.max(settings.fontSize - 0.1, 0.8);
        updateSetting('fontSize', newSize);
        announceToScreenReader(`Font size decreased to ${Math.round(newSize * 100)}%`);
      }
      
      // Alt + C: Toggle high contrast
      if (event.altKey && event.key === 'c') {
        event.preventDefault();
        updateSetting('highContrast', !settings.highContrast);
        announceToScreenReader(
          settings.highContrast ? 'High contrast disabled' : 'High contrast enabled'
        );
      }
      
      // Skip to main content
      if (event.key === 'Tab' && !event.shiftKey && document.activeElement === document.body) {
        const skipLink = document.getElementById('skip-to-main');
        if (skipLink) {
          skipLink.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings, updateSetting, announceToScreenReader, toggleAccessibilityPanel]);

  // Focus management
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target && settings.screenReader) {
        const ariaLabel = target.getAttribute('aria-label');
        const text = target.textContent;
        const role = target.getAttribute('role');
        
        if (ariaLabel) {
          announceToScreenReader(ariaLabel);
        } else if (text && text.trim()) {
          announceToScreenReader(text.trim());
        } else if (role) {
          announceToScreenReader(`${role} element focused`);
        }
      }
    };

    if (settings.screenReader) {
      document.addEventListener('focusin', handleFocusIn);
      return () => document.removeEventListener('focusin', handleFocusIn);
    }
  }, [settings.screenReader, announceToScreenReader]);

  const AccessibilityPanel = () => (
    <Box
      sx={{
        position: 'fixed',
        bottom: 80,
        left: 20,
        zIndex: 9999,
        display: isAccessibilityPanelOpen ? 'block' : 'none',
      }}
      role="dialog"
      aria-label="Accessibility Options"
      aria-hidden={!isAccessibilityPanelOpen}
    >
      <GlassCard
        variant="light"
        intensity="strong"
        sx={{
          p: 3,
          width: 280,
          backgroundColor: alpha('#fff', 0.95),
          backdropFilter: 'blur(25px)',
          border: `2px solid ${alpha('#fff', 0.3)}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessibilityIcon color="primary" />
              <Box sx={{ fontSize: '1rem', fontWeight: 600 }}>Accessibility</Box>
            </Box>
            <IconButton
              size="small"
              onClick={toggleAccessibilityPanel}
              aria-label="Close accessibility panel"
              sx={{ 
                backgroundColor: alpha('#fff', 0.1),
                '&:hover': { backgroundColor: alpha('#fff', 0.2) }
              }}
            >
              <KeyboardArrowUpIcon />
            </IconButton>
          </Box>

          {/* Font Size Controls */}
          <Box>
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
              Font Size ({Math.round(settings.fontSize * 100)}%)
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Decrease font size (Alt + -)">
                <IconButton
                  size="small"
                  onClick={() => {
                    const newSize = Math.max(settings.fontSize - 0.1, 0.8);
                    updateSetting('fontSize', newSize);
                    announceToScreenReader(`Font size decreased to ${Math.round(newSize * 100)}%`);
                  }}
                  disabled={settings.fontSize <= 0.8}
                  aria-label="Decrease font size"
                  sx={{ 
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                  }}
                >
                  <TextDecreaseIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Increase font size (Alt + +)">
                <IconButton
                  size="small"
                  onClick={() => {
                    const newSize = Math.min(settings.fontSize + 0.1, 2);
                    updateSetting('fontSize', newSize);
                    announceToScreenReader(`Font size increased to ${Math.round(newSize * 100)}%`);
                  }}
                  disabled={settings.fontSize >= 2}
                  aria-label="Increase font size"
                  sx={{ 
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                  }}
                >
                  <TextIncreaseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* High Contrast Toggle */}
          <Box>
            <Tooltip title="Toggle high contrast mode (Alt + C)">
              <IconButton
                size="small"
                onClick={() => {
                  updateSetting('highContrast', !settings.highContrast);
                  announceToScreenReader(
                    settings.highContrast ? 'High contrast disabled' : 'High contrast enabled'
                  );
                }}
                aria-label={`${settings.highContrast ? 'Disable' : 'Enable'} high contrast`}
                aria-pressed={settings.highContrast}
                sx={{ 
                  backgroundColor: settings.highContrast 
                    ? alpha(theme.palette.primary.main, 0.2) 
                    : alpha('#fff', 0.1),
                  color: settings.highContrast ? theme.palette.primary.main : 'inherit',
                  '&:hover': { 
                    backgroundColor: settings.highContrast 
                      ? alpha(theme.palette.primary.main, 0.3)
                      : alpha('#fff', 0.2)
                  },
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 2,
                  px: 2,
                }}
              >
                <ContrastIcon />
                High Contrast
              </IconButton>
            </Tooltip>
          </Box>

          {/* Reduced Motion Toggle */}
          <Box>
            <Tooltip title="Reduce animations and motion">
              <IconButton
                size="small"
                onClick={() => {
                  updateSetting('reducedMotion', !settings.reducedMotion);
                  announceToScreenReader(
                    settings.reducedMotion ? 'Reduced motion disabled' : 'Reduced motion enabled'
                  );
                }}
                aria-label={`${settings.reducedMotion ? 'Disable' : 'Enable'} reduced motion`}
                aria-pressed={settings.reducedMotion}
                sx={{ 
                  backgroundColor: settings.reducedMotion 
                    ? alpha(theme.palette.primary.main, 0.2) 
                    : alpha('#fff', 0.1),
                  color: settings.reducedMotion ? theme.palette.primary.main : 'inherit',
                  '&:hover': { 
                    backgroundColor: settings.reducedMotion 
                      ? alpha(theme.palette.primary.main, 0.3)
                      : alpha('#fff', 0.2)
                  },
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 2,
                  px: 2,
                }}
              >
                <VisibilityIcon />
                Reduce Motion
              </IconButton>
            </Tooltip>
          </Box>

          {/* Screen Reader Announcements */}
          <Box>
            <Tooltip title="Enable audio announcements for screen readers">
              <IconButton
                size="small"
                onClick={() => {
                  updateSetting('screenReader', !settings.screenReader);
                  announceToScreenReader(
                    settings.screenReader ? 'Screen reader announcements disabled' : 'Screen reader announcements enabled'
                  );
                }}
                aria-label={`${settings.screenReader ? 'Disable' : 'Enable'} screen reader announcements`}
                aria-pressed={settings.screenReader}
                sx={{ 
                  backgroundColor: settings.screenReader 
                    ? alpha(theme.palette.primary.main, 0.2) 
                    : alpha('#fff', 0.1),
                  color: settings.screenReader ? theme.palette.primary.main : 'inherit',
                  '&:hover': { 
                    backgroundColor: settings.screenReader 
                      ? alpha(theme.palette.primary.main, 0.3)
                      : alpha('#fff', 0.2)
                  },
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 2,
                  px: 2,
                }}
              >
                <VolumeUpIcon />
                Screen Reader
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
            Keyboard shortcuts:<br />
            Alt + A: Toggle panel<br />
            Alt + +/-: Font size<br />
            Alt + C: High contrast
          </Box>
        </Box>
      </GlassCard>
    </Box>
  );

  const AccessibilityToggle = () => (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 9998,
      }}
    >
      <Tooltip title="Accessibility Options (Alt + A)">
        <IconButton
          onClick={toggleAccessibilityPanel}
          aria-label="Open accessibility options"
          aria-expanded={isAccessibilityPanelOpen}
          aria-controls="accessibility-panel"
          sx={{
            backgroundColor: alpha('#fff', 0.1),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: alpha('#fff', 0.2),
              transform: 'scale(1.05)',
            },
            '&:focus-visible': {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
            transition: 'all 0.2s ease',
          }}
        >
          <AccessibilityIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    announceToScreenReader,
    isAccessibilityPanelOpen,
    toggleAccessibilityPanel,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip to main content link */}
      <Box
        id="skip-to-main"
        component="a"
        href="#main-content"
        tabIndex={0}
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: 10000,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          padding: '8px 16px',
          textDecoration: 'none',
          borderRadius: '0 0 8px 0',
          '&:focus': {
            left: 0,
          },
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
              mainContent.focus();
              mainContent.scrollIntoView();
            }
          }
        }}
      >
        Skip to main content
      </Box>

      {/* Screen reader live region for announcements */}
      <Box
        id="accessibility-announcements"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />

      {/* Main content with accessibility enhancements */}
      <Box
        id="main-content"
        role="main"
        tabIndex={-1}
        sx={{
          outline: 'none',
          '&:focus-visible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        {children}
      </Box>

      {/* Accessibility controls */}
      <AccessibilityToggle />
      <AccessibilityPanel />


      {/* Global accessibility styles */}
      <style>
        {`
          /* High contrast styles */
          .accessibility-high-contrast {
            --glass-bg: #000 !important;
            --glass-border: #fff !important;
            --text-primary: #fff !important;
            --text-secondary: #ccc !important;
          }
          
          .accessibility-high-contrast * {
            color: #fff !important;
            border-color: #fff !important;
          }
          
          .accessibility-high-contrast .MuiButton-root {
            background-color: #000 !important;
            border: 2px solid #fff !important;
            color: #fff !important;
          }
          
          .accessibility-high-contrast .MuiButton-contained {
            background-color: #fff !important;
            color: #000 !important;
          }

          /* Reduced motion styles */
          .accessibility-reduced-motion * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0.01ms !important;
          }

          /* Enhanced focus ring */
          .accessibility-focus-ring *:focus-visible {
            outline: 3px solid ${theme.palette.primary.main} !important;
            outline-offset: 2px !important;
            border-radius: 4px;
          }

          /* Keyboard navigation enhancements */
          .accessibility-keyboard-nav button:focus,
          .accessibility-keyboard-nav a:focus,
          .accessibility-keyboard-nav input:focus,
          .accessibility-keyboard-nav textarea:focus,
          .accessibility-keyboard-nav select:focus {
            outline: 3px solid ${theme.palette.primary.main} !important;
            outline-offset: 2px !important;
          }
        `}
      </style>
    </AccessibilityContext.Provider>
  );
};