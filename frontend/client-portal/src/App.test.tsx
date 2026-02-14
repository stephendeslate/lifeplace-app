// frontend/client-portal/src/App.test.tsx
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./App";

// Mock auth context — AppRouter calls useAuth()
vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
  }),
}));

// Mock toast context — AppRouter calls useToastActions()
vi.mock("./contexts/ToastContext", () => ({
  useToastActions: () => ({
    showInfo: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

describe("App Component", () => {
  it("should render without crashing", () => {
    render(
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>,
    );
    expect(document.body).toBeTruthy();
  });
});
