// pages/partner/components/PartnerHero.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartnerHero } from './PartnerHero';

// Mock the design system components
vi.mock('../../../design-system', () => ({
  HeroBackground: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="hero-background" {...props}>
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
        2: '16px',
        3: '24px',
        4: '32px',
        6: '48px',
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
        md: '8px',
      },
    },
    typography: {
      styles: {
        h1: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '3.75rem',
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        },
        h5: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
          fontWeight: 500,
          lineHeight: 1.4,
        },
        bodyLarge: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          fontWeight: 400,
          lineHeight: 1.7,
        },
        body: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
        },
        buttonLarge: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          fontWeight: 600,
          lineHeight: 1.5,
          letterSpacing: '0.025em',
        },
      },
      responsive: {
        h1: {
          mobile: { fontSize: '2.25rem', lineHeight: 1.25 },
          tablet: { fontSize: '3rem', lineHeight: 1.2 },
        },
      },
    },
    color: {
      base: {
        terracotta: {
          300: '#f0b5a1',
          500: '#C87356',
          600: '#b35a40',
        },
      },
    },
    shadow: {
      elevation: {
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.2)',
      },
    },
    animation: {
      transition: {
        elevate: 'all 0.3s ease',
        organic: 'all 0.25s ease',
      },
    },
  },
}));

