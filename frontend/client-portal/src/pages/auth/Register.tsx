// frontend/client-portal/src/pages/auth/Register.tsx

import React, { useState } from 'react';
import {
  Box,
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
import { ErrorHandler } from '../../utils/errorHandler';
import type { RegisterCredentials } from '../../types/auth.types';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { GoogleLoginButton } from '../../components/auth';
import { tokens } from '../../design-system';

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
  const { showSuccess } = useToastActions();
  const theme = useTheme();

  // Glass morphism TextField styling with improved contrast
  const glassTextFieldSx = {
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
  };

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

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (field.startsWith('profile.')) {
      const profileField = field.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
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
        'Your account has been created successfully. You are now logged in.',
      );
      onRegisterSuccess?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Registration error:', error);

      // Handle different types of errors
      const validationErrors = ErrorHandler.extractValidationErrors(error);
      const newErrors: Record<string, string> = {};

      // Map validation errors to form fields
      for (const { field, messages } of validationErrors) {
        newErrors[field] = messages[0];
      }

      // If no field errors, use the general error message
      if (Object.keys(newErrors).length === 0) {
        const errorMessage = ErrorHandler.extractMessage(error);
        newErrors.form = errorMessage;
      }

      setErrors(newErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = (field: 'password' | 'confirm_password') => () => {
    if (field === 'password') {
      setShowPassword((prev) => !prev);
    } else {
      setShowConfirmPassword((prev) => !prev);
    }
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
          maxWidth: 520,
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
                Join LifePlace
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: tokens.color.base.neutral[700],
                  textShadow: `0 1px 4px ${tokens.color.overlays.light}`,
                }}
              >
                Create your account and start your journey
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Registration Form */}
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

                  {/* Personal Information */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: tokens.color.base.neutral[900],
                    }}
                  >
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
                        sx={glassTextFieldSx}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person
                                sx={{
                                  color: errors.first_name
                                    ? theme.palette.error.main
                                    : tokens.color.base.neutral[600],
                                }}
                              />
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
                        sx={glassTextFieldSx}
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
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email
                            sx={{
                              color: errors.email
                                ? theme.palette.error.main
                                : tokens.color.base.neutral[600],
                            }}
                          />
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
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock
                            sx={{
                              color: errors.password
                                ? theme.palette.error.main
                                : tokens.color.base.neutral[600],
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility('password')}
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

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={handleInputChange('confirm_password')}
                    error={!!errors.confirm_password}
                    helperText={errors.confirm_password}
                    disabled={isSubmitting}
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock
                            sx={{
                              color: errors.confirm_password
                                ? theme.palette.error.main
                                : tokens.color.base.neutral[600],
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility('confirm_password')}
                            edge="end"
                            disabled={isSubmitting}
                            sx={{ color: tokens.color.base.neutral[600] }}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Divider sx={{ borderColor: tokens.color.base.neutral[300], my: 2 }} />

                  {/* Optional Information */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: tokens.color.base.neutral[900],
                    }}
                  >
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
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone
                            sx={{
                              color: errors['profile.phone']
                                ? theme.palette.error.main
                                : tokens.color.base.neutral[600],
                            }}
                          />
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
                    sx={glassTextFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business sx={{ color: tokens.color.base.neutral[600] }} />
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
                      'Create Account'
                    )}
                  </Button>

                  {/* Google Sign-Up */}
                  <GoogleLoginButton
                    onSuccess={onRegisterSuccess}
                    text="signup_with"
                    dividerText="or sign up with"
                  />
                </Stack>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Login Link */}
          <AnimatedElement animation="fadeIn" delay={300}>
            <Box textAlign="center">
              <Typography variant="body1" sx={{ color: tokens.color.base.neutral[700] }}>
                Already have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onNavigateToLogin}
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
                  Login here
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
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Typography>
            </Box>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};

export default Register;
