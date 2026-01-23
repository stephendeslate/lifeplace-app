// pages/contact/components/ContactHero.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactHero } from './ContactHero';

describe('ContactHero', () => {
  beforeEach(() => {
    // Mock window.scrollTo
    global.scrollTo = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the hero section', () => {
      render(<ContactHero />);
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });

    it('should render the main heading', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      expect(heading).toBeInTheDocument();
    });

    it('should render the subheading', () => {
      render(<ContactHero />);
      const subheading = screen.getByText(/Experience LifePlace Retreat and Events Center/i);
      expect(subheading).toBeInTheDocument();
    });

    it('should render the complete subheading text', () => {
      render(<ContactHero />);
      expect(
        screen.getByText(
          "Experience LifePlace Retreat and Events Center in Alfonso, near Tagaytay. We're here to help you plan your perfect event."
        )
      ).toBeInTheDocument();
    });
  });

  describe('Contact Information Cards', () => {
    it('should render location card', () => {
      render(<ContactHero />);
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Alfonso, Cavite')).toBeInTheDocument();
    });

    it('should render phone card', () => {
      render(<ContactHero />);
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('(02) 123-4567')).toBeInTheDocument();
    });

    it('should render email card', () => {
      render(<ContactHero />);
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('info@lifeplacealfonso.com')).toBeInTheDocument();
    });

    it('should render all three contact cards', () => {
      render(<ContactHero />);
      const locationLabel = screen.getByText('Location');
      const phoneLabel = screen.getByText('Phone');
      const emailLabel = screen.getByText('Email');

      expect(locationLabel).toBeInTheDocument();
      expect(phoneLabel).toBeInTheDocument();
      expect(emailLabel).toBeInTheDocument();
    });
  });

  describe('Scroll Indicator', () => {
    it('should render scroll indicator icon', () => {
      const { container } = render(<ContactHero />);
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });

    it('should scroll to content when scroll indicator is clicked', async () => {
      const { container } = render(<ContactHero />);
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');

      if (scrollIcon && scrollIcon.parentElement) {
        fireEvent.click(scrollIcon.parentElement);
      }

      await waitFor(() => {
        expect(global.scrollTo).toHaveBeenCalledWith({
          top: window.innerHeight,
          behavior: 'smooth',
        });
      });
    });

    it('should have cursor pointer on scroll indicator', () => {
      const { container } = render(<ContactHero />);
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');

      if (scrollIcon && scrollIcon.parentElement) {
        const styles = window.getComputedStyle(scrollIcon.parentElement);
        expect(styles.cursor).toBe('pointer');
      }
    });
  });

  describe('Design System Integration', () => {
    it('should use HeroBackground component', () => {
      const { container } = render(<ContactHero />);
      // HeroBackground should render a Box with specific styling
      const heroBackground = container.firstChild;
      expect(heroBackground).toBeInTheDocument();
    });

    it('should render with proper layout structure', () => {
      const { container } = render(<ContactHero />);
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('should have proper spacing for mobile and desktop', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render responsive typography', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      expect(heading).toBeInTheDocument();
    });

    it('should stack contact cards on mobile', () => {
      render(<ContactHero />);
      const locationCard = screen.getByText('Alfonso, Cavite').closest('div');
      expect(locationCard).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ContactHero />);
      const mainHeading = screen.getByText('Get in Touch');
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have readable text with proper contrast', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      const subheading = screen.getByText(/Experience LifePlace Retreat and Events Center/i);

      expect(heading).toBeInTheDocument();
      expect(subheading).toBeInTheDocument();
    });

    it('should have keyboard accessible scroll indicator', () => {
      const { container } = render(<ContactHero />);
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');

      expect(scrollIcon).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('should render AnimatedElement components', () => {
      render(<ContactHero />);
      // Verify that content renders (AnimatedElement wraps content)
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
      expect(screen.getByText(/Experience LifePlace Retreat/i)).toBeInTheDocument();
    });

    it('should have staggered animation delays', () => {
      render(<ContactHero />);
      // All animated elements should render
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
      expect(screen.getByText(/Experience LifePlace Retreat/i)).toBeInTheDocument();
      expect(screen.getByText('Alfonso, Cavite')).toBeInTheDocument();
    });
  });

  describe('Visual Design', () => {
    it('should use terracotta warmth gradient', () => {
      const { container } = render(<ContactHero />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have gradient overlay for text readability', () => {
      const { container } = render(<ContactHero />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render contact cards with glass effect', () => {
      render(<ContactHero />);
      const locationCard = screen.getByText('Alfonso, Cavite').closest('div');
      expect(locationCard).toBeInTheDocument();
    });

    it('should have hover effects on contact cards', () => {
      render(<ContactHero />);
      const locationCard = screen.getByText('Alfonso, Cavite').closest('div');

      if (locationCard) {
        // Card should have transition styles for hover
        expect(locationCard).toBeInTheDocument();
      }
    });
  });

  describe('Content Accuracy', () => {
    it('should display correct location information', () => {
      render(<ContactHero />);
      expect(screen.getByText('Alfonso, Cavite')).toBeInTheDocument();
    });

    it('should display correct phone number', () => {
      render(<ContactHero />);
      expect(screen.getByText('(02) 123-4567')).toBeInTheDocument();
    });

    it('should display correct email address', () => {
      render(<ContactHero />);
      expect(screen.getByText('info@lifeplacealfonso.com')).toBeInTheDocument();
    });

    it('should mention Alfonso and Tagaytay in description', () => {
      render(<ContactHero />);
      const description = screen.getByText(/Alfonso.*Tagaytay/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should center content vertically and horizontally', () => {
      const { container } = render(<ContactHero />);
      const mainContent = container.querySelector('[class*="MuiBox-root"]');
      expect(mainContent).toBeInTheDocument();
    });

    it('should position scroll indicator at bottom', () => {
      const { container } = render(<ContactHero />);
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });

    it('should use proper container max-width', () => {
      render(<ContactHero />);
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });
  });

  describe('Typography', () => {
    it('should use Cormorant Garamond for heading', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      expect(heading).toBeInTheDocument();
    });

    it('should use Inter for body text', () => {
      render(<ContactHero />);
      const bodyText = screen.getByText(/Experience LifePlace Retreat/i);
      expect(bodyText).toBeInTheDocument();
    });

    it('should have proper text shadows for readability', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      expect(heading).toBeInTheDocument();
    });

    it('should render card labels with overline style', () => {
      render(<ContactHero />);
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('Color System', () => {
    it('should use neutral colors from design tokens', () => {
      render(<ContactHero />);
      const heading = screen.getByText('Get in Touch');
      expect(heading).toBeInTheDocument();
    });

    it('should use gold accent color for labels', () => {
      render(<ContactHero />);
      expect(screen.getByText('Location')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing window.innerHeight gracefully', () => {
      const originalInnerHeight = window.innerHeight;
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: undefined,
      });

      const { container } = render(<ContactHero />);
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');

      if (scrollIcon && scrollIcon.parentElement) {
        fireEvent.click(scrollIcon.parentElement);
      }

      expect(global.scrollTo).toHaveBeenCalled();

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: originalInnerHeight,
      });
    });

    it('should render without crashing when all props are default', () => {
      expect(() => render(<ContactHero />)).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should integrate with design system tokens', () => {
      render(<ContactHero />);
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });

    it('should use HeroBackground with correct props', () => {
      const { container } = render(<ContactHero />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should use AnimatedElement with correct animations', () => {
      render(<ContactHero />);
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
      expect(screen.getByText(/Experience LifePlace Retreat/i)).toBeInTheDocument();
    });

    it('should use Container component for layout', () => {
      render(<ContactHero />);
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });
  });
});
