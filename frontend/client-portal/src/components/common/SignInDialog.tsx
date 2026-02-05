// frontend/client-portal/src/components/common/SignInDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Close as CloseIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { validateLoginForm } from '../../utils/validation';
import { ErrorHandler } from '../../utils/errorHandler';
import { GoogleLoginButton } from '../auth/GoogleLoginButton';
import type { LoginCredentials } from '../../types/auth.types';

interface SignInDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SignInDialog: React.FC<SignInDialogProps> = ({
  open,
  onClose,
  onSuccess,
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
        'You have been successfully signed in.'
      );
      // Reset form
      setFormData({ email: '', password: '', remember_me: false });
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Login error:', error);

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

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ email: '', password: '', remember_me: false });
      setErrors({});
      onClose();
    }
  };

  const handleGoogleSuccess = () => {
    // Reset form state
    setFormData({ email: '', password: '', remember_me: false });
    setErrors({});
    // Trigger success callback and close dialog
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LoginIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Sign In
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={isSubmitting}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Sign in to auto-fill your contact information
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
          <Stack spacing={3}>
            {errors.form && (
              <Alert
                severity="error"
                sx={{
                  borderRadius: 2,
                }}
              >
                {errors.form}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              disabled={isSubmitting}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color={errors.email ? 'error' : 'action'} />
                  </InputAdornment>
                ),
              }}
            />

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
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ textAlign: 'right' }}>
              <Link
                href="/forgot-password"
                target="_blank"
                variant="body2"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
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
              onSuccess={handleGoogleSuccess}
              text="signin_with"
            />

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Don't have an account?{' '}
              <Link
                href="/register"
                target="_blank"
                sx={{
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Register here
              </Link>
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
