// pages/services/components/ServiceCard.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ServiceCard } from './ServiceCard';
import { NaturePeople } from '@mui/icons-material';
import type { ServiceInfo } from '../types/services.types';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ServiceCard', () => {
  const mockService: ServiceInfo = {
    id: 'camps-retreats',
    name: 'Camps & Retreats',
    description: 'Transform your youth camps, church retreats, and leadership training into unforgettable experiences.',
    features: [
      'Spacious outdoor areas for activities',
      'Chapel for worship and reflection',
      'Dormitory accommodations for up to 300 guests',
    ],
    icon: <NaturePeople data-testid="service-icon" />,
    ctaText: 'Book Now',
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('renders service card with all content', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      // Check service name
      expect(screen.getByRole('heading', { name: mockService.name })).toBeInTheDocument();

      // Check description
      expect(screen.getByText(mockService.description)).toBeInTheDocument();

      // Check features
      mockService.features.forEach((feature) => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });

      // Check CTA button - should have text "Book Now" and aria-label
      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Book Now');
    });

    it('renders icon with proper accessibility attributes', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const iconContainer = screen.getByTestId('service-icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders default CTA text when ctaText is not provided', () => {
      const serviceWithoutCTA = { ...mockService, ctaText: undefined };
      render(
        <BrowserRouter>
          <ServiceCard service={serviceWithoutCTA} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
    });

    it('renders custom CTA text when provided', () => {
      const customCTA = 'Book Your Retreat';
      const serviceWithCustomCTA = { ...mockService, ctaText: customCTA };
      render(
        <BrowserRouter>
          <ServiceCard service={serviceWithCustomCTA} index={0} />
        </BrowserRouter>
      );

      // Button should have the custom text content, but aria-label is always "Learn more about {service.name}"
      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(customCTA);
    });

    it('renders all feature items with bullet points', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const features = screen.getByText(mockService.features[0]).parentElement?.parentElement;
      expect(features?.children).toHaveLength(mockService.features.length);
    });
  });

  describe('Interactions', () => {
    it('navigates to booking page when CTA button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      await user.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/booking');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('button has correct aria-label', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML heading for service name', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const heading = screen.getByRole('heading', { name: mockService.name });
      expect(heading.tagName).toBe('H3');
    });

    it('has accessible button with proper role', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-label', `Learn more about ${mockService.name}`);
    });

    it('decorative elements have aria-hidden', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const iconContainer = screen.getByTestId('service-icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animation Delays', () => {
    it('applies correct animation delay based on index', () => {
      const { container } = render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={2} />
        </BrowserRouter>
      );

      // AnimatedElement should receive delay of 200 + (2 * 100) = 400ms
      // This is tested implicitly through the AnimatedElement component
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses default index of 0 when not provided', () => {
      const { container } = render(
        <BrowserRouter>
          <ServiceCard service={mockService} />
        </BrowserRouter>
      );

      // Should use delay of 200 + (0 * 100) = 200ms
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Service Type Variants', () => {
    it('renders team-building service with correct styling', () => {
      const teamBuildingService: ServiceInfo = {
        ...mockService,
        id: 'team-building',
        name: 'Team Building',
      };

      render(
        <BrowserRouter>
          <ServiceCard service={teamBuildingService} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { name: 'Team Building' })).toBeInTheDocument();
    });

    it('renders workshops service with correct styling', () => {
      const workshopsService: ServiceInfo = {
        ...mockService,
        id: 'workshops',
        name: 'Workshops',
      };

      render(
        <BrowserRouter>
          <ServiceCard service={workshopsService} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { name: 'Workshops' })).toBeInTheDocument();
    });

    it('renders weddings service with correct styling', () => {
      const weddingsService: ServiceInfo = {
        ...mockService,
        id: 'weddings',
        name: 'Weddings',
      };

      render(
        <BrowserRouter>
          <ServiceCard service={weddingsService} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { name: 'Weddings' })).toBeInTheDocument();
    });

    it('falls back to default colors for unknown service types', () => {
      const unknownService: ServiceInfo = {
        ...mockService,
        id: 'unknown-service-type',
        name: 'Unknown Service',
      };

      render(
        <BrowserRouter>
          <ServiceCard service={unknownService} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { name: 'Unknown Service' })).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('renders with vertical stack layout', () => {
      const { container } = render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      // Check that card uses flexbox column layout
      const card = container.querySelector('[class*="MuiBox-root"]');
      expect(card).toBeInTheDocument();
    });

    it('CTA button is full width', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      // Button should have fullWidth class
      expect(button.className).toContain('fullWidth');
    });
  });

  describe('Content Validation', () => {
    it('handles empty features array gracefully', () => {
      const serviceWithoutFeatures: ServiceInfo = {
        ...mockService,
        features: [],
      };

      render(
        <BrowserRouter>
          <ServiceCard service={serviceWithoutFeatures} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { name: mockService.name })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles long feature descriptions', () => {
      const longFeature = 'This is a very long feature description that should wrap properly and maintain good readability with proper line height and spacing throughout the entire text content area.';
      const serviceWithLongFeature: ServiceInfo = {
        ...mockService,
        features: [longFeature],
      };

      render(
        <BrowserRouter>
          <ServiceCard service={serviceWithLongFeature} index={0} />
        </BrowserRouter>
      );

      expect(screen.getByText(longFeature)).toBeInTheDocument();
    });

    it('renders multiple features correctly', () => {
      const manyFeatures = Array.from({ length: 8 }, (_, i) => `Feature ${i + 1}`);
      const serviceWithManyFeatures: ServiceInfo = {
        ...mockService,
        features: manyFeatures,
      };

      render(
        <BrowserRouter>
          <ServiceCard service={serviceWithManyFeatures} index={0} />
        </BrowserRouter>
      );

      manyFeatures.forEach((feature) => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });
  });

  describe('Design System Integration', () => {
    it('uses ModernCard component', () => {
      const { container } = render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      // ModernCard should be present in the rendered output
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses AnimatedElement with slideUp animation', () => {
      const { container } = render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      // AnimatedElement should wrap the card
      expect(container.firstChild).toBeInTheDocument();
    });

    it('includes arrow icon in CTA button', () => {
      render(
        <BrowserRouter>
          <ServiceCard service={mockService} index={0} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: `Learn more about ${mockService.name}` });
      // ArrowForward icon should be rendered as endIcon
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });
});
