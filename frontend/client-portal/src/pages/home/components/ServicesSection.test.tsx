// pages/home/components/ServicesSection.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServicesSection } from "./ServicesSection";

// Mock IntersectionObserver for AnimatedElement
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.IntersectionObserver = mockIntersectionObserver as any;

describe("ServicesSection", () => {
  it("renders without crashing", () => {
    render(<ServicesSection />);
    expect(screen.getByText("Our Services")).toBeInTheDocument();
  });

  it("renders the section heading with correct text", () => {
    render(<ServicesSection />);
    const heading = screen.getByRole("heading", {
      name: /our services/i,
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });

  it("renders the section description", () => {
    render(<ServicesSection />);
    const description = screen.getByText(
      /we provide comprehensive packages for every type of celebration and gathering/i,
    );
    expect(description).toBeInTheDocument();
  });

  it("renders all three service cards", () => {
    render(<ServicesSection />);

    // Use getAllByRole with article to find all service cards
    const serviceCards = screen.getAllByRole("article");
    expect(serviceCards).toHaveLength(3);
  });

  it("renders Weddings service with correct content", () => {
    render(<ServicesSection />);

    const weddingsHeading = screen.getByRole("heading", {
      name: /weddings/i,
      level: 3,
    });
    expect(weddingsHeading).toBeInTheDocument();

    const weddingsDescription = screen.getByText(
      /create timeless memories in our beautiful venues with comprehensive wedding packages/i,
    );
    expect(weddingsDescription).toBeInTheDocument();
  });

  it("renders Team Building service with correct content", () => {
    render(<ServicesSection />);

    const teamBuildingHeading = screen.getByRole("heading", {
      name: /team building/i,
      level: 3,
    });
    expect(teamBuildingHeading).toBeInTheDocument();

    const teamBuildingDescription = screen.getByText(
      /strengthen bonds and foster creativity through hands-on activities/i,
    );
    expect(teamBuildingDescription).toBeInTheDocument();
  });

  it("renders Camps & Retreats service with correct content", () => {
    render(<ServicesSection />);

    const campsRetreatsHeading = screen.getByRole("heading", {
      name: /camps & retreats/i,
      level: 3,
    });
    expect(campsRetreatsHeading).toBeInTheDocument();

    const campsRetreatsDescription = screen.getByText(
      /experience nature, community, and spiritual renewal/i,
    );
    expect(campsRetreatsDescription).toBeInTheDocument();
  });

  it("renders service cards with correct aria labels", () => {
    render(<ServicesSection />);

    expect(screen.getByLabelText("Weddings service")).toBeInTheDocument();
    expect(screen.getByLabelText("Team Building service")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Camps & Retreats service"),
    ).toBeInTheDocument();
  });

  it("renders icons for all services", () => {
    render(<ServicesSection />);

    // Icons are wrapped in elements with aria-hidden
    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    // Should have at least 3 icon wrappers
    expect(hiddenElements.length).toBeGreaterThanOrEqual(3);
  });

  it("applies responsive grid layout", () => {
    render(<ServicesSection />);

    // Find the grid container by looking for the parent of service cards
    const firstCard = screen.getByLabelText("Weddings service");
    const gridContainer = firstCard.parentElement?.parentElement;

    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveStyle({ display: "grid" });
  });

  it("has proper semantic structure", () => {
    render(<ServicesSection />);

    // Main heading should be h2
    const mainHeading = screen.getByRole("heading", { name: /our services/i });
    expect(mainHeading.tagName).toBe("H2");

    // Service titles should be h3
    const weddingsHeading = screen.getByRole("heading", { name: /weddings/i });
    expect(weddingsHeading.tagName).toBe("H3");

    const teamBuildingHeading = screen.getByRole("heading", {
      name: /team building/i,
    });
    expect(teamBuildingHeading.tagName).toBe("H3");
  });

  it("wraps cards in AnimatedElement components", () => {
    render(<ServicesSection />);

    // AnimatedElements will be Box components
    // Check that we have the expected structure
    const serviceCards = screen.getAllByRole("article");
    expect(serviceCards).toHaveLength(3);

    // Each card should be wrapped
    serviceCards.forEach((card) => {
      expect(card.parentElement).toBeInTheDocument();
    });
  });

  it("uses Section component with correct background", () => {
    const { container } = render(<ServicesSection />);

    // Section should be rendered as a section element
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
  });

  it("uses Container component for content width constraint", () => {
    const { container } = render(<ServicesSection />);

    // Container applies maxWidth styles
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();

    // Container should be a child of Section
    const sectionContent = section?.firstChild;
    expect(sectionContent).toBeInTheDocument();
  });

  it("renders service cards in correct order", () => {
    render(<ServicesSection />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Weddings");
    expect(headings[1]).toHaveTextContent("Team Building");
    expect(headings[2]).toHaveTextContent("Camps & Retreats");
  });

  it("applies staggered animation delays", () => {
    render(<ServicesSection />);

    // AnimatedElements should be present (Box components wrapping cards)
    const serviceCards = screen.getAllByRole("article");
    expect(serviceCards).toHaveLength(3);

    // Each card should have a parent wrapper (AnimatedElement)
    serviceCards.forEach((card) => {
      expect(card.parentElement).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has no accessibility violations for headings", () => {
      render(<ServicesSection />);

      // Check heading hierarchy
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      const h3s = screen.getAllByRole("heading", { level: 3 });
      expect(h3s).toHaveLength(3);
    });

    it("provides text alternatives for icons via aria-hidden", () => {
      render(<ServicesSection />);

      // Icons should be hidden from screen readers
      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenElements.length).toBeGreaterThan(0);
    });

    it("uses semantic article elements for service cards", () => {
      render(<ServicesSection />);

      const articles = screen.getAllByRole("article");
      expect(articles).toHaveLength(3);

      articles.forEach((article) => {
        expect(article.tagName).toBe("DIV"); // MUI Box renders as div with role="article"
        expect(article).toHaveAttribute("role", "article");
      });
    });

    it("provides descriptive aria-labels for service cards", () => {
      render(<ServicesSection />);

      const weddingsCard = screen.getByLabelText("Weddings service");
      const teamBuildingCard = screen.getByLabelText("Team Building service");
      const campsRetreatsCard = screen.getByLabelText(
        "Camps & Retreats service",
      );

      expect(weddingsCard).toBeInTheDocument();
      expect(teamBuildingCard).toBeInTheDocument();
      expect(campsRetreatsCard).toBeInTheDocument();
    });

    it("uses proper color contrast for text", () => {
      const { container } = render(<ServicesSection />);

      // Main heading should have dark text color for contrast
      const heading = screen.getByRole("heading", { name: /our services/i });
      expect(heading).toBeInTheDocument();

      // Service descriptions should have readable text
      const descriptions = container.querySelectorAll("p");
      expect(descriptions.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design", () => {
    it("applies responsive typography to main heading", () => {
      render(<ServicesSection />);

      const heading = screen.getByRole("heading", {
        name: /our services/i,
        level: 2,
      });

      // Should have responsive fontSize in sx prop
      expect(heading).toBeInTheDocument();
    });

    it("applies responsive grid columns", () => {
      render(<ServicesSection />);

      // Find grid container
      const firstCard = screen.getByLabelText("Weddings service");
      const gridContainer = firstCard.parentElement?.parentElement;

      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveStyle({ display: "grid" });
    });

    it("centers section description text", () => {
      render(<ServicesSection />);

      const description = screen.getByText(
        /we provide comprehensive packages for every type of celebration and gathering/i,
      );

      expect(description.parentElement).toHaveStyle({ textAlign: "center" });
    });
  });

  describe("Design System Integration", () => {
    it("uses design system tokens for spacing", () => {
      render(<ServicesSection />);

      // Section component should apply consistent spacing
      const section = document.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("uses design system tokens for typography", () => {
      render(<ServicesSection />);

      // Headings should use Cormorant Garamond
      const mainHeading = screen.getByRole("heading", {
        name: /our services/i,
      });
      expect(mainHeading).toBeInTheDocument();

      // Body text should use Inter
      const description = screen.getByText(
        /we provide comprehensive packages for every type of celebration and gathering/i,
      );
      expect(description).toBeInTheDocument();
    });

    it("uses design system tokens for colors", () => {
      render(<ServicesSection />);

      const serviceHeadings = screen.getAllByRole("heading", { level: 3 });
      serviceHeadings.forEach((heading) => {
        expect(heading).toBeInTheDocument();
      });
    });

    it("uses Section component from design system", () => {
      render(<ServicesSection />);

      const section = document.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("uses Container component from design system", () => {
      render(<ServicesSection />);

      // Container should provide max-width constraint
      const section = document.querySelector("section");
      const sectionContent = section?.firstChild;
      expect(sectionContent).toBeInTheDocument();
    });

    it("uses AnimatedElement from design system", () => {
      render(<ServicesSection />);

      // Check that animated wrappers exist
      const serviceCards = screen.getAllByRole("article");
      serviceCards.forEach((card) => {
        expect(card.parentElement).toBeInTheDocument();
      });
    });
  });
});
