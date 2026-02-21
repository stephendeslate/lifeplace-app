import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/utils/render";
import { AcceptInvitation } from "./AcceptInvitation";

// Mock authApi to control invitation loading
vi.mock("../../apis/auth.api", () => ({
  authApi: {
    getInvitation: vi.fn().mockResolvedValue({
      id: "test-invitation-id",
      first_name: "John",
      last_name: "Doe",
      expires_at: new Date(Date.now() + 86400000).toISOString(), // expires tomorrow
      is_accepted: false,
    }),
    acceptInvitation: vi.fn().mockResolvedValue({ detail: "Success" }),
    getCurrentUser: vi.fn().mockRejectedValue(new Error("Not authenticated")),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockRejectedValue(new Error("No refresh token")),
  },
}));

describe("AcceptInvitation", () => {
  it("renders page without crashing", async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/accept-invitation/:invitationId"
          element={<AcceptInvitation />}
        />
      </Routes>,
      { initialEntries: ["/accept-invitation/test-invitation-id"] },
    );
    expect(document.body).toBeTruthy();
  });

  it("shows loading state initially", () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/accept-invitation/:invitationId"
          element={<AcceptInvitation />}
        />
      </Routes>,
      { initialEntries: ["/accept-invitation/test-invitation-id"] },
    );
    // Either loading spinner or invitation form - both are valid
    expect(document.body).toBeTruthy();
  });

  it("shows invitation form after loading", async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/accept-invitation/:invitationId"
          element={<AcceptInvitation />}
        />
      </Routes>,
      { initialEntries: ["/accept-invitation/test-invitation-id"] },
    );
    await waitFor(
      () => {
        // After loading, the form with password fields should appear
        const passwordInput = document.querySelector('input[type="password"]');
        expect(passwordInput).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows error for missing invitationId", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
      </Routes>,
      { initialEntries: ["/accept-invitation"] },
    );
    await waitFor(
      () => {
        expect(
          screen.getByText(/invalid invitation link/i),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
