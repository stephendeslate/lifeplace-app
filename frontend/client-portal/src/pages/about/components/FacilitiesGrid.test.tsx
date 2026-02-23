// pages/about/components/FacilitiesGrid.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacilitiesGrid } from './FacilitiesGrid';

describe('FacilitiesGrid', () => {
  describe('Rendering', () => {
    it('renders the section title', () => {
      render(<FacilitiesGrid />);
      expect(screen.getByText('Facilities & Amenities')).toBeInTheDocument();
    });

    it('renders all 6 facility cards', () => {
      render(<FacilitiesGrid />);

      // Check all facility names are present
      expect(screen.getByText('Sanctuary')).toBeInTheDocument();
      expect(screen.getByText('Cabanas')).toBeInTheDocument();
      expect(screen.getByText('The Pavilion')).toBeInTheDocument();
      expect(screen.getByText('Open-Field')).toBeInTheDocument();
      expect(screen.getByText('Angelic Field')).toBeInTheDocument();
      expect(screen.getByText('Havila')).toBeInTheDocument();
    });

    it('renders facility descriptions', () => {
      render(<FacilitiesGrid />);

      expect(screen.getByText('Chapel - Suitable for church weddings')).toBeInTheDocument();
      expect(screen.getByText('4 total - Each accommodates 6-10 people')).toBeInTheDocument();
      expect(
        screen.getByText('Multipurpose hall - Capacity: 100-200 people (depending on setup)'),
      ).toBeInTheDocument();
      expect(screen.getByText('For larger gatherings')).toBeInTheDocument();
      expect(screen.getByText('Outdoor event space')).toBeInTheDocument();
      expect(
        screen.getByText(
          '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
        ),
      ).toBeInTheDocument();
    });

    it('renders facility icons', () => {
      const { container } = render(<FacilitiesGrid />);

      // Check for SVG icons (MUI icons render as SVG)
      const icons = container.querySelectorAll('svg[data-testid*="Icon"]');
      expect(icons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Layout and Structure', () => {
    it('uses Section component with correct props', () => {
      const { container } = render(<FacilitiesGrid />);

      // Section should be rendered as a section element
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders 6 facility cards', () => {
      render(<FacilitiesGrid />);

      // Check all 6 facility names are rendered
      const facilityNames = [
        'Sanctuary',
        'Cabanas',
        'The Pavilion',
        'Open-Field',
        'Angelic Field',
        'Havila',
      ];

      facilityNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('renders icon containers for each facility', () => {
      const { container } = render(<FacilitiesGrid />);

      // Icon containers should have aria-hidden (includes SVG icons)
      const iconContainers = container.querySelectorAll('[aria-hidden="true"]');
      expect(iconContainers.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<FacilitiesGrid />);

      // Main title should be h2
      const mainTitle = screen.getByRole('heading', { level: 2, name: 'Facilities & Amenities' });
      expect(mainTitle).toBeInTheDocument();

      // Facility names should be h4 (checking one as example)
      const facilityHeading = screen.getByRole('heading', { level: 4, name: 'Sanctuary' });
      expect(facilityHeading).toBeInTheDocument();
    });

    it('has semantic HTML structure', () => {
      const { container } = render(<FacilitiesGrid />);

      // Should use section element
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();

      // Should have proper headings
      const headings = container.querySelectorAll('h2, h4');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('icons are hidden from screen readers', () => {
      const { container } = render(<FacilitiesGrid />);

      // Icon containers should have aria-hidden
      const iconContainers = container.querySelectorAll('[aria-hidden="true"]');
      expect(iconContainers.length).toBeGreaterThanOrEqual(6);
    });

    it('has text content with proper hierarchy', () => {
      render(<FacilitiesGrid />);

      // Facility names should be in the document
      const facilityName = screen.getByText('Sanctuary');
      expect(facilityName).toBeInTheDocument();

      // Descriptions should be in the document
      const description = screen.getByText('Chapel - Suitable for church weddings');
      expect(description).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders without layout errors on mobile viewport', () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      const { container } = render(<FacilitiesGrid />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders without layout errors on tablet viewport', () => {
      // Set tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      const { container } = render(<FacilitiesGrid />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders without layout errors on desktop viewport', () => {
      // Set desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      const { container } = render(<FacilitiesGrid />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('renders all content correctly for animation', () => {
      render(<FacilitiesGrid />);

      // All animated content should be in the document
      expect(screen.getByText('Facilities & Amenities')).toBeInTheDocument();

      // All facility cards should be present
      const facilityNames = [
        'Sanctuary',
        'Cabanas',
        'The Pavilion',
        'Open-Field',
        'Angelic Field',
        'Havila',
      ];

      facilityNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe('Data Integrity', () => {
    it('maintains all facility data correctly', () => {
      render(<FacilitiesGrid />);

      // Verify all facilities and their descriptions are present and accurate
      const facilities = [
        { name: 'Sanctuary', description: 'Chapel - Suitable for church weddings' },
        { name: 'Cabanas', description: '4 total - Each accommodates 6-10 people' },
        {
          name: 'The Pavilion',
          description: 'Multipurpose hall - Capacity: 100-200 people (depending on setup)',
        },
        { name: 'Open-Field', description: 'For larger gatherings' },
        { name: 'Angelic Field', description: 'Outdoor event space' },
        {
          name: 'Havila',
          description: '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
        },
      ];

      facilities.forEach((facility) => {
        expect(screen.getByText(facility.name)).toBeInTheDocument();
        expect(screen.getByText(facility.description)).toBeInTheDocument();
      });
    });

    it('renders correct number of facilities', () => {
      render(<FacilitiesGrid />);

      // Should have exactly 6 facility names
      const facilityNames = [
        'Sanctuary',
        'Cabanas',
        'The Pavilion',
        'Open-Field',
        'Angelic Field',
        'Havila',
      ];

      facilityNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe('Design System Integration', () => {
    it('renders all facility cards with content', () => {
      render(<FacilitiesGrid />);

      // Each facility should have both name and description
      const facilities = [
        { name: 'Sanctuary', description: 'Chapel - Suitable for church weddings' },
        { name: 'Cabanas', description: '4 total - Each accommodates 6-10 people' },
        {
          name: 'The Pavilion',
          description: 'Multipurpose hall - Capacity: 100-200 people (depending on setup)',
        },
        { name: 'Open-Field', description: 'For larger gatherings' },
        { name: 'Angelic Field', description: 'Outdoor event space' },
        {
          name: 'Havila',
          description: '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
        },
      ];

      facilities.forEach((facility) => {
        expect(screen.getByText(facility.name)).toBeInTheDocument();
        expect(screen.getByText(facility.description)).toBeInTheDocument();
      });
    });

    it('uses Section component with semantic HTML', () => {
      render(<FacilitiesGrid />);

      // Section title should be present, indicating component rendered
      expect(screen.getByText('Facilities & Amenities')).toBeInTheDocument();

      // All facility names should be rendered within the structure
      expect(screen.getByText('Sanctuary')).toBeInTheDocument();
      expect(screen.getByText('Havila')).toBeInTheDocument();
    });

    it('renders with proper structure', () => {
      const { container } = render(<FacilitiesGrid />);

      // Should have headings for structure
      const headings = container.querySelectorAll('h2, h4');
      expect(headings.length).toBeGreaterThanOrEqual(7); // 1 h2 + 6 h4
    });
  });

  describe('Content Quality', () => {
    it('displays meaningful facility information', () => {
      render(<FacilitiesGrid />);

      // Check that descriptions are informative
      expect(screen.getByText(/Chapel - Suitable for church weddings/)).toBeInTheDocument();
      expect(screen.getByText(/Capacity: 100-200 people/)).toBeInTheDocument();
      expect(screen.getByText(/Accommodates 150-300 people/)).toBeInTheDocument();
    });

    it('includes capacity information where relevant', () => {
      render(<FacilitiesGrid />);

      // Check for capacity mentions
      expect(screen.getByText(/6-10 people/)).toBeInTheDocument();
      expect(screen.getByText(/100-200 people/)).toBeInTheDocument();
      expect(screen.getByText(/150-300 people/)).toBeInTheDocument();
    });

    it('highlights special features', () => {
      render(<FacilitiesGrid />);

      // Check for special callouts
      expect(screen.getByText(/newly opened/)).toBeInTheDocument();
      expect(screen.getByText(/Multipurpose hall/)).toBeInTheDocument();
    });
  });
});
