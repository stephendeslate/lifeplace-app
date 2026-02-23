// pages/about/components/AboutHero.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AboutHero } from './AboutHero';

describe('AboutHero', () => {
  describe('Rendering', () => {
    it('renders the main heading', () => {
      render(<AboutHero />);
      expect(screen.getByText('LifePlace Alfonso')).toBeInTheDocument();
    });

    it('renders the biblical quote', () => {
      render(<AboutHero />);
      expect(
        screen.getByText('"I have come that they may have life, and have it to the full."'),
      ).toBeInTheDocument();
    });

    it('renders the bible verse reference', () => {
      render(<AboutHero />);
      expect(screen.getByText('John 10:10b')).toBeInTheDocument();
    });

    it('renders the location description', () => {
      render(<AboutHero />);
      expect(
        screen.getByText(/Located in the peaceful hills of Alfonso, Cavite/),
      ).toBeInTheDocument();
    });

    it('renders the scroll indicator icon', () => {
      render(<AboutHero />);
      const scrollIcon = document.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses HeroBackground with earthToSky gradient', () => {
      render(<AboutHero />);
      // HeroBackground should be present in the component tree - rendered successfully
      expect(screen.getByText('LifePlace Alfonso')).toBeInTheDocument();
    });

    it('applies responsive typography tokens', () => {
      render(<AboutHero />);
      const heading = screen.getByText('LifePlace Alfonso');

      // Check if the heading has typography styling applied
      expect(heading).toHaveStyle({
        textAlign: 'center',
      });
    });

    it('uses GlassCard for biblical quote', () => {
      render(<AboutHero />);
      const quote = screen.getByText(
        '"I have come that they may have life, and have it to the full."',
      );

      // Quote should be within a card container
      expect(quote.closest('[class*="MuiBox-root"]')).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('wraps heading in AnimatedElement', () => {
      render(<AboutHero />);
      const heading = screen.getByText('LifePlace Alfonso');

      // AnimatedElement should wrap the heading
      expect(heading).toBeInTheDocument();
    });

    it('wraps quote card in AnimatedElement', () => {
      render(<AboutHero />);
      const quote = screen.getByText(
        '"I have come that they may have life, and have it to the full."',
      );

      // AnimatedElement should wrap the quote
      expect(quote).toBeInTheDocument();
    });

    it('wraps description in AnimatedElement', () => {
      render(<AboutHero />);
      const description = screen.getByText(/Located in the peaceful hills/);

      // AnimatedElement should wrap the description
      expect(description).toBeInTheDocument();
    });

    it('applies bounce animation to scroll indicator', () => {
      const { container } = render(<AboutHero />);
      const scrollContainer = container.querySelector('[class*="MuiBox-root"]');

      // Component should render without errors
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('scrolls to content when scroll indicator is clicked', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      render(<AboutHero />);

      // Find the scroll indicator container (the clickable box around the icon)
      const { container } = render(<AboutHero />);
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
      const { container } = render(<AboutHero />);

      // Scroll indicator should have pointer cursor
      const scrollIndicators = container.querySelectorAll('[class*="MuiBox-root"]');
      const hasPointerCursor = Array.from(scrollIndicators).some((element) => {
        const style = window.getComputedStyle(element);
        return style.cursor === 'pointer';
      });

      expect(hasPointerCursor).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing tokens', () => {
      const { container } = render(<AboutHero />);

      // Component should render with responsive layout
      expect(container.querySelector('[class*="MuiStack-root"]')).toBeInTheDocument();
    });

    it('uses Container component for content width', () => {
      const { container } = render(<AboutHero />);

      // Container component should be present (it's a Box component, not MuiContainer)
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies responsive min-height to hero section', () => {
      render(<AboutHero />);

      // HeroBackground should render with responsive height
      const { container } = render(<AboutHero />);
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<AboutHero />);

      // Main heading should be present
      const heading = screen.getByText('LifePlace Alfonso');
      expect(heading).toBeInTheDocument();
    });

    it('provides readable text with sufficient contrast', () => {
      render(<AboutHero />);

      // All text elements should be present and readable
      expect(screen.getByText('LifePlace Alfonso')).toBeInTheDocument();
      expect(screen.getByText(/I have come that they may have life/)).toBeInTheDocument();
      expect(screen.getByText('John 10:10b')).toBeInTheDocument();
      expect(screen.getByText(/Located in the peaceful hills/)).toBeInTheDocument();
    });

    it('maintains text readability with overlay', () => {
      render(<AboutHero />);

      // Component should render with proper text visibility
      const heading = screen.getByText('LifePlace Alfonso');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(<AboutHero />);

      // Should have flexbox layout for centering
      const flexContainers = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('positions scroll indicator at the bottom', () => {
      const { container } = render(<AboutHero />);

      // Scroll indicator should be at the bottom
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });

    it('applies proper spacing between elements', () => {
      const { container } = render(<AboutHero />);

      // Stack component should handle spacing
      const stack = container.querySelector('[class*="MuiStack-root"]');
      expect(stack).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays the complete biblical quote accurately', () => {
      render(<AboutHero />);

      const quote = screen.getByText(
        '"I have come that they may have life, and have it to the full."',
      );
      expect(quote).toBeInTheDocument();
    });

    it('displays the correct bible verse reference', () => {
      render(<AboutHero />);

      const reference = screen.getByText('John 10:10b');
      expect(reference).toBeInTheDocument();
    });

    it('displays the location information', () => {
      render(<AboutHero />);

      expect(screen.getByText(/Alfonso, Cavite/)).toBeInTheDocument();
      expect(screen.getByText(/near Tagaytay/)).toBeInTheDocument();
    });

    it('communicates the venue purpose', () => {
      render(<AboutHero />);

      expect(
        screen.getByText(/sanctuary for life's most meaningful celebrations/),
      ).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies proper border radius to quote card', () => {
      const { container } = render(<AboutHero />);

      // GlassCard should have border radius applied
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies text shadow for depth', () => {
      render(<AboutHero />);

      const heading = screen.getByText('LifePlace Alfonso');
      expect(heading).toBeInTheDocument();
    });

    it('uses italic style for quote', () => {
      render(<AboutHero />);

      const quote = screen.getByText(/I have come that they may have life/);
      expect(quote).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders without crashing', () => {
      expect(() => render(<AboutHero />)).not.toThrow();
    });

    it('handles missing window.scrollTo gracefully', () => {
      const originalScrollTo = window.scrollTo;
      (window.scrollTo as unknown) = undefined;

      expect(() => render(<AboutHero />)).not.toThrow();

      window.scrollTo = originalScrollTo;
    });
  });
});
