// frontend/admin-crm/src/providers/AppProviders.tsx

import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { LayoutProvider } from '../contexts/LayoutContext';
import { ConfirmDialogProvider } from '../components/common/ConfirmDialog';


interface AppProvidersProps {
  children: React.ReactNode;
}

// Create QueryClient with default options
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
    },
    mutations: {
      retry: false,
    },
  },
});

// App wrapper with core providers
const CoreApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
};

// Inner component that has access to our theme context
const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <CoreApp>
            {children}
          </CoreApp>
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