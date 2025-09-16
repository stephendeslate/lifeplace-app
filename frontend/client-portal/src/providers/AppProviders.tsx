// frontend/client-portal/src/providers/AppProviders.tsx

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { createClientTheme, injectDesignTokens } from '@shared/design-system';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ContractsProvider } from '../contexts/ContractsContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmDialogProvider } from '../components/common/ConfirmDialog';
import { AccessibilityProvider } from '../components/accessibility/AccessibilityProvider';

// Messaging system imports
import { WebSocketProvider, MessagingProvider, setApiClient } from '@shared';
import api from '../utils/api';
import { storage } from '../utils/storage';

interface AppProvidersProps {
  children: React.ReactNode;
}

// Initialize messaging API client
setApiClient(api);

// Create QueryClient with default options optimized for messaging
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403 errors
        // Error objects from axios have dynamic structure requiring any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorObj = error as any;
        if (errorObj?.response?.status === 401 || errorObj?.response?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      // Enhanced error handling for real-time features
      refetchOnReconnect: true,
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Enhanced mutation settings for optimistic updates
      networkMode: 'online',
    },
  },
});

// Messaging-enabled wrapper that has access to auth context
const MessagingEnabledApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const authContext = {
    user,
    isAuthenticated,
    isLoading
  };
  
  // WebSocket configuration for client portal
  const getWebSocketUrl = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = import.meta.env.VITE_WS_BASE_URL || 
                   (import.meta.env.PROD ? window.location.host : 'localhost:8000');
    return `${wsProtocol}//${baseUrl}/ws/messaging/`;
  };

  const getAuthToken = () => {
    const tokens = storage.getTokens();
    return tokens?.access || null;
  };

  const webSocketConfig = {
    url: getWebSocketUrl(),
    protocols: ['messaging'],
    getAuthToken,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
  };

  const messagingConfig = {
    userRole: 'CLIENT' as const,
    enableInternalNotes: false,
    enableBulkOperations: false,
    enableCannedResponses: false,
    enableFileUploads: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB for clients
    allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx'],
    simplified: true,
    autoMarkAsRead: true, // Clients auto-mark as read
    enableTypingIndicators: true,
    enableReadReceipts: false,
    typingTimeout: 3000,
    typingDebounceMs: 1000,
    enableRealTime: true,
    enableSearch: false,
    enableVirtualScrolling: false,
    messagesPerPage: 30,
    threadsPerPage: 10,
    reconnectAttempts: 3,
    reconnectDelay: 2000,
  };

  // Always render the full provider tree - MessagingProvider now handles auth state internally
  return (
    <WebSocketProvider config={webSocketConfig} enabled={isAuthenticated && !isLoading}>
      <MessagingProvider config={messagingConfig} authContext={authContext}>
        <ContractsProvider>
          {children}
          {/* Only show React Query devtools in development */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ContractsProvider>
      </MessagingProvider>
    </WebSocketProvider>
  );
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Create theme instance with light mode
  // TODO: Add theme switching capability later if needed
  const theme = React.useMemo(() => createClientTheme('light'), []);
  
  // Inject design tokens on mount
  React.useEffect(() => {
    injectDesignTokens();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ToastProvider>
            <ConfirmDialogProvider>
              <AccessibilityProvider>
                <AuthProvider>
                  <MessagingEnabledApp>
                    {children}
                  </MessagingEnabledApp>
                </AuthProvider>
              </AccessibilityProvider>
            </ConfirmDialogProvider>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};