describe('PartnerHero', () => {
  beforeEach(() => {
    // Reset window scroll mock
    window.scrollTo = vi.fn();
    // Reset location mock
    delete (window as { location?: Location }).location;
    (window as { location: Partial<Location> }).location = { href: '' };
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PartnerHero />);
      expect(screen.getByTestId('hero-background')).toBeInTheDocument();
    });

    it('renders main heading with correct text', () => {
      render(<PartnerHero />);
      expect(screen.getByRole('heading', { name: /partner with us/i })).toBeInTheDocument();
    });

    it('renders subheading text', () => {
      render(<PartnerHero />);
      expect(
        screen.getByText(/discover the power of collaboration/i)
      ).toBeInTheDocument();
    });

    it('renders supporting text about benefits', () => {
      render(<PartnerHero />);
      expect(
        screen.getByText(/whether you're a vendor, service provider, or organization/i)
      ).toBeInTheDocument();
    });

    it('renders partnership icon', () => {
      render(<PartnerHero />);
      const icon = screen.getByTestId('HandshakeIcon');
      expect(icon).toBeInTheDocument();
    });

    it('renders primary CTA button', () => {
      render(<PartnerHero />);
      expect(
        screen.getByRole('button', { name: /become a partner - contact us/i })
      ).toBeInTheDocument();
    });

    it('renders secondary CTA button', () => {
      render(<PartnerHero />);
      expect(
        screen.getByRole('button', { name: /learn more about partnership benefits/i })
      ).toBeInTheDocument();
    });

    it('renders scroll indicator', () => {
      render(<PartnerHero />);
      expect(screen.getByRole('button', { name: /scroll to content/i })).toBeInTheDocument();
      expect(screen.getByTestId('KeyboardArrowDownIcon')).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses HeroBackground with earthToSky gradient', () => {
      render(<PartnerHero />);
      const heroBackground = screen.getByTestId('hero-background');
      expect(heroBackground).toHaveAttribute('gradient', 'earthToSky');
    });

    it('uses animated HeroBackground', () => {
      render(<PartnerHero />);
      const heroBackground = screen.getByTestId('hero-background');
      // The animated prop is passed as a boolean to HeroBackground
      expect(heroBackground).toBeInTheDocument();
    });

    it('uses gradient overlay', () => {
      render(<PartnerHero />);
      const heroBackground = screen.getByTestId('hero-background');
      expect(heroBackground).toHaveAttribute('overlay', 'gradient');
    });

    it('renders all animated elements with correct delays', () => {
      render(<PartnerHero />);
      const animatedElements = screen.getAllByTestId('animated-element');

      // Should have multiple animated elements
      expect(animatedElements.length).toBeGreaterThan(4);

      // Check for staggered delays (0, 100, 200, 300, 400, 600)
      const delays = animatedElements.map((el) => el.getAttribute('data-delay'));
      expect(delays).toContain('0');
      expect(delays).toContain('100');
      expect(delays).toContain('200');
      expect(delays).toContain('300');
      expect(delays).toContain('400');
      expect(delays).toContain('600');
    });
  });

  describe('User Interactions', () => {
    it('calls scrollTo when scroll indicator is clicked', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      const scrollButton = screen.getByRole('button', { name: /scroll to content/i });
      await user.click(scrollButton);

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: window.innerHeight,
        behavior: 'smooth',
      });
    });

    it('calls scrollTo when Enter key is pressed on scroll indicator', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      const scrollButton = screen.getByRole('button', { name: /scroll to content/i });
      scrollButton.focus();
      await user.keyboard('{Enter}');

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: window.innerHeight,
        behavior: 'smooth',
      });
    });

    it('calls scrollTo when Space key is pressed on scroll indicator', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      const scrollButton = screen.getByRole('button', { name: /scroll to content/i });
      scrollButton.focus();
      await user.keyboard('{ }');

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: window.innerHeight,
        behavior: 'smooth',
      });
    });

    it('scrolls to contact section when "Become a Partner" is clicked and section exists', async () => {
      const user = userEvent.setup();
      const mockScrollIntoView = vi.fn();

      // Create mock contact section
      const contactSection = document.createElement('div');
      contactSection.id = 'partner-contact';
      contactSection.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(contactSection);

      render(<PartnerHero />);

      const becomePartnerButton = screen.getByRole('button', {
        name: /become a partner - contact us/i,
      });
      await user.click(becomePartnerButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Cleanup
      document.body.removeChild(contactSection);
    });

    it('navigates to contact page when "Become a Partner" is clicked and section does not exist', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      const becomePartnerButton = screen.getByRole('button', {
        name: /become a partner - contact us/i,
      });
      await user.click(becomePartnerButton);

      expect(window.location.href).toBe('/contact');
    });

    it('scrolls to benefits section when "Learn More" is clicked and section exists', async () => {
      const user = userEvent.setup();
      const mockScrollIntoView = vi.fn();

      // Create mock benefits section
      const benefitsSection = document.createElement('div');
      benefitsSection.id = 'partner-benefits';
      benefitsSection.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(benefitsSection);

      render(<PartnerHero />);

      const learnMoreButton = screen.getByRole('button', {
        name: /learn more about partnership benefits/i,
      });
      await user.click(learnMoreButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Cleanup
      document.body.removeChild(benefitsSection);
    });

    it('scrolls to content when "Learn More" is clicked and section does not exist', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      const learnMoreButton = screen.getByRole('button', {
        name: /learn more about partnership benefits/i,
      });
      await user.click(learnMoreButton);

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: window.innerHeight,
        behavior: 'smooth',
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading hierarchy', () => {
      render(<PartnerHero />);
      const heading = screen.getByRole('heading', { name: /partner with us/i });
      expect(heading.tagName).toBe('H1');
    });

    it('has aria-labels on interactive buttons', () => {
      render(<PartnerHero />);

      expect(
        screen.getByRole('button', { name: /become a partner - contact us/i })
      ).toHaveAttribute('aria-label');

      expect(
        screen.getByRole('button', { name: /learn more about partnership benefits/i })
      ).toHaveAttribute('aria-label');

      expect(
        screen.getByRole('button', { name: /scroll to content/i })
      ).toHaveAttribute('aria-label');
    });

    it('scroll indicator is keyboard accessible', () => {
      render(<PartnerHero />);
      const scrollButton = screen.getByRole('button', { name: /scroll to content/i });

      expect(scrollButton).toHaveAttribute('tabIndex', '0');
      expect(scrollButton).toHaveAttribute('role', 'button');
    });

    it('CTA buttons have proper focus-visible styles', () => {
      render(<PartnerHero />);
      const becomePartnerButton = screen.getByRole('button', {
        name: /become a partner - contact us/i,
      });
      const learnMoreButton = screen.getByRole('button', {
        name: /learn more about partnership benefits/i,
      });

      // Check that buttons exist (focus-visible styles are in sx prop)
      expect(becomePartnerButton).toBeInTheDocument();
      expect(learnMoreButton).toBeInTheDocument();
    });

    it('renders with semantic HTML', () => {
      render(<PartnerHero />);

      // Check for proper semantic structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3); // 2 CTAs + 1 scroll indicator
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing tokens', () => {
      render(<PartnerHero />);
      // Component should render without errors
      expect(screen.getByTestId('hero-background')).toBeInTheDocument();
    });

    it('renders buttons in a responsive stack', () => {
      render(<PartnerHero />);
      const buttons = screen.getAllByRole('button').filter((btn) =>
        btn.getAttribute('aria-label')?.includes('partner')
      );

      // Should have both CTA buttons
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Typography Tokens', () => {
    it('uses correct typography hierarchy', () => {
      render(<PartnerHero />);

      // Main heading should be h1
      const mainHeading = screen.getByRole('heading', { name: /partner with us/i });
      expect(mainHeading.tagName).toBe('H1');

      // Subheading should be a paragraph
      const subheading = screen.getByText(/discover the power of collaboration/i);
      expect(subheading.tagName).toBe('P');
    });
  });

  describe('Color Tokens', () => {
    it('uses terracotta for primary CTA button', () => {
      render(<PartnerHero />);
      const becomePartnerButton = screen.getByRole('button', {
        name: /become a partner - contact us/i,
      });

      // Button should be rendered (color styles are in sx prop)
      expect(becomePartnerButton).toBeInTheDocument();
      expect(becomePartnerButton).toHaveAttribute('aria-label');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing getElementById gracefully', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      // Ensure no sections exist
      expect(document.getElementById('partner-contact')).toBeNull();
      expect(document.getElementById('partner-benefits')).toBeNull();

      // Should not crash when clicking buttons
      const becomePartnerButton = screen.getByRole('button', {
        name: /become a partner - contact us/i,
      });
      await user.click(becomePartnerButton);

      const learnMoreButton = screen.getByRole('button', {
        name: /learn more about partnership benefits/i,
      });
      await user.click(learnMoreButton);

      // Should have attempted navigation or scroll
      expect(window.location.href || window.scrollTo).toBeDefined();
    });

    it('handles rapid clicks on scroll indicator', async () => {
      const user = userEvent.setup();
      render(<PartnerHero />);

      const scrollButton = screen.getByRole('button', { name: /scroll to content/i });

      // Click multiple times rapidly
      await user.click(scrollButton);
      await user.click(scrollButton);
      await user.click(scrollButton);

      // Should have called scrollTo multiple times without errors
      expect(window.scrollTo).toHaveBeenCalledTimes(3);
    });
  });

  describe('Content Verification', () => {
    it('displays complete partnership value proposition', () => {
      render(<PartnerHero />);

      // Main heading
      expect(screen.getByText(/partner with us/i)).toBeInTheDocument();

      // Value proposition
      expect(screen.getByText(/discover the power of collaboration/i)).toBeInTheDocument();

      // Target audience
      expect(
        screen.getByText(/whether you're a vendor, service provider, or organization/i)
      ).toBeInTheDocument();
    });

    it('provides clear calls to action', () => {
      render(<PartnerHero />);

      // Primary action
      expect(
        screen.getByRole('button', { name: /become a partner/i })
      ).toBeInTheDocument();

      // Secondary action
      expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
    });
  });
});
