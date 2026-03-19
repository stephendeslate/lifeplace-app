import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToastActions } from '@/contexts/ToastContext';
import { authApi } from '@/apis/auth.api';

interface ResetPasswordProps {
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

export function useResetPasswordLogic({ onNavigateToLogin, onNavigateToHome }: ResetPasswordProps) {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { showSuccess, showError } = useToastActions();

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (tokenId) {
      validateToken();
    } else {
      setIsValidating(false);
      setIsTokenValid(false);
      setTokenError('Invalid reset link');
    }
  }, [tokenId]);

  const validateToken = async () => {
    setIsValidating(true);
    try {
      const response = await authApi.validateResetToken(tokenId!);
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
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (errors.password || errors.form) {
      setErrors((prev) => ({ ...prev, password: '', form: '' }));
    }
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
    if (errors.confirmPassword || errors.form) {
      setErrors((prev) => ({ ...prev, confirmPassword: '', form: '' }));
    }
  };

  const handleBackToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = '/login';
    }
  };

  const handleBackToHome = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleRequestNewLink = () => {
    window.location.href = '/forgot-password';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await authApi.confirmPasswordReset(tokenId!, {
        password,
        confirm_password: confirmPassword,
      });
      setIsSuccess(true);
      showSuccess('Password Reset', response.detail);

      setTimeout(() => {
        handleBackToLogin();
      }, 2000);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Password reset error:', error);

      const err = error as {
        response?: { data?: { detail?: string; password_feedback?: string[] } };
        message?: string;
      };
      const errorMessage =
        err?.response?.data?.detail || err.message || 'Failed to reset password. Please try again.';
      const feedback = err?.response?.data?.password_feedback || [];

      setErrors({ form: errorMessage });
      if (feedback.length > 0) {
        setErrors((prev) => ({ ...prev, form: `${errorMessage}\n${feedback.join('\n')}` }));
      }
      showError('Reset Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isValidating,
    isTokenValid,
    isSuccess,
    email,
    tokenError,
    password,
    confirmPassword,
    errors,
    showPassword,
    showConfirmPassword,
    isSubmitting,
    setShowPassword,
    setShowConfirmPassword,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleSubmit,
    handleBackToLogin,
    handleBackToHome,
    handleRequestNewLink,
  };
}
