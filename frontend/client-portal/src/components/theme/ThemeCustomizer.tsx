// frontend/client-portal/src/components/theme/ThemeCustomizer.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Avatar,
  Stack,
  Divider,
  useTheme,
  alpha,
  createTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Palette as PaletteIcon,
  Refresh as ResetIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  BlurOn as BlurIcon,
  FormatSize as FontSizeIcon,
  ColorLens as ColorIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface ThemeCustomization {
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

interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  preview: string;
}

interface ThemeCustomizerContextType {
  customization: ThemeCustomization;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
  resetToDefault: () => void;
  isCustomizerOpen: boolean;
  toggleCustomizer: () => void;
  applyTheme: (theme: Record<string, unknown>) => void;
}

const defaultCustomization: ThemeCustomization = {
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

const colorPresets: ColorPreset[] = [
  { name: 'Deep Forest', primary: '#2d5016', secondary: '#8b4513', preview: 'linear-gradient(45deg, #2d5016, #8b4513)' },
  { name: 'Sunset Orange', primary: '#ff6b35', secondary: '#ff8a65', preview: 'linear-gradient(45deg, #ff6b35, #ff8a65)' },
  { name: 'Forest Green', primary: '#2e7d32', secondary: '#66bb6a', preview: 'linear-gradient(45deg, #2e7d32, #66bb6a)' },
  { name: 'Royal Purple', primary: '#7b1fa2', secondary: '#ba68c8', preview: 'linear-gradient(45deg, #7b1fa2, #ba68c8)' },
  { name: 'Rose Gold', primary: '#e91e63', secondary: '#f8bbd9', preview: 'linear-gradient(45deg, #e91e63, #f8bbd9)' },
  { name: 'Midnight', primary: '#263238', secondary: '#37474f', preview: 'linear-gradient(45deg, #263238, #37474f)' },
  { name: 'Coral Reef', primary: '#ff7043', secondary: '#ffab91', preview: 'linear-gradient(45deg, #ff7043, #ffab91)' },
  { name: 'Sage Green', primary: '#5a7c47', secondary: '#7a9469', preview: 'linear-gradient(45deg, #5a7c47, #7a9469)' },
];

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined);

export const useThemeCustomizer = () => {
  const context = useContext(ThemeCustomizerContext);
  if (context === undefined) {
    throw new Error('useThemeCustomizer must be used within a ThemeCustomizerProvider');
  }
  return context;
};

interface ThemeCustomizerProviderProps {
  children: React.ReactNode;
}

