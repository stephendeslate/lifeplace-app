/**
 * Google Sign-In Button Component
 *
 * Provides Google OAuth authentication for mobile app users.
 * Uses expo-auth-session for the OAuth flow and sends the ID token
 * to the backend for verification and user creation/login.
 *
 * Note: This component requires a development build to function.
 * It will not render when running in Expo Go due to native module requirements.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Constants from 'expo-constants';

import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AuthAPI } from '@/apis/auth.api';
import { getErrorMessage } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { colors, spacing, typeScale, layout, shadows, neutralColors } from '@/theme';

const authLogger = logger.create('GoogleSignIn');

// Check if native modules are available (not in Expo Go)
let WebBrowser: typeof import('expo-web-browser') | null = null;
let Google: typeof import('expo-auth-session/providers/google') | null = null;
let isNativeModuleAvailable = false;

try {
  WebBrowser = require('expo-web-browser');
  Google = require('expo-auth-session/providers/google');
  isNativeModuleAvailable = true;
  // Ensure the web browser dismisses properly on iOS
  if (WebBrowser) {
    WebBrowser.maybeCompleteAuthSession();
  }
} catch (e) {
  authLogger.debug('Google Sign-In native modules not available (likely running in Expo Go)');
}

/**
 * Google "G" Logo SVG Component
 * Using official Google brand colors and paths
 */
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export interface GoogleSignInButtonProps {
  /** Callback when sign-in is successful */
  onSuccess?: () => void;
  /** Button text variant */
  text?: 'signin' | 'signup' | 'continue';
  /** Optional custom style */
  style?: object;
}

/**
 * Google Sign-In Button
 *
 * Handles the full Google OAuth flow:
 * 1. Opens Google Sign-In in browser/native UI
 * 2. Receives the ID token from Google
 * 3. Sends token to backend for verification
 * 4. Backend creates/returns user and JWT tokens
 * 5. Stores tokens and navigates to app
 *
 * Note: Returns null when running in Expo Go (native modules unavailable)
 */
export function GoogleSignInButton({
  onSuccess,
  text = 'continue',
  style,
}: GoogleSignInButtonProps) {
  const { googleLogin } = useAuthContext();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Get client IDs from config
  const webClientId = Constants.expoConfig?.extra?.googleOAuthClientId;
  const iosClientId = Constants.expoConfig?.extra?.googleOAuthIosClientId;
  const androidClientId = Constants.expoConfig?.extra?.googleOAuthAndroidClientId;

  // Configure Google auth request (only if native module available)
  // We use a conditional hook pattern here - the hook is always called but with null config if unavailable
  const authConfig = isNativeModuleAvailable && Google ? {
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
  } : { webClientId: undefined, iosClientId: undefined, androidClientId: undefined };

  // This hook must be called unconditionally to follow React rules
  // When native modules aren't available, we pass empty config and handle it below
  const useAuthRequestHook = Google?.useAuthRequest || (() => [null, null, async () => ({ type: 'dismiss' as const })]);
  const [request, response, promptAsync] = useAuthRequestHook(authConfig);

  // Fetch client ID from backend on mount
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const result = await AuthAPI.getGoogleClientId();
        if (result.client_id) {
          setClientId(result.client_id);
          setIsConfigured(true);
        }
      } catch (error) {
        authLogger.debug('Google OAuth not configured on backend');
        // Don't show error - button just won't appear
      }
    };
    fetchClientId();
  }, []);

  // Handle Google auth response
  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success') {
        const { authentication, params } = response;

        // Get the ID token - we need this for backend verification
        // The ID token proves the user authenticated with Google
        const idToken = params?.id_token || authentication?.idToken;

        if (!idToken) {
          showToast('Google Sign-In failed: No ID token received', 'error');
          setIsLoading(false);
          return;
        }

        try {
          // Send ID token to our backend for verification
          await googleLogin(idToken);
          showToast('Welcome! Successfully signed in with Google', 'success');
          onSuccess?.();
        } catch (error) {
          authLogger.error('Google login error:', getErrorMessage(error));
          showToast(getErrorMessage(error), 'error');
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        authLogger.error('Google auth error:', response.error);
        showToast('Google Sign-In failed. Please try again.', 'error');
        setIsLoading(false);
      } else if (response?.type === 'dismiss') {
        // User cancelled
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [response, googleLogin, showToast, onSuccess]);

  const handlePress = useCallback(async () => {
    if (!request) {
      showToast('Google Sign-In is not available', 'error');
      return;
    }

    setIsLoading(true);

    try {
      await promptAsync();
    } catch (error) {
      authLogger.error('Google prompt error:', getErrorMessage(error));
      showToast('Failed to open Google Sign-In', 'error');
      setIsLoading(false);
    }
  }, [request, promptAsync, showToast]);

  // Get button text based on variant
  const getButtonText = () => {
    switch (text) {
      case 'signin':
        return 'Sign in with Google';
      case 'signup':
        return 'Sign up with Google';
      case 'continue':
      default:
        return 'Continue with Google';
    }
  };

  // Don't render if native modules unavailable (Expo Go) or not configured
  if (!isNativeModuleAvailable) {
    return null;
  }

  if (!isConfigured && !webClientId && !iosClientId && !androidClientId) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled, style]}
      onPress={handlePress}
      disabled={isLoading || !request}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={getButtonText()}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={neutralColors[600]} />
      ) : (
        <>
          <GoogleIcon size={20} />
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: neutralColors[0],
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: neutralColors[200],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 50,
    gap: spacing.sm,
    ...shadows.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typeScale.labelLarge,
    color: neutralColors[700],
  },
});

export default GoogleSignInButton;
