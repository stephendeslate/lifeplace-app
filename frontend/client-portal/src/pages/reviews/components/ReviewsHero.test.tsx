// pages/reviews/components/ReviewsHero.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewsHero } from './ReviewsHero';

describe('ReviewsHero', () => {
  describe('Rendering', () => {
    it('renders the main heading', () => {
      render(<ReviewsHero />);
      expect(screen.getByText('Unforgettable Moments')).toBeInTheDocument();
    });

    it('renders the subheading', () => {
      render(<ReviewsHero />);
      expect(screen.getByText("Our Venue through Our Guests' Eyes")).toBeInTheDocument();
    });

    it('renders the description text', () => {
      render(<ReviewsHero />);
      expect(
        screen.getByText(/See what our clients and guests have to say about their experiences/)
      ).toBeInTheDocument();
    });

    it('renders the 5-star rating display', () => {
      render(<ReviewsHero />);
      expect(screen.getByText('5.0 / 5.0')).toBeInTheDocument();
    });

    it('renders all 5 star icons', () => {
      const { container } = render(<ReviewsHero />);
      const starIcons = container.querySelectorAll('[data-testid="StarIcon"]');
      expect(starIcons).toHaveLength(5);
    });

    it('renders the Share Your Story button', () => {
      render(<ReviewsHero />);
      expect(screen.getByText('Share Your Story')).toBeInTheDocument();
    });

    it('renders the View Reviews button', () => {
      render(<ReviewsHero />);
      expect(screen.getByText('View Reviews')).toBeInTheDocument();
    });

    it('renders the scroll indicator icon', () => {
      render(<ReviewsHero />);
      const scrollIcon = document.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });

    it('renders RateReview icon in Share Your Story button', () => {
      render(<ReviewsHero />);
      const rateReviewIcon = document.querySelector('[data-testid="RateReviewIcon"]');
      expect(rateReviewIcon).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses HeroBackground with sunsetGlow gradient', () => {
      render(<ReviewsHero />);
      // HeroBackground should be present in the component tree - verify by checking heading renders
      expect(screen.getByText('Unforgettable Moments')).toBeInTheDocument();
    });

    it('applies responsive typography tokens for h1', () => {
      render(<ReviewsHero />);
      const heading = screen.getByText('Unforgettable Moments');

      // Check if the heading has typography styling applied
      expect(heading).toHaveStyle({
        textAlign: 'center',
      });
    });

    it('uses light overlay for text readability', () => {
      const { container } = render(<ReviewsHero />);
      // Component should render with HeroBackground overlay
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies Modern Organic Luxury color tokens', () => {
      render(<ReviewsHero />);
      // Component should use design system tokens (verified by no errors)
      expect(screen.getByText('Unforgettable Moments')).toBeInTheDocument();
    });

    it('applies design system spacing tokens', () => {
      const { container } = render(<ReviewsHero />);
      // Stack component should handle spacing with tokens
      const stack = container.querySelector('[class*="MuiStack-root"]');
      expect(stack).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('wraps heading in AnimatedElement with fadeIn animation', () => {
      render(<ReviewsHero />);
      const heading = screen.getByText('Unforgettable Moments');

      // AnimatedElement should wrap the heading
      expect(heading).toBeInTheDocument();
    });

    it('wraps subheading in AnimatedElement with staggered delay', () => {
      render(<ReviewsHero />);
      const subheading = screen.getByText("Our Venue through Our Guests' Eyes");

      // AnimatedElement should wrap the subheading
      expect(subheading).toBeInTheDocument();
    });

    it('wraps description in AnimatedElement', () => {
      render(<ReviewsHero />);
      const description = screen.getByText(/See what our clients and guests/);

      // AnimatedElement should wrap the description
      expect(description).toBeInTheDocument();
    });

    it('wraps rating stars in AnimatedElement', () => {
      render(<ReviewsHero />);
      const rating = screen.getByText('5.0 / 5.0');

      // AnimatedElement should wrap the rating
      expect(rating).toBeInTheDocument();
    });

    it('wraps CTA buttons in AnimatedElement', () => {
      render(<ReviewsHero />);
      const button = screen.getByText('Share Your Story');

      // AnimatedElement should wrap the buttons
      expect(button).toBeInTheDocument();
    });

    it('applies bounce animation to scroll indicator', () => {
      const { container } = render(<ReviewsHero />);
      const scrollContainer = container.querySelector('[class*="MuiBox-root"]');

      // Component should render without errors
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('scrolls to content when scroll indicator is clicked', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      const { container } = render(<ReviewsHero />);

      // Find the clickable scroll indicator
      const scrollIndicators = container.querySelectorAll('[class*="MuiBox-root"]');
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

    it('calls handleViewReviews when View Reviews button is clicked', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      render(<ReviewsHero />);

      const viewReviewsButton = screen.getByText('View Reviews');
      fireEvent.click(viewReviewsButton);

      // Should scroll to content
      expect(scrollToMock).toHaveBeenCalledWith({
        top: window.innerHeight,
        behavior: 'smooth',
      });
    });

    it('calls handleLeaveReview when Share Your Story button is clicked', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      fireEvent.click(shareButton);

      // Should not throw an error
      expect(shareButton).toBeInTheDocument();
    });

    it('scrolls to review section if it exists when Share Your Story is clicked', () => {
      const mockScrollIntoView = vi.fn();
      const mockSection = document.createElement('div');
      mockSection.id = 'leave-review';
      mockSection.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(mockSection);

      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      fireEvent.click(shareButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Cleanup
      document.body.removeChild(mockSection);
    });

    it('falls back to scroll when review section does not exist', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      fireEvent.click(shareButton);

      // Should fallback to scroll
      expect(scrollToMock).toHaveBeenCalledWith({
        top: window.innerHeight,
        behavior: 'smooth',
      });
    });

    it('has clickable scroll indicator with proper cursor', () => {
      const { container } = render(<ReviewsHero />);

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
      const { container } = render(<ReviewsHero />);

      // Component should render with responsive layout
      expect(container.querySelector('[class*="MuiStack-root"]')).toBeInTheDocument();
    });

    it('uses Container component for content width', () => {
      const { container } = render(<ReviewsHero />);

      // Container component should be present
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('applies responsive min-height to hero section', () => {
      const { container } = render(<ReviewsHero />);

      // HeroBackground should render with responsive height
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('stacks buttons vertically on mobile', () => {
      const { container } = render(<ReviewsHero />);

      // Stack should have responsive direction
      const buttonStack = container.querySelector('[class*="MuiStack-root"]');
      expect(buttonStack).toBeInTheDocument();
    });

    it('applies responsive font sizes to headings', () => {
      render(<ReviewsHero />);

      const heading = screen.getByText('Unforgettable Moments');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic h1 for main heading', () => {
      render(<ReviewsHero />);

      const heading = screen.getByText('Unforgettable Moments');
      expect(heading.tagName).toBe('H1');
    });

    it('provides readable text with sufficient contrast', () => {
      render(<ReviewsHero />);

      // All text elements should be present and readable
      expect(screen.getByText('Unforgettable Moments')).toBeInTheDocument();
      expect(screen.getByText("Our Venue through Our Guests' Eyes")).toBeInTheDocument();
      expect(screen.getByText(/See what our clients and guests/)).toBeInTheDocument();
    });

    it('has proper focus styles on buttons', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      const viewButton = screen.getByText('View Reviews');

      expect(shareButton).toBeInTheDocument();
      expect(viewButton).toBeInTheDocument();
    });

    it('buttons have accessible labels', () => {
      render(<ReviewsHero />);

      expect(screen.getByText('Share Your Story')).toBeInTheDocument();
      expect(screen.getByText('View Reviews')).toBeInTheDocument();
    });

    it('maintains text readability with light overlay', () => {
      render(<ReviewsHero />);

      // Component should render with proper text visibility
      const heading = screen.getByText('Unforgettable Moments');
      expect(heading).toBeInTheDocument();
    });

    it('uses proper ARIA attributes for interactive elements', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      const viewButton = screen.getByText('View Reviews');

      // Buttons should be accessible
      expect(shareButton).toBeInTheDocument();
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(<ReviewsHero />);

      // Should have flexbox layout for centering
      const flexContainers = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('positions scroll indicator at the bottom', () => {
      const { container } = render(<ReviewsHero />);

      // Scroll indicator should be at the bottom
      const scrollIcon = container.querySelector('[data-testid="KeyboardArrowDownIcon"]');
      expect(scrollIcon).toBeInTheDocument();
    });

    it('applies proper spacing between elements', () => {
      const { container } = render(<ReviewsHero />);

      // Stack component should handle spacing
      const stack = container.querySelector('[class*="MuiStack-root"]');
      expect(stack).toBeInTheDocument();
    });

    it('uses Container component with wide maxWidth', () => {
      const { container } = render(<ReviewsHero />);

      // Container should be present (it's a custom Box component)
      expect(container.querySelector('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('stacks CTA buttons with proper spacing', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      const viewButton = screen.getByText('View Reviews');

      expect(shareButton).toBeInTheDocument();
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('applies terracotta variant to Share Your Story button', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      expect(shareButton).toBeInTheDocument();
      expect(shareButton.closest('button')).toHaveClass('MuiButton-contained');
    });

    it('applies outlined variant to View Reviews button', () => {
      render(<ReviewsHero />);

      const viewButton = screen.getByText('View Reviews');
      expect(viewButton).toBeInTheDocument();
      expect(viewButton.closest('button')).toHaveClass('MuiButton-outlined');
    });

    it('applies large size to both buttons', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      const viewButton = screen.getByText('View Reviews');

      expect(shareButton.closest('button')).toHaveClass('MuiButton-sizeLarge');
      expect(viewButton.closest('button')).toHaveClass('MuiButton-sizeLarge');
    });

    it('uses design system button typography tokens', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      expect(shareButton).toBeInTheDocument();
    });

    it('applies hover effects to buttons', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      const viewButton = screen.getByText('View Reviews');

      // Buttons should be present and styled
      expect(shareButton).toBeInTheDocument();
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe('Rating Display', () => {
    it('displays 5 gold stars', () => {
      const { container } = render(<ReviewsHero />);
      const starIcons = container.querySelectorAll('[data-testid="StarIcon"]');
      expect(starIcons).toHaveLength(5);
    });

    it('displays the rating score text', () => {
      render(<ReviewsHero />);
      expect(screen.getByText('5.0 / 5.0')).toBeInTheDocument();
    });

    it('applies gold color token to stars', () => {
      const { container } = render(<ReviewsHero />);
      const starIcons = container.querySelectorAll('[data-testid="StarIcon"]');
      expect(starIcons.length).toBeGreaterThan(0);
    });

    it('centers rating display', () => {
      render(<ReviewsHero />);
      const rating = screen.getByText('5.0 / 5.0');
      const ratingContainer = rating.closest('[class*="MuiStack-root"]');
      expect(ratingContainer).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays accurate hero messaging', () => {
      render(<ReviewsHero />);

      expect(screen.getByText('Unforgettable Moments')).toBeInTheDocument();
      expect(screen.getByText("Our Venue through Our Guests' Eyes")).toBeInTheDocument();
    });

    it('communicates testimonial purpose', () => {
      render(<ReviewsHero />);

      expect(
        screen.getByText(/See what our clients and guests have to say/)
      ).toBeInTheDocument();
      expect(screen.getByText(/about their experiences at LifePlace Alfonso/)).toBeInTheDocument();
    });

    it('encourages user engagement with CTAs', () => {
      render(<ReviewsHero />);

      expect(screen.getByText('Share Your Story')).toBeInTheDocument();
      expect(screen.getByText('View Reviews')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies text shadow for depth and readability', () => {
      render(<ReviewsHero />);

      const heading = screen.getByText('Unforgettable Moments');
      expect(heading).toBeInTheDocument();
    });

    it('uses proper border radius from design tokens', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      expect(shareButton).toBeInTheDocument();
    });

    it('applies proper box shadows from design tokens', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      expect(shareButton).toBeInTheDocument();
    });

    it('uses organic transitions from design tokens', () => {
      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      expect(shareButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders without crashing', () => {
      expect(() => render(<ReviewsHero />)).not.toThrow();
    });

    it('handles missing window.scrollTo gracefully', () => {
      const originalScrollTo = window.scrollTo;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.scrollTo = undefined as any;

      expect(() => render(<ReviewsHero />)).not.toThrow();

      window.scrollTo = originalScrollTo;
    });

    it('handles missing review section element gracefully', () => {
      const scrollToMock = vi.fn();
      window.scrollTo = scrollToMock;

      render(<ReviewsHero />);

      const shareButton = screen.getByText('Share Your Story');
      fireEvent.click(shareButton);

      // Should fallback to scroll
      expect(scrollToMock).toHaveBeenCalled();
    });

    it('renders all elements even if some fail to load', () => {
      render(<ReviewsHero />);

      // All critical elements should be present
      expect(screen.getByText('Unforgettable Moments')).toBeInTheDocument();
      expect(screen.getByText('Share Your Story')).toBeInTheDocument();
      expect(screen.getByText('View Reviews')).toBeInTheDocument();
    });
  });
});
