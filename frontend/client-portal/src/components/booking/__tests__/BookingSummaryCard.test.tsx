// frontend/client-portal/src/components/booking/__tests__/BookingSummaryCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { BookingSummaryCard } from '../shared/BookingSummaryCard';
import type { PackageLineItem, AddonLineItem, PricingBreakdown, EventSummary } from '../../../types/booking';

const theme = createTheme();

// Mock currency hook
vi.mock('../../../hooks/useCurrency', () => ({
  useCurrencySettings: () => ({
    formatAmount: (amount: string | number) => `₱${parseFloat(String(amount)).toLocaleString()}`,
  }),
}));

// Wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock data
const mockEvent: EventSummary = {
  eventType: 'Wedding',
  date: 'June 15, 2025',
  time: '2:00 PM',
  venue: 'Grand Ballroom',
};

const mockPackages: PackageLineItem[] = [
  {
    product_id: 1,
    name: 'Premium Package',
    quantity: 1,
    unit_price: '50000',
    line_total: '50000',
    base_price: '50000',
  },
];

const mockAddons: AddonLineItem[] = [
  {
    product_id: 10,
    name: 'Photo Booth',
    quantity: 1,
    unit_price: '5000',
    line_total: '5000',
  },
];

const mockPricing: PricingBreakdown = {
  subtotal: '55000',
  formattedSubtotal: '₱55,000',
  tax: '6600',
  formattedTax: '₱6,600',
  discount: '0',
  formattedDiscount: '₱0',
  total: '61600',
  formattedTotal: '₱61,600',
};

describe('BookingSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders booking summary title in confirmation mode', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
            displayMode="confirmation"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Booking Summary')).toBeInTheDocument();
    });

    it('renders review title in review mode', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
            displayMode="review"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
    });
  });

  describe('Event Details', () => {
    it('renders event details when provided', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            event={mockEvent}
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Event Details')).toBeInTheDocument();
      expect(screen.getByText('Wedding')).toBeInTheDocument();
      expect(screen.getByText('June 15, 2025')).toBeInTheDocument();
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    it('renders time with informational note', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            event={mockEvent}
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('2:00 PM (Informational)')).toBeInTheDocument();
    });

    it('does not render event section when not provided', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Event Details')).not.toBeInTheDocument();
    });

    it('handles partial event data', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            event={{ date: 'June 15, 2025' }}
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('June 15, 2025')).toBeInTheDocument();
      expect(screen.queryByText('Venue:')).not.toBeInTheDocument();
    });
  });

  describe('Packages Section', () => {
    it('renders packages table with correct headers', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={[]}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Selected Packages')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Unit Price')).toBeInTheDocument();
      expect(screen.getAllByText('Total')[0]).toBeInTheDocument();
    });

    it('renders package details', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={[]}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Premium Package')).toBeInTheDocument();
    });

    it('hides packages section when showPackageBreakdown is false', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={[]}
            pricing={mockPricing}
            showPackageBreakdown={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Selected Packages')).not.toBeInTheDocument();
    });

    it('handles packages with venue excess hours', () => {
      const packagesWithVenueDetails: PackageLineItem[] = [
        {
          product_id: 1,
          name: 'Premium Package',
          quantity: 1,
          unit_price: '55000',
          line_total: '55000',
          base_price: '50000',
          venue_details: [
            {
              venue_id: 1,
              venue_name: 'Main Hall',
              additional_hours: 2,
              excess_hour_price: '2500',
            },
          ],
        },
      ];

      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={packagesWithVenueDetails}
            addons={[]}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Premium Package')).toBeInTheDocument();
    });

    it('handles packages with legacy excess hours', () => {
      const packagesWithExcess: PackageLineItem[] = [
        {
          product_id: 1,
          name: 'Premium Package',
          quantity: 1,
          unit_price: '55000',
          line_total: '55000',
          base_price: '50000',
          excess_hours: 2,
          excess_hour_price: '2500',
          excess_cost: '5000',
        },
      ];

      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={packagesWithExcess}
            addons={[]}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Premium Package')).toBeInTheDocument();
    });
  });

  describe('Add-ons Section', () => {
    it('renders add-ons table', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={[]}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Selected Add-ons')).toBeInTheDocument();
      expect(screen.getByText('Photo Booth')).toBeInTheDocument();
    });

    it('hides add-ons section when showAddonBreakdown is false', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={[]}
            addons={mockAddons}
            pricing={mockPricing}
            showAddonBreakdown={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Selected Add-ons')).not.toBeInTheDocument();
    });

    it('renders multiple add-ons', () => {
      const multipleAddons: AddonLineItem[] = [
        { product_id: 10, name: 'Photo Booth', quantity: 1, unit_price: '5000', line_total: '5000' },
        { product_id: 11, name: 'DJ Services', quantity: 1, unit_price: '8000', line_total: '8000' },
      ];

      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={[]}
            addons={multipleAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Photo Booth')).toBeInTheDocument();
      expect(screen.getByText('DJ Services')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no packages or add-ons', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={[]}
            addons={[]}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('No packages or add-ons selected')).toBeInTheDocument();
    });
  });

  describe('Pricing Summary', () => {
    it('renders pricing breakdown', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.getByText('₱55,000')).toBeInTheDocument();
    });

    it('renders tax when present', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Tax:')).toBeInTheDocument();
      expect(screen.getByText('₱6,600')).toBeInTheDocument();
    });

    it('renders total amount', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Total:')).toBeInTheDocument();
      expect(screen.getByText('₱61,600')).toBeInTheDocument();
    });

    it('renders discount when present', () => {
      const pricingWithDiscount: PricingBreakdown = {
        ...mockPricing,
        discount: '5000',
        formattedDiscount: '₱5,000',
        discountDetails: { code: 'SAVE10', description: '10% off' },
      };

      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={pricingWithDiscount}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/Discount/)).toBeInTheDocument();
      expect(screen.getByText(/-₱5,000/)).toBeInTheDocument();
    });

    it('shows discount code when available', () => {
      const pricingWithDiscount: PricingBreakdown = {
        ...mockPricing,
        discount: '5000',
        formattedDiscount: '₱5,000',
        discountDetails: { code: 'SAVE10' },
      };

      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={pricingWithDiscount}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/SAVE10/)).toBeInTheDocument();
    });

    it('hides pricing breakdown when showPricingBreakdown is false', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
            showPricingBreakdown={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Subtotal:')).not.toBeInTheDocument();
    });

    it('hides pricing when no items', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={[]}
            addons={[]}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Subtotal:')).not.toBeInTheDocument();
    });

    it('hides tax when zero', () => {
      const pricingNoTax: PricingBreakdown = {
        ...mockPricing,
        tax: '0',
        formattedTax: '₱0',
      };

      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={pricingNoTax}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Tax:')).not.toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('uses confirmation as default display mode', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Booking Summary')).toBeInTheDocument();
    });

    it('shows all breakdowns by default', () => {
      render(
        <TestWrapper>
          <BookingSummaryCard
            packages={mockPackages}
            addons={mockAddons}
            pricing={mockPricing}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Selected Packages')).toBeInTheDocument();
      expect(screen.getByText('Selected Add-ons')).toBeInTheDocument();
      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    });
  });
});
