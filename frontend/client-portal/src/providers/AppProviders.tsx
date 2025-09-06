// frontend/client-portal/src/providers/AppProviders.tsx

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import theme from '../utils/theme';
import { AuthProvider } from '../contexts/AuthContext';
import { ContractsProvider } from '../contexts/ContractsContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmDialogProvider } from '../components/common/ConfirmDialog';
import { AccessibilityProvider } from '../components/accessibility/AccessibilityProvider';

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
    },
    mutations: {
      retry: false,
    },
  },
});

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ToastProvider>
            <ConfirmDialogProvider>
              <AccessibilityProvider>
                <AuthProvider>
                  <ContractsProvider>
                    {children}
                    {/* Only show React Query devtools in development */}
                    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
                  </ContractsProvider>
                </AuthProvider>
              </AccessibilityProvider>
            </ConfirmDialogProvider>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};