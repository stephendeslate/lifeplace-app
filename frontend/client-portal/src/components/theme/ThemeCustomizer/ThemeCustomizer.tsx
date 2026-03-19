import React, { createContext, useContext } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Palette as PaletteIcon,
  Refresh as ResetIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomizerContextType, ThemeCustomizerProviderProps } from './types';
import { useThemeCustomizerLogic } from './useThemeCustomizerLogic';
import { ThemeModeSection } from './ThemeModeSection';
import { ColorPresetsSection } from './ColorPresetsSection';
import { GlassMorphismSection } from './GlassMorphismSection';
import { LayoutSection } from './LayoutSection';
import { AdvancedOptionsSection } from './AdvancedOptionsSection';
import { PreviewSection } from './PreviewSection';

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined);

export const useThemeCustomizer = () => {
  const context = useContext(ThemeCustomizerContext);
  if (context === undefined) {
    throw new Error('useThemeCustomizer must be used within a ThemeCustomizerProvider');
  }
  return context;
};

export const ThemeCustomizerProvider: React.FC<ThemeCustomizerProviderProps> = ({ children }) => {
  const {
    customization,
    updateCustomization,
    resetToDefault,
    isCustomizerOpen,
    setIsCustomizerOpen,
    contextValue,
  } = useThemeCustomizerLogic();

  return (
    <ThemeCustomizerContext.Provider value={contextValue}>
      {children}

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
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 2,
                borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
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
                    '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                  }}
                >
                  <ResetIcon />
                </IconButton>
                <IconButton
                  onClick={() => setIsCustomizerOpen(false)}
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, maxHeight: 'calc(90vh - 100px)', overflow: 'auto' }}>
              <Stack spacing={4}>
                <ThemeModeSection
                  customization={customization}
                  updateCustomization={updateCustomization}
                />

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                <ColorPresetsSection
                  customization={customization}
                  updateCustomization={updateCustomization}
                />

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                <GlassMorphismSection
                  customization={customization}
                  updateCustomization={updateCustomization}
                />

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                <LayoutSection
                  customization={customization}
                  updateCustomization={updateCustomization}
                />

                <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

                <AdvancedOptionsSection
                  customization={customization}
                  updateCustomization={updateCustomization}
                />

                <PreviewSection customization={customization} />
              </Stack>
            </DialogContent>
          </GlassCard>
        </AnimatedElement>
      </Dialog>
    </ThemeCustomizerContext.Provider>
  );
};
