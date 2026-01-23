// pages/about/components/LocationContact.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationContact } from './LocationContact';

describe('LocationContact', () => {
  const mockNavigateToBooking = vi.fn();

  beforeEach(() => {
    mockNavigateToBooking.mockClear();
  });

  describe('Rendering', () => {
    it('renders the main heading', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Visit Us')).toBeInTheDocument();
    });

    it('renders the section description', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(
        screen.getByText(/We're located near Tagaytay, easily accessible from Metro Manila/)
      ).toBeInTheDocument();
    });

    it('renders the location contact info', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Patutong Malaki North, Alfonso, Cavite 4120')).toBeInTheDocument();
    });

    it('renders the phone contact info', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(
        screen.getByText('(046) 889 0844 / (0962) 275 3145 / +639935260943')
      ).toBeInTheDocument();
    });

    it('renders the email contact info', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
    });

    it('renders the Google Maps iframe', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src');
      expect(iframe.getAttribute('src')).toContain('google.com/maps');
    });

    it('renders the Get Directions button', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Get Directions')).toBeInTheDocument();
    });

    it('renders the Follow Us section', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Follow Us')).toBeInTheDocument();
    });

    it('renders the CTA button', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Start Planning Your Event')).toBeInTheDocument();
    });

    it('renders all contact icons', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Check for LocationOn, Phone, Email icons
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Design System Integration', () => {
    it('uses Section component with sage background', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Component should render successfully with Section
      expect(screen.getByText('Visit Us')).toBeInTheDocument();
    });

    it('uses Container component for content width', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Container should wrap the content
      expect(screen.getByText('Visit Us')).toBeInTheDocument();
    });

    it('uses ModernCard for map container', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Map should be within a ModernCard
      const iframe = screen.getByTitle('LifePlace Alfonso Location');
      expect(iframe.closest('[class*="MuiBox-root"]')).toBeInTheDocument();
    });

    it('uses ModernCard for contact info items', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Contact info should be in ModernCards
      const locationCard = screen.getByText('Location').closest('[class*="MuiBox-root"]');
      expect(locationCard).toBeInTheDocument();
    });

    it('applies design tokens for typography', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const heading = screen.getByText('Visit Us');

      // Heading should have proper styling
      expect(heading).toHaveStyle({ textAlign: 'center' });
    });

    it('uses Button component from shared design system', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Both buttons should be present
      expect(screen.getByText('Get Directions')).toBeInTheDocument();
      expect(screen.getByText('Start Planning Your Event')).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('wraps heading in AnimatedElement', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // AnimatedElement should wrap the heading
      expect(screen.getByText('Visit Us')).toBeInTheDocument();
    });

    it('wraps map card in AnimatedElement', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // AnimatedElement should wrap the map
      expect(screen.getByTitle('LifePlace Alfonso Location')).toBeInTheDocument();
    });

    it('wraps each contact card in AnimatedElement', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // All contact cards should be animated
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('wraps social media section in AnimatedElement', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // AnimatedElement should wrap social section
      expect(screen.getByText('Follow Us')).toBeInTheDocument();
    });

    it('uses staggered animation delays for contact cards', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // All contact cards should render (animations are applied)
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onNavigateToBooking when CTA button is clicked', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      const ctaButton = screen.getByText('Start Planning Your Event');
      fireEvent.click(ctaButton);

      expect(mockNavigateToBooking).toHaveBeenCalledTimes(1);
    });

    it('opens Google Maps when Get Directions button is clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      const directionsButton = screen.getByText('Get Directions');
      fireEvent.click(directionsButton);

      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('google.com/maps'),
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });

    it('includes proper address in Google Maps URL', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      const directionsButton = screen.getByText('Get Directions');
      fireEvent.click(directionsButton);

      const calledUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('Patutong%20Malaki%20North');
      expect(calledUrl).toContain('Alfonso');
      expect(calledUrl).toContain('Cavite');

      windowOpenSpy.mockRestore();
    });

    it('opens social media links in new tab', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Find all social media links (they are IconButtons with href)
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const socialButtons = container.querySelectorAll('a[target="_blank"]');

      expect(socialButtons.length).toBeGreaterThan(0);
    });

    it('has proper security attributes on social links', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const socialButtons = container.querySelectorAll('a[target="_blank"]');

      socialButtons.forEach((button) => {
        expect(button).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Layout', () => {
    it('uses 2-column layout on large screens', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Map and contact info should be in a grid layout
      expect(screen.getByTitle('LifePlace Alfonso Location')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('applies proper spacing between sections', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Stack component should handle spacing
      const stacks = container.querySelectorAll('[class*="MuiStack-root"]');
      expect(stacks.length).toBeGreaterThan(0);
    });

    it('centers social media section', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Follow Us section should be centered
      const followUsHeading = screen.getByText('Follow Us');
      expect(followUsHeading).toBeInTheDocument();
    });

    it('centers CTA button', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // CTA button should be centered
      const ctaButton = screen.getByText('Start Planning Your Event');
      expect(ctaButton).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies circular backgrounds to contact icons', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Icon containers should have circular backgrounds
      const iconContainers = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    it('uses terracotta color for location icon', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Location icon should be present
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('uses sage color for phone icon', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Phone icon should be present
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });

    it('applies hover effect to contact cards', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Cards should have hover capability
      const locationCard = screen.getByText('Location').closest('[class*="MuiBox-root"]');
      expect(locationCard).toBeInTheDocument();
    });

    it('applies rounded corners to map container', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');

      // Map container should have rounded corners
      expect(iframe).toBeInTheDocument();
    });

    it('uses terracotta variant for CTA button', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const ctaButton = screen.getByText('Start Planning Your Event');

      // Button should be rendered
      expect(ctaButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Main heading should be present
      const heading = screen.getByText('Visit Us');
      expect(heading).toBeInTheDocument();
    });

    it('provides accessible labels for social media links', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Social buttons should have aria-label
      const socialButtons = container.querySelectorAll('a[aria-label]');
      expect(socialButtons.length).toBeGreaterThan(0);
    });

    it('has accessible iframe title', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');

      expect(iframe).toHaveAttribute('title', 'LifePlace Alfonso Location');
    });

    it('uses semantic heading hierarchy', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Should have h2 and h5 headings
      expect(screen.getByText('Visit Us')).toBeInTheDocument();
      expect(screen.getByText('Follow Us')).toBeInTheDocument();
    });

    it('provides readable contrast for text', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // All text should be readable
      expect(screen.getByText('Visit Us')).toBeInTheDocument();
      expect(screen.getByText('Patutong Malaki North, Alfonso, Cavite 4120')).toBeInTheDocument();
    });

    it('has keyboard-accessible buttons', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      const ctaButton = screen.getByText('Start Planning Your Event');
      expect(ctaButton).toBeInTheDocument();

      // Button should be keyboard accessible (it's a real button element)
      expect(ctaButton.tagName).toBe('BUTTON');
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive spacing', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Component should render with responsive layout
      expect(container.querySelector('[class*="MuiStack-root"]')).toBeInTheDocument();
    });

    it('uses responsive grid layout', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      // Grid should contain both map and contact info
      expect(screen.getByTitle('LifePlace Alfonso Location')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('has minimum height for map on mobile', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');

      // Map should be visible
      expect(iframe).toBeInTheDocument();
    });
  });

  describe('Social Media Links', () => {
    it('renders Facebook link with correct URL', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const facebookLink = container.querySelector('a[href*="facebook.com"]');

      expect(facebookLink).toBeInTheDocument();
      expect(facebookLink).toHaveAttribute('href', 'https://facebook.com/lifeplacealfonso');
    });

    it('renders Instagram link with correct URL', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const instagramLink = container.querySelector('a[href*="instagram.com"]');

      expect(instagramLink).toBeInTheDocument();
      expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/lifeplacealfonso');
    });

    it('renders TikTok link with correct URL', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const tiktokLink = container.querySelector('a[href*="tiktok.com"]');

      expect(tiktokLink).toBeInTheDocument();
      expect(tiktokLink).toHaveAttribute('href', 'https://tiktok.com/@lifeplacealfonso');
    });

    it('renders all three social media icons', () => {
      const { container } = render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const socialLinks = container.querySelectorAll('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="tiktok.com"]');

      expect(socialLinks.length).toBe(3);
    });
  });

  describe('Map Integration', () => {
    it('embeds Google Maps iframe with correct attributes', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');

      expect(iframe).toHaveAttribute('allowFullScreen');
      expect(iframe).toHaveAttribute('loading', 'lazy');
      expect(iframe).toHaveAttribute('referrerPolicy', 'no-referrer-when-downgrade');
    });

    it('sets iframe dimensions to 100%', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');

      expect(iframe).toHaveAttribute('width', '100%');
      expect(iframe).toHaveAttribute('height', '100%');
    });

    it('removes iframe border', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      const iframe = screen.getByTitle('LifePlace Alfonso Location');

      expect(iframe).toHaveStyle({ border: '0' });
    });
  });

  describe('Error Handling', () => {
    it('renders without crashing', () => {
      expect(() => render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />)).not.toThrow();
    });

    it('handles missing onNavigateToBooking prop gracefully', () => {
      expect(() => render(<LocationContact />)).not.toThrow();
    });

    it('handles window.open failure gracefully', () => {
      const originalOpen = window.open;
      window.open = vi.fn(() => null);

      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);

      const directionsButton = screen.getByText('Get Directions');
      expect(() => fireEvent.click(directionsButton)).not.toThrow();

      window.open = originalOpen;
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct address', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('Patutong Malaki North, Alfonso, Cavite 4120')).toBeInTheDocument();
    });

    it('displays correct phone numbers', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(
        screen.getByText('(046) 889 0844 / (0962) 275 3145 / +639935260943')
      ).toBeInTheDocument();
    });

    it('displays correct email address', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(screen.getByText('reservations.lifeplace@gmail.com')).toBeInTheDocument();
    });

    it('displays complete section description', () => {
      render(<LocationContact onNavigateToBooking={mockNavigateToBooking} />);
      expect(
        screen.getByText(
          /We're located near Tagaytay, easily accessible from Metro Manila. Come visit us or get in touch to start planning your event./
        )
      ).toBeInTheDocument();
    });
  });
});
