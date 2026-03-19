import React from 'react';
import { Box, Typography, Slider, Stack } from '@mui/material';
import { FormatSize as FontSizeIcon } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomization } from './types';

interface LayoutSectionProps {
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

export const LayoutSection: React.FC<LayoutSectionProps> = ({
  customization,
  updateCustomization,
}) => {
  return (
    <AnimatedElement animation="slideUp" delay={400}>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
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
              sx={sliderSx(customization.primaryColor)}
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
              sx={sliderSx(customization.primaryColor)}
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
              sx={sliderSx(customization.primaryColor)}
            />
          </Box>
        </Stack>
      </Box>
    </AnimatedElement>
  );
};
