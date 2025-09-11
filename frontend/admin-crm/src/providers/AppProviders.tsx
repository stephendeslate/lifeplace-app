// frontend/admin-crm/src/providers/AppProviders.tsx

import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { LayoutProvider } from '../contexts/LayoutContext';
import { ConfirmDialogProvider } from '../components/common/ConfirmDialog';

// Messaging system imports
import { WebSocketProvider } from '@shared/contexts/WebSocketContext';
import { MessagingProvider } from '@shared/providers/MessagingProvider';
import { setApiClient } from '@shared/apis/messaging.api';
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
        if ((error as { response?: { status?: number } })?.response?.status === 401 || (error as { response?: { status?: number } })?.response?.status === 403) {
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
  const { user, isAuthenticated } = useAuth();
  
  // WebSocket configuration for admin CRM
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
    userRole: 'ADMIN' as const,
    enableInternalNotes: true,
    enableBulkOperations: true,
    enableCannedResponses: true,
    enableFileUploads: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB for admin
    allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.txt', '.xlsx', '.pptx'],
    autoMarkAsRead: false, // Admins manually mark as read
    simplified: false,
    enableTypingIndicators: true,
    enableReadReceipts: true,
    typingTimeout: 3000,
    typingDebounceMs: 1000,
    enableRealTime: true,
    enableSearch: true,
    enableVirtualScrolling: true,
    messagesPerPage: 50,
    threadsPerPage: 20,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  };

  if (!isAuthenticated || !user) {
    // Don't initialize messaging for unauthenticated users
    return (
      <LayoutProvider>
        <ToastProvider>
          <ConfirmDialogProvider>
            {children}
            {/* Only show React Query devtools in development */}
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </ConfirmDialogProvider>
        </ToastProvider>
      </LayoutProvider>
    );
  }

  return (
    <WebSocketProvider config={webSocketConfig} enabled={isAuthenticated}>
      <MessagingProvider config={messagingConfig}>
        <LayoutProvider>
          <ToastProvider>
            <ConfirmDialogProvider>
              {children}
              {/* Only show React Query devtools in development */}
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </ConfirmDialogProvider>
          </ToastProvider>
        </LayoutProvider>
      </MessagingProvider>
    </WebSocketProvider>
  );
};

// Inner component that has access to our theme context
const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <MessagingEnabledApp>
            {children}
          </MessagingEnabledApp>
        </AuthProvider>
      </LocalizationProvider>
    </MuiThemeProvider>
  );
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApp>
          {children}
        </ThemedApp>
      </ThemeProvider>
    </QueryClientProvider>
  );
};