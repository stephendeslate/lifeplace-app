// frontend/client-portal/src/providers/AppProviders.tsx

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorHandler } from '../utils/errorHandler';

// WIP: Shared design system integration temporarily disabled for deployment
// import { injectDesignTokens } from '@shared/design-system';
import { theme as clientPortalTheme } from '../utils/theme';
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
        if (ErrorHandler.isAuthError(error) || ErrorHandler.isPermissionError(error)) {
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

// Core app wrapper
const CoreApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ContractsProvider>
      {children}
      {/* Only show React Query devtools in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </ContractsProvider>
  );
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Use client-portal's custom nature-inspired green theme
  const theme = React.useMemo(() => clientPortalTheme, []);

  // WIP: Inject design tokens on mount - temporarily disabled
  // React.useEffect(() => {
  //   injectDesignTokens();
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ToastProvider>
            <ConfirmDialogProvider>
              <AccessibilityProvider>
                <AuthProvider>
                  <CoreApp>{children}</CoreApp>
                </AuthProvider>
              </AccessibilityProvider>
            </ConfirmDialogProvider>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
