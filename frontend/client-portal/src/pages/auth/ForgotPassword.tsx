// frontend/client-portal/src/pages/auth/ForgotPassword.tsx

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Link,
  Alert,
  InputAdornment,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Email,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { useToastActions } from '../../contexts/ToastContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { authApi } from '../../apis/auth.api';

interface ForgotPasswordProps {
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { showSuccess, showError } = useToastActions();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const validateEmail = (): boolean => {
    if (!email) {
      setErrors({ email: 'Email is required' });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errors.email) {
      setErrors({});
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await authApi.requestPasswordReset(email);
      setIsSuccess(true);
      showSuccess('Email Sent', response.detail);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Password reset request error:', error);

      const errorObj = error as { response?: { data?: { detail?: string } } };
      if (errorObj?.response?.data?.detail) {
        setErrors({ form: errorObj.response.data.detail });
      } else {
        showError(
          'Request Failed',
          'Failed to send reset email. Please try again.'
        );
      }
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

                <CheckCircle
                  sx={{
                    fontSize: 80,
                    color: theme.palette.success.light,
                    mx: 'auto',
                    filter: 'drop-shadow(0 4px 20px rgba(0,255,0,0.3))',
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
                  Check Your Email
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: alpha('#fff', 0.9),
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  We've sent password reset instructions to:
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: theme.palette.primary.light,
                    fontWeight: 600,
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  {email}
                </Typography>
              </Stack>
            </AnimatedElement>

            {/* Instructions Card */}
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
                  <Typography
                    variant="body1"
                    sx={{
                      color: alpha('#fff', 0.9),
                      textAlign: 'center',
                      lineHeight: 1.7,
                    }}
                  >
                    If you don't see the email, check your spam folder or request a new reset link.
                  </Typography>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBackToLogin}
                    startIcon={<ArrowBack />}
                    sx={{
                      py: 2,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderColor: alpha('#fff', 0.5),
                      color: 'white',
                      backgroundColor: alpha('#fff', 0.05),
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: alpha('#fff', 0.15),
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

  // Request Form
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

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                Forgot Password?
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: alpha('#fff', 0.9),
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
              >
                Enter your email to reset your password
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
                      }}
                    >
                      {errors.form}
                    </Alert>
                  )}

                  {/* Email Field */}
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    disabled={isSubmitting}
                    autoFocus
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: errors.email ? theme.palette.error.light : alpha('#fff', 0.7) }} />
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
                      position: 'relative',
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
                        Sending...
                      </Box>
                    ) : (
                      'Send Reset Instructions'
                    )}
                  </Button>

                  {/* Back to Login Link */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={handleBackToLogin}
                      disabled={isSubmitting}
                      sx={{
                        color: alpha('#fff', 0.9),
                        textDecoration: 'none',
                        fontWeight: 500,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'white',
                          textDecoration: 'underline',
                        },
                        '&:disabled': {
                          color: alpha('#fff', 0.4),
                          cursor: 'not-allowed',
                        },
                      }}
                    >
                      Remember your password? Sign in
                    </Link>
                  </Box>
                </Stack>
              </Box>
            </GlassCard>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
