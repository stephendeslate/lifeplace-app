// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/KeySequenceIndicator.tsx

import React from 'react';
import { Box, Typography, Chip, useTheme, alpha } from '@mui/material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface KeySequenceIndicatorProps {
  keySequence: string[];
}

export const KeySequenceIndicator: React.FC<KeySequenceIndicatorProps> = ({ keySequence }) => {
  const theme = useTheme();

  if (keySequence.length === 0) {
    return null;
  }

  return (
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
  );
};
