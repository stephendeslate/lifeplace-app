// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/ShortcutsHelpDialog.tsx

import React from 'react';
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
import { Close as CloseIcon, Keyboard as KeyboardIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { KeyboardShortcut } from './types';
import { formatKeys } from './formatKeys';

interface ShortcutsHelpDialogProps {
  open: boolean;
  onClose: () => void;
  groupedShortcuts: Record<string, KeyboardShortcut[]>;
}

export const ShortcutsHelpDialog: React.FC<ShortcutsHelpDialogProps> = ({
  open,
  onClose,
  groupedShortcuts,
}) => {
  const theme = useTheme();
  const categoryEntries = Object.entries(groupedShortcuts);

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
              <KeyboardIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Keyboard Shortcuts
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                '&:hover': { backgroundColor: alpha('#fff', 0.2) },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              {categoryEntries.map(([category, categoryShortcuts], categoryIndex) => (
                <AnimatedElement key={category} animation="slideUp" delay={categoryIndex * 100}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                      {category}
                    </Typography>
                    <Stack spacing={2}>
                      {categoryShortcuts.map((shortcut, index) => (
                        <AnimatedElement
                          key={shortcut.id}
                          animation="slideRight"
                          delay={index * 50}
                        >
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
                                <Box
                                  sx={{
                                    color: theme.palette.primary.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
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
                                    <Box
                                      key={keyIndex}
                                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                    >
                                      {keyGroup.map((key, subIndex) => (
                                        <React.Fragment key={subIndex}>
                                          <Chip
                                            label={formatKeys([key])}
                                            size="small"
                                            sx={{
                                              backgroundColor: alpha(
                                                theme.palette.primary.main,
                                                0.1,
                                              ),
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
                  {categoryIndex < categoryEntries.length - 1 && (
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
                  <strong>Tip:</strong> Press{' '}
                  <Chip label="?" size="small" sx={{ mx: 0.5, fontFamily: 'monospace' }} />
                  anytime to open this help dialog. Shortcuts are disabled when typing in input
                  fields.
                </Typography>
              </Box>
            </AnimatedElement>
          </DialogContent>
        </GlassCard>
      </AnimatedElement>
    </Dialog>
  );
};
