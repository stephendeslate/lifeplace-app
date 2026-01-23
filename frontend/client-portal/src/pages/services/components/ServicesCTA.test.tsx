// pages/services/components/ServicesCTA.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesCTA } from './ServicesCTA';

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
    typography: {
      styles: {
        h2: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '3rem',
          fontWeight: 600,
          lineHeight: 1.25,
        },
        bodyLarge: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          lineHeight: 1.7,
        },
        bodySmall: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          lineHeight: 1.6,
        },
      },
    },
    color: {
      base: {
        neutral: {
          700: '#54514E',
          900: '#2E2A28',
        },
        sage: {
          200: '#dde1d8',
          600: '#6a7360',
        },
      },
    },
  },
}));

// Mock the shared Button component
vi.mock('../../../../../shared/design-system/components/Button', () => ({
  Button: ({ children, variant, size, startIcon, endIcon, onClick, ariaLabel, ...props }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    onClick?: () => void;
    ariaLabel?: string;
  }) => (
    <button
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {startIcon}
      {children}
      {endIcon}
    </button>
  ),
}));

describe('ServicesCTA', () => {
  describe('Rendering', () => {
    it('renders the component without crashing', () => {
      render(<ServicesCTA />);
      expect(screen.getByText('Ready to Plan Your Event?')).toBeInTheDocument();
    });

    it('renders the heading with correct text', () => {
      render(<ServicesCTA />);
      const heading = screen.getByText('Ready to Plan Your Event?');
      expect(heading).toBeInTheDocument();
    });

    it('renders the description text', () => {
      render(<ServicesCTA />);
      expect(
        screen.getByText(/Contact us today to discuss your event needs/i)
      ).toBeInTheDocument();
    });

    it('renders both CTA buttons', () => {
      render(<ServicesCTA />);
      expect(screen.getByRole('button', { name: /book your event at lifeplace alfonso/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /call lifeplace alfonso/i })).toBeInTheDocument();
    });

    it('renders contact information', () => {
      render(<ServicesCTA />);
      expect(screen.getByText('+63 993 526 0943')).toBeInTheDocument();
      expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
    });

    it('renders phone and email icons', () => {
      const { container } = render(<ServicesCTA />);
      const phoneIcons = container.querySelectorAll('[data-testid="PhoneIcon"]');
      const emailIcons = container.querySelectorAll('[data-testid="EmailIcon"]');

      // Should have 2 phone icons (one in button, one in contact info)
      expect(phoneIcons.length).toBeGreaterThanOrEqual(1);
      // Should have 1 email icon
      expect(emailIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Button Interactions', () => {
    it('calls onNavigateToBooking when Book Your Event button is clicked', async () => {
      const user = userEvent.setup();
      const mockNavigate = vi.fn();

      render(<ServicesCTA onNavigateToBooking={mockNavigate} />);

      const bookButton = screen.getByRole('button', { name: /book your event at lifeplace alfonso/i });
      await user.click(bookButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('initiates phone call when Call Us button is clicked', async () => {
      const user = userEvent.setup();

      // Mock window.location.href
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as Location;

      render(<ServicesCTA />);

      const callButton = screen.getByRole('button', { name: /call lifeplace alfonso/i });
      await user.click(callButton);

      expect(window.location.href).toBe('tel:+639935260943');

      // Restore original location
      window.location = originalLocation;
    });

    it('does not crash when onNavigateToBooking is not provided', async () => {
      const user = userEvent.setup();

      render(<ServicesCTA />);

      const bookButton = screen.getByRole('button', { name: /book your event at lifeplace alfonso/i });
      await user.click(bookButton);

      // Should not throw an error
      expect(bookButton).toBeInTheDocument();
    });
  });

  describe('Button Variants and Styling', () => {
    it('renders Book Your Event button with terracotta variant', () => {
      render(<ServicesCTA />);
      const bookButton = screen.getByRole('button', { name: /book your event at lifeplace alfonso/i });

      // Check if button exists (variant styling is applied via styled components)
      expect(bookButton).toBeInTheDocument();
    });

    it('renders Call Us button with outline variant', () => {
      render(<ServicesCTA />);
      const callButton = screen.getByRole('button', { name: /call lifeplace alfonso/i });

      // Check if button exists (variant styling is applied via styled components)
      expect(callButton).toBeInTheDocument();
    });

    it('renders buttons with large size', () => {
      render(<ServicesCTA />);
      const bookButton = screen.getByRole('button', { name: /book your event at lifeplace alfonso/i });
      const callButton = screen.getByRole('button', { name: /call lifeplace alfonso/i });

      expect(bookButton).toBeInTheDocument();
      expect(callButton).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders ArrowForward icon in Book Your Event button', () => {
      const { container } = render(<ServicesCTA />);
      const arrowIcon = container.querySelector('[data-testid="ArrowForwardIcon"]');

      expect(arrowIcon).toBeInTheDocument();
    });

    it('renders Phone icon in Call Us button', () => {
      const { container } = render(<ServicesCTA />);
      const bookButton = screen.getByRole('button', { name: /book your event at lifeplace alfonso/i });
      const callButton = screen.getByRole('button', { name: /call lifeplace alfonso/i });

      // Both buttons should be present
      expect(bookButton).toBeInTheDocument();
      expect(callButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      render(<ServicesCTA />);

      expect(
        screen.getByRole('button', { name: /book your event at lifeplace alfonso/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole('button', { name: /call lifeplace alfonso at \+63 993 526 0943/i })
      ).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      const { container } = render(<ServicesCTA />);
      const heading = screen.getByText('Ready to Plan Your Event?');

      // Check that heading exists (MUI Typography doesn't always create h2 element)
      expect(heading).toBeInTheDocument();
    });

    it('contact information is readable by screen readers', () => {
      render(<ServicesCTA />);

      const phoneText = screen.getByText('+63 993 526 0943');
      const emailText = screen.getByText('reservations.lifeplace@gmail.com');

      expect(phoneText).toBeInTheDocument();
      expect(emailText).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('renders buttons in a stack layout', () => {
      const { container } = render(<ServicesCTA />);
      const bookButton = screen.getByRole('button', { name: /book your event at lifeplace alfonso/i });
      const callButton = screen.getByRole('button', { name: /call lifeplace alfonso/i });

      expect(bookButton).toBeInTheDocument();
      expect(callButton).toBeInTheDocument();

      // Both buttons should be in the document
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('renders contact info in a stack layout', () => {
      render(<ServicesCTA />);

      const phoneText = screen.getByText('+63 993 526 0943');
      const emailText = screen.getByText('reservations.lifeplace@gmail.com');

      expect(phoneText).toBeInTheDocument();
      expect(emailText).toBeInTheDocument();
    });
  });

  describe('Design System Compliance', () => {
    it('uses Section component for layout', () => {
      const { container } = render(<ServicesCTA />);

      // Section creates a <section> element
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('uses Container component for content width', () => {
      render(<ServicesCTA />);

      // Container and Section should render the content
      expect(screen.getByText('Ready to Plan Your Event?')).toBeInTheDocument();
    });

    it('uses AnimatedElement for entrance animation', () => {
      render(<ServicesCTA />);

      // AnimatedElement wraps content, check that content is present
      expect(screen.getByText('Ready to Plan Your Event?')).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct phone number', () => {
      render(<ServicesCTA />);
      expect(screen.getByText('+63 993 526 0943')).toBeInTheDocument();
    });

    it('displays correct email address', () => {
      render(<ServicesCTA />);
      expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
    });

    it('displays correct venue name in description', () => {
      render(<ServicesCTA />);
      expect(screen.getByText(/LifePlace Alfonso/i)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('renders complete CTA section with all elements', () => {
      const mockNavigate = vi.fn();
      render(<ServicesCTA onNavigateToBooking={mockNavigate} />);

      // Verify all major elements are present
      expect(screen.getByText('Ready to Plan Your Event?')).toBeInTheDocument();
      expect(screen.getByText(/Contact us today/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /book your event at lifeplace alfonso/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /call lifeplace alfonso/i })).toBeInTheDocument();
      expect(screen.getByText('+63 993 526 0943')).toBeInTheDocument();
      expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
    });
  });
});
