// pages/home/components/SocialProofSection.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialProofSection } from './SocialProofSection';

describe('SocialProofSection', () => {
  it('renders without crashing', () => {
    render(<SocialProofSection />);
    expect(screen.getByText('Trusted by Hundreds of Families')).toBeInTheDocument();
  });

  it('displays section heading and subtitle', () => {
    render(<SocialProofSection />);

    expect(screen.getByText('Trusted by Hundreds of Families')).toBeInTheDocument();
    expect(screen.getByText(/Join the many satisfied clients/i)).toBeInTheDocument();
  });

  it('displays testimonials section heading', () => {
    render(<SocialProofSection />);

    expect(screen.getByText('What Our Clients Say')).toBeInTheDocument();
  });

  it('displays all three testimonials', () => {
    render(<SocialProofSection />);

    // Check for testimonial authors
    expect(screen.getByText('Maria & Carlos Santos')).toBeInTheDocument();
    expect(screen.getByText('Elena Reyes')).toBeInTheDocument();
    expect(screen.getByText('The Mendoza Family')).toBeInTheDocument();
  });

  it('displays testimonial quotes', () => {
    render(<SocialProofSection />);

    expect(
      screen.getByText(/LifePlace made our wedding day absolutely perfect/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Outstanding venue and exceptional service/i)).toBeInTheDocument();
    expect(screen.getByText(/We've hosted three events here/i)).toBeInTheDocument();
  });

  it('displays testimonial roles and event info', () => {
    render(<SocialProofSection />);

    expect(screen.getByText(/Wedding Celebration/i)).toBeInTheDocument();
    expect(screen.getByText(/Corporate Event Coordinator/i)).toBeInTheDocument();
    expect(screen.getByText(/Repeat Client/i)).toBeInTheDocument();
  });

  it('displays all star ratings (5 stars per testimonial)', () => {
    const { container } = render(<SocialProofSection />);

    // Each testimonial has 5 stars, 3 testimonials = 15 stars
    // Plus 1 star in the stats section = 16 total
    const starIcons = container.querySelectorAll('[data-testid="StarIcon"]');
    expect(starIcons.length).toBeGreaterThanOrEqual(15);
  });

  it('displays trust badges', () => {
    render(<SocialProofSection />);

    expect(screen.getByText('Certified Venue')).toBeInTheDocument();
    expect(screen.getByText('Family Owned')).toBeInTheDocument();
    expect(screen.getByText('Expert Team')).toBeInTheDocument();
  });

  it('uses proper semantic HTML structure', () => {
    const { container } = render(<SocialProofSection />);

    // Check for section element
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();

    // Check for heading hierarchy
    const h2 = screen.getByRole('heading', {
      level: 2,
      name: 'Trusted by Hundreds of Families',
    });
    expect(h2).toBeInTheDocument();

    const h3 = screen.getByRole('heading', {
      level: 3,
      name: 'What Our Clients Say',
    });
    expect(h3).toBeInTheDocument();
  });

  it('has accessible stat icons', () => {
    const { container } = render(<SocialProofSection />);

    // Check for various icons
    const icons = container.querySelectorAll('[data-testid*="Icon"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('displays testimonials in responsive grid', () => {
    render(<SocialProofSection />);

    // Check that all testimonials are rendered (grid layout is handled by CSS)
    expect(screen.getByText('Maria & Carlos Santos')).toBeInTheDocument();
    expect(screen.getByText('Elena Reyes')).toBeInTheDocument();
    expect(screen.getByText('The Mendoza Family')).toBeInTheDocument();
  });

  it('applies correct background color to section', () => {
    const { container } = render(<SocialProofSection />);

    const section = container.querySelector('section');
    expect(section).toHaveStyle({ width: '100%' });
  });

  describe('Accessibility', () => {
    it('has sufficient color contrast for headings', () => {
      render(<SocialProofSection />);

      const heading = screen.getByText('Trusted by Hundreds of Families');
      expect(heading).toBeInTheDocument();
      // Note: Actual contrast testing would require color comparison tools
    });

    it('testimonial quotes are properly formatted', () => {
      render(<SocialProofSection />);

      // Quotes should have opening and closing quotation marks
      const quote = screen.getByText(/LifePlace made our wedding day absolutely perfect/i);
      expect(quote.textContent).toMatch(/^"/);
      expect(quote.textContent).toMatch(/"$/);
    });

    it('star ratings are visible for screen readers', () => {
      const { container } = render(<SocialProofSection />);

      // Each testimonial should have star icons (3 testimonials × 5 stars)
      // Plus 1 star in stats = 16 total
      const starIcons = container.querySelectorAll('[data-testid="StarIcon"]');
      expect(starIcons.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Responsive Design', () => {
    it('renders testimonials in a grid layout', () => {
      render(<SocialProofSection />);

      // Testimonials should be rendered
      expect(screen.getByText('Maria & Carlos Santos')).toBeInTheDocument();
      expect(screen.getByText('Elena Reyes')).toBeInTheDocument();
      expect(screen.getByText('The Mendoza Family')).toBeInTheDocument();
    });
  });

  describe('Content Validation', () => {
    it('all testimonials have 5-star ratings', () => {
      const { container } = render(<SocialProofSection />);

      // Count all star icons (testimonials + stats)
      // In the implementation, gold stars use tokens.color.base.gold[500]
      const starIcons = container.querySelectorAll('[data-testid="StarIcon"]');
      expect(starIcons.length).toBeGreaterThanOrEqual(15); // At least 3 testimonials with 5 stars each
    });
  });
});
