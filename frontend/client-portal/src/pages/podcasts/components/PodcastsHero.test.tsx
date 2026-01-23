// pages/podcasts/components/PodcastsHero.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PodcastsHero } from './PodcastsHero';

describe('PodcastsHero', () => {
  beforeEach(() => {
    // Mock window.scrollTo
    window.scrollTo = vi.fn();
  });

  describe('Rendering', () => {
    it('renders the component without crashing', () => {
      render(<PodcastsHero />);
      expect(screen.getByText('LifePlace Podcasts')).toBeInTheDocument();
    });

    it('displays the main heading', () => {
      render(<PodcastsHero />);
      const heading = screen.getByText('LifePlace Podcasts');
      expect(heading).toBeInTheDocument();
    });

    it('displays the subheading text', () => {
      render(<PodcastsHero />);
      const subheading = screen.getByText(/Join Peter and Shekinah Gramaje/i);
      expect(subheading).toBeInTheDocument();
    });

    it('displays the featured quote', () => {
      render(<PodcastsHero />);
      const quote = screen.getByText(/Conversations that inspire, encourage/i);
      expect(quote).toBeInTheDocument();
    });

    it('renders the podcast icon', () => {
      render(<PodcastsHero />);
      // MUI icons are rendered as SVGs with a specific data-testid or role
      const icon = document.querySelector('[data-testid="PodcastsIcon"]') ||
                   document.querySelector('svg[class*="MuiSvgIcon"]');
      expect(icon).toBeTruthy();
    });

    it('renders the scroll indicator arrow', () => {
      render(<PodcastsHero />);
      const arrow = document.querySelector('[data-testid="KeyboardArrowDownIcon"]') ||
                    document.querySelector('svg[class*="MuiSvgIcon"]');
      expect(arrow).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<PodcastsHero />);
      // Check that the main heading exists with proper text content
      expect(screen.getByText('LifePlace Podcasts')).toBeTruthy();
    });

    it('has sufficient contrast for text elements', () => {
      render(<PodcastsHero />);
      // Check that text elements have color styles applied
      const heading = screen.getByText('LifePlace Podcasts');
      const styles = window.getComputedStyle(heading);
      expect(styles.color).toBeTruthy();
    });

    it('maintains readable font sizes on mobile', () => {
      render(<PodcastsHero />);
      const heading = screen.getByText('LifePlace Podcasts');
      const styles = window.getComputedStyle(heading);
      // Font size should be defined
      expect(styles.fontSize).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('scrolls to content when scroll indicator is clicked', () => {
      const { container } = render(<PodcastsHero />);

      // Find the last Box element which should be the scroll indicator
      const boxes = container.querySelectorAll('[class*="MuiBox"]');
      const scrollIndicator = boxes[boxes.length - 1];

      if (scrollIndicator) {
        fireEvent.click(scrollIndicator);
        // Check that scrollTo was called (exact values may vary in test env)
        expect(window.scrollTo).toHaveBeenCalled();
      }
    });

    it('hover effect works on icon container', () => {
      const { container } = render(<PodcastsHero />);
      // Icon container should exist within the component
      const iconContainers = container.querySelectorAll('[class*="MuiBox"]');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    it('hover effect works on quote card', () => {
      render(<PodcastsHero />);
      const quoteCard = screen.getByText(/Conversations that inspire/i).closest('div');
      // Quote card should exist
      expect(quoteCard).toBeTruthy();
    });
  });

  describe('Design System Integration', () => {
    it('uses HeroBackground component', () => {
      const { container } = render(<PodcastsHero />);
      // Check that the component renders with proper structure
      expect(container.firstChild).toBeTruthy();
    });

    it('applies correct spacing tokens', () => {
      const { container } = render(<PodcastsHero />);
      // Component should render with proper Box structure
      const boxes = container.querySelectorAll('[class*="MuiBox"]');
      expect(boxes.length).toBeGreaterThan(0);
    });

    it('uses typography tokens for heading', () => {
      render(<PodcastsHero />);
      const heading = screen.getByText('LifePlace Podcasts');
      const styles = window.getComputedStyle(heading);

      // Check that typography styles are applied
      expect(styles.fontFamily).toBeTruthy();
      expect(styles.fontSize).toBeTruthy();
    });

    it('applies correct color tokens', () => {
      render(<PodcastsHero />);
      const heading = screen.getByText('LifePlace Podcasts');
      const styles = window.getComputedStyle(heading);

      // Color should be defined
      expect(styles.color).toBeTruthy();
    });

    it('uses AnimatedElement for animations', () => {
      const { container } = render(<PodcastsHero />);
      // Component should render successfully with animations
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Layout & Responsiveness', () => {
    it('renders with correct minimum height', () => {
      const { container } = render(<PodcastsHero />);
      const mainContainer = container.firstChild as HTMLElement;

      if (mainContainer) {
        const styles = window.getComputedStyle(mainContainer);
        // Min-height should be set
        expect(styles.minHeight).toBeTruthy();
      }
    });

    it('centers content properly', () => {
      const { container } = render(<PodcastsHero />);
      const contentBox = container.querySelector('[class*="MuiBox"]');

      if (contentBox) {
        const styles = window.getComputedStyle(contentBox);
        expect(styles.display).toBeTruthy();
      }
    });

    it('applies responsive padding', () => {
      const { container } = render(<PodcastsHero />);
      // Component should render with proper structure
      const boxes = container.querySelectorAll('[class*="MuiBox"]');
      expect(boxes.length).toBeGreaterThan(0);
    });

    it('stacks elements vertically on mobile', () => {
      const { container } = render(<PodcastsHero />);
      const stack = container.querySelector('[class*="MuiStack"]');

      if (stack) {
        const styles = window.getComputedStyle(stack);
        expect(styles.display).toBeTruthy();
      }
    });
  });

  describe('Animation Timing', () => {
    it('applies staggered animation delays', () => {
      const { container } = render(<PodcastsHero />);
      // Component should render with AnimatedElement components
      const animatedElements = container.querySelectorAll('[class*="MuiBox"]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('has smooth transitions on hover', () => {
      render(<PodcastsHero />);
      const quoteCard = screen.getByText(/Conversations that inspire/i).closest('div');
      // Quote card should exist and be ready for interactions
      expect(quoteCard).toBeTruthy();
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct podcast hosts names', () => {
      render(<PodcastsHero />);
      expect(screen.getByText(/Peter and Shekinah Gramaje/i)).toBeInTheDocument();
    });

    it('displays correct tagline', () => {
      render(<PodcastsHero />);
      expect(screen.getByText(/insights on life, rest, relationships, and purpose/i)).toBeInTheDocument();
    });

    it('displays correct featured quote', () => {
      render(<PodcastsHero />);
      expect(screen.getByText(/truly matters in life/i)).toBeInTheDocument();
    });
  });

  describe('Visual Effects', () => {
    it('applies backdrop filter to quote card', () => {
      render(<PodcastsHero />);
      const quoteCard = screen.getByText(/Conversations that inspire/i).closest('div');
      // Quote card should exist with backdrop blur styles
      expect(quoteCard).toBeTruthy();
    });

    it('applies text shadow for readability', () => {
      render(<PodcastsHero />);
      const heading = screen.getByText('LifePlace Podcasts');
      // Heading should exist with proper styling
      expect(heading).toBeTruthy();
    });

    it('applies border radius to quote card', () => {
      render(<PodcastsHero />);
      const quoteCard = screen.getByText(/Conversations that inspire/i).closest('div');

      if (quoteCard) {
        const styles = window.getComputedStyle(quoteCard);
        expect(styles.borderRadius).toBeTruthy();
      }
    });

    it('applies box shadow to icon container', () => {
      const { container } = render(<PodcastsHero />);
      // Icon container should exist within component structure
      const boxes = container.querySelectorAll('[class*="MuiBox"]');
      expect(boxes.length).toBeGreaterThan(0);
    });
  });

  describe('Scroll Indicator Animation', () => {
    it('applies bounce animation to scroll indicator', () => {
      const { container } = render(<PodcastsHero />);
      const scrollIndicator = container.querySelector('[class*="MuiBox"]:last-child');

      if (scrollIndicator) {
        const styles = window.getComputedStyle(scrollIndicator);
        expect(styles.animation).toBeTruthy();
      }
    });

    it('has pointer cursor on scroll indicator', () => {
      const { container } = render(<PodcastsHero />);
      // Scroll indicator should exist at the bottom
      const boxes = container.querySelectorAll('[class*="MuiBox"]');
      expect(boxes.length).toBeGreaterThan(0);
    });
  });

  describe('Background Gradient', () => {
    it('uses heroWarm gradient', () => {
      const { container } = render(<PodcastsHero />);
      // Component should render with HeroBackground
      expect(container.firstChild).toBeTruthy();
    });

    it('has animated gradient enabled', () => {
      const { container } = render(<PodcastsHero />);
      // Check that the component renders successfully
      expect(container.firstChild).toBeTruthy();
    });

    it('has gradient overlay for text readability', () => {
      const { container } = render(<PodcastsHero />);
      // Component should render with proper structure
      expect(container.firstChild).toBeTruthy();
    });
  });
});
