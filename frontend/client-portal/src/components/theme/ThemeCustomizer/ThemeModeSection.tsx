import React from 'react';
import { Box, Typography, Button, Stack, alpha, useTheme } from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ColorLens as ColorIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomization } from './types';

interface ThemeModeSectionProps {
  customization: ThemeCustomization;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
}

export const ThemeModeSection: React.FC<ThemeModeSectionProps> = ({
  customization,
  updateCustomization,
}) => {
  const systemTheme = useTheme();

  return (
    <AnimatedElement animation="slideUp" delay={100}>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
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
                mode === 'light' ? (
                  <LightModeIcon />
                ) : mode === 'dark' ? (
                  <DarkModeIcon />
                ) : (
                  <ColorIcon />
                )
              }
              sx={{
                backgroundColor:
                  customization.mode === mode
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
  );
};
