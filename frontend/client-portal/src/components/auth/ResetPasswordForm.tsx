// Reset Password Form Component for Client Portal
// Confirm password reset with token

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useToastActions } from '../../contexts/ToastContext';
import { authApi } from '../../apis/auth.api';

interface ResetPasswordFormProps {
  tokenId: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ tokenId }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastActions();
  const theme = useTheme();

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    validateToken();
  }, [tokenId]);

  const validateToken = async () => {
    setIsValidating(true);
    try {
      const response = await authApi.validateResetToken(tokenId);
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
    } catch (error) {
      setIsTokenValid(false);
      setTokenError('Unable to validate reset link. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (passwordError) setPasswordError('');
    if (submitError) setSubmitError('');
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
    if (confirmPasswordError) setConfirmPasswordError('');
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setPasswordFeedback([]);

    try {
      const response = await authApi.confirmPasswordReset(tokenId, {
        password,
        confirm_password: confirmPassword,
      });
      setIsSuccess(true);
      showSuccess('Password Reset', response.detail);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error.message || 'Failed to reset password. Please try again.';
      const feedback = error?.response?.data?.password_feedback || [];

      setSubmitError(errorMessage);
      setPasswordFeedback(feedback);
      showError('Reset Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          py: 4,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Validating reset link...
        </Typography>
      </Box>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 3,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.error.main, 0.1),
              mb: 3,
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 60,
                color: theme.palette.error.main,
              }}
            />
          </Box>

          <Typography variant="h5" fontWeight={600} gutterBottom>
            Invalid Reset Link
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {tokenError}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() => navigate('/forgot-password')}
          sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem', fontWeight: 600 }}
        >
          Request New Reset Link
        </Button>

        <Button
          fullWidth
          variant="text"
          onClick={() => navigate('/login')}
          sx={{ textTransform: 'none', color: theme.palette.text.secondary }}
        >
          Back to Login
        </Button>
      </Box>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 3,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.success.main, 0.1),
              mb: 3,
            }}
          >
            <CheckCircle
              sx={{
                fontSize: 60,
                color: theme.palette.success.main,
              }}
            />
          </Box>

          <Typography variant="h5" fontWeight={600} gutterBottom>
            Password Reset Successful!
          </Typography>

          <Typography variant="body1" color="text.secondary">
            Your password has been reset. Redirecting to login...
          </Typography>
        </Box>

        <CircularProgress size={40} sx={{ mx: 'auto' }} />
      </Box>
    );
  }

  // Reset password form
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            p: 2.5,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            mb: 2,
          }}
        >
          <Lock
            sx={{
              fontSize: 48,
              color: theme.palette.primary.main,
            }}
          />
        </Box>

        <Typography variant="h5" fontWeight={600} gutterBottom>
          Reset Your Password
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enter a new password for:
        </Typography>

        <Typography variant="body1" fontWeight={600} color="primary">
          {email}
        </Typography>
      </Box>

      {/* Error Alert */}
      {submitError && (
        <Alert severity="error">
          {submitError}
          {passwordFeedback.length > 0 && (
            <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
              {passwordFeedback.map((feedback, index) => (
                <li key={index}>{feedback}</li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {/* Password Field */}
      <TextField
        fullWidth
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={handlePasswordChange}
        error={Boolean(passwordError)}
        helperText={passwordError || 'Minimum 8 characters'}
        disabled={isSubmitting}
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color={passwordError ? 'error' : 'action'} />
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

      {/* Confirm Password Field */}
      <TextField
        fullWidth
        label="Confirm New Password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={handleConfirmPasswordChange}
        error={Boolean(confirmPasswordError)}
        helperText={confirmPasswordError}
        disabled={isSubmitting}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color={confirmPasswordError ? 'error' : 'action'} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Submit Button */}
      <Button
        fullWidth
        type="submit"
        variant="contained"
        disabled={isSubmitting}
        sx={{
          py: 1.5,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
          },
        }}
      >
        {isSubmitting ? (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={20} color="inherit" />
            Resetting Password...
          </Box>
        ) : (
          'Reset Password'
        )}
      </Button>

      {/* Back to Login */}
      <Button
        fullWidth
        variant="text"
        onClick={() => navigate('/login')}
        disabled={isSubmitting}
        sx={{
          textTransform: 'none',
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.text.primary,
          },
        }}
      >
        Back to Login
      </Button>
    </Box>
  );
};
