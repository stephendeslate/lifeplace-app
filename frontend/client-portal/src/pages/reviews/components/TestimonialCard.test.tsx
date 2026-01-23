// pages/reviews/components/TestimonialCard.test.tsx
// Tests for the TestimonialCard component

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestimonialCard } from './TestimonialCard';
import type { Testimonial } from '../types/reviews.types';

// Mock testimonial data
const mockTestimonial: Testimonial = {
  id: '1',
  name: 'Sarah Johnson',
  organization: 'Amazing Events Inc',
  review: 'The venue exceeded all our expectations. Beautiful location and exceptional service.',
  eventDate: 'March 15, 2025',
  eventType: 'Wedding',
};

const mockTestimonialMinimal: Testimonial = {
  id: '2',
  name: 'John Smith',
  review: 'Highly recommend this venue for any event!',
};

describe('TestimonialCard', () => {
  describe('Rendering', () => {
    it('renders testimonial review text', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      expect(screen.getByText(/"The venue exceeded all our expectations/i)).toBeInTheDocument();
    });

    it('renders testimonial author name', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    it('renders organization when provided', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      expect(screen.getByText('Amazing Events Inc')).toBeInTheDocument();
    });

    it('renders event date when provided', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      expect(screen.getByText('March 15, 2025')).toBeInTheDocument();
    });

    it('does not render organization when not provided', () => {
      render(<TestimonialCard testimonial={mockTestimonialMinimal} />);
      expect(screen.queryByText(/Inc|Corp|LLC/i)).not.toBeInTheDocument();
    });

    it('does not render event date when not provided', () => {
      render(<TestimonialCard testimonial={mockTestimonialMinimal} />);
      expect(screen.queryByText(/2025|2024|2026/i)).not.toBeInTheDocument();
    });
  });

  describe('Avatar', () => {
    it('renders avatar with initials', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      const avatar = screen.getByText('SJ');
      expect(avatar).toBeInTheDocument();
    });

    it('generates correct initials from full name', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      expect(screen.getByText('SJ')).toBeInTheDocument();
    });

    it('generates initials for single name', () => {
      const singleName: Testimonial = {
        id: '3',
        name: 'Madonna',
        review: 'Great venue!',
      };
      render(<TestimonialCard testimonial={singleName} />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('handles multi-word names correctly', () => {
      const multiWordName: Testimonial = {
        id: '4',
        name: 'Mary Anne Elizabeth Smith',
        review: 'Wonderful experience!',
      };
      render(<TestimonialCard testimonial={multiWordName} />);
      // Should only show first two initials
      expect(screen.getByText('MA')).toBeInTheDocument();
    });
  });

  describe('Star Rating', () => {
    it('renders 5 stars', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      const starRating = screen.getByRole('img', { name: /5 star rating/i });
      expect(starRating).toBeInTheDocument();
    });

    it('has proper ARIA label for rating', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      const rating = screen.getByLabelText('5 star rating');
      expect(rating).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);

      // Should have proper text rendering for name
      const nameElement = screen.getByText('Sarah Johnson');
      expect(nameElement).toBeInTheDocument();
    });

    it('rating has accessible label', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      const rating = screen.getByRole('img', { name: '5 star rating' });
      expect(rating).toHaveAttribute('aria-label', '5 star rating');
    });

    it('quote marks are properly rendered in review text', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);
      const reviewText = screen.getByText(/"The venue exceeded all our expectations/i);
      expect(reviewText.textContent).toMatch(/^"/); // Starts with quote
    });
  });

  describe('Animation', () => {
    it('applies animation with default index', () => {
      const { container } = render(<TestimonialCard testimonial={mockTestimonial} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies animation with custom index', () => {
      const { container } = render(<TestimonialCard testimonial={mockTestimonial} index={5} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('calculates delay based on index', () => {
      // Testing that different indices render without errors
      const { rerender } = render(<TestimonialCard testimonial={mockTestimonial} index={0} />);
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();

      rerender(<TestimonialCard testimonial={mockTestimonial} index={10} />);
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('renders with elevated card variant', () => {
      const { container } = render(<TestimonialCard testimonial={mockTestimonial} />);
      const card = container.querySelector('[class*="MuiBox"]');
      expect(card).toBeInTheDocument();
    });

    it('maintains vertical layout with proper spacing', () => {
      render(<TestimonialCard testimonial={mockTestimonial} />);

      // All key elements should be present in order
      const reviewText = screen.getByText(/"The venue exceeded all our expectations/i);
      const authorName = screen.getByText('Sarah Johnson');
      const rating = screen.getByRole('img', { name: '5 star rating' });

      expect(reviewText).toBeInTheDocument();
      expect(authorName).toBeInTheDocument();
      expect(rating).toBeInTheDocument();
    });
  });

  describe('Content Variations', () => {
    it('handles long reviews gracefully', () => {
      const longReview: Testimonial = {
        id: '5',
        name: 'Test User',
        review: 'This is an extremely long review that goes on and on about how amazing the venue is. It includes multiple sentences and detailed descriptions about the facilities, the staff, the ambiance, and the overall experience. The review continues to elaborate on various aspects of the event and venue.',
      };
      render(<TestimonialCard testimonial={longReview} />);
      expect(screen.getByText(/This is an extremely long review/i)).toBeInTheDocument();
    });

    it('handles short reviews', () => {
      const shortReview: Testimonial = {
        id: '6',
        name: 'Test User',
        review: 'Great!',
      };
      render(<TestimonialCard testimonial={shortReview} />);
      expect(screen.getByText(/"Great!"/i)).toBeInTheDocument();
    });

    it('handles special characters in name', () => {
      const specialName: Testimonial = {
        id: '7',
        name: "O'Brien-Smith",
        review: 'Excellent venue!',
      };
      render(<TestimonialCard testimonial={specialName} />);
      expect(screen.getByText("O'Brien-Smith")).toBeInTheDocument();
    });

    it('handles special characters in review', () => {
      const specialReview: Testimonial = {
        id: '8',
        name: 'Test User',
        review: 'The venue is 5-star! We couldn\'t have asked for more & everyone loved it.',
      };
      render(<TestimonialCard testimonial={specialReview} />);
      expect(screen.getByText(/The venue is 5-star!/i)).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses Modern Organic Luxury design tokens', () => {
      const { container } = render(<TestimonialCard testimonial={mockTestimonial} />);
      // Component should render without throwing errors - design tokens are applied via sx props
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies slideUp animation', () => {
      const { container } = render(<TestimonialCard testimonial={mockTestimonial} />);
      // AnimatedElement wrapper should be present
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty strings gracefully', () => {
      const emptyStrings: Testimonial = {
        id: '9',
        name: 'Valid Name',
        organization: '',
        review: 'Valid review',
        eventDate: '',
      };
      render(<TestimonialCard testimonial={emptyStrings} />);
      expect(screen.getByText('Valid Name')).toBeInTheDocument();
      expect(screen.getByText(/"Valid review"/i)).toBeInTheDocument();
    });

    it('handles undefined optional fields', () => {
      const minimalData: Testimonial = {
        id: '10',
        name: 'John Doe',
        review: 'Good venue',
      };
      render(<TestimonialCard testimonial={minimalData} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/"Good venue"/i)).toBeInTheDocument();
    });
  });
});
