import React from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { ColorLens as ColorIcon } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomization } from './types';
import { colorPresets } from './types';

interface ColorPresetsSectionProps {
  customization: ThemeCustomization;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
}

export const ColorPresetsSection: React.FC<ColorPresetsSectionProps> = ({
  customization,
  updateCustomization,
}) => {
  const systemTheme = useTheme();

  return (
    <AnimatedElement animation="slideUp" delay={200}>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <ColorIcon fontSize="small" />
          Color Presets
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 2,
          }}
        >
          {colorPresets.map((preset, index) => (
            <AnimatedElement key={preset.name} animation="slideUp" delay={200 + index * 50}>
              <Button
                variant="outlined"
                onClick={() =>
                  updateCustomization({
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                  })
                }
                sx={{
                  p: 2,
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  borderColor:
                    customization.primaryColor === preset.primary
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
  );
};
