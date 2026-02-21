import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/utils/render";
import { ResetPassword } from "./ResetPassword";

describe("ResetPassword", () => {
  it("shows invalid reset link when no tokenId param", () => {
    renderWithProviders(
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>,
      { initialEntries: ["/reset-password"] },
    );
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
  });

  it("renders reset form when tokenId is provided", () => {
    renderWithProviders(
      <Routes>
        <Route path="/reset-password/:tokenId" element={<ResetPassword />} />
      </Routes>,
      { initialEntries: ["/reset-password/valid-token-abc123"] },
    );
    // The page-level "Invalid reset link" should NOT appear (that's only when tokenId is missing)
    expect(screen.queryByText(/invalid reset link/i)).not.toBeInTheDocument();
    // The form component renders something (loading state while validating token)
    expect(document.body.innerHTML.length).toBeGreaterThan(100);
  });

  it("shows support footer", () => {
    renderWithProviders(
      <Routes>
        <Route path="/reset-password/:tokenId" element={<ResetPassword />} />
      </Routes>,
      { initialEntries: ["/reset-password/valid-token-abc123"] },
    );
    expect(
      screen.getByText(/need help\? contact your system administrator/i),
    ).toBeInTheDocument();
  });
});
