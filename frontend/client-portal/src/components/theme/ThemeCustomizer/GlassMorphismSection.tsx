import React from 'react';
import { Box, Typography, Slider, Stack } from '@mui/material';
import { BlurOn as BlurIcon } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomization } from './types';

interface GlassMorphismSectionProps {
  customization: ThemeCustomization;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
}

const sliderSx = (primaryColor: string) => ({
  '& .MuiSlider-thumb': {
    backgroundColor: primaryColor,
  },
  '& .MuiSlider-track': {
    backgroundColor: primaryColor,
  },
});

export const GlassMorphismSection: React.FC<GlassMorphismSectionProps> = ({
  customization,
  updateCustomization,
}) => {
  return (
    <AnimatedElement animation="slideUp" delay={300}>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
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
              sx={sliderSx(customization.primaryColor)}
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
              sx={sliderSx(customization.primaryColor)}
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
              sx={sliderSx(customization.primaryColor)}
            />
          </Box>
        </Stack>
      </Box>
    </AnimatedElement>
  );
};
