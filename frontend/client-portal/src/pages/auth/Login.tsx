// frontend/client-portal/src/pages/auth/Login.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
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
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        setErrors({ 
          form: 'Invalid email or password. Please check your credentials and try again.' 
        });
      } else if (error?.response?.data?.detail) {
        setErrors({ form: error.response.data.detail });
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
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        padding: 2,
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
          <Stack spacing={2} textAlign="center">
            <Button
              startIcon={<ArrowBack />}
              onClick={onNavigateToHome}
              sx={{ alignSelf: 'flex-start', mb: 2 }}
            >
              Back to Home
            </Button>
            
            <Typography variant="h3" sx={{ fontWeight: 600 }}>
              Welcome Back
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Sign in to your LifePlace account
            </Typography>
          </Stack>

          {/* Login Form */}
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  {/* Form Error */}
                  {errors.form && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color={errors.email ? 'error' : 'action'} />
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color={errors.password ? 'error' : 'action'} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Remember Me */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.remember_me}
                        onChange={handleInputChange('remember_me')}
                        disabled={isSubmitting}
                        color="primary"
                      />
                    }
                    label="Remember me for 7 days"
                    sx={{ alignSelf: 'flex-start' }}
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
            </CardContent>
          </Card>

          {/* Register Link */}
          <Box textAlign="center">
            <Typography variant="body1" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={onNavigateToRegister}
                sx={{
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: theme.palette.primary.main,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Register here
              </Link>
            </Typography>
          </Box>

          {/* Help Text */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.disabled">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Login;