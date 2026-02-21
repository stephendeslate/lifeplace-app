import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/utils/render";
import { Dashboard } from "./Dashboard";

describe("Dashboard", () => {
  it("renders without crashing", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 10000 },
    );
  });

  it("renders dashboard subtitle", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(
      () => {
        expect(
          screen.getByText(
            /here's your lifeplace business overview for today/i,
          ),
        ).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it("renders Refresh button", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /refresh/i }),
        ).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it("renders Tasks Summary section", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(
      () => {
        // TasksSummaryWidget should be rendered
        expect(
          screen.getByText(/pending tasks|tasks summary/i),
        ).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });
});
