// Forgot Password Form Component for Client Portal
// Request password reset email

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  InputAdornment,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Email,
  LockReset,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useToastActions } from '../../contexts/ToastContext';
import { authApi } from '../../apis/auth.api';

export const ForgotPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastActions();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
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
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.requestPasswordReset(email);
      setIsSuccess(true);
      showSuccess('Email Sent', response.detail);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email. Please try again.';
      showError('Request Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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

          <Typography
            variant="h5"
            fontWeight={600}
            gutterBottom
            sx={{ color: theme.palette.text.primary }}
          >
            Check Your Email
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            gutterBottom
          >
            We've sent password reset instructions to:
          </Typography>

          <Typography
            variant="body1"
            fontWeight={600}
            sx={{ color: theme.palette.primary.main, mb: 2 }}
          >
            {email}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.875rem' }}
          >
            If you don't see the email, check your spam folder.
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/login')}
          startIcon={<ArrowBack />}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
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
          <LockReset
            sx={{
              fontSize: 48,
              color: theme.palette.primary.main,
            }}
          />
        </Box>

        <Typography
          variant="h5"
          fontWeight={600}
          gutterBottom
          sx={{ color: theme.palette.text.primary }}
        >
          Forgot Password?
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6 }}
        >
          Enter your email address and we'll send you instructions to reset your password.
        </Typography>
      </Box>

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
              <Email color={emailError ? 'error' : 'action'} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: theme.palette.primary.main,
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
            Sending...
          </Box>
        ) : (
          'Send Reset Instructions'
        )}
      </Button>

      {/* Back to Login */}
      <Button
        fullWidth
        variant="text"
        onClick={() => navigate('/login')}
        startIcon={<ArrowBack />}
        disabled={isSubmitting}
        sx={{
          textTransform: 'none',
          color: theme.palette.text.secondary,
          fontWeight: 500,
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
