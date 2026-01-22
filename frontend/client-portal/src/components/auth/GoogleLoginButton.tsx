// frontend/client-portal/src/components/auth/GoogleLoginButton.tsx

import { useEffect, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider, CredentialResponse } from '@react-oauth/google';
import { Box, Typography, Divider, CircularProgress, alpha, useTheme } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import { authApi } from '../../apis/auth.api';
import { ErrorHandler } from '../../utils/errorHandler';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  dividerText?: string;
}

/**
 * Google Sign-In button component that integrates with the backend Google OAuth flow.
 *
 * Features:
 * - Fetches Google client ID dynamically from backend
 * - Handles login/registration with Google credentials
 * - Shows appropriate error messages
 * - Supports customizable button text
 */
export const GoogleLoginButton = ({
  onSuccess,
  text = 'continue_with',
  dividerText = 'or',
}: GoogleLoginButtonProps) => {
  const { googleLogin } = useAuth();
  const { showError, showSuccess } = useToastActions();
  const theme = useTheme();
  const [clientId, setClientId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const response = await authApi.getGoogleClientId();
        if (response.client_id) {
          setClientId(response.client_id);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch Google client ID:', error);
        }
        // Don't show error - Google sign-in will just not appear
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientId();
  }, []);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      showError('Google Sign-In Failed', 'No credential received from Google. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await googleLogin(credentialResponse.credential);
      showSuccess('Welcome!', 'You have successfully signed in with Google.');
      onSuccess?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error('Google login error:', error);
      }
      const message = ErrorHandler.extractMessage(error);
      showError('Google Sign-In Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    showError('Google Sign-In Failed', 'Sign-in was cancelled or failed. Please try again.');
  };

  // Don't render if loading or no client ID configured
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} sx={{ color: alpha('#fff', 0.7) }} />
      </Box>
    );
  }

  if (!clientId) {
    // Google OAuth not configured - don't show anything
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Box sx={{ width: '100%', my: 2 }}>
        <Divider
          sx={{
            my: 2,
            '&::before, &::after': {
              borderColor: alpha('#fff', 0.3),
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: alpha('#fff', 0.8),
              px: 2,
            }}
          >
            {dividerText}
          </Typography>
        </Divider>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            minHeight: 44,
          }}
        >
          {isSubmitting ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                width: '100%',
                backgroundColor: alpha('#fff', 0.1),
                borderRadius: 1,
                backdropFilter: 'blur(10px)',
              }}
            >
              <CircularProgress size={24} sx={{ color: theme.palette.primary.light }} />
              <Typography
                variant="body2"
                sx={{ ml: 2, color: alpha('#fff', 0.8) }}
              >
                Signing in...
              </Typography>
            </Box>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text={text}
              shape="rectangular"
              size="large"
              width="100%"
              useOneTap={false}
              theme="outline"
            />
          )}
        </Box>
      </Box>
    </GoogleOAuthProvider>
  );
};

export default GoogleLoginButton;
