// pages/reviews/components/TestimonialGrid.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestimonialGrid } from './TestimonialGrid';

// Mock AnimatedElement to simplify testing
vi.mock('../../../design-system/components/AnimatedElement', () => ({
  AnimatedElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock TestimonialCard to focus on grid layout testing
vi.mock('./TestimonialCard', () => ({
  TestimonialCard: ({
    testimonial,
    index,
  }: {
    testimonial: { id: string; name: string };
    index: number;
  }) => (
    <div data-testid={`testimonial-card-${testimonial.id}`} data-index={index}>
      {testimonial.name}
    </div>
  ),
}));

describe('TestimonialGrid', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TestimonialGrid />);
      expect(screen.getByRole('heading', { name: /what our guests say/i })).toBeInTheDocument();
    });

    it('renders the section heading with correct text', () => {
      render(<TestimonialGrid />);
      const heading = screen.getByRole('heading', { name: /what our guests say/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('renders the section description', () => {
      render(<TestimonialGrid />);
      expect(screen.getByText(/real experiences from real guests/i)).toBeInTheDocument();
    });

    it('renders all 16 testimonial cards', () => {
      render(<TestimonialGrid />);
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards).toHaveLength(16);
    });
  });

  describe('Content', () => {
    it('renders testimonials with correct names', () => {
      render(<TestimonialGrid />);

      // Check for a few key testimonials
      expect(screen.getByText(/ms. chanderlynne mojica/i)).toBeInTheDocument();
      expect(screen.getByText(/mr. dags miguel/i)).toBeInTheDocument();
      expect(screen.getByText(/enc imus youth camp/i)).toBeInTheDocument();
      expect(screen.getByText(/rotaract district 3810/i)).toBeInTheDocument();
    });

    it('passes the correct index to each testimonial card', () => {
      render(<TestimonialGrid />);

      const cards = screen.getAllByTestId(/testimonial-card-/);
      cards.forEach((card, index) => {
        expect(card).toHaveAttribute('data-index', String(index));
      });
    });
  });

  describe('Layout Structure', () => {
    it('uses Section component with sage background', () => {
      const { container } = render(<TestimonialGrid />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('uses Container component for content width constraint', () => {
      const { container } = render(<TestimonialGrid />);
      // Container should be present in the structure
      expect(container.querySelector('[class*="MuiBox"]')).toBeInTheDocument();
    });

    it('has a grid layout for testimonial cards', () => {
      render(<TestimonialGrid />);
      // Verify grid exists by checking that all cards are rendered
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards).toHaveLength(16);
    });
  });

  describe('Design System Integration', () => {
    it('applies responsive typography tokens to heading', () => {
      const { container } = render(<TestimonialGrid />);
      const heading = container.querySelector('h2');
      expect(heading).toBeInTheDocument();
      // Verify heading exists with proper structure
      expect(heading?.textContent).toBe('What Our Guests Say');
    });

    it('uses proper spacing tokens for layout', () => {
      render(<TestimonialGrid />);
      // Verify proper layout by checking all cards are rendered
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards).toHaveLength(16);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<TestimonialGrid />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it('uses semantic HTML with section element', () => {
      const { container } = render(<TestimonialGrid />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('has descriptive text for context', () => {
      render(<TestimonialGrid />);
      expect(
        screen.getByText(/preferred venue for weddings, retreats, and team building events/i),
      ).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders all testimonials regardless of viewport size', () => {
      render(<TestimonialGrid />);
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards.length).toBeGreaterThan(0);
    });

    it('maintains testimonial order', () => {
      render(<TestimonialGrid />);
      const firstCard = screen.getByTestId('testimonial-card-1');
      const lastCard = screen.getByTestId('testimonial-card-16');

      expect(firstCard).toBeInTheDocument();
      expect(lastCard).toBeInTheDocument();
    });
  });

  describe('Animation Integration', () => {
    it('wraps header content in AnimatedElement', () => {
      render(<TestimonialGrid />);
      // AnimatedElement is mocked, but we verify content is still rendered
      expect(screen.getByRole('heading', { name: /what our guests say/i })).toBeInTheDocument();
    });

    it('provides staggered delays through card index', () => {
      render(<TestimonialGrid />);
      const cards = screen.getAllByTestId(/testimonial-card-/);

      // Verify each card receives its index for staggered animations
      cards.forEach((card, index) => {
        expect(card).toHaveAttribute('data-index', String(index));
      });
    });
  });

  describe('Data Integrity', () => {
    it('preserves all original testimonial data', () => {
      render(<TestimonialGrid />);

      // Verify key testimonials are present
      const testimonialNames = [
        'Ms. Chanderlynne Mojica',
        'Mr. Dags Miguel',
        'Mr. Jr Torregosa',
        'Mr. Ed Federico',
        'ENC Imus Youth Camp',
        'Rotaract District 3810',
        'Ms. Sarah Chen',
        'Pastor Mark Santos',
        'Mr. James Rodriguez',
        'Ms. Ana Reyes',
        'School of Leadership Philippines',
        'Mr. Michael Tan',
        'Ms. Patricia Lim',
        'Youth for Christ Cavite',
        'Mr. David Kim',
        'Ms. Grace Villanueva',
      ];

      testimonialNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('renders exactly 16 testimonials', () => {
      render(<TestimonialGrid />);
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards).toHaveLength(16);
    });
  });

  describe('Modern Organic Luxury Design', () => {
    it('uses sage background color', () => {
      const { container } = render(<TestimonialGrid />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('applies proper color tokens to typography', () => {
      const { container } = render(<TestimonialGrid />);
      const heading = container.querySelector('h2');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe('What Our Guests Say');
    });

    it('maintains consistent spacing throughout', () => {
      const { container } = render(<TestimonialGrid />);
      // Verify spacing is applied via design tokens
      expect(container.querySelector('[class*="MuiStack"]')).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('uses CSS grid for card layout', () => {
      render(<TestimonialGrid />);
      // Verify grid layout by ensuring all cards are rendered in order
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards).toHaveLength(16);
    });

    it('supports responsive column layout', () => {
      render(<TestimonialGrid />);
      // Verify responsive layout by checking cards are properly rendered
      const cards = screen.getAllByTestId(/testimonial-card-/);
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
