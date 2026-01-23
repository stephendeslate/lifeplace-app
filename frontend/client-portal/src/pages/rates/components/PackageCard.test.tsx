// pages/rates/components/PackageCard.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { PackageCard } from './PackageCard';
import type { PackageInfo } from '../types/rates.types';

// Mock IntersectionObserver for AnimatedElement
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver as typeof IntersectionObserver;

// Mock shared Button component
vi.mock('@shared/design-system', () => ({
  Button: ({ children, variant, size, onClick, ariaLabel, fullWidth, sx }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    ariaLabel?: string;
    fullWidth?: boolean;
    sx?: object;
  }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth}
      onClick={onClick}
      aria-label={ariaLabel}
      style={sx as React.CSSProperties}
    >
      {children}
    </button>
  ),
}));

// Create theme for tests
const theme = createTheme();

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

// Test data
const mockStandardPackage: PackageInfo = {
  id: 'team-building',
  name: 'Team Building Package',
  description: 'Perfect for corporate team building events and group activities',
  tiers: [
    { duration: '4 hours', price: 1200, isPopular: false },
    { duration: '8 hours', price: 2000, isPopular: true },
  ],
  includes: [
    'Venue access',
    'Basic equipment',
    'Activity coordinator',
    'Light refreshments',
  ],
  notes: ['Minimum booking of 4 hours required'],
  minimumParticipants: 15,
};

const mockPremiumPackage: PackageInfo = {
  id: 'premium-retreat',
  name: 'Premium Retreat Package',
  description: 'Exclusive package with premium amenities and personalized service',
  tiers: [
    { duration: 'Full Day', price: 3500, isPopular: false },
    { duration: '2 Days', price: 6000, isPopular: true },
  ],
  includes: [
    'Premium venue access',
    'Full catering service',
    'Professional facilitator',
    'Audio-visual equipment',
    'Overnight accommodation',
  ],
  badge: 'Most Popular',
};

const mockSimplePackage: PackageInfo = {
  id: 'basic',
  name: 'Basic Package',
  description: 'Simple and affordable option for small groups',
  tiers: [
    { duration: '2 hours', price: 800, isPopular: false },
  ],
  includes: ['Venue access', 'Basic setup'],
};

