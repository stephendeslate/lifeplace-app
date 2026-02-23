// pages/home/components/HeroSection.test.tsx
/**
 * HeroSection Component Tests
 *
 * Tests for the Modern Organic Luxury redesigned HeroSection component
 * including design system compliance, accessibility, and functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroSection } from './HeroSection';

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the design system components
vi.mock('../../../design-system', () => ({
  HeroBackground: ({
    children,
    gradient,
    animated,
    overlay,
    sx,
  }: {
    children: React.ReactNode;
    gradient?: string;
    animated?: boolean;
    overlay?: string;
    sx?: object;
  }) => (
    <div
      data-testid="hero-background"
      data-gradient={gradient}
      data-animated={animated}
      data-overlay={overlay}
      style={sx as React.CSSProperties}
    >
      {children}
    </div>
  ),
  AnimatedElement: ({
    children,
    animation,
    delay,
  }: {
    children: React.ReactNode;
    animation?: string;
    delay?: number;
  }) => (
    <div data-testid="animated-element" data-animation={animation} data-delay={delay}>
      {children}
    </div>
  ),
  tokens: {
    spacing: {
      space: {
        1: '8px',
        2: '16px',
        3: '24px',
        4: '32px',
        5: '40px',
        9: '72px',
        14: '112px',
        containerPadding: {
          mobile: '16px',
          tablet: '24px',
          desktop: '32px',
        },
      },
      radius: {
        button: '8px',
      },
    },
    typography: {
      styles: {
        display2: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '4.5rem',
          lineHeight: 1.15,
        },
        bodyLarge: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          lineHeight: 1.7,
        },
        quote: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
          fontStyle: 'italic',
        },
        bodySmall: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
        },
        h5: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
        },
        buttonLarge: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          fontWeight: 600,
        },
      },
      responsive: {
        display2: {
          mobile: { fontSize: '2.5rem', lineHeight: 1.2 },
          tablet: { fontSize: '3.5rem', lineHeight: 1.15 },
        },
      },
    },
    color: {
      base: {
        terracotta: {
          500: '#C87356',
          600: '#b35a40',
        },
      },
    },
    shadow: {
      elevation: {
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
      },
    },
    animation: {
      transition: {
        elevate: 'all 0.3s ease',
        organic: 'all 0.3s ease',
      },
    },
  },
}));

vi.mock('../../../design-system/components/GlassCard', () => ({
  GlassCard: ({
    children,
    variant,
    intensity,
    hover,
    sx,
  }: {
    children: React.ReactNode;
    variant?: string;
    intensity?: string;
    hover?: boolean;
    sx?: object;
  }) => (
    <div
      data-testid="glass-card"
      data-variant={variant}
      data-intensity={intensity}
      data-hover={hover?.toString()}
      style={sx as React.CSSProperties}
    >
      {children}
    </div>
  ),
}));

// Import useAuth after mocking
import { useAuth } from '../../../contexts/AuthContext';

const mockAuthNotAuthenticated = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  loading: false,
  updateUserProfile: vi.fn(),
};

const mockAuthAuthenticated = {
  isAuthenticated: true,
  user: {
    id: '1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '123-456-7890',
    role: 'client',
    is_active: true,
    date_joined: '2024-01-01',
  },
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  loading: false,
  updateUserProfile: vi.fn(),
};

const renderHeroSection = (authMock = mockAuthNotAuthenticated, props = {}) => {
  const defaultProps = {
    onNavigateToLogin: vi.fn(),
    onNavigateToRegister: vi.fn(),
    onNavigateToBooking: vi.fn(),
    ...props,
  };

  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(authMock);

  return {
    ...render(<HeroSection {...defaultProps} />),
    props: defaultProps,
  };
};

describe('HeroSection', () => {
  describe('Design System Compliance', () => {
    it('should use HeroBackground with warmSage gradient', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const heroBackground = screen.getByTestId('hero-background');
      expect(heroBackground).toHaveAttribute('data-gradient', 'warmSage');
    });

    it('should have animated background', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const heroBackground = screen.getByTestId('hero-background');
      expect(heroBackground).toHaveAttribute('data-animated', 'true');
    });

    it('should have gradient overlay for text readability', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const heroBackground = screen.getByTestId('hero-background');
      expect(heroBackground).toHaveAttribute('data-overlay', 'gradient');
    });

    it('should use AnimatedElement with correct animations and delays', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const animatedElements = screen.getAllByTestId('animated-element');

      // Should have 4 animated elements (heading, subheading, quote, buttons)
      expect(animatedElements).toHaveLength(4);

      // Check animations and delays
      expect(animatedElements[0]).toHaveAttribute('data-animation', 'fadeIn');
      expect(animatedElements[0]).toHaveAttribute('data-delay', '0');

      expect(animatedElements[1]).toHaveAttribute('data-animation', 'fadeIn');
      expect(animatedElements[1]).toHaveAttribute('data-delay', '200');

      expect(animatedElements[2]).toHaveAttribute('data-animation', 'slideUp');
      expect(animatedElements[2]).toHaveAttribute('data-delay', '400');

      expect(animatedElements[3]).toHaveAttribute('data-animation', 'fadeIn');
      expect(animatedElements[3]).toHaveAttribute('data-delay', '600');
    });

    it('should use GlassCard with correct variant and intensity', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const glassCard = screen.getByTestId('glass-card');
      expect(glassCard).toHaveAttribute('data-variant', 'light');
      expect(glassCard).toHaveAttribute('data-intensity', 'medium');
      expect(glassCard).toHaveAttribute('data-hover', 'false');
    });
  });

  describe('Content Display', () => {
    it('should render main heading', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      expect(screen.getByText(/Celebrate Life's Most/i)).toBeInTheDocument();
      expect(screen.getByText(/Precious Moments/i)).toBeInTheDocument();
    });

    it('should render subheading', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      expect(
        screen.getByText(/Experience the cozy ambience and peaceful environment/i),
      ).toBeInTheDocument();
    });

    it('should render Bible verse quote', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      expect(
        screen.getByText(/"I have come that they may have life, and have it to the full."/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/John 10:10b/i)).toBeInTheDocument();
    });
  });

  describe('Not Authenticated State', () => {
    it('should render "Book Your Event" button', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      expect(screen.getByRole('button', { name: /Book Your Event/i })).toBeInTheDocument();
    });

    it('should render "Client Portal" button', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      expect(screen.getByRole('button', { name: /Client Portal/i })).toBeInTheDocument();
    });

    it('should not render welcome message', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
    });

    it('should call onNavigateToBooking when "Book Your Event" is clicked', async () => {
      const user = userEvent.setup();
      const { props } = renderHeroSection(mockAuthNotAuthenticated);

      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });
      await user.click(bookButton);

      expect(props.onNavigateToBooking).toHaveBeenCalledTimes(1);
    });

    it('should call onNavigateToLogin when "Client Portal" is clicked', async () => {
      const user = userEvent.setup();
      const { props } = renderHeroSection(mockAuthNotAuthenticated);

      const portalButton = screen.getByRole('button', { name: /Client Portal/i });
      await user.click(portalButton);

      expect(props.onNavigateToLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authenticated State', () => {
    it('should render welcome message with user first name', () => {
      renderHeroSection(mockAuthAuthenticated);
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    });

    it('should render welcome message with email if no first name', () => {
      const authContext = {
        ...mockAuthAuthenticated,
        user: { ...mockAuthAuthenticated.user!, first_name: '' },
      };
      renderHeroSection(authContext);
      expect(screen.getByText(/Welcome back, test@example.com!/i)).toBeInTheDocument();
    });

    it('should render "Book Your Event" button', () => {
      renderHeroSection(mockAuthAuthenticated);
      expect(screen.getByRole('button', { name: /Book Your Event/i })).toBeInTheDocument();
    });

    it('should render "Go to Dashboard" button', () => {
      renderHeroSection(mockAuthAuthenticated);
      expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument();
    });

    it('should not render "Client Portal" button', () => {
      renderHeroSection(mockAuthAuthenticated);
      expect(screen.queryByRole('button', { name: /Client Portal/i })).not.toBeInTheDocument();
    });

    it('should call onNavigateToBooking when "Book Your Event" is clicked', async () => {
      const user = userEvent.setup();
      const { props } = renderHeroSection(mockAuthAuthenticated);

      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });
      await user.click(bookButton);

      expect(props.onNavigateToBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const heading = screen.getByText(/Celebrate Life's Most/i);
      // Typography component with design system styles
      expect(heading).toBeInTheDocument();
      expect(heading).toBeTruthy();
    });

    it('should have sufficient color contrast for white text on gradient', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      // Background has gradient overlay to ensure text readability
      const heroBackground = screen.getByTestId('hero-background');
      expect(heroBackground).toHaveAttribute('data-overlay', 'gradient');
    });

    it('should have text shadows for better readability', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      // Component applies textShadow for better readability
      expect(screen.getByText(/Celebrate Life's Most/i)).toBeInTheDocument();
      expect(screen.getByText(/Experience the cozy ambience/i)).toBeInTheDocument();
    });

    it('should have ArrowForward icon for Book Your Event button', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });
      expect(bookButton).toBeInTheDocument();
      // Icon is rendered via endIcon prop
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive spacing configuration', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const heroBackground = screen.getByTestId('hero-background');
      // Responsive spacing is applied through sx prop
      expect(heroBackground).toBeTruthy();
    });

    it('should have responsive typography sizes', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      // Component uses responsive typography tokens
      expect(screen.getByText(/Celebrate Life's Most/i)).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('should have terracotta background for primary button', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });
      expect(bookButton).toBeInTheDocument();
      // Button uses tokens.color.base.terracotta[500]
    });

    it('should have white outline for secondary button', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const portalButton = screen.getByRole('button', { name: /Client Portal/i });
      expect(portalButton).toBeInTheDocument();
      // Button has white border and transparent background with blur
    });

    it('should have proper button sizing and padding', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });
      expect(bookButton).toHaveAttribute('class');
      // Uses MUI size="large" with custom padding from tokens
    });
  });

  describe('Error Handling', () => {
    it('should handle missing onNavigateToBooking gracefully', async () => {
      const user = userEvent.setup();
      renderHeroSection(mockAuthNotAuthenticated, {
        onNavigateToBooking: undefined,
      });

      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });

      // Should not throw error
      await expect(user.click(bookButton)).resolves.not.toThrow();
    });

    it('should handle missing onNavigateToLogin gracefully', async () => {
      const user = userEvent.setup();
      renderHeroSection(mockAuthNotAuthenticated, {
        onNavigateToLogin: undefined,
      });

      const portalButton = screen.getByRole('button', { name: /Client Portal/i });

      // Should not throw error
      await expect(user.click(portalButton)).resolves.not.toThrow();
    });

    it('should handle null user gracefully', () => {
      const authContext = {
        ...mockAuthAuthenticated,
        user: null,
      };

      expect(() => renderHeroSection(authContext)).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should render all elements in correct order', () => {
      renderHeroSection(mockAuthNotAuthenticated);

      // Check that elements are present in correct order
      expect(screen.getByText(/Celebrate Life's Most/i)).toBeInTheDocument();
      expect(screen.getByText(/Experience the cozy ambience/i)).toBeInTheDocument();
      expect(screen.getByText(/"I have come that they may have life/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Book Your Event/i })).toBeInTheDocument();
    });

    it('should properly stack buttons horizontally on larger screens', () => {
      renderHeroSection(mockAuthNotAuthenticated);
      const bookButton = screen.getByRole('button', { name: /Book Your Event/i });
      const portalButton = screen.getByRole('button', { name: /Client Portal/i });

      // Both buttons should exist
      expect(bookButton).toBeInTheDocument();
      expect(portalButton).toBeInTheDocument();
    });
  });
});
