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
import type { LoginCredentials } from '../../types/auth.types';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

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
  const { showSuccess, showError } = useToastActions();
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
      console.error('Login error:', error);
      
      // Handle different types of errors
      // Error objects from axios have dynamic structure requiring any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorObj = error as any;
      if (errorObj?.response?.status === 400 || errorObj?.response?.status === 401) {
        setErrors({ 
          form: 'Invalid email or password. Please check your credentials and try again.' 
        });
      } else if (errorObj?.response?.data?.detail) {
        setErrors({ form: errorObj.response.data.detail });
      } else {
        showError(
          'Login Failed',
          'An unexpected error occurred. Please try again.'
        );
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
                Welcome Back
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: alpha('#fff', 0.9),
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
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
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    error={!!errors.email}
                    helperText={errors.email}
                    disabled={isSubmitting}
                    sx={{
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
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: errors.email ? theme.palette.error.light : alpha('#fff', 0.7) }} />
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
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: errors.password ? theme.palette.error.light : alpha('#fff', 0.7) }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
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
                            color: alpha('#fff', 0.7),
                            '&.Mui-checked': {
                              color: theme.palette.primary.light,
                            },
                          }}
                        />
                      }
                      label="Remember me for 7 days"
                      sx={{
                        color: alpha('#fff', 0.8),
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
                        color: alpha('#fff', 0.9),
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: '#fff',
                          textDecoration: 'underline',
                        },
                        '&:disabled': {
                          color: alpha('#fff', 0.4),
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
                        color: theme.palette.primary.main,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} sx={{ color: 'inherit' }} />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Stack>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Register Link */}
          <AnimatedElement animation="fadeIn" delay={300}>
            <Box textAlign="center">
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.9) }}>
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onNavigateToRegister}
                  sx={{
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    '&:hover': {
                      textDecoration: 'underline',
                      textShadow: '0 2px 15px rgba(255,255,255,0.5)',
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
                  color: alpha('#fff', 0.7),
                  textShadow: '0 1px 5px rgba(0,0,0,0.2)',
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