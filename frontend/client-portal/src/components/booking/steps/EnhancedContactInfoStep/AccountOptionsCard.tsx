// Account options card — sign-in and create account options for unauthenticated users

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ContactInfoStepData } from '@/types/booking';

interface AccountOptionsCardProps {
  formData: ContactInfoStepData;
  showPassword: boolean;
  canCreateAccount: boolean;
  onFieldChange: (field: keyof ContactInfoStepData, value: unknown) => void;
  onTogglePassword: () => void;
  onOpenSignIn: () => void;
}

export const AccountOptionsCard: React.FC<AccountOptionsCardProps> = ({
  formData,
  showPassword,
  canCreateAccount,
  onFieldChange,
  onTogglePassword,
  onOpenSignIn,
}) => {
  const theme = useTheme();

  return (
    <AnimatedElement animation="slideRight" delay={600}>
      <GlassCard
        variant="light"
        intensity="subtle"
        sx={{
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <SecurityIcon color="info" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Account Options
            </Typography>
          </Box>

          {/* Sign In Option */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              mb: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LoginIcon color="primary" />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Already have an account?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to auto-fill your information
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={onOpenSignIn}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              <LoginIcon />
            </IconButton>
          </Box>

          {/* Create Account Option */}
          {canCreateAccount && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.create_account || false}
                    onChange={(e) => onFieldChange('create_account', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Create an account for faster future bookings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Save your preferences and view booking history
                    </Typography>
                  </Box>
                }
              />

              {formData.create_account && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => onFieldChange('password', e.target.value)}
                    required
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={onTogglePassword} edge="end">
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        backgroundColor: alpha('#fff', 0.1),
                        backdropFilter: 'blur(10px)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha('#fff', 0.2),
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};
