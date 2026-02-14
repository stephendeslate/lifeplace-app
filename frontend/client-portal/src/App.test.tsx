// frontend/client-portal/src/App.test.tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./App";

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
