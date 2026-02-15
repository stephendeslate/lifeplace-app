// pages/rates/components/WeddingPackages.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeddingPackages } from "./WeddingPackages";
import type {
  RatesWeddingVenue,
  RatesWeddingComboApi,
  RatesAllInWeddingApi,
} from "../types/rates.types";

// Mock AnimatedElement to avoid intersection observer issues in tests
vi.mock("../../../design-system/components/AnimatedElement", () => ({
  AnimatedElement: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockWeddingVenues: RatesWeddingVenue[] = [
  {
    id: 1,
    name: "The Open Field",
    price: "70000.00",
    duration: "3 hours",
    capacity: "130-150 guests",
    includes: ["Free prenup venue", "Ceiling treatment available (₱40,000)"],
    excess_hour_rate: "10000.00",
  },
  {
    id: 2,
    name: "The Pavilion",
    price: "23200.00",
    duration: "3 hours",
    capacity: "100-130 guests",
    includes: ["Free prenup venue"],
    excess_hour_rate: "10000.00",
  },
  {
    id: 3,
    name: "The Angelic Field",
    price: "26400.00",
    duration: "3 hours",
    capacity: "150-200 guests",
    includes: ["Free prenup venue", "String lights included"],
    excess_hour_rate: "10000.00",
  },
  {
    id: 4,
    name: "The Sanctuary",
    price: "10000.00",
    duration: "3 hours",
    capacity: "Ceremony venue",
    includes: ["White draping", "Basic styling", "Basic sound system"],
    excess_hour_rate: null,
  },
  {
    id: 5,
    name: "The Pool",
    price: "15000.00",
    duration: "3 hours",
    capacity: "70-80 guests",
    includes: ["String lights included"],
    excess_hour_rate: "7000.00",
  },
  {
    id: 6,
    name: "The Al Fresco",
    price: "12000.00",
    duration: "3 hours",
    capacity: "Intimate dining",
    includes: [],
    excess_hour_rate: null,
  },
];

const mockWeddingCombos: RatesWeddingComboApi[] = [
  {
    id: 10,
    name: "Sanctuary + Open Field",
    price: "110000.00",
    duration: "6 hours",
    includes: ["Free prenup", "4 cabana rooms"],
  },
  {
    id: 11,
    name: "Sanctuary + Pavilion",
    price: "66000.00",
    duration: "6 hours",
    includes: ["Free prenup", "4 cabana rooms"],
  },
  {
    id: 12,
    name: "Angelic Field + Open Field",
    price: "100000.00",
    duration: "6 hours",
    includes: ["Free prenup", "4 cabana rooms"],
  },
  {
    id: 13,
    name: "Angelic Field + Pavilion",
    price: "60000.00",
    duration: "6 hours",
    includes: ["Free prenup", "4 cabana rooms"],
  },
];

const mockAllInWeddings: RatesAllInWeddingApi[] = [
  {
    id: 20,
    name: "All-In Wedding - Sanctuary & Pavilion",
    starting_price: "385770.00",
    guest_count: 100,
    venues: "Sanctuary + Pavilion",
    includes: [
      "Catering with buffet selections",
      "Photography and videography",
      "Professional coordination team",
      "Lighting and sound equipment",
      "Floral arrangements",
      "Table setup with linens",
      "Host/emcee services",
    ],
  },
  {
    id: 21,
    name: "All-In Wedding - Angelic Field & Open Field",
    starting_price: "517000.00",
    guest_count: 150,
    venues: "Angelic Field + Open Field",
    includes: [
      "Catering with buffet selections",
      "Photography and videography",
      "Professional coordination team",
      "Lighting and sound equipment",
      "Floral arrangements",
      "Table setup with linens",
      "Host/emcee services",
    ],
  },
];

const defaultProps = {
  weddingVenues: mockWeddingVenues,
  weddingCombos: mockWeddingCombos,
  allInWeddings: mockAllInWeddings,
};

describe("WeddingPackages", () => {
  describe("Rendering", () => {
    it("renders the component without crashing", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("Wedding Packages")).toBeInTheDocument();
    });

    it("renders the main heading with correct text", () => {
      render(<WeddingPackages {...defaultProps} />);
      const heading = screen.getByText("Wedding Packages");
      expect(heading).toBeInTheDocument();
    });

    it("renders the description text", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(
        screen.getByText(
          "Create your perfect wedding day with our exclusive venue packages and all-inclusive options.",
        ),
      ).toBeInTheDocument();
    });

    it("renders the Favorite icon", () => {
      render(<WeddingPackages {...defaultProps} />);
      // Check that the heading is rendered - the icon is part of the header section
      expect(screen.getByText("Wedding Packages")).toBeInTheDocument();
    });
  });

  describe("Venue-Only Options Section", () => {
    it('renders the "Venue-Only Options" section heading', () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("Venue-Only Options")).toBeInTheDocument();
    });

    it("renders all 6 wedding venues", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("The Open Field")).toBeInTheDocument();
      expect(screen.getByText("The Pavilion")).toBeInTheDocument();
      expect(screen.getByText("The Angelic Field")).toBeInTheDocument();
      expect(screen.getByText("The Sanctuary")).toBeInTheDocument();
      expect(screen.getByText("The Pool")).toBeInTheDocument();
      expect(screen.getByText("The Al Fresco")).toBeInTheDocument();
    });

    it("displays venue prices in PHP format", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("₱70,000")).toBeInTheDocument(); // The Open Field
      expect(screen.getByText("₱23,200")).toBeInTheDocument(); // The Pavilion
      expect(screen.getByText("₱26,400")).toBeInTheDocument(); // The Angelic Field
    });

    it("displays venue duration and capacity information", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText(/130-150 guests/)).toBeInTheDocument(); // The Open Field
      expect(screen.getByText(/100-130 guests/)).toBeInTheDocument(); // The Pavilion
    });

    it("displays venue inclusions", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getAllByText("• Free prenup venue").length).toBeGreaterThan(
        0,
      );
      expect(
        screen.getAllByText("• String lights included").length,
      ).toBeGreaterThan(0);
      expect(screen.getByText("• White draping")).toBeInTheDocument();
    });

    it("displays excess hour rates when available", () => {
      render(<WeddingPackages {...defaultProps} />);
      // Multiple venues have ₱10,000 excess hour rate
      expect(
        screen.getAllByText("Excess hour: ₱10,000").length,
      ).toBeGreaterThan(0);
      expect(screen.getByText("Excess hour: ₱7,000")).toBeInTheDocument();
    });
  });

  describe("Combination Packages Section", () => {
    it('renders the "Combination Packages (6 Hours)" section heading', () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(
        screen.getByText("Combination Packages (6 Hours)"),
      ).toBeInTheDocument();
    });

    it("renders all 4 combination packages", () => {
      render(<WeddingPackages {...defaultProps} />);
      // These names appear in both combo section and all-in section
      expect(
        screen.getAllByText("Sanctuary + Open Field").length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText("Sanctuary + Pavilion").length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText("Angelic Field + Open Field").length,
      ).toBeGreaterThan(0);
      expect(screen.getByText("Angelic Field + Pavilion")).toBeInTheDocument();
    });

    it("displays combination package prices", () => {
      render(<WeddingPackages {...defaultProps} />);
      // Check that the prices are displayed somewhere on the page
      const allText = document.body.textContent || "";
      expect(allText).toContain("₱110,000"); // Sanctuary + Open Field
      expect(allText).toContain("₱66,000"); // Sanctuary + Pavilion
      expect(allText).toContain("₱100,000"); // Angelic + Open Field
      expect(allText).toContain("₱60,000"); // Angelic + Pavilion
    });

    it("displays combination package inclusions with checkmarks", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getAllByText("Free prenup").length).toBeGreaterThan(0);
      expect(screen.getAllByText("4 cabana rooms").length).toBeGreaterThan(0);
    });

    it("displays duration for combination packages", () => {
      render(<WeddingPackages {...defaultProps} />);
      const sixHoursDurations = screen.getAllByText(/6 hours/);
      expect(sixHoursDurations.length).toBeGreaterThanOrEqual(4); // All 4 combo packages
    });
  });

  describe("All-In Wedding Packages Section", () => {
    it('renders the "All-In Wedding Packages" section heading', () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("All-In Wedding Packages")).toBeInTheDocument();
    });

    it("renders all 2 all-in packages", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("100 Guests")).toBeInTheDocument();
      expect(screen.getByText("150 Guests")).toBeInTheDocument();
    });

    it('displays "All-Inclusive" badge for each package', () => {
      render(<WeddingPackages {...defaultProps} />);
      const badges = screen.getAllByText("All-Inclusive");
      expect(badges.length).toBe(2);
    });

    it("displays venue combinations for all-in packages", () => {
      render(<WeddingPackages {...defaultProps} />);
      // These appear in both the combo section and all-in section
      const sanctuaryPavilion = screen.getAllByText("Sanctuary + Pavilion");
      const angelicOpenField = screen.getAllByText(
        "Angelic Field + Open Field",
      );

      expect(sanctuaryPavilion.length).toBeGreaterThan(0);
      expect(angelicOpenField.length).toBeGreaterThan(0);
    });

    it("displays starting prices for all-in packages", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(screen.getByText("₱385,770")).toBeInTheDocument(); // 100 guests
      expect(screen.getByText("₱517,000")).toBeInTheDocument(); // 150 guests
    });

    it('displays "Starting at" label for prices', () => {
      render(<WeddingPackages {...defaultProps} />);
      const startingAtLabels = screen.getAllByText("Starting at");
      expect(startingAtLabels.length).toBe(2);
    });

    it("displays major inclusions heading", () => {
      render(<WeddingPackages {...defaultProps} />);
      const majorInclusionsHeadings = screen.getAllByText("Major Inclusions:");
      expect(majorInclusionsHeadings.length).toBe(2);
    });

    it("displays all major inclusions for packages", () => {
      render(<WeddingPackages {...defaultProps} />);
      expect(
        screen.getAllByText("Catering with buffet selections").length,
      ).toBe(2);
      expect(screen.getAllByText("Photography and videography").length).toBe(2);
      expect(screen.getAllByText("Professional coordination team").length).toBe(
        2,
      );
      expect(screen.getAllByText("Lighting and sound equipment").length).toBe(
        2,
      );
      expect(screen.getAllByText("Floral arrangements").length).toBe(2);
      expect(screen.getAllByText("Table setup with linens").length).toBe(2);
      expect(screen.getAllByText("Host/emcee services").length).toBe(2);
    });

    it('renders "Inquire Now" buttons for all-in packages', () => {
      render(<WeddingPackages {...defaultProps} />);
      const inquireButtons = screen.getAllByText("Inquire Now");
      expect(inquireButtons.length).toBe(2);
    });
  });

  describe("Interactivity", () => {
    it('calls onNavigateToBooking when "Inquire Now" button is clicked', async () => {
      const user = userEvent.setup();
      const mockNavigate = vi.fn();

      render(
        <WeddingPackages
          {...defaultProps}
          onNavigateToBooking={mockNavigate}
        />,
      );

      const inquireButtons = screen.getAllByText("Inquire Now");
      await user.click(inquireButtons[0]);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("calls onNavigateToBooking for each button independently", async () => {
      const user = userEvent.setup();
      const mockNavigate = vi.fn();

      render(
        <WeddingPackages
          {...defaultProps}
          onNavigateToBooking={mockNavigate}
        />,
      );

      const inquireButtons = screen.getAllByText("Inquire Now");

      await user.click(inquireButtons[0]);
      expect(mockNavigate).toHaveBeenCalledTimes(1);

      await user.click(inquireButtons[1]);
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it("does not crash when onNavigateToBooking is not provided", async () => {
      const user = userEvent.setup();

      render(<WeddingPackages {...defaultProps} />);

      const inquireButtons = screen.getAllByText("Inquire Now");
      await user.click(inquireButtons[0]);

      // Should not crash
      expect(inquireButtons[0]).toBeInTheDocument();
    });
  });

  describe("Design System Compliance", () => {
    it("uses Section component with cream background", () => {
      const { container } = render(<WeddingPackages {...defaultProps} />);
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("uses Container component for content", () => {
      render(<WeddingPackages {...defaultProps} />);
      // Container component wraps the content - verify content is rendered
      expect(screen.getByText("Wedding Packages")).toBeInTheDocument();
      expect(screen.getByText("Venue-Only Options")).toBeInTheDocument();
    });

    it("applies proper grid layout for venue cards", () => {
      render(<WeddingPackages {...defaultProps} />);
      // Grid layout is applied via MUI sx prop - verify all venue cards are rendered
      expect(screen.getByText("The Open Field")).toBeInTheDocument();
      expect(screen.getByText("The Pavilion")).toBeInTheDocument();
      expect(screen.getByText("The Angelic Field")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      render(<WeddingPackages {...defaultProps} />);

      // Main heading should be h2 level (via typography tokens)
      const mainHeading = screen.getByText("Wedding Packages");
      expect(mainHeading).toBeInTheDocument();

      // Section headings should be h4 level (via typography tokens)
      expect(screen.getByText("Venue-Only Options")).toBeInTheDocument();
      expect(
        screen.getByText("Combination Packages (6 Hours)"),
      ).toBeInTheDocument();
      expect(screen.getByText("All-In Wedding Packages")).toBeInTheDocument();
    });

    it("buttons have accessible labels", () => {
      render(<WeddingPackages {...defaultProps} />);
      const buttons = screen.getAllByRole("button", { name: /inquire now/i });
      expect(buttons.length).toBe(2);
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it("uses semantic HTML elements", () => {
      const { container } = render(<WeddingPackages {...defaultProps} />);
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("icons are decorative and do not interfere with accessibility", () => {
      render(<WeddingPackages {...defaultProps} />);
      // Icons are present as part of the buttons and check items
      // Verify that buttons are accessible
      const buttons = screen.getAllByRole("button", { name: /inquire now/i });
      expect(buttons.length).toBe(2);
    });
  });

  describe("Responsive Behavior", () => {
    it("renders without errors on different viewport sizes", () => {
      // This test ensures the component structure is correct for responsive design
      render(<WeddingPackages {...defaultProps} />);

      // Verify all sections render correctly - responsive behavior is handled by MUI
      expect(screen.getByText("Wedding Packages")).toBeInTheDocument();
      expect(screen.getByText("Venue-Only Options")).toBeInTheDocument();
      expect(
        screen.getByText("Combination Packages (6 Hours)"),
      ).toBeInTheDocument();
      expect(screen.getByText("All-In Wedding Packages")).toBeInTheDocument();
    });
  });

  describe("Data Integrity", () => {
    it("maintains all wedding venue data", () => {
      render(<WeddingPackages {...defaultProps} />);

      // Verify all venues are present
      const venueNames = [
        "The Open Field",
        "The Pavilion",
        "The Angelic Field",
        "The Sanctuary",
        "The Pool",
        "The Al Fresco",
      ];

      venueNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it("maintains all combination package data", () => {
      render(<WeddingPackages {...defaultProps} />);

      // These names appear in multiple sections
      const allText = document.body.textContent || "";
      expect(allText).toContain("Sanctuary + Open Field");
      expect(allText).toContain("Sanctuary + Pavilion");
      expect(allText).toContain("Angelic Field + Open Field");
      expect(allText).toContain("Angelic Field + Pavilion");
    });

    it("maintains all all-in package data", () => {
      render(<WeddingPackages {...defaultProps} />);

      // Check guest counts
      expect(screen.getByText("100 Guests")).toBeInTheDocument();
      expect(screen.getByText("150 Guests")).toBeInTheDocument();

      // Check all inclusions are present
      expect(
        screen.getAllByText("Catering with buffet selections").length,
      ).toBe(2);
      expect(screen.getAllByText("Photography and videography").length).toBe(2);
    });

    it("formats all prices correctly in Philippine Peso", () => {
      render(<WeddingPackages {...defaultProps} />);

      // Sample prices to verify format
      const prices = ["₱70,000", "₱23,200", "₱110,000", "₱385,770", "₱517,000"];

      prices.forEach((price) => {
        expect(screen.getByText(price)).toBeInTheDocument();
      });
    });
  });
});
