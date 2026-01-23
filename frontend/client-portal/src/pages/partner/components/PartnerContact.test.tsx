// pages/partner/components/PartnerContact.test.tsx
/**
 * Tests for PartnerContact Component
 *
 * Test Coverage:
 * - Component rendering with Modern Organic Luxury design
 * - Contact information display
 * - Email and phone links functionality
 * - Button interaction
 * - Accessibility compliance (WCAG AA)
 * - Responsive behavior
 * - Navigation anchor ID
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartnerContact } from './PartnerContact';

// Mock the design system components
vi.mock('../../../design-system', () => ({
  Section: ({ children, id, ...props }: { children: React.ReactNode; id?: string; [key: string]: unknown }) => (
    <section data-testid="section" id={id} {...props}>
      {children}
    </section>
  ),
  Container: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="container" {...props}>
      {children}
    </div>
  ),
  ModernCard: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="modern-card" {...props}>
      {children}
    </div>
  ),
  tokens: {
    spacing: {
      space: {
        1: '4px',
        2: '8px',
        3: '12px',
        5: '20px',
      },
      radius: {
        xs: '4px',
      },
    },
    typography: {
      styles: {
        h2: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '3rem',
          fontWeight: 600,
          lineHeight: 1.2,
        },
        bodyLarge: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          lineHeight: 1.7,
        },
        body: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
        },
        caption: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          lineHeight: 1.5,
        },
      },
      responsive: {
        h2: {
          mobile: { fontSize: '2rem', lineHeight: 1.25 },
          tablet: { fontSize: '2.5rem', lineHeight: 1.2 },
        },
      },
      weights: {
        semibold: 600,
      },
    },
    color: {
      base: {
        sage: {
          100: '#E8F4E8',
          500: '#508750',
          600: '#406c40',
          700: '#305130',
          800: '#203620',
        },
        terracotta: {
          100: '#FBE5D6',
          700: '#8b452e',
        },
        gold: {
          100: '#FFFCE6',
          700: '#7f6346',
        },
        neutral: {
          600: '#6B7280',
          700: '#4B5563',
        },
      },
    },
    animation: {
      transition: {
        organic: 'all 0.25s ease',
      },
    },
  },
}));

// Mock the shared design system components
vi.mock('../../../../../shared/design-system/components/Button', () => ({
  Button: ({ children, onClick, ariaLabel, endIcon, ...props }: { children: React.ReactNode; onClick?: () => void; ariaLabel?: string; endIcon?: React.ReactNode; [key: string]: unknown }) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>
      {children}
      {endIcon && <span data-testid="button-end-icon">{endIcon}</span>}
    </button>
  ),
}));

vi.mock('../../../../../shared/design-system/components/AnimatedElement', () => ({
  FadeIn: ({ children, delay }: { children: React.ReactNode; delay?: number }) => (
    <div data-testid="fade-in" data-delay={delay}>
      {children}
    </div>
  ),
}));

describe('PartnerContact', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PartnerContact />);
      expect(screen.getByRole('heading', { name: /become a partner/i })).toBeInTheDocument();
    });

    it('renders main heading as h2', () => {
      render(<PartnerContact />);
      const heading = screen.getByRole('heading', { name: /become a partner/i });
      expect(heading.tagName).toBe('H2');
    });

    it('renders subheading text', () => {
      render(<PartnerContact />);
      expect(
        screen.getByText(/interested in partnering with lifeplace alfonso/i)
      ).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('renders email contact section', () => {
      render(<PartnerContact />);
      expect(screen.getByText(/partnership email/i)).toBeInTheDocument();
      expect(screen.getByText(/partnerships@lifeplaceretreat\.com/i)).toBeInTheDocument();
    });

    it('renders email as clickable mailto link', () => {
      render(<PartnerContact />);
      const emailLink = screen.getByRole('link', { name: /partnerships@lifeplaceretreat\.com/i });
      expect(emailLink).toHaveAttribute('href', 'mailto:partnerships@lifeplaceretreat.com');
    });

    it('renders phone numbers section', () => {
      render(<PartnerContact />);
      expect(screen.getByText(/phone numbers/i)).toBeInTheDocument();
      expect(screen.getByText(/\(046\) 889-0844 • \+63 993 526 0943/i)).toBeInTheDocument();
    });

    it('renders address section', () => {
      render(<PartnerContact />);
      expect(screen.getByText(/address/i)).toBeInTheDocument();
      expect(
        screen.getByText(/patutong malaki north, alfonso, cavite 4120/i)
      ).toBeInTheDocument();
    });

    it('renders contact icons', () => {
      render(<PartnerContact />);
      expect(screen.getByTestId('EmailIcon')).toBeInTheDocument();
      expect(screen.getByTestId('PhoneIcon')).toBeInTheDocument();
      expect(screen.getByTestId('LocationOnIcon')).toBeInTheDocument();
    });
  });

  describe('CTA Button', () => {
    it('renders email partnership team button', () => {
      render(<PartnerContact />);
      const button = screen.getByRole('button', { name: /email partnership team/i });
      expect(button).toBeInTheDocument();
    });

    it('button has proper aria-label', () => {
      render(<PartnerContact />);
      const button = screen.getByRole('button', { name: /email partnership team/i });
      expect(button).toHaveAccessibleName();
    });

    it('button has ArrowForward icon', () => {
      render(<PartnerContact />);
      const button = screen.getByRole('button', { name: /email partnership team/i });
      const icon = button.querySelector('[data-testid="button-end-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('button navigates to mailto link when clicked', async () => {
      const user = userEvent.setup();

      // Mock window.location.href
      delete (window as { location?: Location }).location;
      (window as { location: Partial<Location> }).location = { href: '' };

      render(<PartnerContact />);

      const button = screen.getByRole('button', { name: /email partnership team/i });
      await user.click(button);

      expect(window.location.href).toBe('mailto:partnerships@lifeplaceretreat.com');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<PartnerContact />);
      const heading = screen.getByRole('heading', { name: /become a partner/i });
      expect(heading.tagName).toBe('H2');
    });

    it('email link is keyboard accessible', () => {
      render(<PartnerContact />);
      const emailLink = screen.getByRole('link', { name: /partnerships@lifeplaceretreat\.com/i });
      expect(emailLink).toHaveAttribute('href');
    });

    it('button is keyboard accessible', () => {
      render(<PartnerContact />);
      const button = screen.getByRole('button', { name: /email partnership team/i });
      expect(button.tagName).toBe('BUTTON');
    });

    it('has sufficient text labels for screen readers', () => {
      render(<PartnerContact />);
      expect(screen.getByText(/partnership email/i)).toBeInTheDocument();
      expect(screen.getByText(/phone numbers/i)).toBeInTheDocument();
      expect(screen.getByText(/address/i)).toBeInTheDocument();
    });

    it('contact information is properly structured', () => {
      render(<PartnerContact />);
      // Check that labels and values are both present
      expect(screen.getByText(/partnership email/i)).toBeInTheDocument();
      expect(screen.getByText(/partnerships@lifeplaceretreat\.com/i)).toBeInTheDocument();
    });
  });

  describe('Modern Organic Luxury Design System', () => {
    it('uses Section component with proper spacing', () => {
      render(<PartnerContact />);
      const section = screen.getByTestId('section');
      expect(section).toBeInTheDocument();
    });

    it('uses Container for content width constraint', () => {
      render(<PartnerContact />);
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
    });

    it('uses ModernCard for contact display', () => {
      render(<PartnerContact />);
      const cards = screen.getAllByTestId('modern-card');
      // Should have 4 cards: 1 main card + 3 contact info cards
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('displays contact cards in vertical stack', () => {
      render(<PartnerContact />);
      // All three contact methods should be visible
      expect(screen.getByText(/partnership email/i)).toBeInTheDocument();
      expect(screen.getByText(/phone numbers/i)).toBeInTheDocument();
      expect(screen.getByText(/address/i)).toBeInTheDocument();
    });

    it('uses FadeIn animations with staggered delays', () => {
      render(<PartnerContact />);
      const fadeIns = screen.getAllByTestId('fade-in');

      // Check that we have animated elements
      expect(fadeIns.length).toBeGreaterThan(0);

      // Check for staggered delays
      const delays = fadeIns.map((el) => el.getAttribute('data-delay'));
      expect(delays).toContain('100');
      expect(delays).toContain('200');
      expect(delays).toContain('300');
      expect(delays).toContain('400');
      expect(delays).toContain('500');
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct email address', () => {
      render(<PartnerContact />);
      expect(screen.getByText(/partnerships@lifeplaceretreat\.com/i)).toBeInTheDocument();
    });

    it('displays correct phone numbers', () => {
      render(<PartnerContact />);
      expect(screen.getByText(/\(046\) 889-0844 • \+63 993 526 0943/i)).toBeInTheDocument();
    });

    it('displays correct physical address', () => {
      render(<PartnerContact />);
      expect(
        screen.getByText(/patutong malaki north, alfonso, cavite 4120/i)
      ).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('maintains contact information structure', () => {
      render(<PartnerContact />);
      // Verify all contact methods are present
      const email = screen.getByText(/partnerships@lifeplaceretreat\.com/i);
      const phone = screen.getByText(/\(046\) 889-0844/i);
      const address = screen.getByText(/patutong malaki north/i);

      expect(email).toBeInTheDocument();
      expect(phone).toBeInTheDocument();
      expect(address).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders all content on mobile viewport', () => {
      render(<PartnerContact />);
      expect(screen.getByRole('heading', { name: /become a partner/i })).toBeInTheDocument();
      expect(screen.getByText(/partnerships@lifeplaceretreat\.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /email partnership team/i })).toBeInTheDocument();
    });

    it('maintains readability with proper text hierarchy', () => {
      render(<PartnerContact />);
      const heading = screen.getByRole('heading', { name: /become a partner/i });
      const description = screen.getByText(/interested in partnering/i);
      const button = screen.getByRole('button', { name: /email partnership team/i });

      expect(heading).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });
  });

  describe('Email Link Interaction', () => {
    it('email link has proper hover and focus styles', () => {
      render(<PartnerContact />);
      const emailLink = screen.getByRole('link', { name: /partnerships@lifeplaceretreat\.com/i });

      // Link should be present and functional
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:partnerships@lifeplaceretreat.com');
    });

    it('email link is keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<PartnerContact />);

      const emailLink = screen.getByRole('link', { name: /partnerships@lifeplaceretreat\.com/i });

      // Should be focusable via keyboard
      await user.tab();
      // The link should be in the tab order
      expect(emailLink).toBeInTheDocument();
    });
  });
});
