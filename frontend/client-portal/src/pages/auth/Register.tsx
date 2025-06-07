// frontend/client-portal/src/pages/auth/Register.tsx

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
  Alert,
  IconButton,
  InputAdornment,
  useTheme,
  alpha,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  Business,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { validateRegisterForm } from '../../utils/validation';
import type { RegisterCredentials } from '../../types/auth.types';

interface RegisterProps {
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
  onRegisterSuccess?: () => void;
}

const Register: React.FC<RegisterProps> = ({
  onNavigateToLogin,
  onNavigateToHome,
  onRegisterSuccess,
}) => {
  const { register } = useAuth();
  const { showSuccess, showError } = useToastActions();
  const theme = useTheme();

  const [formData, setFormData] = useState<RegisterCredentials>({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    profile: {
      phone: '',
      company: '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    
    if (field.startsWith('profile.')) {
      const profileField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

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

    const validation = validateRegisterForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Clean up profile data - remove empty fields
      const cleanedData: typeof formData & { profile?: typeof formData.profile } = {
        ...formData,
        profile: {
          ...(formData.profile?.phone && { phone: formData.profile.phone }),
          ...(formData.profile?.company && { company: formData.profile.company }),
        },
      };

      // Remove profile if it's empty
      if (cleanedData.profile && Object.keys(cleanedData.profile).length === 0) {
        delete cleanedData.profile;
      }

      await register(cleanedData);
      showSuccess(
        'Welcome to LifePlace!',
        'Your account has been created successfully. You are now logged in.'
      );
      onRegisterSuccess?.();
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error?.response?.data) {
        const errorData = error.response.data;
        const newErrors: Record<string, string> = {};

        if (errorData.email) {
          newErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        }
        if (errorData.password) {
          newErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        }
        if (errorData.first_name) {
          newErrors.first_name = Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name;
        }
        if (errorData.last_name) {
          newErrors.last_name = Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name;
        }
        if (errorData.detail) {
          newErrors.form = errorData.detail;
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        } else {
          showError(
            'Registration Failed',
            'Please check your information and try again.'
          );
        }
      } else {
        showError(
          'Registration Failed',
          'An unexpected error occurred. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = (field: 'password' | 'confirm_password') => () => {
    if (field === 'password') {
      setShowPassword(prev => !prev);
    } else {
      setShowConfirmPassword(prev => !prev);
    }
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
          maxWidth: 520,
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
              Join LifePlace
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Create your account and start your journey
            </Typography>
          </Stack>

          {/* Registration Form */}
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

                  {/* Personal Information */}
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Personal Information
                  </Typography>

                  {/* Name Fields */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        fullWidth
                        label="First Name"
                        value={formData.first_name}
                        onChange={handleInputChange('first_name')}
                        error={!!errors.first_name}
                        helperText={errors.first_name}
                        disabled={isSubmitting}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person color={errors.first_name ? 'error' : 'action'} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        value={formData.last_name}
                        onChange={handleInputChange('last_name')}
                        error={!!errors.last_name}
                        helperText={errors.last_name}
                        disabled={isSubmitting}
                      />
                    </Box>
                  </Box>

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

                  {/* Password Fields */}
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!errors.password}
                    helperText={errors.password || 'Must be at least 8 characters long'}
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
                            onClick={handleTogglePasswordVisibility('password')}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={handleInputChange('confirm_password')}
                    error={!!errors.confirm_password}
                    helperText={errors.confirm_password}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color={errors.confirm_password ? 'error' : 'action'} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility('confirm_password')}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Divider />

                  {/* Optional Information */}
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Additional Information (Optional)
                  </Typography>

                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.profile?.phone || ''}
                    onChange={handleInputChange('profile.phone')}
                    error={!!errors['profile.phone']}
                    helperText={errors['profile.phone']}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone color={errors['profile.phone'] ? 'error' : 'action'} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Company"
                    value={formData.profile?.company || ''}
                    onChange={handleInputChange('profile.company')}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business color="action" />
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
                      mt: 3,
                      position: 'relative',
                    }}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} sx={{ color: 'inherit' }} />
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Login Link */}
          <Box textAlign="center">
            <Typography variant="body1" color="text.secondary">
              Already have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={onNavigateToLogin}
                sx={{
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: theme.palette.primary.main,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Login here
              </Link>
            </Typography>
          </Box>

          {/* Help Text */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.disabled">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Register;