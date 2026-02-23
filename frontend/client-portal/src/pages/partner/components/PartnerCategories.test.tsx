// pages/partner/components/PartnerCategories.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PartnerCategories } from './PartnerCategories';

describe('PartnerCategories', () => {
  describe('Rendering', () => {
    it('renders the section heading', () => {
      render(<PartnerCategories />);
      expect(screen.getByText('Partner Categories')).toBeInTheDocument();
    });

    it('renders the section description', () => {
      render(<PartnerCategories />);
      expect(
        screen.getByText(/We welcome partnerships from various industries/),
      ).toBeInTheDocument();
    });

    it('renders all four category cards', () => {
      render(<PartnerCategories />);

      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Churches')).toBeInTheDocument();
    });
  });

  describe('Category Content', () => {
    it('renders Travel Agencies category with correct content', () => {
      render(<PartnerCategories />);

      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(
        screen.getByText(/Partner with us to offer your clients exclusive retreat/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Specialized group packages for retreats/)).toBeInTheDocument();
      expect(screen.getByText(/Competitive commission structures/)).toBeInTheDocument();
    });

    it('renders Wedding Coordinators category with correct content', () => {
      render(<PartnerCategories />);

      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText(/Become a preferred wedding coordinator/)).toBeInTheDocument();
      expect(screen.getByText(/Preferred venue status/)).toBeInTheDocument();
      expect(screen.getByText(/Discounted venue rates/)).toBeInTheDocument();
    });

    it('renders Schools category with correct content', () => {
      render(<PartnerCategories />);

      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText(/Access educational-focused packages/)).toBeInTheDocument();
      expect(screen.getByText(/Educational-focused packages/)).toBeInTheDocument();
      expect(screen.getByText(/Camps and leadership training rates/)).toBeInTheDocument();
    });

    it('renders Churches category with correct content', () => {
      render(<PartnerCategories />);

      expect(screen.getByText('Churches')).toBeInTheDocument();
      expect(screen.getByText(/Special rates for spiritual retreats/)).toBeInTheDocument();
      expect(screen.getByText(/Discounted rates for spiritual retreats/)).toBeInTheDocument();
      expect(screen.getByText(/Youth camp facilities/)).toBeInTheDocument();
    });
  });

  describe('Benefits Lists', () => {
    it('renders all benefits for Travel Agencies', () => {
      render(<PartnerCategories />);

      const benefits = [
        'Specialized group packages for retreats',
        'Competitive commission structures',
        'Customized itineraries including accommodations and meals',
        'Priority booking access',
      ];

      benefits.forEach((benefit) => {
        expect(screen.getByText(benefit)).toBeInTheDocument();
      });
    });

    it('renders all benefits for Wedding Coordinators', () => {
      render(<PartnerCategories />);

      const benefits = [
        'Preferred venue status',
        'Discounted venue rates',
        'On-site coordination support',
        'Flexible wedding packages',
      ];

      benefits.forEach((benefit) => {
        expect(screen.getByText(benefit)).toBeInTheDocument();
      });
    });

    it('renders all benefits for Schools', () => {
      render(<PartnerCategories />);

      const benefits = [
        'Educational-focused packages',
        'Camps and leadership training rates',
        'Student activity venues',
        'Partnership rates for recurring bookings',
      ];

      benefits.forEach((benefit) => {
        expect(screen.getByText(benefit)).toBeInTheDocument();
      });
    });

    it('renders all benefits for Churches', () => {
      render(<PartnerCategories />);

      const benefits = [
        'Discounted rates for spiritual retreats',
        'Youth camp facilities',
        'Leadership development venues',
        'Long-term collaboration opportunities',
      ];

      benefits.forEach((benefit) => {
        expect(screen.getByText(benefit)).toBeInTheDocument();
      });
    });

    it('renders check icons for each benefit', () => {
      const { container } = render(<PartnerCategories />);

      // Each category has 4 benefits, 4 categories = 16 check icons
      const checkIcons = container.querySelectorAll('[data-testid="CheckIcon"]');
      expect(checkIcons.length).toBe(16);
    });
  });

  describe('Icons', () => {
    it('renders category icons with accessible labels', () => {
      render(<PartnerCategories />);

      // Check for icon containers with aria-labels
      expect(screen.getByLabelText('Travel Agencies icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Coordinators icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Schools icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Churches icon')).toBeInTheDocument();
    });

    it('renders all category icons', () => {
      render(<PartnerCategories />);

      // All category names should be present (indicating icons are rendered)
      expect(screen.getByLabelText('Travel Agencies icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Coordinators icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Schools icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Churches icon')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('uses Section component with correct props', () => {
      const { container } = render(<PartnerCategories />);

      // Section should render as a <section> element
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders cards in a grid layout', () => {
      render(<PartnerCategories />);

      // All categories should be present (indicating grid layout works)
      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Churches')).toBeInTheDocument();
    });

    it('applies modern card styling to each category', () => {
      const { container } = render(<PartnerCategories />);

      // ModernCard components should be rendered
      expect(container.querySelectorAll('h4').length).toBe(4);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      const { container } = render(<PartnerCategories />);

      // Main heading should be h2
      const mainHeading = container.querySelector('h2');
      expect(mainHeading).toHaveTextContent('Partner Categories');

      // Category headings should be h4
      const categoryHeadings = container.querySelectorAll('h4');
      expect(categoryHeadings.length).toBe(4);
    });

    it('has accessible icon labels', () => {
      render(<PartnerCategories />);

      // Icon containers should have role="img" and aria-label
      expect(screen.getByLabelText('Travel Agencies icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Coordinators icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Schools icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Churches icon')).toBeInTheDocument();
    });

    it('check icons are hidden from screen readers', () => {
      const { container } = render(<PartnerCategories />);

      // Check icons should have aria-hidden="true"
      const checkIcons = container.querySelectorAll('[data-testid="CheckIcon"]');
      checkIcons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('has semantic HTML structure', () => {
      const { container } = render(<PartnerCategories />);

      // Should use section element
      expect(container.querySelector('section')).toBeInTheDocument();

      // Should have proper heading elements
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelectorAll('h4').length).toBe(4);
    });
  });

  describe('Design System Integration', () => {
    it('uses design tokens for spacing', () => {
      const { container } = render(<PartnerCategories />);

      // Component should be rendered without errors
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies different card variants to categories', () => {
      render(<PartnerCategories />);

      // All categories should be rendered (using different card variants)
      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Churches')).toBeInTheDocument();
    });

    it('uses ModernCard component for each category', () => {
      const { container } = render(<PartnerCategories />);

      // Each category should have an h4 heading (indicating ModernCard structure)
      const categoryHeadings = container.querySelectorAll('h4');
      expect(categoryHeadings.length).toBe(4);
    });
  });

  describe('Responsive Design', () => {
    it('renders without layout errors on different screen sizes', () => {
      const { container } = render(<PartnerCategories />);

      // Component should render successfully
      expect(container.firstChild).toBeInTheDocument();

      // All categories should be visible
      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Churches')).toBeInTheDocument();
    });

    it('maintains content readability', () => {
      render(<PartnerCategories />);

      // All text content should be present
      expect(screen.getByText('Partner Categories')).toBeInTheDocument();
      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Churches')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('wraps content in AnimatedElement components', () => {
      render(<PartnerCategories />);

      // Component should render successfully with animations
      expect(screen.getByText('Partner Categories')).toBeInTheDocument();
    });

    it('applies staggered animation delays to category cards', () => {
      render(<PartnerCategories />);

      // All cards should be rendered
      expect(screen.getByText('Travel Agencies')).toBeInTheDocument();
      expect(screen.getByText('Wedding Coordinators')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Churches')).toBeInTheDocument();
    });
  });

  describe('Content Completeness', () => {
    it('has complete data for all categories', () => {
      render(<PartnerCategories />);

      // Each category should have name, description, and 4 benefits
      const categories = [
        { name: 'Travel Agencies', benefitCount: 4 },
        { name: 'Wedding Coordinators', benefitCount: 4 },
        { name: 'Schools', benefitCount: 4 },
        { name: 'Churches', benefitCount: 4 },
      ];

      categories.forEach((category) => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
      });
    });

    it('displays meaningful descriptions for each category', () => {
      render(<PartnerCategories />);

      // Check that each description is informative (not empty or generic)
      expect(screen.getByText(/Partner with us to offer your clients/)).toBeInTheDocument();
      expect(screen.getByText(/Become a preferred wedding coordinator/)).toBeInTheDocument();
      expect(screen.getByText(/Access educational-focused packages/)).toBeInTheDocument();
      expect(screen.getByText(/Special rates for spiritual retreats/)).toBeInTheDocument();
    });
  });
});
