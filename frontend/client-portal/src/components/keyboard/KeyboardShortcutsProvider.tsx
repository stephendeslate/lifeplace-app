// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Chip,
  IconButton,
  useTheme,
  alpha,
  Stack,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
  Home as HomeIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface KeyboardShortcut {
  id: string;
  category: string;
  description: string;
  keys: string[];
  action: () => void;
  icon?: React.ReactNode;
  enabled?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  addShortcut: (shortcut: KeyboardShortcut) => void;
  removeShortcut: (id: string) => void;
  isHelpOpen: boolean;
  toggleHelp: () => void;
  executeShortcut: (keys: string[]) => boolean;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({ children }) => {
  const theme = useTheme();
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [keySequence, setKeySequence] = useState<string[]>([]);

  // Default shortcuts
  const defaultShortcuts: KeyboardShortcut[] = [
    {
      id: 'help',
      category: 'General',
      description: 'Show keyboard shortcuts help',
      keys: ['?'],
      action: () => setIsHelpOpen(true),
      icon: <HelpIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'search',
      category: 'General',
      description: 'Open global search',
      keys: ['Meta', 'k'],
      action: () => {
        const searchButton = document.querySelector('[aria-label*="Search"]') as HTMLElement;
        if (searchButton) searchButton.click();
      },
      icon: <SearchIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'home',
      category: 'Navigation',
      description: 'Go to dashboard',
      keys: ['g', 'h'],
      action: () => {
        window.location.hash = '/dashboard';
      },
      icon: <HomeIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'settings',
      category: 'Navigation',
      description: 'Go to settings',
      keys: ['g', 's'],
      action: () => {
        window.location.hash = '/settings';
      },
      icon: <SettingsIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'notifications',
      category: 'General',
      description: 'Open notifications',
      keys: ['n'],
      action: () => {
        const notificationButton = document.querySelector('[aria-label*="notification"]') as HTMLElement;
        if (notificationButton) notificationButton.click();
      },
      icon: <NotificationsIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'menu',
      category: 'General',
      description: 'Toggle sidebar menu',
      keys: ['m'],
      action: () => {
        const menuButton = document.querySelector('[aria-label*="menu"]') as HTMLElement;
        if (menuButton) menuButton.click();
      },
      icon: <MenuIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'new',
      category: 'Actions',
      description: 'Create new item',
      keys: ['c'],
      action: () => {
        const newButton = document.querySelector('[aria-label*="new"], [aria-label*="create"], [aria-label*="add"]') as HTMLElement;
        if (newButton) newButton.click();
      },
      icon: <AddIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'save',
      category: 'Actions',
      description: 'Save current form',
      keys: ['Meta', 's'],
      action: () => {
        const saveButton = document.querySelector('[type="submit"], [aria-label*="save"]') as HTMLElement;
        if (saveButton) {
          saveButton.click();
        }
      },
      icon: <SaveIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'back',
      category: 'Navigation',
      description: 'Go back',
      keys: ['Escape'],
      action: () => {
        const backButton = document.querySelector('[aria-label*="back"]') as HTMLElement;
        if (backButton) {
          backButton.click();
        } else {
          window.history.back();
        }
      },
      icon: <BackIcon fontSize="small" />,
      enabled: true,
    },
    {
      id: 'next',
      category: 'Navigation',
      description: 'Go forward/next',
      keys: ['Meta', 'ArrowRight'],
      action: () => {
        const nextButton = document.querySelector('[aria-label*="next"], [aria-label*="forward"]') as HTMLElement;
        if (nextButton) nextButton.click();
      },
      icon: <ForwardIcon fontSize="small" />,
      enabled: true,
    },
  ];

  // Initialize default shortcuts
  useEffect(() => {
    setShortcuts(defaultShortcuts);
  }, []);

  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => [...prev.filter(s => s.id !== shortcut.id), shortcut]);
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  const executeShortcut = useCallback((keys: string[]): boolean => {
    const shortcut = shortcuts.find(s => 
      s.enabled && 
      s.keys.length === keys.length && 
      s.keys.every((key, index) => key === keys[index])
    );

    if (shortcut) {
      shortcut.action();
      return true;
    }
    return false;
  }, [shortcuts]);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen(prev => !prev);
  }, []);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key;
      const newPressedKeys = new Set(pressedKeys);
      
      // Handle modifier keys
      if (event.metaKey) newPressedKeys.add('Meta');
      if (event.ctrlKey) newPressedKeys.add('Control');
      if (event.altKey) newPressedKeys.add('Alt');
      if (event.shiftKey) newPressedKeys.add('Shift');
      
      // Add the main key
      newPressedKeys.add(key);
      setPressedKeys(newPressedKeys);

      // Build key sequence for sequential shortcuts (like 'g' then 'h')
      const currentSequence = [...keySequence];
      
      // Reset sequence after timeout or if it gets too long
      if (currentSequence.length > 3) {
        currentSequence.length = 0;
      }
      
      // For letter keys, add to sequence
      if (key.length === 1 && /[a-zA-Z?]/.test(key)) {
        currentSequence.push(key.toLowerCase());
        setKeySequence(currentSequence);
      }

      // Try to execute shortcuts with current pressed keys
      const currentKeys = Array.from(newPressedKeys);
      if (executeShortcut(currentKeys)) {
        event.preventDefault();
        setPressedKeys(new Set());
        setKeySequence([]);
        return;
      }

      // Try to execute sequential shortcuts
      if (currentSequence.length >= 2) {
        if (executeShortcut(currentSequence)) {
          event.preventDefault();
          setKeySequence([]);
          return;
        }
      }

      // Handle single key shortcuts (like '?' for help)
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (executeShortcut([key])) {
          event.preventDefault();
          setPressedKeys(new Set());
          setKeySequence([]);
          return;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const newPressedKeys = new Set(pressedKeys);
      
      // Remove modifier keys
      if (!event.metaKey) newPressedKeys.delete('Meta');
      if (!event.ctrlKey) newPressedKeys.delete('Control');
      if (!event.altKey) newPressedKeys.delete('Alt');
      if (!event.shiftKey) newPressedKeys.delete('Shift');
      
      // Remove the main key
      newPressedKeys.delete(event.key);
      setPressedKeys(newPressedKeys);
    };

    // Clear sequence after timeout
    const clearSequenceTimeout = setTimeout(() => {
      setKeySequence([]);
    }, 2000);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      clearTimeout(clearSequenceTimeout);
    };
  }, [pressedKeys, keySequence, executeShortcut]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!shortcut.enabled) return acc;
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatKeys = (keys: string[]) => {
    return keys.map(key => {
      switch (key) {
        case 'Meta':
          return '⌘';
        case 'Control':
          return 'Ctrl';
        case 'Alt':
          return '⌥';
        case 'Shift':
          return '⇧';
        case 'ArrowUp':
          return '↑';
        case 'ArrowDown':
          return '↓';
        case 'ArrowLeft':
          return '←';
        case 'ArrowRight':
          return '→';
        case 'Escape':
          return 'Esc';
        case ' ':
          return 'Space';
        default:
          return key;
      }
    }).join(' + ');
  };

  const contextValue: KeyboardShortcutsContextType = {
    shortcuts,
    addShortcut,
    removeShortcut,
    isHelpOpen,
    toggleHelp,
    executeShortcut,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      
      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            backgroundImage: 'none',
          },
        }}
      >
        <AnimatedElement animation="slideDown" delay={0}>
          <GlassCard
            variant="light"
            intensity="strong"
            sx={{
              backgroundColor: alpha('#fff', 0.95),
              backdropFilter: 'blur(25px)',
              border: `1px solid ${alpha('#fff', 0.2)}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <DialogTitle sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              pb: 2,
              borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <KeyboardIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Keyboard Shortcuts
                </Typography>
              </Box>
              <IconButton 
                onClick={() => setIsHelpOpen(false)}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts], categoryIndex) => (
                  <AnimatedElement key={category} animation="slideUp" delay={categoryIndex * 100}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                        {category}
                      </Typography>
                      <Stack spacing={2}>
                        {categoryShortcuts.map((shortcut, index) => (
                          <AnimatedElement key={shortcut.id} animation="slideRight" delay={index * 50}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 2,
                                backgroundColor: alpha('#fff', 0.05),
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${alpha('#fff', 0.1)}`,
                                borderRadius: 2,
                                '&:hover': {
                                  backgroundColor: alpha('#fff', 0.1),
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                {shortcut.icon && (
                                  <Box sx={{ 
                                    color: theme.palette.primary.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}>
                                    {shortcut.icon}
                                  </Box>
                                )}
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {shortcut.description}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {shortcut.keys.map((keyGroup, keyIndex) => {
                                  // Handle sequential keys (like ['g', 'h'])
                                  if (Array.isArray(keyGroup)) {
                                    return (
                                      <Box key={keyIndex} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {keyGroup.map((key, subIndex) => (
                                          <React.Fragment key={subIndex}>
                                            <Chip
                                              label={formatKeys([key])}
                                              size="small"
                                              sx={{
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                                fontFamily: 'monospace',
                                                fontWeight: 600,
                                                minWidth: 32,
                                                height: 24,
                                              }}
                                            />
                                            {subIndex < keyGroup.length - 1 && (
                                              <Typography variant="caption" sx={{ mx: 0.5 }}>
                                                then
                                              </Typography>
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </Box>
                                    );
                                  }

                                  // Handle single key or combination
                                  return (
                                    <Chip
                                      key={keyIndex}
                                      label={formatKeys(shortcut.keys)}
                                      size="small"
                                      sx={{
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        fontFamily: 'monospace',
                                        fontWeight: 600,
                                        minWidth: 32,
                                        height: 24,
                                      }}
                                    />
                                  );
                                })}
                              </Box>
                            </Box>
                          </AnimatedElement>
                        ))}
                      </Stack>
                    </Box>
                    {categoryIndex < Object.keys(groupedShortcuts).length - 1 && (
                      <Divider sx={{ borderColor: alpha('#fff', 0.1), mt: 2 }} />
                    )}
                  </AnimatedElement>
                ))}
              </Stack>

              {/* Tip */}
              <AnimatedElement animation="slideUp" delay={300}>
                <Box
                  sx={{
                    mt: 4,
                    p: 2,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    <strong>Tip:</strong> Press <Chip label="?" size="small" sx={{ mx: 0.5, fontFamily: 'monospace' }} /> 
                    anytime to open this help dialog. Shortcuts are disabled when typing in input fields.
                  </Typography>
                </Box>
              </AnimatedElement>
            </DialogContent>
          </GlassCard>
        </AnimatedElement>
      </Dialog>

      {/* Visual indicator for active key sequences */}
      {keySequence.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 10000,
          }}
        >
          <AnimatedElement animation="slideUp" delay={0}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                p: 2,
                backgroundColor: alpha('#fff', 0.9),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha('#fff', 0.2)}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Sequence:
                </Typography>
                {keySequence.map((key, index) => (
                  <Chip
                    key={index}
                    label={key.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  />
                ))}
                <Typography variant="caption" color="text.secondary">
                  (continues for 2s)
                </Typography>
              </Box>
            </GlassCard>
          </AnimatedElement>
        </Box>
      )}
    </KeyboardShortcutsContext.Provider>
  );
};