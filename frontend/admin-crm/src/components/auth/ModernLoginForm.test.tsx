import { describe, it, expect } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { ThemeProvider as AppThemeProvider } from "../../contexts/ThemeContext";
import { LayoutProvider } from "../../contexts/LayoutContext";
import { ToastProvider } from "../../contexts/ToastContext";
import { AuthProvider } from "../../contexts/AuthContext";
import { MemoryRouter } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { modernTheme } from "../../design-system/theme/modernTheme";
import { ModernLoginForm } from "./ModernLoginForm";

// ModernLoginForm uses useTheme from custom ThemeContext, so we need AppThemeProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <MuiThemeProvider theme={modernTheme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <MemoryRouter>
                <AuthProvider>
                  <LayoutProvider>
                    <ToastProvider>{children}</ToastProvider>
                  </LayoutProvider>
                </AuthProvider>
              </MemoryRouter>
            </LocalizationProvider>
          </MuiThemeProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    );
  };
}

function renderForm(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("ModernLoginForm", () => {
  it("renders email and password input fields", () => {
    renderForm(<ModernLoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("submit button is in the document", () => {
    renderForm(<ModernLoginForm />);
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows email validation error when submitted with empty email", async () => {
    renderForm(<ModernLoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("shows password validation error when submitted with empty password", async () => {
    renderForm(<ModernLoginForm />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("shows invalid email error when email format is wrong", async () => {
    renderForm(<ModernLoginForm />);
    // Use fireEvent.submit directly on the form to bypass HTML5 email validation in jsdom
    const emailInput = screen.getByLabelText(/email address/i);
    // Change to invalid email
    fireEvent.change(emailInput, { target: { value: "not-a-valid-email" } });
    // Submit the form directly
    const form = emailInput.closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address"),
      ).toBeInTheDocument();
    });
  });

  it("shows password length error when password is less than 3 characters", async () => {
    renderForm(<ModernLoginForm />);
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "ab" },
    });
    const form = emailInput.closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 3 characters"),
      ).toBeInTheDocument();
    });
  });

  it("clears field error when user starts typing in that field", async () => {
    renderForm(<ModernLoginForm />);
    // Trigger validation errors via button click
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
    // Start typing in email field
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "a" },
    });
    await waitFor(() => {
      expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
    });
  });

  it("renders remember me checkbox", () => {
    renderForm(<ModernLoginForm />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderForm(<ModernLoginForm />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });
});
