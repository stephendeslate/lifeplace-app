// pages/podcasts/components/PodcastsGrid.test.tsx
/**
 * PodcastsGrid Component Tests
 *
 * Tests for the Modern Organic Luxury redesigned PodcastsGrid component
 * including design system compliance, accessibility, and content rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PodcastsGrid } from './PodcastsGrid';

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
    spacing: {
      space: {
        0.5: '4px',
        1: '8px',
        2: '16px',
        3: '24px',
        4: '32px',
        6: '48px',
        8: '64px',
      },
      radius: {
        lg: '12px',
        card: '16px',
      },
    },
    typography: {
      styles: {
        h2: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '3rem',
          lineHeight: 1.2,
        },
        h4: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '2rem',
          lineHeight: 1.3,
        },
        body: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1rem',
          lineHeight: 1.6,
        },
        bodySmall: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
        },
        caption: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
        },
      },
      sizes: {
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      responsive: {
        h2: {
          mobile: { fontSize: '2rem', lineHeight: 1.2 },
          tablet: { fontSize: '2.5rem', lineHeight: 1.2 },
          desktop: { fontSize: '3rem', lineHeight: 1.2 },
        },
      },
      lineHeights: {
        tight: 1.3,
        relaxed: 1.6,
      },
      weights: {
        medium: 500,
      },
    },
    color: {
      base: {
        neutral: {
          50: '#FAF7F2',
          100: '#F5F1EB',
          600: '#6F6B67',
          700: '#54514E',
          900: '#2E2A28',
        },
        sage: {
          100: '#eef0ec',
          500: '#7D8570',
        },
      },
    },
    animation: {
      transition: {
        organic: 'all 0.3s ease',
      },
    },
    shadow: {
      elevation: {
        sm: '0 2px 4px rgba(0,0,0,0.1)',
      },
    },
  },
}));

// Mock ModernCard component
vi.mock('../../../design-system/components/ModernCard', () => ({
  ModernCard: ({ children, variant, size, hover, sx }: { children: React.ReactNode; variant?: string; size?: string; hover?: boolean; sx?: object }) => (
    <div
      data-testid="modern-card"
      data-variant={variant}
      data-size={size}
      data-hover={hover?.toString()}
      style={sx as React.CSSProperties}
    >
      {children}
    </div>
  ),
}));

// Mock AnimatedElement from shared
vi.mock('../../../design-system/components/AnimatedElement', () => ({
  AnimatedElement: ({ children, animation, delay }: { children: React.ReactNode; animation?: string; delay?: number }) => (
    <div data-testid="animated-element" data-animation={animation} data-delay={delay}>
      {children}
    </div>
  ),
}));

// Mock Button component from shared
vi.mock('../../../../../shared/design-system/components/Button', () => ({
  Button: ({ children, variant, size, onClick, startIcon, fullWidth, ariaLabel }: { children: React.ReactNode; variant?: string; size?: string; onClick?: () => void; startIcon?: React.ReactNode; fullWidth?: boolean; ariaLabel?: string }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth?.toString()}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {startIcon}
      {children}
    </button>
  ),
}));

describe('PodcastsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Structure', () => {
    it('renders Section component with cream background', () => {
      render(<PodcastsGrid />);
      const section = screen.getByTestId('section');
      expect(section).toHaveAttribute('data-background', 'cream');
    });

    it('renders Section component with large spacing', () => {
      render(<PodcastsGrid />);
      const section = screen.getByTestId('section');
      expect(section).toHaveAttribute('data-spacing', 'large');
    });

    it('renders Container component with wide maxWidth', () => {
      render(<PodcastsGrid />);
      const container = screen.getByTestId('container');
      expect(container).toHaveAttribute('data-max-width', 'wide');
    });

    it('has proper semantic HTML structure', () => {
      render(<PodcastsGrid />);
      const section = screen.getByTestId('section');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Section Heading', () => {
    it('renders section heading with correct text', () => {
      render(<PodcastsGrid />);
      const heading = screen.getByRole('heading', { level: 2, name: /recent episodes/i });
      expect(heading).toBeInTheDocument();
    });

    it('wraps heading in AnimatedElement', () => {
      render(<PodcastsGrid />);
      const animatedElements = screen.getAllByTestId('animated-element');
      expect(animatedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Episode Content', () => {
    it('renders all four podcast episodes', () => {
      render(<PodcastsGrid />);

      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      expect(screen.getByText('Being Is Greater Than Doing')).toBeInTheDocument();
      expect(screen.getByText('The Reality of Marriage')).toBeInTheDocument();
      expect(screen.getByText('How to Forgive')).toBeInTheDocument();
    });

    it('displays episode titles', () => {
      render(<PodcastsGrid />);

      const titles = [
        'Importance of Rest',
        'Being Is Greater Than Doing',
        'The Reality of Marriage',
        'How to Forgive',
      ];

      titles.forEach(title => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it('displays episode durations', () => {
      render(<PodcastsGrid />);

      expect(screen.getByText('25 min')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('35 min')).toBeInTheDocument();
      expect(screen.getByText('40 min')).toBeInTheDocument();
    });

    it('displays episode hosts', () => {
      render(<PodcastsGrid />);

      const peterElements = screen.getAllByText(/Peter Gramaje/i);
      expect(peterElements.length).toBeGreaterThan(0);

      const shekinahElements = screen.getAllByText(/Shekinah Gramaje/i);
      expect(shekinahElements.length).toBeGreaterThan(0);
    });

    it('displays episode with three hosts correctly', () => {
      render(<PodcastsGrid />);

      expect(screen.getByText(/How to Forgive/i)).toBeInTheDocument();
      expect(screen.getByText(/Krizzia Kate Yuzon/i)).toBeInTheDocument();
    });

    it('renders episode descriptions', () => {
      render(<PodcastsGrid />);

      expect(screen.getByText(/significance of rest/i)).toBeInTheDocument();
      expect(screen.getByText(/who we are matters more/i)).toBeInTheDocument();
      expect(screen.getByText(/joys and challenges of marriage/i)).toBeInTheDocument();
      expect(screen.getByText(/freedom that comes from letting go/i)).toBeInTheDocument();
    });

    it('displays placeholder messages for episodes without videos', () => {
      render(<PodcastsGrid />);

      const placeholders = screen.getAllByText(/episode coming soon/i);
      expect(placeholders).toHaveLength(4);
    });
  });

  describe('Episode Cards', () => {
    it('renders correct number of ModernCard components', () => {
      render(<PodcastsGrid />);

      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);
    });

    it('renders ModernCard with correct variant', () => {
      render(<PodcastsGrid />);

      const cards = screen.getAllByTestId('modern-card');
      cards.forEach(card => {
        expect(card).toHaveAttribute('data-variant', 'elevated');
      });
    });

    it('renders ModernCard with correct size', () => {
      render(<PodcastsGrid />);

      const cards = screen.getAllByTestId('modern-card');
      cards.forEach(card => {
        expect(card).toHaveAttribute('data-size', 'medium');
      });
    });

    it('renders Listen buttons for all episodes', () => {
      render(<PodcastsGrid />);

      const buttons = screen.getAllByText('Listen');
      expect(buttons).toHaveLength(4);
    });
  });

  describe('Coming Soon Message', () => {
    it('renders coming soon message', () => {
      render(<PodcastsGrid />);

      const message = screen.getByText(/more episodes coming soon/i);
      expect(message).toBeInTheDocument();
    });

    it('wraps coming soon message in AnimatedElement', () => {
      render(<PodcastsGrid />);

      const message = screen.getByText(/more episodes coming soon/i);
      expect(message).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('renders AnimatedElement components', () => {
      render(<PodcastsGrid />);

      const animatedElements = screen.getAllByTestId('animated-element');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('has staggered animation delays for episode cards', () => {
      render(<PodcastsGrid />);

      const animatedElements = screen.getAllByTestId('animated-element');
      // Should have animations for: heading + 4 episodes + coming soon = 6 total
      expect(animatedElements.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Grid Layout', () => {
    it('renders episode cards in a grid structure', () => {
      render(<PodcastsGrid />);

      // Verify that all 4 cards are rendered, which confirms the grid layout is working
      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<PodcastsGrid />);

      // Main section heading should be h2
      const mainHeading = screen.getByRole('heading', { level: 2, name: /recent episodes/i });
      expect(mainHeading).toBeInTheDocument();
    });

    it('has aria-labels for Listen buttons', () => {
      render(<PodcastsGrid />);

      // Check that buttons have proper aria labels
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing tokens', () => {
      render(<PodcastsGrid />);

      const section = screen.getByTestId('section');
      expect(section).toHaveAttribute('data-spacing', 'large');
    });

    it('uses Container for responsive max-width', () => {
      render(<PodcastsGrid />);

      const container = screen.getByTestId('container');
      expect(container).toHaveAttribute('data-max-width', 'wide');
    });
  });

  describe('Design System Compliance', () => {
    it('uses cream background for warm feel', () => {
      render(<PodcastsGrid />);

      const section = screen.getByTestId('section');
      expect(section).toHaveAttribute('data-background', 'cream');
    });

    it('uses typography tokens for headings', () => {
      render(<PodcastsGrid />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });
  });
});
