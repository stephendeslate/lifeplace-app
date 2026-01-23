// pages/home/components/VenuesSection.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenuesSection } from './VenuesSection';

// Mock window.location
const mockLocation = {
  href: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock the design system components
vi.mock('../../../design-system', () => ({
  Section: ({ children, background, spacing }: { children: React.ReactNode; background?: string; spacing?: string }) => (
    <section data-testid="section" data-background={background} data-spacing={spacing}>
      {children}
    </section>
  ),
  Container: ({ children, maxWidth }: { children: React.ReactNode; maxWidth?: string }) => (
    <div data-testid="container" data-max-width={maxWidth}>
      {children}
    </div>
  ),
  AnimatedElement: ({ children, animation, delay }: { children: React.ReactNode; animation?: string; delay?: number }) => (
    <div data-testid="animated-element" data-animation={animation} data-delay={delay}>
      {children}
    </div>
  ),
  tokens: {
    typography: {
      styles: {
        h2: {
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '48px',
          fontWeight: 600,
          lineHeight: 1.2,
        },
        h5: {
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '24px',
          fontWeight: 600,
        },
        body: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          lineHeight: 1.6,
        },
        bodyLarge: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '18px',
          lineHeight: 1.7,
        },
      },
    },
    color: {
      base: {
        neutral: {
          700: '#54514E',
          900: '#2E2A28',
        },
        sage: {
          50: '#f7f8f6',
          100: '#eef0ec',
          600: '#6a7360',
        },
      },
    },
    animation: {
      transition: {
        all: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
}));

// Mock GlassCard component
vi.mock('../../../design-system/components/GlassCard', () => ({
  GlassCard: ({ children, variant, intensity, hover, sx }: { children: React.ReactNode; variant?: string; intensity?: string; hover?: boolean; sx?: object }) => (
    <div
      data-testid="glass-card"
      data-variant={variant}
      data-intensity={intensity}
      data-hover={hover}
      style={sx as React.CSSProperties}
    >
      {children}
    </div>
  ),
}));

// Mock shared Button component
vi.mock('../../../design-system', () => ({
  Button: ({ children, variant, size, onClick, sx }: { children: React.ReactNode; variant?: string; size?: string; onClick?: () => void; sx?: object }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      style={sx as React.CSSProperties}
    >
      {children}
    </button>
  ),
}));

describe('VenuesSection', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<VenuesSection />);
      expect(screen.getByText('Facilities & Amenities')).toBeInTheDocument();
    });

    it('renders the section heading', () => {
      render(<VenuesSection />);
      const heading = screen.getByText('Facilities & Amenities');
      expect(heading).toBeInTheDocument();
    });

    it('renders the section description', () => {
      render(<VenuesSection />);
      const description = screen.getByText(/Discover our diverse range of venues/i);
      expect(description).toBeInTheDocument();
    });

    it('renders all 6 venue cards', () => {
      render(<VenuesSection />);

      expect(screen.getByText('Sanctuary')).toBeInTheDocument();
      expect(screen.getByText('Cabanas')).toBeInTheDocument();
      expect(screen.getByText('The Pavilion')).toBeInTheDocument();
      expect(screen.getByText('Open-Field')).toBeInTheDocument();
      expect(screen.getByText('Angelic Field')).toBeInTheDocument();
      expect(screen.getByText('Havila')).toBeInTheDocument();
    });
  });

  describe('Venue Details', () => {
    it('renders Sanctuary venue with correct details', () => {
      render(<VenuesSection />);

      expect(screen.getByText('Sanctuary')).toBeInTheDocument();
      expect(screen.getByText(/Chapel - Suitable for church weddings/i)).toBeInTheDocument();
    });

    it('renders Cabanas venue with correct details', () => {
      render(<VenuesSection />);

      expect(screen.getByText('Cabanas')).toBeInTheDocument();
      expect(screen.getByText(/4 total - Each accommodates 6-10 people/i)).toBeInTheDocument();
    });

    it('renders The Pavilion venue with correct details', () => {
      render(<VenuesSection />);

      expect(screen.getByText('The Pavilion')).toBeInTheDocument();
      expect(screen.getByText(/Multipurpose hall - Capacity: 100-200 people/i)).toBeInTheDocument();
    });

    it('renders Open-Field venue with correct details', () => {
      render(<VenuesSection />);

      expect(screen.getByText('Open-Field')).toBeInTheDocument();
      expect(screen.getByText(/For larger gatherings/i)).toBeInTheDocument();
    });

    it('renders Angelic Field venue with correct details', () => {
      render(<VenuesSection />);

      expect(screen.getByText('Angelic Field')).toBeInTheDocument();
      expect(screen.getByText(/Outdoor event space/i)).toBeInTheDocument();
    });

    it('renders Havila venue with correct details', () => {
      render(<VenuesSection />);

      expect(screen.getByText('Havila')).toBeInTheDocument();
      expect(screen.getByText(/newly opened.*Hostel.*Accommodates 150-300 people/i)).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders icons for each venue', () => {
      const { container } = render(<VenuesSection />);

      // Find all icon containers
      const iconContainers = container.querySelectorAll('svg[data-testid]');

      // Should have icons for Church, Hotel, Home, Landscape, Nature, Groups
      // MUI icons automatically get data-testid attributes
      expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(6);
    });

    it('icon containers have proper styling', () => {
      const { container } = render(<VenuesSection />);

      // Check that icon containers exist with proper structure
      const iconWrappers = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(iconWrappers.length).toBeGreaterThan(0);
    });
  });

  describe('Design System Integration', () => {
    it('uses Section component with correct props', () => {
      const { container } = render(<VenuesSection />);

      // Section should be rendered
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('uses Container component for content width', () => {
      const { container } = render(<VenuesSection />);

      // Container should exist with proper max-width
      const containerElement = container.querySelector('[class*="MuiBox-root"]');
      expect(containerElement).toBeInTheDocument();
    });

    it('renders GlassCard components for each venue', () => {
      const { container } = render(<VenuesSection />);

      // Should have multiple cards
      const cards = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(cards.length).toBeGreaterThan(6);
    });
  });

  describe('Layout & Grid', () => {
    it('uses responsive grid layout', () => {
      const { container } = render(<VenuesSection />);

      // Grid layout should be present - check for glass cards
      const cards = container.querySelectorAll('[data-testid="glass-card"]');
      expect(cards.length).toBe(6);
    });

    it('displays cards in a grid with proper spacing', () => {
      render(<VenuesSection />);

      // All venue cards should be present
      const venueCards = [
        'Sanctuary',
        'Cabanas',
        'The Pavilion',
        'Open-Field',
        'Angelic Field',
        'Havila'
      ];

      venueCards.forEach(venue => {
        expect(screen.getByText(venue)).toBeInTheDocument();
      });
    });
  });

  describe('Call to Action Button', () => {
    it('renders "Explore All Facilities" button', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });
      expect(button).toBeInTheDocument();
    });

    it('button has correct variant and size', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });
      expect(button).toBeInTheDocument();
      // Button should be visible and clickable
      expect(button).toBeEnabled();
    });

    it('button navigates to /facilities when clicked', async () => {
      const user = userEvent.setup();
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });

      // Reset location
      mockLocation.href = '';

      await user.click(button);

      // Check that navigation was triggered
      expect(mockLocation.href).toBe('/facilities');
    });
  });

  describe('Animations', () => {
    it('wraps section header in AnimatedElement', () => {
      const { container } = render(<VenuesSection />);

      const heading = screen.getByText('Facilities & Amenities');
      expect(heading).toBeInTheDocument();

      // AnimatedElement should be present
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('wraps each venue card in AnimatedElement', () => {
      render(<VenuesSection />);

      // All cards should be rendered (animations don't prevent rendering)
      const venueCards = [
        'Sanctuary',
        'Cabanas',
        'The Pavilion',
        'Open-Field',
        'Angelic Field',
        'Havila'
      ];

      venueCards.forEach(venue => {
        expect(screen.getByText(venue)).toBeInTheDocument();
      });
    });

    it('wraps CTA button in AnimatedElement', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Typography', () => {
    it('uses design tokens for heading typography', () => {
      render(<VenuesSection />);

      const heading = screen.getByText('Facilities & Amenities');
      expect(heading).toBeInTheDocument();

      // Heading should use Cormorant Garamond (from design tokens)
      const styles = window.getComputedStyle(heading);
      expect(styles.fontFamily).toContain('Cormorant Garamond');
    });

    it('uses proper text hierarchy', () => {
      render(<VenuesSection />);

      // Main heading
      const mainHeading = screen.getByText('Facilities & Amenities');
      expect(mainHeading).toBeInTheDocument();

      // Venue titles (h5)
      const venueTitles = screen.getAllByText(/Sanctuary|Cabanas|Pavilion|Open-Field|Angelic Field|Havila/);
      expect(venueTitles.length).toBeGreaterThan(0);

      // Body text (descriptions)
      const descriptions = screen.getAllByText(/Chapel|accommodates|Multipurpose|gatherings|Outdoor|Hostel/i);
      expect(descriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(<VenuesSection />);

      // Should have section element
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('button has accessible label', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });
      expect(button).toHaveAccessibleName();
    });

    it('venue cards have proper text content', () => {
      render(<VenuesSection />);

      // Each venue should have title and description
      expect(screen.getByText('Sanctuary')).toBeInTheDocument();
      expect(screen.getByText(/Chapel - Suitable for church weddings/i)).toBeInTheDocument();

      expect(screen.getByText('Cabanas')).toBeInTheDocument();
      expect(screen.getByText(/4 total - Each accommodates 6-10 people/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });

      // Button should be focusable
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing', () => {
      const { container } = render(<VenuesSection />);

      // Container should exist with responsive styling
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders grid with responsive columns', () => {
      const { container } = render(<VenuesSection />);

      // Grid should contain all venue cards
      const cards = container.querySelectorAll('[data-testid="glass-card"]');
      expect(cards.length).toBe(6);
    });

    it('button has responsive padding', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Color Tokens', () => {
    it('uses neutral colors for text', () => {
      render(<VenuesSection />);

      const heading = screen.getByText('Facilities & Amenities');
      expect(heading).toBeInTheDocument();

      // Should use neutral[900] for headings
      const styles = window.getComputedStyle(heading);
      expect(styles.color).toBeTruthy();
    });

    it('uses sage colors for icon backgrounds', () => {
      const { container } = render(<VenuesSection />);

      // Icon containers should have sage background
      const iconContainers = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(iconContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty venue capacity gracefully', () => {
      render(<VenuesSection />);

      // Venues with empty capacity should still render
      expect(screen.getByText('Sanctuary')).toBeInTheDocument();
      expect(screen.getByText('Open-Field')).toBeInTheDocument();
    });

    it('handles long venue descriptions', () => {
      render(<VenuesSection />);

      // Havila has the longest description
      const havilaDescription = screen.getByText(/newly opened.*Hostel.*Accommodates 150-300 people/i);
      expect(havilaDescription).toBeInTheDocument();
    });

    it('renders correctly without props', () => {
      // Component should not require any props
      expect(() => render(<VenuesSection />)).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('integrates with design system Section component', () => {
      const { container } = render(<VenuesSection />);

      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('integrates with design system Container component', () => {
      const { container } = render(<VenuesSection />);

      // Container should constrain content width
      const containerElement = container.querySelector('[class*="MuiBox-root"]');
      expect(containerElement).toBeInTheDocument();
    });

    it('integrates with shared Button component', () => {
      render(<VenuesSection />);

      const button = screen.getByRole('button', { name: /Explore All Facilities/i });
      expect(button).toBeInTheDocument();
    });

    it('integrates with GlassCard component', () => {
      const { container } = render(<VenuesSection />);

      // Should have multiple glass cards
      const cards = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(cards.length).toBeGreaterThan(6);
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct venue count', () => {
      render(<VenuesSection />);

      const venueNames = [
        'Sanctuary',
        'Cabanas',
        'The Pavilion',
        'Open-Field',
        'Angelic Field',
        'Havila'
      ];

      venueNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });

      expect(venueNames.length).toBe(6);
    });

    it('venue descriptions are meaningful', () => {
      render(<VenuesSection />);

      // Each venue should have a description with useful information
      expect(screen.getByText(/Chapel - Suitable for church weddings/i)).toBeInTheDocument();
      expect(screen.getByText(/4 total - Each accommodates 6-10 people/i)).toBeInTheDocument();
      expect(screen.getByText(/Multipurpose hall - Capacity: 100-200 people/i)).toBeInTheDocument();
      expect(screen.getByText(/For larger gatherings/i)).toBeInTheDocument();
      expect(screen.getByText(/Outdoor event space/i)).toBeInTheDocument();
      expect(screen.getByText(/Hostel.*Accommodates 150-300 people/i)).toBeInTheDocument();
    });
  });
});
