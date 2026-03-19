import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, ArrowBack } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface ResetPasswordFormProps {
  email: string;
  password: string;
  confirmPassword: string;
  errors: Record<string, string>;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
  onPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent) => void;
  onToggleShowPassword: () => void;
  onToggleShowConfirmPassword: () => void;
  onBackToHome: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  password,
  confirmPassword,
  errors,
  showPassword,
  showConfirmPassword,
  isSubmitting,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
  onBackToHome,
}) => {
  const theme = useTheme();

  const glassTextFieldSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: alpha('#fff', 0.1),
      backdropFilter: 'blur(10px)',
      color: 'white',
      '& fieldset': {
        borderColor: alpha('#fff', 0.3),
      },
      '&:hover fieldset': {
        borderColor: alpha('#fff', 0.5),
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.light,
      },
    },
    '& .MuiInputLabel-root': {
      color: alpha('#fff', 0.8),
      '&.Mui-focused': {
        color: theme.palette.primary.light,
      },
    },
    '& .MuiFormHelperText-root': {
      color: alpha('#fff', 0.7),
    },
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 360px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        width: '100%',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Stack spacing={4}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} textAlign="center">
              <Button
                startIcon={<ArrowBack />}
                onClick={onBackToHome}
                sx={{
                  alignSelf: 'flex-start',
                  mb: 2,
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                  },
                }}
              >
                Back to Home
              </Button>

              <Lock
                sx={{
                  fontSize: 80,
                  color: theme.palette.primary.light,
                  mx: 'auto',
                  filter: 'drop-shadow(0 4px 20px rgba(0,150,255,0.4))',
                }}
              />

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                Reset Your Password
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: alpha('#fff', 0.8),
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
              >
                Enter a new password for:
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.primary.light,
                  fontWeight: 600,
                }}
              >
                {email}
              </Typography>
            </Stack>
          </AnimatedElement>

          <AnimatedElement animation="slideUp" delay={200}>
            <GlassCard
              variant="light"
              intensity="strong"
              sx={{
                p: 4,
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={3}>
                  {errors.form && (
                    <Alert
                      severity="error"
                      sx={{
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                        color: 'white',
                        '& .MuiAlert-icon': {
                          color: theme.palette.error.light,
                        },
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {errors.form}
                    </Alert>
                  )}

                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={onPasswordChange}
                    error={!!errors.password}
                    helperText={errors.password || 'Minimum 8 characters'}
                    disabled={isSubmitting}
                    autoFocus
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock
                            sx={{
                              color: errors.password
                                ? theme.palette.error.light
                                : alpha('#fff', 0.7),
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={onToggleShowPassword}
                            edge="end"
                            disabled={isSubmitting}
                            sx={{ color: alpha('#fff', 0.7) }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={onConfirmPasswordChange}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    disabled={isSubmitting}
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock
                            sx={{
                              color: errors.confirmPassword
                                ? theme.palette.error.light
                                : alpha('#fff', 0.7),
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={onToggleShowConfirmPassword}
                            edge="end"
                            disabled={isSubmitting}
                            sx={{ color: alpha('#fff', 0.7) }}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isSubmitting}
                    sx={{
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      mt: 2,
                      backgroundColor: 'white',
                      color: theme.palette.primary.main,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.9),
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                      },
                      '&:disabled': {
                        backgroundColor: alpha('#fff', 0.7),
                        color: alpha(theme.palette.primary.main, 0.6),
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isSubmitting ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />
                        Resetting Password...
                      </Box>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </Stack>
              </Box>
            </GlassCard>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};

export default ResetPasswordForm;
