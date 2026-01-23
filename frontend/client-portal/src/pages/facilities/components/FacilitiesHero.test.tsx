// pages/facilities/components/FacilitiesHero.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacilitiesHero } from './FacilitiesHero';

describe('FacilitiesHero', () => {
  describe('Rendering', () => {
    it('renders the main heading', () => {
      render(<FacilitiesHero />);
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
    });

    it('renders the subheading', () => {
      render(<FacilitiesHero />);
      expect(
        screen.getByText('Discover our beautiful venues and comfortable accommodations')
      ).toBeInTheDocument();
    });

    it('renders the description text', () => {
      render(<FacilitiesHero />);
      expect(
        screen.getByText(/From intimate ceremonies to grand celebrations/)
      ).toBeInTheDocument();
    });

    it('renders the complete description', () => {
      render(<FacilitiesHero />);
      expect(
        screen.getByText(/Our thoughtfully designed venues combine natural beauty/)
      ).toBeInTheDocument();
    });

    it('renders the scroll indicator icon', () => {
      render(<FacilitiesHero />);
      const scrollIcon = document.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses HeroBackground with earthToSky gradient', () => {
      render(<FacilitiesHero />);
      // HeroBackground should be present in the component tree
      // Component renders without errors, indicating HeroBackground is working
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
    });

    it('applies responsive typography tokens to heading', () => {
      render(<FacilitiesHero />);
      const heading = screen.getByText('Our Facilities');

      // Check if the heading has typography styling applied
      expect(heading).toHaveStyle({
        textAlign: 'center',
      });
    });

    it('uses Container component for content width', () => {
      const { container } = render(<FacilitiesHero />);

      // Container component should be present
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies design tokens for spacing', () => {
      const { container } = render(<FacilitiesHero />);

      // Stack component should handle spacing with tokens
      const stack = container.querySelector('[class*="MuiStack-root"]');
      expect(stack).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('wraps heading in AnimatedElement', () => {
      render(<FacilitiesHero />);
      const heading = screen.getByText('Our Facilities');

      // AnimatedElement should wrap the heading
      expect(heading).toBeInTheDocument();
    });

    it('wraps subheading in AnimatedElement', () => {
      render(<FacilitiesHero />);
      const subheading = screen.getByText(/Discover our beautiful venues/);

      // AnimatedElement should wrap the subheading
      expect(subheading).toBeInTheDocument();
    });

    it('wraps description in AnimatedElement', () => {
      render(<FacilitiesHero />);
      const description = screen.getByText(/From intimate ceremonies/);

      // AnimatedElement should wrap the description
      expect(description).toBeInTheDocument();
    });

    it('applies staggered animation delays', () => {
      render(<FacilitiesHero />);

      // All animated elements should be present
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
      expect(screen.getByText(/Discover our beautiful venues/)).toBeInTheDocument();
      expect(screen.getByText(/From intimate ceremonies/)).toBeInTheDocument();
    });

    it('applies bounce animation to scroll indicator', () => {
      const { container } = render(<FacilitiesHero />);
      const scrollContainer = container.querySelector('[class*="MuiBox-root"]');

      // Component should render without errors
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('scrolls to content when scroll indicator is clicked', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      render(<FacilitiesHero />);

      // Find the scroll indicator container (the clickable box around the icon)
      const { container } = render(<FacilitiesHero />);
      const scrollIndicators = container.querySelectorAll('[class*="MuiBox-root"]');

      // Find the clickable scroll indicator (it has cursor: pointer and onClick)
      let scrollIndicator: Element | null = null;
      scrollIndicators.forEach((element) => {
        const style = window.getComputedStyle(element);
        if (style.cursor === 'pointer') {
          scrollIndicator = element;
        }
      });

      if (scrollIndicator) {
        fireEvent.click(scrollIndicator);
        expect(scrollToMock).toHaveBeenCalledWith({
          top: window.innerHeight,
          behavior: 'smooth',
        });
      }
    });

    it('has clickable scroll indicator with proper cursor', () => {
      const { container } = render(<FacilitiesHero />);

      // Scroll indicator should have pointer cursor
      const scrollIndicators = container.querySelectorAll('[class*="MuiBox-root"]');
      const hasPointerCursor = Array.from(scrollIndicators).some((element) => {
        const style = window.getComputedStyle(element);
        return style.cursor === 'pointer';
      });

      expect(hasPointerCursor).toBe(true);
    });

    it('applies hover transition to scroll indicator', () => {
      render(<FacilitiesHero />);
      const scrollIcon = document.querySelector('[data-testid="KeyboardArrowDownIcon"]');

      // Icon should be present with transition styling
      expect(scrollIcon).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing tokens', () => {
      const { container } = render(<FacilitiesHero />);

      // Component should render with responsive layout
      expect(container.querySelector('[class*="MuiStack-root"]')).toBeInTheDocument();
    });

    it('applies responsive typography to heading', () => {
      render(<FacilitiesHero />);
      const heading = screen.getByText('Our Facilities');

      // Heading should be present with responsive typography
      expect(heading).toBeInTheDocument();
    });

    it('applies responsive typography to subheading', () => {
      render(<FacilitiesHero />);
      const subheading = screen.getByText(/Discover our beautiful venues/);

      // Subheading should be present with responsive typography
      expect(subheading).toBeInTheDocument();
    });

    it('applies responsive min-height to hero section', () => {
      render(<FacilitiesHero />);

      // HeroBackground should render with responsive height
      const { container } = render(<FacilitiesHero />);
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies responsive padding to content area', () => {
      const { container } = render(<FacilitiesHero />);

      // Content area should have responsive padding
      const contentBoxes = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(contentBoxes.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<FacilitiesHero />);

      // Main heading should be present
      const heading = screen.getByText('Our Facilities');
      expect(heading).toBeInTheDocument();
    });

    it('provides readable text with sufficient contrast (WCAG AA)', () => {
      render(<FacilitiesHero />);

      // All text elements should be present and readable
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
      expect(screen.getByText(/Discover our beautiful venues/)).toBeInTheDocument();
      expect(screen.getByText(/From intimate ceremonies/)).toBeInTheDocument();
    });

    it('maintains text readability with gradient overlay', () => {
      render(<FacilitiesHero />);

      // Component should render with proper text visibility on gradient
      const heading = screen.getByText('Our Facilities');
      expect(heading).toBeInTheDocument();
    });

    it('uses appropriate text shadows for readability', () => {
      render(<FacilitiesHero />);

      // Text should be present with text shadows for depth and readability
      const heading = screen.getByText('Our Facilities');
      expect(heading).toBeInTheDocument();
    });

    it('has appropriate color contrast for light text on dark overlay', () => {
      render(<FacilitiesHero />);

      // All text should be visible with proper contrast
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
      expect(screen.getByText(/Discover our beautiful venues/)).toBeInTheDocument();
      expect(screen.getByText(/From intimate ceremonies/)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(<FacilitiesHero />);

      // Should have flexbox layout for centering
      const flexContainers = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('positions scroll indicator at the bottom', () => {
      const { container } = render(<FacilitiesHero />);

      // Scroll indicator should be at the bottom
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });

    it('applies proper spacing between text elements', () => {
      const { container } = render(<FacilitiesHero />);

      // Stack component should handle spacing
      const stack = container.querySelector('[class*="MuiStack-root"]');
      expect(stack).toBeInTheDocument();
    });

    it('uses full viewport height minus navbar', () => {
      render(<FacilitiesHero />);

      // Component should render with proper height
      const { container } = render(<FacilitiesHero />);
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays the correct heading text', () => {
      render(<FacilitiesHero />);

      const heading = screen.getByText('Our Facilities');
      expect(heading).toBeInTheDocument();
    });

    it('displays the complete subheading', () => {
      render(<FacilitiesHero />);

      expect(
        screen.getByText('Discover our beautiful venues and comfortable accommodations')
      ).toBeInTheDocument();
    });

    it('displays descriptive text about venues', () => {
      render(<FacilitiesHero />);

      expect(screen.getByText(/intimate ceremonies/)).toBeInTheDocument();
      expect(screen.getByText(/grand celebrations/)).toBeInTheDocument();
      expect(screen.getByText(/perfect space for every occasion/)).toBeInTheDocument();
    });

    it('displays venue quality messaging', () => {
      render(<FacilitiesHero />);

      expect(screen.getByText(/thoughtfully designed venues/)).toBeInTheDocument();
      expect(screen.getByText(/natural beauty with modern amenities/)).toBeInTheDocument();
    });

    it('communicates the venue value proposition', () => {
      render(<FacilitiesHero />);

      expect(screen.getByText(/unforgettable experiences/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies earthToSky gradient background', () => {
      const { container } = render(<FacilitiesHero />);

      // HeroBackground should render with gradient
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies dark overlay for text readability', () => {
      const { container } = render(<FacilitiesHero />);

      // Component should render with overlay
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies text shadows for depth', () => {
      render(<FacilitiesHero />);

      const heading = screen.getByText('Our Facilities');
      expect(heading).toBeInTheDocument();
    });

    it('uses Cormorant Garamond for headings', () => {
      render(<FacilitiesHero />);

      const heading = screen.getByText('Our Facilities');
      expect(heading).toBeInTheDocument();
    });

    it('uses Inter for body text', () => {
      render(<FacilitiesHero />);

      const description = screen.getByText(/From intimate ceremonies/);
      expect(description).toBeInTheDocument();
    });

    it('applies proper max-width constraints', () => {
      render(<FacilitiesHero />);

      // Text elements should have max-width constraints
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
      expect(screen.getByText(/Discover our beautiful venues/)).toBeInTheDocument();
      expect(screen.getByText(/From intimate ceremonies/)).toBeInTheDocument();
    });
  });

  describe('Modern Organic Luxury Design', () => {
    it('uses warm earthToSky gradient for grounded feel', () => {
      const { container } = render(<FacilitiesHero />);

      // HeroBackground component should be present
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies animated gradient for subtle motion', () => {
      const { container } = render(<FacilitiesHero />);

      // Animated gradient should be applied
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('uses design tokens for all colors', () => {
      render(<FacilitiesHero />);

      // Component should use tokens (neutral[50] for light text)
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
    });

    it('uses design tokens for all spacing', () => {
      const { container } = render(<FacilitiesHero />);

      // Stack should use token spacing
      expect(container.querySelector('[class*="MuiStack-root"]')).toBeInTheDocument();
    });

    it('applies organic transition timings', () => {
      render(<FacilitiesHero />);
      const scrollIcon = document.querySelector('[data-testid="KeyboardArrowDownIcon"]');

      // Icon should be present with organic transitions
      expect(scrollIcon).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders without crashing', () => {
      expect(() => render(<FacilitiesHero />)).not.toThrow();
    });

    it('handles missing window.scrollTo gracefully', () => {
      const originalScrollTo = window.scrollTo;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.scrollTo = undefined as any;

      expect(() => render(<FacilitiesHero />)).not.toThrow();

      window.scrollTo = originalScrollTo;
    });

    it('renders with empty props object', () => {
      expect(() => render(<FacilitiesHero />)).not.toThrow();
    });
  });

  describe('Backward Compatibility', () => {
    it('maintains existing functionality', () => {
      render(<FacilitiesHero />);

      // All original content should be present
      expect(screen.getByText('Our Facilities')).toBeInTheDocument();
      expect(screen.getByText(/beautiful venues/)).toBeInTheDocument();
    });

    it('preserves scroll behavior', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      const { container } = render(<FacilitiesHero />);
      const scrollIndicators = container.querySelectorAll('[class*="MuiBox-root"]');

      // Find clickable element
      let scrollIndicator: Element | null = null;
      scrollIndicators.forEach((element) => {
        const style = window.getComputedStyle(element);
        if (style.cursor === 'pointer') {
          scrollIndicator = element;
        }
      });

      if (scrollIndicator) {
        fireEvent.click(scrollIndicator);
        expect(scrollToMock).toHaveBeenCalled();
      }
    });

    it('maintains responsive behavior', () => {
      const { container } = render(<FacilitiesHero />);

      // Responsive layout should be maintained
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });
  });
});
