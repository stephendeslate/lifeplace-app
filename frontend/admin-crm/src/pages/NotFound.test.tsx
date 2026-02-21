import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/utils/render";
import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("renders 404 heading", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders Page Not Found text", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });

  it("renders Go to Dashboard button", () => {
    renderWithProviders(<NotFound />);
    expect(
      screen.getByRole("button", { name: /go to dashboard/i }),
    ).toBeInTheDocument();
  });

  it("renders Go Back button", () => {
    renderWithProviders(<NotFound />);
    expect(
      screen.getByRole("button", { name: /go back/i }),
    ).toBeInTheDocument();
  });

  it("renders support message", () => {
    renderWithProviders(<NotFound />);
    expect(
      screen.getByText(/if you believe this is an error/i),
    ).toBeInTheDocument();
  });
});
