// frontend/client-portal/src/pages/auth/ResetPassword.tsx

import React, { useState, useEffect } from 'react';
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
import {
  Visibility,
  VisibilityOff,
  Lock,
  ArrowBack,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useToastActions } from '../../contexts/ToastContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { authApi } from '../../apis/auth.api';

interface ResetPasswordProps {
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { showSuccess, showError } = useToastActions();
  const theme = useTheme();

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Glass morphism TextField styling (matching Login/Register)
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

  useEffect(() => {
    if (tokenId) {
      validateToken();
    } else {
      setIsValidating(false);
      setIsTokenValid(false);
      setTokenError('Invalid reset link');
    }
  }, [tokenId]);

  const validateToken = async () => {
    setIsValidating(true);
    try {
      const response = await authApi.validateResetToken(tokenId!);
      if (response.valid) {
        setIsTokenValid(true);
        setEmail(response.email || '');
      } else {
        setIsTokenValid(false);
        const errorMessages = {
          already_used: 'This password reset link has already been used.',
          expired: 'This password reset link has expired.',
          not_found: 'Invalid password reset link.',
        };
        setTokenError(errorMessages[response.reason || 'not_found']);
      }
    } catch (_error) {
      setIsTokenValid(false);
      setTokenError('Unable to validate reset link. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (errors.password || errors.form) {
      setErrors(prev => ({ ...prev, password: '', form: '' }));
    }
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
    if (errors.confirmPassword || errors.form) {
      setErrors(prev => ({ ...prev, confirmPassword: '', form: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await authApi.confirmPasswordReset(tokenId!, {
        password,
        confirm_password: confirmPassword,
      });
      setIsSuccess(true);
      showSuccess('Password Reset', response.detail);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        handleBackToLogin();
      }, 2000);
    } catch (error: unknown) {
      console.error('Password reset error:', error);

      const err = error as { response?: { data?: { detail?: string; password_feedback?: string[] } }; message?: string };
      const errorMessage = err?.response?.data?.detail || err.message || 'Failed to reset password. Please try again.';
      const feedback = err?.response?.data?.password_feedback || [];

      setErrors({ form: errorMessage });
      if (feedback.length > 0) {
        setErrors(prev => ({ ...prev, form: `${errorMessage}\n${feedback.join('\n')}` }));
      }
      showError('Reset Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = '/login';
    }
  };

  const handleBackToHome = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleRequestNewLink = () => {
    window.location.href = '/forgot-password';
  };

  // Loading State
  if (isValidating) {
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
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white' }}>
            Validating reset link...
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Invalid Token State
  if (!isTokenValid) {
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
            {/* Header */}
            <AnimatedElement animation="fadeIn" delay={100}>
              <Stack spacing={2} textAlign="center">
                <Button
                  startIcon={<ArrowBack />}
                  onClick={handleBackToHome}
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

                <ErrorIcon
                  sx={{
                    fontSize: 80,
                    color: theme.palette.error.light,
                    mx: 'auto',
                    filter: 'drop-shadow(0 4px 20px rgba(255,0,0,0.4))',
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
                  Invalid Reset Link
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: alpha('#fff', 0.9),
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  {tokenError}
                </Typography>
              </Stack>
            </AnimatedElement>

            {/* Action Card */}
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
                <Stack spacing={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleRequestNewLink}
                    sx={{
                      py: 2,
                      fontSize: '1rem',
                      fontWeight: 600,
                      backgroundColor: 'white',
                      color: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.9),
                      },
                    }}
                  >
                    Request New Reset Link
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBackToLogin}
                    sx={{
                      py: 2,
                      borderColor: alpha('#fff', 0.5),
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: alpha('#fff', 0.1),
                      },
                    }}
                  >
                    Back to Login
                  </Button>
                </Stack>
              </GlassCard>
            </AnimatedElement>
          </Stack>
        </Box>
      </Box>
    );
  }

  // Success State
  if (isSuccess) {
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
            {/* Header */}
            <AnimatedElement animation="fadeIn" delay={100}>
              <Stack spacing={2} textAlign="center">
                <CheckCircle
                  sx={{
                    fontSize: 100,
                    color: theme.palette.success.light,
                    mx: 'auto',
                    filter: 'drop-shadow(0 4px 20px rgba(0,255,0,0.4))',
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
                  Password Reset Successful!
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: alpha('#fff', 0.9),
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  Your password has been reset successfully
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: alpha('#fff', 0.8),
                  }}
                >
                  Redirecting to login...
                </Typography>
              </Stack>
            </AnimatedElement>

            <AnimatedElement animation="slideUp" delay={200}>
              <CircularProgress size={40} sx={{ color: 'white', mx: 'auto', display: 'block' }} />
            </AnimatedElement>
          </Stack>
        </Box>
      </Box>
    );
  }

  // Reset Form
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
          {/* Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} textAlign="center">
              <Button
                startIcon={<ArrowBack />}
                onClick={handleBackToHome}
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

          {/* Reset Form */}
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
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  {/* Form Error */}
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

                  {/* Password Field */}
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    error={!!errors.password}
                    helperText={errors.password || 'Minimum 8 characters'}
                    disabled={isSubmitting}
                    autoFocus
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: errors.password ? theme.palette.error.light : alpha('#fff', 0.7) }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
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

                  {/* Confirm Password Field */}
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    disabled={isSubmitting}
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: errors.confirmPassword ? theme.palette.error.light : alpha('#fff', 0.7) }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

                  {/* Submit Button */}
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

export default ResetPassword;