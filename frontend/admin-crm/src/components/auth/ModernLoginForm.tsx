// Modern Login Form Component
// Clean login form with flat design

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Divider,
  useTheme as useMuiTheme,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  LoginOutlined,
  SecurityOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { tokens } from '../../design-system';
import { createTransition } from '../../design-system/utils/animations';
import type { LoginCredentials } from '../../types/auth.types';

interface ModernLoginFormProps {
  onSuccess?: () => void;
}

export const ModernLoginForm: React.FC<ModernLoginFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { showError } = useToastActions();
  const { effectiveMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isDarkMode = effectiveMode === 'dark';

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    remember_me: false,
  });

  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange =
    (field: keyof LoginCredentials) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'remember_me' ? event.target.checked : event.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Clear submit error when user makes changes
      if (submitError) {
        setSubmitError('');
      }
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitError('');
      await login(formData);
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
      setSubmitError(errorMessage);
      showError('Login Failed', errorMessage);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, sm: 3 },
        position: 'relative',
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          textAlign: 'center',
          mb: { xs: 1, sm: 2 },
          position: 'relative',
        }}
      >
        {/* Icon Background */}
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            mb: 2,
          }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: tokens.spacing.radius.lg,
              background: tokens.color.primary[50],
              border: `1px solid ${tokens.color.primary[200]}`,
              color: tokens.color.primary[600],
              mb: 1.5,
            }}
          >
            <LoginOutlined sx={{ fontSize: '2rem' }} />
          </Box>
        </Box>

        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            color: tokens.color.primary[700],
            mb: 1,
            letterSpacing: '-0.02em',
          }}
        >
          LifePlace Admin
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: tokens.color.neutral[600],
            fontWeight: 500,
            letterSpacing: '0.025em',
          }}
        >
          Access your admin dashboard
        </Typography>
      </Box>

      {/* Error Alert */}
      {submitError && (
        <Alert
          severity="error"
          sx={{
            borderRadius: tokens.spacing.radius.md,
            border: `1px solid ${tokens.color.error[200]}`,
            '& .MuiAlert-message': {
              fontWeight: 500,
            },
          }}
        >
          {submitError}
        </Alert>
      )}

      {/* Email Field */}
      <TextField
        fullWidth
        variant="outlined"
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        error={!!errors.email}
        helperText={errors.email}
        disabled={isLoading}
        autoComplete="email"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email
                sx={{
                  color: errors.email
                    ? tokens.color.error[500]
                    : isDarkMode
                      ? tokens.color.neutral[400]
                      : tokens.color.neutral[500],
                }}
              />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.md,
            backgroundColor: isDarkMode ? tokens.color.neutral[800] : 'white',
            border: `1px solid ${isDarkMode ? tokens.color.neutral[700] : tokens.color.neutral[300]}`,
            transition: createTransition(['border-color', 'background-color'], 'fast'),
            padding: '2px 0',
            color: isDarkMode ? tokens.color.neutral[200] : tokens.color.neutral[800],

            '& input': {
              color: isDarkMode ? tokens.color.neutral[200] : tokens.color.neutral[800],
              '&::placeholder': {
                color: isDarkMode ? tokens.color.neutral[500] : tokens.color.neutral[400],
              },
            },

            '&:hover': {
              borderColor: tokens.color.primary[300],
            },

            '&.Mui-focused': {
              borderColor: tokens.color.primary[500],
            },

            '&.Mui-error': {
              borderColor: tokens.color.error[500],
            },

            '& fieldset': {
              border: 'none',
            },
          },

          '& .MuiInputLabel-root': {
            color: isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[600],
            fontWeight: 500,
            backgroundColor: 'transparent',
            padding: '0 4px',

            '&.Mui-focused': {
              color: tokens.color.primary[isDarkMode ? 400 : 600],
            },

            '&.Mui-error': {
              color: tokens.color.error[600],
            },

            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.75)',
              backgroundColor: isDarkMode ? muiTheme.palette.background.paper : 'white',
              padding: '0 8px',
            },
          },

          '& .MuiFormHelperText-root': {
            marginLeft: 0,
            marginTop: 1,
            fontWeight: 500,
            color: isDarkMode ? tokens.color.neutral[400] : 'inherit',
          },
        }}
      />

      {/* Password Field */}
      <TextField
        fullWidth
        variant="outlined"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        error={!!errors.password}
        helperText={errors.password}
        disabled={isLoading}
        autoComplete="current-password"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock
                sx={{
                  color: errors.password
                    ? tokens.color.error[500]
                    : isDarkMode
                      ? tokens.color.neutral[400]
                      : tokens.color.neutral[500],
                }}
              />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={togglePasswordVisibility}
                edge="end"
                disabled={isLoading}
                sx={{
                  color: isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[500],
                  '&:hover': {
                    color: tokens.color.primary[500],
                    backgroundColor: `${tokens.color.primary[500]}10`,
                  },
                }}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.md,
            backgroundColor: isDarkMode ? tokens.color.neutral[800] : 'white',
            border: `1px solid ${isDarkMode ? tokens.color.neutral[700] : tokens.color.neutral[300]}`,
            transition: createTransition(['border-color', 'background-color'], 'fast'),
            padding: '2px 0',
            color: isDarkMode ? tokens.color.neutral[200] : tokens.color.neutral[800],

            '& input': {
              color: isDarkMode ? tokens.color.neutral[200] : tokens.color.neutral[800],
              '&::placeholder': {
                color: isDarkMode ? tokens.color.neutral[500] : tokens.color.neutral[400],
              },
            },

            '&:hover': {
              borderColor: tokens.color.primary[300],
            },

            '&.Mui-focused': {
              borderColor: tokens.color.primary[500],
            },

            '&.Mui-error': {
              borderColor: tokens.color.error[500],
            },

            '& fieldset': {
              border: 'none',
            },
          },

          '& .MuiInputLabel-root': {
            color: isDarkMode ? tokens.color.neutral[400] : tokens.color.neutral[600],
            fontWeight: 500,
            backgroundColor: 'transparent',
            padding: '0 4px',

            '&.Mui-focused': {
              color: tokens.color.primary[isDarkMode ? 400 : 600],
            },

            '&.Mui-error': {
              color: tokens.color.error[600],
            },

            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.75)',
              backgroundColor: isDarkMode ? muiTheme.palette.background.paper : 'white',
              padding: '0 8px',
            },
          },

          '& .MuiFormHelperText-root': {
            marginLeft: 0,
            marginTop: 1,
            fontWeight: 500,
            color: isDarkMode ? tokens.color.neutral[400] : 'inherit',
          },
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
              disabled={isLoading}
              sx={{
                color: tokens.color.neutral[500],
                '&.Mui-checked': {
                  color: tokens.color.primary[600],
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '1.4rem',
                },
              }}
            />
          }
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="body2"
                sx={{
                  color: tokens.color.neutral[700],
                  fontWeight: 500,
                }}
              >
                Keep me signed in
              </Typography>
              <SecurityOutlined
                sx={{
                  fontSize: '1rem',
                  color: tokens.color.neutral[500],
                }}
              />
            </Box>
          }
          sx={{
            marginLeft: 0,
            '& .MuiFormControlLabel-label': {
              marginLeft: 1,
            },
          }}
        />

        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={() => navigate('/forgot-password')}
          disabled={isLoading}
          sx={{
            color: tokens.color.primary[600],
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: createTransition(['color']),

            '&:hover': {
              color: tokens.color.primary[700],
              textDecoration: 'underline',
            },

            '&:disabled': {
              color: tokens.color.neutral[400],
              cursor: 'not-allowed',
            },
          }}
        >
          Forgot password?
        </Link>
      </Box>

      {/* Login Button */}
      <Button
        type="submit"
        fullWidth
        size="large"
        disabled={isLoading}
        sx={{
          py: { xs: 1.25, sm: 1.5 },
          borderRadius: tokens.spacing.radius.md,
          fontWeight: 600,
          fontSize: '1rem',
          letterSpacing: '0.025em',
          textTransform: 'none',
          position: 'relative',
          overflow: 'hidden',

          // Simple button styling
          background: tokens.color.primary[600],
          color: 'white',

          '&:hover': !isLoading
            ? {
                background: tokens.color.primary[700],
              }
            : {},

          '&:active': {
            background: tokens.color.primary[800],
          },

          '&:disabled': {
            background: tokens.color.neutral[300],
            color: tokens.color.neutral[500],
          },

          transition: createTransition(['background'], 'fast'),
        }}
      >
        {isLoading ? (
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            sx={{
              '& .loading-spinner': {
                width: 20,
                height: 20,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              },

              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          >
            <Box className="loading-spinner" />
            Signing In...
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1.5}>
            <LoginOutlined />
            Sign In to Dashboard
          </Box>
        )}
      </Button>

      {/* Divider */}
      <Divider
        sx={{
          my: { xs: 0.5, sm: 1 },
          '&::before, &::after': {
            borderColor: `${tokens.color.neutral[300]}60`,
          },
        }}
      />

      {/* Footer Text */}
      <Typography
        variant="caption"
        sx={{
          textAlign: 'center',
          color: tokens.color.neutral[600],
          fontWeight: 500,
          letterSpacing: '0.025em',
          lineHeight: 1.4,
        }}
      >
        Admin access required. Contact your administrator if you need access.
      </Typography>
    </Box>
  );
};
