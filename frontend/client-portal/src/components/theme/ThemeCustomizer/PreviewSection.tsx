import React from 'react';
import { Box, Typography, Button, Avatar, alpha } from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ThemeCustomization } from './types';

interface PreviewSectionProps {
  customization: ThemeCustomization;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({ customization }) => {
  return (
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
            <Avatar
              sx={{
                backgroundColor: customization.primaryColor,
                width: customization.compactMode ? 32 : 40,
                height: customization.compactMode ? 32 : 40,
              }}
            >
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
  );
};
