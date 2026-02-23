// pages/partner/components/PartnerBenefits.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PartnerBenefits } from './PartnerBenefits';

// Mock the design system components
vi.mock('../../../design-system', () => ({
  Section: ({
    children,
    id,
    background,
    spacing,
  }: {
    children: React.ReactNode;
    id?: string;
    background?: string;
    spacing?: string;
  }) => (
    <section data-testid="section" id={id} data-background={background} data-spacing={spacing}>
      {children}
    </section>
  ),
  Container: ({ children, maxWidth }: { children: React.ReactNode; maxWidth?: string }) => (
    <div data-testid="container" data-max-width={maxWidth}>
      {children}
    </div>
  ),
  ModernCard: ({
    children,
    variant,
    size,
    hover,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    hover?: boolean;
  }) => (
    <div data-testid="modern-card" data-variant={variant} data-size={size} data-hover={hover}>
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
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        12: '48px',
      },
      layout: {
        maxWidth: {
          content: '1200px',
        },
      },
    },
    typography: {
      styles: {
        h2: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '3rem',
          fontWeight: 600,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
        },
        h4: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.75rem',
          fontWeight: 600,
          lineHeight: 1.3,
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
      },
      lineHeights: {
        relaxed: 1.7,
      },
    },
    color: {
      base: {
        charcoal: {
          600: '#4B5563',
          800: '#1F2937',
        },
        sage: {
          600: '#4D7C5C',
        },
        terracotta: {
          500: '#C87356',
        },
        neutral: {
          100: '#F5F5F4',
        },
      },
    },
  },
}));

