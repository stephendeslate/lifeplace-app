import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/utils/render";
import SupportPage from "./SupportPage";

describe("SupportPage", () => {
  it("renders without crashing", async () => {
    renderWithProviders(<SupportPage />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("renders support inquiries list", async () => {
    renderWithProviders(<SupportPage />);
    await waitFor(
      () => {
        // Support Inquiries heading or Open Inquiries stat card
        const supportContent =
          screen.queryByText(/support inquiries/i) ||
          screen.queryByText(/open inquiries/i);
        expect(supportContent).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("renders search or filter controls", async () => {
    renderWithProviders(<SupportPage />);
    await waitFor(
      () => {
        const searchOrFilter =
          screen.queryByPlaceholderText(/search/i) ||
          document.querySelector('input[type="text"]') ||
          document.querySelector("select");
        expect(searchOrFilter).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
