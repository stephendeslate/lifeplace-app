// Reset Password Form Component
// Reusable form for confirming password reset with token

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircleOutlined,
  ErrorOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useToastActions } from '../../contexts/ToastContext';
import { tokens } from '../../design-system';
import { createTransition } from '../../design-system/utils/animations';
import { authApi } from '../../apis/auth.api';

interface ResetPasswordFormProps {
  tokenId: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ tokenId }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastActions();

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

  const validateToken = useCallback(async () => {
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
    } catch (_error) {
      setIsTokenValid(false);
      setTokenError('Unable to validate reset link. Please try again.');
    } finally {
      setIsValidating(false);
    }
  }, [tokenId]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; password_feedback?: string[] } }; message?: string };
      const errorMessage = err?.response?.data?.detail || err.message || 'Failed to reset password. Please try again.';
      const feedback = err?.response?.data?.password_feedback || [];

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
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: '50%',
              display: 'inline-flex',
              background: `linear-gradient(135deg, ${tokens.color.error[500]}15 0%, ${tokens.color.error[600]}10 100%)`,
              mb: 3,
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 48,
                color: tokens.color.error[500],
              }}
            />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: tokens.color.neutral[900],
              mb: 1.5,
            }}
          >
            Invalid Reset Link
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: tokens.color.neutral[600],
              mb: 3,
            }}
          >
            {tokenError}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() => navigate('/forgot-password')}
          sx={{
            py: 1.5,
            borderRadius: tokens.spacing.radius.lg,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          Request New Reset Link
        </Button>

        <Button
          fullWidth
          variant="text"
          onClick={() => navigate('/login')}
          sx={{
            textTransform: 'none',
            color: tokens.color.neutral[600],
            fontWeight: 500,
          }}
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
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: '50%',
              display: 'inline-flex',
              background: `linear-gradient(135deg, ${tokens.color.success[500]}15 0%, ${tokens.color.success[600]}10 100%)`,
              mb: 3,
            }}
          >
            <CheckCircleOutlined
              sx={{
                fontSize: 48,
                color: tokens.color.success[500],
              }}
            />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: tokens.color.neutral[900],
              mb: 1.5,
            }}
          >
            Password Reset Successful!
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: tokens.color.neutral[600],
            }}
          >
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
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Box
          sx={{
            p: 2.5,
            borderRadius: '50%',
            display: 'inline-flex',
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
            mb: 3,
          }}
        >
          <Lock
            sx={{
              fontSize: 48,
              color: tokens.color.primary[500],
            }}
          />
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            background: `linear-gradient(135deg, ${tokens.color.neutral[900]} 0%, ${tokens.color.neutral[700]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1.5,
          }}
        >
          Reset Your Password
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: tokens.color.neutral[600],
            lineHeight: 1.6,
            mb: 1,
          }}
        >
          Enter a new password for:
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: tokens.color.neutral[900],
            fontWeight: 600,
          }}
        >
          {email}
        </Typography>
      </Box>

      {/* Error Alert */}
      {submitError && (
        <Alert
          severity="error"
          sx={{
            borderRadius: tokens.spacing.radius.md,
          }}
        >
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
              <Lock sx={{ color: tokens.color.neutral[400] }} />
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
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.lg,
            transition: createTransition(['border-color', 'box-shadow']),
          },
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
              <Lock sx={{ color: tokens.color.neutral[400] }} />
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
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.lg,
            transition: createTransition(['border-color', 'box-shadow']),
          },
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
          borderRadius: tokens.spacing.radius.lg,
          background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: `0 4px 12px ${tokens.color.primary[500]}40`,
          transition: createTransition(['all']),

          '&:hover': {
            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
            boxShadow: `0 6px 20px ${tokens.color.primary[500]}50`,
            transform: 'translateY(-1px)',
          },
        }}
      >
        {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
      </Button>

      {/* Back to Login */}
      <Button
        fullWidth
        variant="text"
        onClick={() => navigate('/login')}
        disabled={isSubmitting}
        sx={{
          textTransform: 'none',
          color: tokens.color.neutral[600],
          fontWeight: 500,
          transition: createTransition(['color']),

          '&:hover': {
            color: tokens.color.neutral[900],
            background: 'transparent',
          },
        }}
      >
        Back to Login
      </Button>
    </Box>
  );
};