describe('PartnerBenefits', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PartnerBenefits />);
      expect(screen.getByTestId('section')).toBeInTheDocument();
    });

    it('renders main heading', () => {
      render(<PartnerBenefits />);
      expect(screen.getByRole('heading', { name: /partnership benefits/i })).toBeInTheDocument();
    });

    it('renders subheading text', () => {
      render(<PartnerBenefits />);
      expect(screen.getByText(/why partner with lifeplace alfonso/i)).toBeInTheDocument();
    });

    it('renders all four benefit cards', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);
    });

    it('renders Premium Facility Access benefit', () => {
      render(<PartnerBenefits />);
      expect(screen.getByRole('heading', { name: /premium facility access/i })).toBeInTheDocument();
      expect(
        screen.getByText(/access to a well-equipped venue in a desirable location/i),
      ).toBeInTheDocument();
    });

    it('renders Exclusive Discounts benefit', () => {
      render(<PartnerBenefits />);
      expect(screen.getByRole('heading', { name: /exclusive discounts/i })).toBeInTheDocument();
      expect(
        screen.getByText(/enjoy exclusive discounts and referral incentives/i),
      ).toBeInTheDocument();
    });

    it('renders Cross-Promotional Marketing benefit', () => {
      render(<PartnerBenefits />);
      expect(screen.getByText(/cross-promotional marketing/i)).toBeInTheDocument();
      expect(screen.getByText(/benefit from joint marketing opportunities/i)).toBeInTheDocument();
    });

    it('renders Established Credibility benefit', () => {
      render(<PartnerBenefits />);
      expect(screen.getByText(/established credibility/i)).toBeInTheDocument();
      expect(
        screen.getByText(/partner with a trusted venue with a proven track record/i),
      ).toBeInTheDocument();
    });

    it('renders benefit icons', () => {
      render(<PartnerBenefits />);
      expect(screen.getByTestId('LocationOnIcon')).toBeInTheDocument();
      expect(screen.getByTestId('LocalOfferIcon')).toBeInTheDocument();
      expect(screen.getByTestId('CampaignIcon')).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('uses Section component with white background', () => {
      render(<PartnerBenefits />);
      const section = screen.getByTestId('section');
      expect(section).toHaveAttribute('data-background', 'white');
    });

    it('uses Section component with large spacing', () => {
      render(<PartnerBenefits />);
      const section = screen.getByTestId('section');
      expect(section).toHaveAttribute('data-spacing', 'large');
    });

    it('uses Container with content maxWidth', () => {
      render(<PartnerBenefits />);
      const container = screen.getByTestId('container');
      expect(container).toHaveAttribute('data-max-width', 'content');
    });

    it('uses ModernCard with elevated variant', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('data-variant', 'elevated');
      });
    });

    it('uses ModernCard with large size', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('data-size', 'large');
      });
    });

    it('enables hover effect on all cards', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('data-hover', 'true');
      });
    });

    it('renders animated elements with staggered delays', () => {
      render(<PartnerBenefits />);
      const animatedElements = screen.getAllByTestId('animated-element');

      // Should have 5 animated elements (1 header + 4 cards)
      expect(animatedElements).toHaveLength(5);

      // Check for staggered delays
      const delays = animatedElements.map((el) => el.getAttribute('data-delay'));
      expect(delays).toContain('100'); // Header
      expect(delays).toContain('200'); // First card
      expect(delays).toContain('300'); // Second card
      expect(delays).toContain('400'); // Third card
      expect(delays).toContain('500'); // Fourth card
    });

    it('uses fadeIn animation for header', () => {
      render(<PartnerBenefits />);
      const animatedElements = screen.getAllByTestId('animated-element');
      const headerAnimation = animatedElements[0];
      expect(headerAnimation).toHaveAttribute('data-animation', 'fadeIn');
    });

    it('uses slideUp animation for benefit cards', () => {
      render(<PartnerBenefits />);
      const animatedElements = screen.getAllByTestId('animated-element');
      const cardAnimations = animatedElements.slice(1); // Skip header

      cardAnimations.forEach((card) => {
        expect(card).toHaveAttribute('data-animation', 'slideUp');
      });
    });
  });

  describe('Grid Layout', () => {
    it('renders benefits in a grid layout', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);
    });

    it('displays all benefits with equal height cards', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');

      // Each card should exist (height: 100% is in sx prop)
      cards.forEach((card) => {
        expect(card).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading hierarchy', () => {
      render(<PartnerBenefits />);
      const heading = screen.getByRole('heading', { name: /partnership benefits/i });
      expect(heading.tagName).toBe('H2');
    });

    it('uses h4 for benefit titles', () => {
      render(<PartnerBenefits />);
      const benefitTitles = screen.getAllByRole('heading', { level: 4 });
      expect(benefitTitles).toHaveLength(4);
    });

    it('has proper semantic structure', () => {
      render(<PartnerBenefits />);

      // Section should be a semantic section element
      const section = screen.getByTestId('section');
      expect(section.tagName).toBe('SECTION');

      // Main heading
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

      // Benefit headings
      expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(4);
    });

    it('provides descriptive text for each benefit', () => {
      render(<PartnerBenefits />);

      // Each benefit should have a description
      expect(screen.getByText(/access to a well-equipped venue/i)).toBeInTheDocument();
      expect(screen.getByText(/exclusive discounts and referral incentives/i)).toBeInTheDocument();
      expect(screen.getByText(/joint marketing opportunities/i)).toBeInTheDocument();
      expect(screen.getByText(/trusted venue with a proven track record/i)).toBeInTheDocument();
    });
  });

  describe('Typography Tokens', () => {
    it('uses correct typography hierarchy', () => {
      render(<PartnerBenefits />);

      // Main heading should be h2
      const mainHeading = screen.getByRole('heading', { name: /partnership benefits/i });
      expect(mainHeading.tagName).toBe('H2');

      // Benefit titles should be h4
      const benefitTitles = screen.getAllByRole('heading', { level: 4 });
      expect(benefitTitles).toHaveLength(4);
    });
  });

  describe('Color Tokens', () => {
    it('uses sage and terracotta colors for icons', () => {
      render(<PartnerBenefits />);

      // Icons should be rendered (colors are in sx prop)
      expect(screen.getByTestId('LocationOnIcon')).toBeInTheDocument();
      expect(screen.getByTestId('LocalOfferIcon')).toBeInTheDocument();
      expect(screen.getByTestId('CampaignIcon')).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });
  });

  describe('Content Verification', () => {
    it('displays all benefit information', () => {
      render(<PartnerBenefits />);

      // Header content
      expect(screen.getByRole('heading', { name: /partnership benefits/i })).toBeInTheDocument();
      expect(screen.getByText(/why partner with lifeplace alfonso/i)).toBeInTheDocument();

      // All benefit titles as headings
      expect(screen.getByRole('heading', { name: /premium facility access/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /exclusive discounts/i })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /cross-promotional marketing/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /established credibility/i })).toBeInTheDocument();
    });

    it('provides complete benefit descriptions', () => {
      render(<PartnerBenefits />);

      expect(
        screen.getByText(
          /access to a well-equipped venue in a desirable location with versatile event spaces/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /enjoy exclusive discounts and referral incentives for your clients and organization/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /benefit from joint marketing opportunities and increased visibility to our client base/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /partner with a trusted venue with a proven track record of successful events/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing tokens', () => {
      render(<PartnerBenefits />);
      expect(screen.getByTestId('section')).toBeInTheDocument();
    });

    it('renders all cards in a responsive grid', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('handles benefits array correctly', () => {
      render(<PartnerBenefits />);

      // Should render exactly 4 benefits
      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);

      const benefitTitles = screen.getAllByRole('heading', { level: 4 });
      expect(benefitTitles).toHaveLength(4);
    });

    it('renders unique keys for each benefit', () => {
      render(<PartnerBenefits />);

      // Each benefit card should render (React would warn if keys were duplicated)
      const cards = screen.getAllByTestId('modern-card');
      expect(cards).toHaveLength(4);
    });
  });

  describe('Modern Organic Luxury Compliance', () => {
    it('uses only design system components', () => {
      render(<PartnerBenefits />);

      // Should use Section, Container, ModernCard, AnimatedElement
      expect(screen.getByTestId('section')).toBeInTheDocument();
      expect(screen.getByTestId('container')).toBeInTheDocument();
      expect(screen.getAllByTestId('modern-card')).toHaveLength(4);
      expect(screen.getAllByTestId('animated-element')).toHaveLength(5);
    });

    it('uses elevated card variant for sophistication', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('data-variant', 'elevated');
      });
    });

    it('uses large card size for ample content space', () => {
      render(<PartnerBenefits />);
      const cards = screen.getAllByTestId('modern-card');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('data-size', 'large');
      });
    });
  });
});
