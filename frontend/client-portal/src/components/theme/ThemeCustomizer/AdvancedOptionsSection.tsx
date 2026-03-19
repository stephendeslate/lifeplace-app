import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Stack } from '@mui/material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomization } from './types';

interface AdvancedOptionsSectionProps {
  customization: ThemeCustomization;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
}

const switchSx = (primaryColor: string) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: primaryColor,
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: primaryColor,
  },
});

export const AdvancedOptionsSection: React.FC<AdvancedOptionsSectionProps> = ({
  customization,
  updateCustomization,
}) => {
  return (
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
                sx={switchSx(customization.primaryColor)}
              />
            }
            label="Compact Mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={customization.highContrast}
                onChange={(e) => updateCustomization({ highContrast: e.target.checked })}
                sx={switchSx(customization.primaryColor)}
              />
            }
            label="High Contrast"
          />
          <FormControlLabel
            control={
              <Switch
                checked={customization.reducedTransparency}
                onChange={(e) => updateCustomization({ reducedTransparency: e.target.checked })}
                sx={switchSx(customization.primaryColor)}
              />
            }
            label="Reduced Transparency"
          />
        </Stack>
      </Box>
    </AnimatedElement>
  );
};
