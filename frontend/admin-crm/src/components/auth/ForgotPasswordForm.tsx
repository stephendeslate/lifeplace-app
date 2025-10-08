// Forgot Password Form Component
// Reusable form for requesting password reset

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Email,
  LockResetOutlined,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useToastActions } from '../../contexts/ToastContext';
import { tokens } from '../../design-system';
import { createTransition } from '../../design-system/utils/animations';
import { authApi } from '../../apis/auth.api';

export const ForgotPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastActions();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (emailError) setEmailError('');
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await authApi.requestPasswordReset(email);
      setIsSuccess(true);
      showSuccess('Email Sent', response.detail);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email. Please try again.';
      setSubmitError(errorMessage);
      showError('Request Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

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
            <LockResetOutlined
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
              background: `linear-gradient(135deg, ${tokens.color.neutral[900]} 0%, ${tokens.color.neutral[700]} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1.5,
            }}
          >
            Check Your Email
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: tokens.color.neutral[600],
              mb: 1,
            }}
          >
            We've sent password reset instructions to:
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: tokens.color.neutral[900],
              fontWeight: 600,
              mb: 3,
            }}
          >
            {email}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: tokens.color.neutral[500],
              fontSize: '0.875rem',
            }}
          >
            If you don't see the email, check your spam folder or request a new reset link.
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          onClick={handleBackToLogin}
          startIcon={<ArrowBack />}
          sx={{
            py: 1.5,
            borderRadius: tokens.spacing.radius.lg,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            ...createTransition(['all']),
          }}
        >
          Back to Login
        </Button>
      </Box>
    );
  }

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
          <LockResetOutlined
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
          Forgot Password?
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: tokens.color.neutral[600],
            lineHeight: 1.6,
          }}
        >
          Enter your email address and we'll send you instructions to reset your password.
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
        </Alert>
      )}

      {/* Email Field */}
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={email}
        onChange={handleEmailChange}
        error={Boolean(emailError)}
        helperText={emailError}
        disabled={isSubmitting}
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email sx={{ color: tokens.color.neutral[400] }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.lg,
            ...createTransition(['border-color', 'box-shadow']),

            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: tokens.color.primary[300],
              },
            },

            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: tokens.color.primary[500],
                borderWidth: '2px',
              },
            },
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
          ...createTransition(['all']),

          '&:hover': {
            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
            boxShadow: `0 6px 20px ${tokens.color.primary[500]}50`,
            transform: 'translateY(-1px)',
          },

          '&:active': {
            transform: 'translateY(0)',
          },
        }}
      >
        {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
      </Button>

      {/* Back to Login */}
      <Button
        fullWidth
        variant="text"
        onClick={handleBackToLogin}
        startIcon={<ArrowBack />}
        disabled={isSubmitting}
        sx={{
          textTransform: 'none',
          color: tokens.color.neutral[600],
          fontWeight: 500,
          ...createTransition(['color']),

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
