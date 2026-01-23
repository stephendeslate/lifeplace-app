// frontend/client-portal/src/pages/auth/Login.tsx

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Link,
  Checkbox,
  FormControlLabel,
  Alert,
  IconButton,
  InputAdornment,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { validateLoginForm } from '../../utils/validation';
import { ErrorHandler } from '../../utils/errorHandler';
import type { LoginCredentials } from '../../types/auth.types';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { GoogleLoginButton } from '../../components/auth';
import { tokens } from '../../design-system';

interface LoginProps {
  onNavigateToRegister?: () => void;
  onNavigateToHome?: () => void;
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({
  onNavigateToRegister,
  onNavigateToHome,
  onLoginSuccess,
}) => {
  const { login } = useAuth();
  const { showSuccess } = useToastActions();
  const theme = useTheme();

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    remember_me: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'remember_me' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = validateLoginForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(formData);
      showSuccess(
        'Welcome back!',
        'You have been successfully logged in.'
      );
      onLoginSuccess?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Login error:', error);
      
      // Handle different types of errors
      const statusCode = ErrorHandler.getStatusCode(error);
      if (statusCode === 400 || statusCode === 401) {
        setErrors({
          form: 'Invalid email or password. Please check your credentials and try again.'
        });
      } else {
        const errorMessage = ErrorHandler.extractMessage(error);
        setErrors({ form: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 360px)', // Account for header/footer + generous PublicLayout padding
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
                onClick={onNavigateToHome}
                sx={{
                  alignSelf: 'flex-start',
                  mb: 2,
                  color: tokens.color.base.neutral[900],
                  backdropFilter: 'blur(10px)',
                  backgroundColor: alpha('#fff', 0.6),
                  border: `1px solid ${tokens.color.base.neutral[200]}`,
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.8),
                  },
                }}
              >
                Back to Home
              </Button>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  color: tokens.color.base.neutral[900],
                  textShadow: `0 2px 8px ${tokens.color.overlays.light}`,
                }}
              >
                Welcome Back
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: tokens.color.base.neutral[700],
                  textShadow: `0 1px 4px ${tokens.color.overlays.light}`,
                }}
              >
                Sign in to your LifePlace account
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Login Form */}
          <AnimatedElement animation="slideUp" delay={200}>
            <GlassCard
              variant="light"
              intensity="strong"
              sx={{
                p: 4,
                backdropFilter: 'blur(20px)',
                backgroundColor: alpha('#fff', 0.5),
                border: `1px solid ${tokens.color.base.neutral[200]}`,
                boxShadow: tokens.shadow.elevation.card,
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
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${theme.palette.error.main}`,
                        color: theme.palette.error.dark,
                        '& .MuiAlert-icon': {
                          color: theme.palette.error.main,
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
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    error={!!errors.email}
                    helperText={errors.email}
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha('#fff', 0.7),
                        backdropFilter: 'blur(10px)',
                        color: tokens.color.base.neutral[900],
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[300],
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.neutral[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[700],
                        },
                      },
                      '& .MuiFormHelperText-root': {
                        color: tokens.color.base.neutral[600],
                        backgroundColor: alpha('#fff', 0.7),
                        marginLeft: 0,
                        paddingLeft: '14px',
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: errors.email ? theme.palette.error.main : tokens.color.base.neutral[600] }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Password Field */}
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!errors.password}
                    helperText={errors.password}
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha('#fff', 0.7),
                        backdropFilter: 'blur(10px)',
                        color: tokens.color.base.neutral[900],
                        '& fieldset': {
                          borderColor: tokens.color.base.neutral[300],
                        },
                        '&:hover fieldset': {
                          borderColor: tokens.color.base.neutral[400],
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: tokens.color.base.sage[600],
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.base.neutral[600],
                        '&.Mui-focused': {
                          color: tokens.color.base.sage[700],
                        },
                      },
                      '& .MuiFormHelperText-root': {
                        color: tokens.color.base.neutral[600],
                        backgroundColor: alpha('#fff', 0.7),
                        marginLeft: 0,
                        paddingLeft: '14px',
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: errors.password ? theme.palette.error.main : tokens.color.base.neutral[600] }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            disabled={isSubmitting}
                            sx={{ color: tokens.color.base.neutral[600] }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Remember Me and Forgot Password */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.remember_me}
                          onChange={handleInputChange('remember_me')}
                          disabled={isSubmitting}
                          sx={{
                            color: tokens.color.base.neutral[600],
                            '&.Mui-checked': {
                              color: tokens.color.base.sage[600],
                            },
                          }}
                        />
                      }
                      label="Remember me for 7 days"
                      sx={{
                        color: tokens.color.base.neutral[700],
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.875rem',
                        },
                      }}
                    />

                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={() => window.location.href = '/forgot-password'}
                      disabled={isSubmitting}
                      sx={{
                        color: tokens.color.base.sage[700],
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: tokens.color.base.sage[800],
                          textDecoration: 'underline',
                        },
                        '&:disabled': {
                          color: tokens.color.base.neutral[400],
                          cursor: 'not-allowed',
                        },
                      }}
                    >
                      Forgot password?
                    </Link>
                  </Box>

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
                      backgroundColor: tokens.color.base.sage[600],
                      color: '#FFFFFF',
                      boxShadow: tokens.shadow.elevation.card,
                      '&:hover': {
                        backgroundColor: tokens.color.base.sage[700],
                        transform: 'translateY(-2px)',
                        boxShadow: tokens.shadow.elevation.cardHover,
                      },
                      '&:disabled': {
                        backgroundColor: tokens.color.base.sage[400],
                        color: '#FFFFFF',
                        opacity: 0.7,
                      },
                      transition: tokens.animation.transition.smooth,
                    }}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} sx={{ color: 'inherit' }} />
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  {/* Google Sign-In */}
                  <GoogleLoginButton
                    onSuccess={onLoginSuccess}
                    text="signin_with"
                  />
                </Stack>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Register Link */}
          <AnimatedElement animation="fadeIn" delay={300}>
            <Box textAlign="center">
              <Typography variant="body1" sx={{ color: tokens.color.base.neutral[700] }}>
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onNavigateToRegister}
                  sx={{
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: tokens.color.base.sage[700],
                    '&:hover': {
                      textDecoration: 'underline',
                      color: tokens.color.base.sage[800],
                    },
                  }}
                >
                  Register here
                </Link>
              </Typography>
            </Box>
          </AnimatedElement>

          {/* Help Text */}
          <AnimatedElement animation="fadeIn" delay={400}>
            <Box textAlign="center">
              <Typography
                variant="body2"
                sx={{
                  color: tokens.color.base.neutral[600],
                }}
              >
                By signing in, you agree to our Terms of Service and Privacy Policy
              </Typography>
            </Box>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};

export default Login;