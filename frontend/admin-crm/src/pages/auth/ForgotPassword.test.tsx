import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/utils/render";
import { ForgotPassword } from "./ForgotPassword";

describe("ForgotPassword", () => {
  it("renders without crashing", () => {
    renderWithProviders(<ForgotPassword />);
    expect(document.body).toBeTruthy();
  });

  it("shows support contact message", () => {
    renderWithProviders(<ForgotPassword />);
    expect(
      screen.getByText(/need help\? contact your system administrator/i),
    ).toBeInTheDocument();
  });

  it("renders email input field", async () => {
    renderWithProviders(<ForgotPassword />);
    await waitFor(
      () => {
        const emailInput =
          screen.queryByLabelText(/email/i) ||
          screen.queryByPlaceholderText(/email/i) ||
          document.querySelector('input[type="email"]');
        expect(emailInput).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