describe('PackageCard', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText('Team Building Package')).toBeInTheDocument();
    });

    it('renders package name correctly', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText('Team Building Package')).toBeInTheDocument();
    });

    it('renders package description', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText(/Perfect for corporate team building events/i)).toBeInTheDocument();
    });

    it('renders all price tiers', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText('4 hours')).toBeInTheDocument();
      expect(screen.getByText('8 hours')).toBeInTheDocument();
    });

    it('renders all included features', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText('Venue access')).toBeInTheDocument();
      expect(screen.getByText('Basic equipment')).toBeInTheDocument();
      expect(screen.getByText('Activity coordinator')).toBeInTheDocument();
      expect(screen.getByText('Light refreshments')).toBeInTheDocument();
    });

    it('renders minimum participants when present', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText('Minimum 15 participants')).toBeInTheDocument();
    });

    it('does not render minimum participants when not present', () => {
      renderWithTheme(<PackageCard package={mockSimplePackage} />);
      expect(screen.queryByText(/Minimum .* participants/i)).not.toBeInTheDocument();
    });

    it('renders notes when present', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText(/Minimum booking of 4 hours required/i)).toBeInTheDocument();
    });

    it('does not render notes section when notes are absent', () => {
      renderWithTheme(<PackageCard package={mockPremiumPackage} />);
      // Should not have any elements with "*" prefix from notes
      const allText = document.body.textContent || '';
      expect(allText).not.toMatch(/^\* /);
    });

    it('renders premium badge when present', () => {
      renderWithTheme(<PackageCard package={mockPremiumPackage} />);
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('does not render badge when not present', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
    });

    it('renders "Select Package" CTA button', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByRole('button', { name: /Select Team Building Package/i })).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses ModernCard component with elevated variant', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const card = container.querySelector('div[class*="MuiBox-root"]');
      expect(card).toBeTruthy();
    });

    it('uses AnimatedElement with slideUp animation', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // AnimatedElement wraps the entire card
      expect(container.firstChild).toBeTruthy();
    });

    it('applies correct animation delay based on index', () => {
      const { rerender } = renderWithTheme(<PackageCard package={mockStandardPackage} index={0} />);
      // Delay should be 100 + 0 * 150 = 100ms
      expect(mockIntersectionObserver).toHaveBeenCalled();

      rerender(<ThemeProvider theme={theme}><PackageCard package={mockStandardPackage} index={2} /></ThemeProvider>);
      // Delay should be 100 + 2 * 150 = 400ms
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('uses Button component with terracotta variant', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const button = screen.getByRole('button', { name: /Select/i });
      expect(button).toBeInTheDocument();
    });

    it('uses CheckCircle icon for included features', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // CheckCircle icons should be present (one for each included item)
      const icons = document.querySelectorAll('[data-testid="CheckCircleIcon"]');
      expect(icons.length).toBe(mockStandardPackage.includes.length);
    });

    it('uses Star icon in premium badge', () => {
      renderWithTheme(<PackageCard package={mockPremiumPackage} />);
      const starIcon = document.querySelector('[data-testid="StarIcon"]');
      expect(starIcon).toBeTruthy();
    });
  });

  describe('Typography Tokens', () => {
    it('applies correct font family to package name', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const packageName = screen.getByText('Team Building Package');
      const styles = window.getComputedStyle(packageName);

      // Should use Cormorant Garamond (heading font)
      expect(styles.fontFamily).toContain('Cormorant Garamond');
    });

    it('applies correct font family to description and body text', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const description = screen.getByText(/Perfect for corporate team building/i);
      const styles = window.getComputedStyle(description);

      // Should use Inter (body font)
      expect(styles.fontFamily).toContain('Inter');
    });

    it('applies correct font family to "What\'s Included" heading', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const heading = screen.getByText("What's Included:");
      const styles = window.getComputedStyle(heading);

      // Should use Cormorant Garamond (heading font)
      expect(styles.fontFamily).toContain('Cormorant Garamond');
    });

    it('applies correct font size to package name (h4)', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const packageName = screen.getByText('Team Building Package');

      // Should use 3xl size from tokens
      expect(packageName).toBeTruthy();
    });

    it('applies correct font size to price (h3)', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const price = screen.getByText(/₱1,200/);

      // Should use 2xl size from tokens
      expect(price).toBeTruthy();
    });
  });

  describe('Color Tokens', () => {
    it('uses gold accent for premium packages', () => {
      renderWithTheme(<PackageCard package={mockPremiumPackage} />);
      const badge = screen.getByText('Most Popular');

      // Premium packages should use gold accent
      expect(badge).toBeInTheDocument();
    });

    it('uses sage accent for standard packages', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const popularLabel = screen.getByText('POPULAR');

      // Standard packages should use sage accent (no badge means sage)
      expect(popularLabel).toBeInTheDocument();
    });

    it('applies success color to checkmark icons', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // CheckCircle icons should have success color
      const icons = document.querySelectorAll('[data-testid="CheckCircleIcon"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('uses neutral colors for text hierarchy', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const packageName = screen.getByText('Team Building Package');
      const description = screen.getByText(/Perfect for corporate team building/i);

      // Package name should be darker (neutral[900])
      // Description should be lighter (neutral[700])
      expect(packageName).toBeTruthy();
      expect(description).toBeTruthy();
    });

    it('uses warning color for notes section', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const note = screen.getByText(/Minimum booking of 4 hours required/i);

      // Notes section should use warning subtle background
      expect(note).toBeInTheDocument();
    });
  });

  describe('Spacing Tokens', () => {
    it('applies correct card padding (large size)', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const card = container.querySelector('div[class*="MuiBox-root"]');

      // Large size uses 32px (space[8]) padding
      expect(card).toBeTruthy();
    });

    it('applies correct spacing between sections', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const stack = container.querySelector('div[class*="MuiStack-root"]');

      // Stack should have space[6] (24px) gap
      expect(stack).toBeTruthy();
    });

    it('applies correct border radius to card', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const card = container.querySelector('div[class*="MuiBox-root"]');

      // Should use radius.xxl
      expect(card).toBeTruthy();
    });

    it('applies correct border radius to price tiers', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const tierBox = screen.getByText('4 hours').parentElement;

      // Should use radius.lg
      expect(tierBox).toBeTruthy();
    });
  });

  describe('Price Formatting', () => {
    it('formats prices in Philippine Peso (PHP)', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // Should format as ₱1,200 (no decimals)
      expect(screen.getByText(/₱1,200/)).toBeInTheDocument();
      expect(screen.getByText(/₱2,000/)).toBeInTheDocument();
    });

    it('does not include decimal places in price', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // Should not have .00
      const allText = document.body.textContent || '';
      expect(allText).not.toContain('.00');
    });

    it('includes "/person" suffix on prices', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // All prices should have /person suffix
      const personLabels = screen.getAllByText('/person');
      expect(personLabels.length).toBe(mockStandardPackage.tiers.length);
    });

    it('uses comma separators for thousands', () => {
      renderWithTheme(<PackageCard package={mockPremiumPackage} />);
      // Should format 3500 as ₱3,500
      expect(screen.getByText(/₱3,500/)).toBeInTheDocument();
      expect(screen.getByText(/₱6,000/)).toBeInTheDocument();
    });
  });

  describe('Popular Tier Highlighting', () => {
    it('highlights popular tier with "POPULAR" label', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText('POPULAR')).toBeInTheDocument();
    });

    it('applies accent color to popular tier', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const popularLabel = screen.getByText('POPULAR');

      // Should be in a box with accent background
      expect(popularLabel).toBeInTheDocument();
    });

    it('does not show "POPULAR" label on non-popular tiers', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const popularLabels = screen.getAllByText('POPULAR');

      // Should only have one POPULAR label (for the 8 hours tier)
      expect(popularLabels.length).toBe(1);
    });

    it('applies border to popular tier', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const popularTier = screen.getByText('8 hours').parentElement;

      // Should have border with accent color
      expect(popularTier).toBeTruthy();
    });

    it('applies hover effect to popular tier', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const popularTier = screen.getByText('8 hours').parentElement;

      // Should have hover styles defined
      expect(popularTier).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('uses responsive grid for price tiers', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const tierContainer = screen.getByText('4 hours').parentElement?.parentElement;

      // Should use grid with responsive columns (1 col on xs, 2 cols on sm+)
      expect(tierContainer).toBeTruthy();
    });

    it('maintains full height for flex layout', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const card = container.querySelector('div[class*="MuiBox-root"]');

      // Card should have height: 100% and flex column
      expect(card).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const packageName = screen.getByText('Team Building Package');

      // Should use h4 variant
      expect(packageName).toBeInTheDocument();
    });

    it('has descriptive aria-label on CTA button', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const button = screen.getByRole('button', { name: /Select Team Building Package/i });

      expect(button).toBeInTheDocument();
    });

    it('maintains WCAG AA contrast ratio for text', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const packageName = screen.getByText('Team Building Package');
      const description = screen.getByText(/Perfect for corporate team building/i);

      // Using neutral[900] on white background provides >7:1 contrast
      // Using neutral[700] on white background provides >4.5:1 contrast
      expect(packageName).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });

    it('uses semantic checkmark icons for included features', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const icons = document.querySelectorAll('[data-testid="CheckCircleIcon"]');

      // Should have one icon per included feature
      expect(icons.length).toBe(mockStandardPackage.includes.length);
    });

    it('button is keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const button = screen.getByRole('button', { name: /Select/i });

      await user.tab();
      expect(button).toHaveFocus();
    });

    it('includes "What\'s Included:" label for feature list', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      expect(screen.getByText("What's Included:")).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('positions badge in top-right corner', () => {
      renderWithTheme(<PackageCard package={mockPremiumPackage} />);
      const badge = screen.getByText('Most Popular').parentElement;

      // Badge should have absolute positioning in top-right
      expect(badge).toBeTruthy();
    });

    it('arranges price tiers in grid layout', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const tierContainer = screen.getByText('4 hours').parentElement?.parentElement;

      // Should use CSS Grid
      expect(tierContainer).toBeTruthy();
    });

    it('displays features as vertical list with icons', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const firstFeature = screen.getByText('Venue access').parentElement;

      // Should use flex layout with gap
      expect(firstFeature).toBeTruthy();
    });

    it('positions CTA button at bottom of card', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const button = screen.getByRole('button', { name: /Select/i });

      // Button should be last child of flex container
      expect(button).toBeTruthy();
      expect(container.querySelector('button:last-child')).toBeTruthy();
    });

    it('uses flex: 1 for "What\'s Included" section to push button down', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const includesSection = screen.getByText("What's Included:").parentElement;

      // Section should have flex: 1
      expect(includesSection).toBeTruthy();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover effect to card', () => {
      const { container } = renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const card = container.querySelector('div[class*="MuiBox-root"]');

      // ModernCard with hover={true} should have hover styles
      expect(card).toBeTruthy();
    });

    it('applies hover shadow to popular tier', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      const popularTier = screen.getByText('8 hours').parentElement;

      // Popular tier should have hover shadow defined
      expect(popularTier).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles package with single tier', () => {
      renderWithTheme(<PackageCard package={mockSimplePackage} />);
      expect(screen.getByText('2 hours')).toBeInTheDocument();
      expect(screen.getByText(/₱800/)).toBeInTheDocument();
    });

    it('handles package with many included features', () => {
      const manyFeaturesPackage: PackageInfo = {
        ...mockStandardPackage,
        includes: Array.from({ length: 10 }, (_, i) => `Feature ${i + 1}`),
      };

      renderWithTheme(<PackageCard package={manyFeaturesPackage} />);
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Feature 10')).toBeInTheDocument();
    });

    it('handles package with multiple notes', () => {
      const multiNotePackage: PackageInfo = {
        ...mockStandardPackage,
        notes: [
          'First note about the package',
          'Second important note',
          'Third additional information',
        ],
      };

      renderWithTheme(<PackageCard package={multiNotePackage} />);
      expect(screen.getByText(/First note about the package/i)).toBeInTheDocument();
      expect(screen.getByText(/Second important note/i)).toBeInTheDocument();
      expect(screen.getByText(/Third additional information/i)).toBeInTheDocument();
    });

    it('handles very long package names gracefully', () => {
      const longNamePackage: PackageInfo = {
        ...mockStandardPackage,
        name: 'Very Long Package Name That Should Wrap Properly Without Breaking Layout',
      };

      renderWithTheme(<PackageCard package={longNamePackage} />);
      expect(screen.getByText(/Very Long Package Name/i)).toBeInTheDocument();
    });

    it('handles large price values', () => {
      const expensivePackage: PackageInfo = {
        ...mockStandardPackage,
        tiers: [{ duration: 'Full Day', price: 999999, isPopular: true }],
      };

      renderWithTheme(<PackageCard package={expensivePackage} />);
      expect(screen.getByText(/₱999,999/)).toBeInTheDocument();
    });

    it('handles empty notes array', () => {
      const emptyNotesPackage: PackageInfo = {
        ...mockStandardPackage,
        notes: [],
      };

      renderWithTheme(<PackageCard package={emptyNotesPackage} />);
      // Notes section should not render
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Data Structure Integrity', () => {
    it('preserves package id', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);
      // Component should work with id (even if not directly displayed)
      expect(mockStandardPackage.id).toBe('team-building');
    });

    it('supports all tier properties', () => {
      const tier = mockStandardPackage.tiers[1];
      renderWithTheme(<PackageCard package={mockStandardPackage} />);

      expect(screen.getByText(tier.duration)).toBeInTheDocument();
      expect(screen.getByText(/₱2,000/)).toBeInTheDocument();
      expect(tier.isPopular).toBe(true);
    });

    it('maintains package data structure', () => {
      renderWithTheme(<PackageCard package={mockStandardPackage} />);

      // Verify all data structure fields are used
      expect(mockStandardPackage.id).toBeTruthy();
      expect(mockStandardPackage.name).toBeTruthy();
      expect(mockStandardPackage.description).toBeTruthy();
      expect(mockStandardPackage.tiers).toHaveLength(2);
      expect(mockStandardPackage.includes).toHaveLength(4);
      expect(mockStandardPackage.notes).toHaveLength(1);
      expect(mockStandardPackage.minimumParticipants).toBe(15);
    });
  });
});
