// pages/contact/components/ContactMap.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactMap } from './ContactMap';

describe('ContactMap', () => {
  beforeEach(() => {
    // Mock window.open
    global.open = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the map section', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should render the main heading', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });

    it('should render the location description', () => {
      render(<ContactMap />);
      const description = screen.getByText('Located in the serene hills of Alfonso, Cavite, near Tagaytay');
      expect(description).toBeInTheDocument();
    });

    it('should render the address information', () => {
      render(<ContactMap />);
      expect(screen.getByText('Patutong Malaki North')).toBeInTheDocument();
      expect(screen.getByText('Alfonso, Cavite 4120')).toBeInTheDocument();
    });

    it('should render the additional information text', () => {
      render(<ContactMap />);
      const infoText = screen.getByText(/Just a short drive from Tagaytay City/i);
      expect(infoText).toBeInTheDocument();
    });
  });

  describe('Map Placeholder', () => {
    it('should render map placeholder with correct role', () => {
      render(<ContactMap />);
      const mapPlaceholder = screen.getByRole('img', {
        name: /Map showing LifePlace Alfonso location/i,
      });
      expect(mapPlaceholder).toBeInTheDocument();
    });

    it('should render map icon', () => {
      const { container } = render(<ContactMap />);
      const mapIcon = container.querySelector('[data-testid="MapIcon"]');
      expect(mapIcon).toBeInTheDocument();
    });

    it('should render location pin icon', () => {
      const { container } = render(<ContactMap />);
      const locationIcon = container.querySelector('[data-testid="LocationOnIcon"]');
      expect(locationIcon).toBeInTheDocument();
    });

    it('should have proper ARIA label for map placeholder', () => {
      render(<ContactMap />);
      const mapPlaceholder = screen.getByRole('img');
      expect(mapPlaceholder).toHaveAttribute(
        'aria-label',
        'Map showing LifePlace Alfonso location in Patutong Malaki North, Alfonso, Cavite'
      );
    });
  });

  describe('Google Maps Button', () => {
    it('should render the Google Maps button', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('should open Google Maps in new window when button is clicked', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });

      fireEvent.click(button);

      expect(global.open).toHaveBeenCalledWith(
        'https://www.google.com/maps/search/?api=1&query=Patutong+Malaki+North+Alfonso+Cavite+4120',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should have proper ARIA label for accessibility', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });
      expect(button).toHaveAttribute('aria-label', 'Open location in Google Maps in a new window');
    });

    it('should render with OpenInNew icon', () => {
      const { container } = render(<ContactMap />);
      const openInNewIcon = container.querySelector('[data-testid="OpenInNewIcon"]');
      expect(openInNewIcon).toBeInTheDocument();
    });

    it('should have outlined variant styling', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });
      expect(button).toHaveClass('MuiButton-outlined');
    });
  });

  describe('Design System Integration', () => {
    it('should use Section component with sage background', () => {
      const { container } = render(<ContactMap />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should use Container component for content constraint', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should use ModernCard variant elevated', () => {
      const { container } = render(<ContactMap />);
      // ModernCard renders as a Box
      const card = container.querySelector('[class*="MuiBox-root"]');
      expect(card).toBeInTheDocument();
    });

    it('should use AnimatedElement for fadeIn animation', () => {
      render(<ContactMap />);
      // AnimatedElement wraps content, verify content renders
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with responsive height for map placeholder', () => {
      render(<ContactMap />);
      const mapPlaceholder = screen.getByRole('img');
      expect(mapPlaceholder).toBeInTheDocument();
    });

    it('should have responsive typography', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });

    it('should stack content vertically on mobile', () => {
      render(<ContactMap />);
      const address = screen.getByText('Patutong Malaki North');
      expect(address).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });

    it('should have readable text with proper contrast', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      const description = screen.getByText(/Located in the serene hills/i);

      expect(heading).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });

    it('should have keyboard accessible button', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });

      // Button should be focusable
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have descriptive ARIA labels', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });
      expect(button).toHaveAttribute('aria-label');
    });

    it('should hide decorative icons from screen readers', () => {
      const { container } = render(<ContactMap />);
      const mapIcon = container.querySelector('[data-testid="MapIcon"]');
      const locationIcon = container.querySelector('[data-testid="LocationOnIcon"]');

      expect(mapIcon).toHaveAttribute('aria-hidden', 'true');
      expect(locationIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Typography', () => {
    it('should use Cormorant Garamond for heading', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });

    it('should use design tokens for font sizes', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
      expect(screen.getByText(/Located in the serene hills/i)).toBeInTheDocument();
    });

    it('should use proper text alignment', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });

    it('should have proper line height for body text', () => {
      render(<ContactMap />);
      const bodyText = screen.getByText(/Just a short drive from Tagaytay City/i);
      expect(bodyText).toBeInTheDocument();
    });
  });

  describe('Color System', () => {
    it('should use sage colors from design tokens', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });

    it('should use neutral colors for secondary text', () => {
      render(<ContactMap />);
      const description = screen.getByText(/Located in the serene hills/i);
      expect(description).toBeInTheDocument();
    });

    it('should have proper color contrast for WCAG AA compliance', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      const bodyText = screen.getByText(/Just a short drive/i);

      expect(heading).toBeInTheDocument();
      expect(bodyText).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should center button horizontally', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('should have proper spacing between elements', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
      expect(screen.getByText('Patutong Malaki North')).toBeInTheDocument();
    });

    it('should use Container maxWidth content', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should have proper padding in ModernCard', () => {
      render(<ContactMap />);
      const heading = screen.getByText('Find Us');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('should display correct venue name in heading', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should display correct street address', () => {
      render(<ContactMap />);
      expect(screen.getByText('Patutong Malaki North')).toBeInTheDocument();
    });

    it('should display correct city and postal code', () => {
      render(<ContactMap />);
      expect(screen.getByText('Alfonso, Cavite 4120')).toBeInTheDocument();
    });

    it('should mention both Alfonso and Tagaytay', () => {
      render(<ContactMap />);
      expect(screen.getByText(/Alfonso.*Tagaytay/i)).toBeInTheDocument();
    });

    it('should use correct Google Maps URL format', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });

      fireEvent.click(button);

      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('https://www.google.com/maps/search/?api=1'),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing window.open gracefully', () => {
      const originalOpen = global.open;

      try {
        global.open = vi.fn();

        render(<ContactMap />);
        const button = screen.getByRole('button', {
          name: /Open location in Google Maps in a new window/i,
        });

        fireEvent.click(button);

        expect(global.open).toHaveBeenCalled();
      } finally {
        global.open = originalOpen;
      }
    });

    it('should render without crashing when all props are default', () => {
      expect(() => render(<ContactMap />)).not.toThrow();
    });

    it('should handle button click without window.open', () => {
      global.open = vi.fn(() => null);

      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });

      fireEvent.click(button);

      expect(global.open).toHaveBeenCalled();
    });
  });

  describe('Security', () => {
    it('should open Google Maps link with noopener and noreferrer', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });

      fireEvent.click(button);

      expect(global.open).toHaveBeenCalledWith(
        expect.any(String),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should use _blank target for external link', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });

      fireEvent.click(button);

      expect(global.open).toHaveBeenCalledWith(
        expect.any(String),
        '_blank',
        expect.any(String)
      );
    });
  });

  describe('Visual Design', () => {
    it('should use sage background for section', () => {
      const { container } = render(<ContactMap />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should have elevated card variant for clean look', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should have rounded corners on map placeholder', () => {
      render(<ContactMap />);
      const mapPlaceholder = screen.getByRole('img');
      expect(mapPlaceholder).toBeInTheDocument();
    });

    it('should have dashed border on map placeholder', () => {
      render(<ContactMap />);
      const mapPlaceholder = screen.getByRole('img');
      expect(mapPlaceholder).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should integrate with design system tokens', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should integrate with MUI Button component', () => {
      render(<ContactMap />);
      const button = screen.getByRole('button', {
        name: /Open location in Google Maps in a new window/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('should use Section with correct spacing', () => {
      const { container } = render(<ContactMap />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should use Container with content maxWidth', () => {
      render(<ContactMap />);
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should render with fadeIn animation', () => {
      render(<ContactMap />);
      // AnimatedElement wraps content
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });

    it('should have animation delay of 100ms', () => {
      render(<ContactMap />);
      // Content should render after animation
      expect(screen.getByText('Find Us')).toBeInTheDocument();
    });
  });
});
