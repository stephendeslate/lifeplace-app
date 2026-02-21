// frontend/admin-crm/src/test/utils/render.tsx

import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createTestQueryClient } from "./test-query-client";
import { ToastProvider } from "../../contexts/ToastContext";
import { AuthProvider } from "../../contexts/AuthContext";
import { LayoutProvider } from "../../contexts/LayoutContext";
import { ThemeProvider as AppThemeProvider } from "../../contexts/ThemeContext";
import { modernTheme } from "../../design-system/theme/modernTheme";

interface WrapperProps {
  children: React.ReactNode;
}

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route for MemoryRouter */
  initialEntries?: MemoryRouterProps["initialEntries"];
  /** Custom QueryClient instance */
  queryClient?: QueryClient;
  /** Whether to include AuthProvider (default: true) */
  withAuth?: boolean;
  /** Whether to include routing (default: true) */
  withRouter?: boolean;
}

/**
 * Creates a wrapper component with all providers needed for testing.
 * This matches the provider hierarchy in AppProviders.tsx
 */
export function createTestWrapper(options: CustomRenderOptions = {}) {
  const {
    queryClient = createTestQueryClient(),
    initialEntries = ["/"],
    withAuth = true,
    withRouter = true,
  } = options;

  return function TestWrapper({ children }: WrapperProps) {
    // Build the component tree from inside out
    let content = <>{children}</>;

    // Add LayoutProvider and ToastProvider
    content = (
      <LayoutProvider>
        <ToastProvider>{content}</ToastProvider>
      </LayoutProvider>
    );

    // Optionally add AuthProvider
    if (withAuth) {
      content = <AuthProvider>{content}</AuthProvider>;
    }

    // Add LocalizationProvider
    content = (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {content}
      </LocalizationProvider>
    );

    // Optionally add routing
    if (withRouter) {
      content = (
        <MemoryRouter initialEntries={initialEntries}>{content}</MemoryRouter>
      );
    }

    // Add theme (AppThemeProvider must wrap MUI ThemeProvider so useThemeColors works)
    content = (
      <AppThemeProvider>
        <ThemeProvider theme={modernTheme}>
          <CssBaseline />
          {content}
        </ThemeProvider>
      </AppThemeProvider>
    );

    // Add QueryClientProvider
    content = (
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    );

    return content;
  };
}

/**
 * Custom render function that wraps components with all required providers.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  return {
    ...render(ui, {
      wrapper: createTestWrapper({ ...options, queryClient }),
      ...renderOptions,
    }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