export const ThemeCustomizerProvider: React.FC<ThemeCustomizerProviderProps> = ({ children }) => {
  const systemTheme = useTheme();
  const [customization, setCustomization] = useState<ThemeCustomization>(() => {
    const saved = localStorage.getItem('theme-customization');
    return saved ? { ...defaultCustomization, ...JSON.parse(saved) } : defaultCustomization;
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const updateCustomization = (updates: Partial<ThemeCustomization>) => {
    setCustomization(prev => {
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
    setIsCustomizerOpen(prev => !prev);
  };

  // Apply theme based on system preference if auto mode
  useEffect(() => {
    if (customization.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Theme will be automatically updated through the applyTheme function
        document.documentElement.setAttribute('data-theme-mode', mediaQuery.matches ? 'dark' : 'light');
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
    const isDark = customization.mode === 'dark' || 
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
              backdropFilter: customization.reducedTransparency ? 'none' : `blur(${customization.blurStrength}px)`,
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

  return (
    <ThemeCustomizerContext.Provider value={contextValue}>
      {children}
      
      {/* Theme Customizer Dialog */}
      <Dialog
        open={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
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
        <AnimatedElement animation="slideRight" delay={0}>
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
              maxHeight: '90vh',
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
                <PaletteIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Theme Customizer
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  onClick={resetToDefault}
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                  }}
                >
                  <ResetIcon />
                </IconButton>
                <IconButton 
                  onClick={() => setIsCustomizerOpen(false)}
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, maxHeight: 'calc(90vh - 100px)', overflow: 'auto' }}>
              <Stack spacing={4}>
                
                {/* Theme Mode */}
                <AnimatedElement animation="slideUp" delay={100}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LightModeIcon fontSize="small" />
                      Theme Mode
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {(['light', 'dark', 'auto'] as const).map((mode) => (
                        <Button
                          key={mode}
                          variant={customization.mode === mode ? 'contained' : 'outlined'}
                          onClick={() => updateCustomization({ mode })}
                          startIcon={
                            mode === 'light' ? <LightModeIcon /> :
                            mode === 'dark' ? <DarkModeIcon /> : <ColorIcon />
                          }
                          sx={{
                            backgroundColor: customization.mode === mode 
                              ? alpha(systemTheme.palette.primary.main, 0.2)
                              : alpha('#fff', 0.1),
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                </AnimatedElement>

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                {/* Color Presets */}
                <AnimatedElement animation="slideUp" delay={200}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ColorIcon fontSize="small" />
                      Color Presets
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                      {colorPresets.map((preset, index) => (
                        <AnimatedElement key={preset.name} animation="slideUp" delay={200 + index * 50}>
                          <Button
                            variant="outlined"
                            onClick={() => updateCustomization({ 
                              primaryColor: preset.primary, 
                              secondaryColor: preset.secondary 
                            })}
                            sx={{
                              p: 2,
                              backgroundColor: alpha('#fff', 0.05),
                              backdropFilter: 'blur(10px)',
                              border: `1px solid ${alpha('#fff', 0.1)}`,
                              borderColor: customization.primaryColor === preset.primary 
                                ? systemTheme.palette.primary.main 
                                : alpha('#fff', 0.1),
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                              '&:hover': {
                                backgroundColor: alpha('#fff', 0.1),
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: preset.preview,
                                border: '2px solid rgba(255,255,255,0.2)',
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                              {preset.name}
                            </Typography>
                          </Button>
                        </AnimatedElement>
                      ))}
                    </Box>
                  </Box>
                </AnimatedElement>

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                {/* Glass Morphism Controls */}
                <AnimatedElement animation="slideUp" delay={300}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BlurIcon fontSize="small" />
                      Glass Morphism
                    </Typography>
                    <Stack spacing={3}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Glass Intensity: {Math.round(customization.glassIntensity * 100)}%
                        </Typography>
                        <Slider
                          value={customization.glassIntensity}
                          onChange={(_, value) => updateCustomization({ glassIntensity: value as number })}
                          min={0.05}
                          max={0.3}
                          step={0.01}
                          sx={{
                            '& .MuiSlider-thumb': {
                              backgroundColor: customization.primaryColor,
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: customization.primaryColor,
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Blur Strength: {customization.blurStrength}px
                        </Typography>
                        <Slider
                          value={customization.blurStrength}
                          onChange={(_, value) => updateCustomization({ blurStrength: value as number })}
                          min={5}
                          max={50}
                          step={1}
                          sx={{
                            '& .MuiSlider-thumb': {
                              backgroundColor: customization.primaryColor,
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: customization.primaryColor,
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Border Opacity: {Math.round(customization.borderOpacity * 100)}%
                        </Typography>
                        <Slider
                          value={customization.borderOpacity}
                          onChange={(_, value) => updateCustomization({ borderOpacity: value as number })}
                          min={0.05}
                          max={0.5}
                          step={0.01}
                          sx={{
                            '& .MuiSlider-thumb': {
                              backgroundColor: customization.primaryColor,
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: customization.primaryColor,
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                </AnimatedElement>

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                {/* Layout Controls */}
                <AnimatedElement animation="slideUp" delay={400}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FontSizeIcon fontSize="small" />
                      Layout & Typography
                    </Typography>
                    <Stack spacing={3}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Border Radius: {customization.borderRadius}px
                        </Typography>
                        <Slider
                          value={customization.borderRadius}
                          onChange={(_, value) => updateCustomization({ borderRadius: value as number })}
                          min={0}
                          max={24}
                          step={1}
                          sx={{
                            '& .MuiSlider-thumb': {
                              backgroundColor: customization.primaryColor,
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: customization.primaryColor,
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Font Size: {customization.fontSize}px
                        </Typography>
                        <Slider
                          value={customization.fontSize}
                          onChange={(_, value) => updateCustomization({ fontSize: value as number })}
                          min={12}
                          max={18}
                          step={1}
                          sx={{
                            '& .MuiSlider-thumb': {
                              backgroundColor: customization.primaryColor,
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: customization.primaryColor,
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Animation Speed: {customization.animationSpeed}x
                        </Typography>
                        <Slider
                          value={customization.animationSpeed}
                          onChange={(_, value) => updateCustomization({ animationSpeed: value as number })}
                          min={0.5}
                          max={3}
                          step={0.1}
                          sx={{
                            '& .MuiSlider-thumb': {
                              backgroundColor: customization.primaryColor,
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: customization.primaryColor,
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                </AnimatedElement>

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                {/* Advanced Options */}
                <AnimatedElement animation="slideUp" delay={500}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Advanced Options
                    </Typography>
                    <Stack spacing={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.compactMode}
                            onChange={(e) => updateCustomization({ compactMode: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: customization.primaryColor,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: customization.primaryColor,
                              },
                            }}
                          />
                        }
                        label="Compact Mode"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.highContrast}
                            onChange={(e) => updateCustomization({ highContrast: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: customization.primaryColor,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: customization.primaryColor,
                              },
                            }}
                          />
                        }
                        label="High Contrast"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.reducedTransparency}
                            onChange={(e) => updateCustomization({ reducedTransparency: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: customization.primaryColor,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: customization.primaryColor,
                              },
                            }}
                          />
                        }
                        label="Reduced Transparency"
                      />
                    </Stack>
                  </Box>
                </AnimatedElement>

                {/* Preview */}
                <AnimatedElement animation="slideUp" delay={600}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Preview
                    </Typography>
                    <GlassCard
                      variant="light"
                      intensity="medium"
                      sx={{
                        p: 3,
                        backgroundColor: alpha(customization.primaryColor, customization.glassIntensity),
                        backdropFilter: `blur(${customization.blurStrength}px)`,
                        border: `1px solid ${alpha('#fff', customization.borderOpacity)}`,
                        borderRadius: `${customization.borderRadius}px`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ 
                          backgroundColor: customization.primaryColor,
                          width: customization.compactMode ? 32 : 40,
                          height: customization.compactMode ? 32 : 40,
                        }}>
                          <PaletteIcon fontSize={customization.compactMode ? 'small' : 'medium'} />
                        </Avatar>
                        <Box>
                          <Typography 
                            variant={customization.compactMode ? 'body1' : 'h6'} 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: `${customization.fontSize}px`,
                            }}
                          >
                            Sample Card Title
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: `${customization.fontSize - 2}px` }}
                          >
                            This is how your theme will look
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: customization.primaryColor,
                          borderRadius: `${customization.borderRadius}px`,
                          '&:hover': {
                            backgroundColor: customization.secondaryColor,
                          },
                          transition: `all ${1 / customization.animationSpeed}s ease`,
                        }}
                      >
                        Sample Button
                      </Button>
                    </GlassCard>
                  </Box>
                </AnimatedElement>
              </Stack>
            </DialogContent>
          </GlassCard>
        </AnimatedElement>
      </Dialog>
    </ThemeCustomizerContext.Provider>
  );
};