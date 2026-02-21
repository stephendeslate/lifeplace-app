import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/utils/render";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

describe("AnalyticsDashboard", () => {
  it("renders without crashing", async () => {
    renderWithProviders(<AnalyticsDashboard />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("renders Analytics heading", async () => {
    renderWithProviders(<AnalyticsDashboard />);
    await waitFor(
      () => {
        expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("renders tab navigation", async () => {
    renderWithProviders(<AnalyticsDashboard />);
    await waitFor(
      () => {
        const tabs = document.querySelector('[role="tablist"]');
        expect(tabs).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("renders Analytics tab options", async () => {
    renderWithProviders(<AnalyticsDashboard />);
    await waitFor(
      () => {
        // Should have multiple tabs for different analytics sections
        const tabs = document.querySelectorAll('[role="tab"]');
        expect(tabs.length).toBeGreaterThan(1);
      },
      { timeout: 5000 },
    );
  });
});
