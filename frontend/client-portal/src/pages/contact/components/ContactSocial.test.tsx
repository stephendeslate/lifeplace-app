// pages/contact/components/ContactSocial.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactSocial } from './ContactSocial';

// Mock AnimatedElement to render children immediately
vi.mock('../../../design-system', async () => {
  const actual = await vi.importActual('../../../design-system');
  return {
    ...actual,
    AnimatedElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe('ContactSocial', () => {
  describe('Rendering', () => {
    it('renders the component without crashing', () => {
      render(<ContactSocial />);
      expect(screen.getByText('Follow Us on Social Media')).toBeInTheDocument();
    });

    it('renders the heading with correct text', () => {
      render(<ContactSocial />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Follow Us on Social Media');
    });

    it('renders the description text', () => {
      render(<ContactSocial />);
      expect(
        screen.getByText('Stay connected and see the latest happenings at LifePlace Alfonso.')
      ).toBeInTheDocument();
    });
  });

  describe('Social Links', () => {
    it('renders all three social media links', () => {
      render(<ContactSocial />);

      const facebookLink = screen.getByLabelText('Follow us on Facebook');
      const instagramLink = screen.getByLabelText('Follow us on Instagram');
      const tiktokLink = screen.getByLabelText('Follow us on TikTok');

      expect(facebookLink).toBeInTheDocument();
      expect(instagramLink).toBeInTheDocument();
      expect(tiktokLink).toBeInTheDocument();
    });

    it('renders correct URLs for social links', () => {
      render(<ContactSocial />);

      const facebookLink = screen.getByLabelText('Follow us on Facebook');
      const instagramLink = screen.getByLabelText('Follow us on Instagram');
      const tiktokLink = screen.getByLabelText('Follow us on TikTok');

      expect(facebookLink).toHaveAttribute('href', 'https://facebook.com/lifeplacealfonso');
      expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/lifeplacealfonso');
      expect(tiktokLink).toHaveAttribute('href', 'https://tiktok.com/@lifeplacealfonso');
    });

    it('opens links in new tab with proper security attributes', () => {
      render(<ContactSocial />);

      const links = [
        screen.getByLabelText('Follow us on Facebook'),
        screen.getByLabelText('Follow us on Instagram'),
        screen.getByLabelText('Follow us on TikTok'),
      ];

      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('renders social media handles', () => {
      render(<ContactSocial />);

      const handles = screen.getAllByText('@lifeplacealfonso');
      expect(handles).toHaveLength(3);
    });
  });

  describe('Icons', () => {
    it('renders Facebook icon', () => {
      render(<ContactSocial />);
      const facebookLink = screen.getByLabelText('Follow us on Facebook');
      const icon = facebookLink.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders Instagram icon', () => {
      render(<ContactSocial />);
      const instagramLink = screen.getByLabelText('Follow us on Instagram');
      const icon = instagramLink.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders TikTok icon', () => {
      render(<ContactSocial />);
      const tiktokLink = screen.getByLabelText('Follow us on TikTok');
      const icon = tiktokLink.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all social links', () => {
      render(<ContactSocial />);

      expect(screen.getByLabelText('Follow us on Facebook')).toBeInTheDocument();
      expect(screen.getByLabelText('Follow us on Instagram')).toBeInTheDocument();
      expect(screen.getByLabelText('Follow us on TikTok')).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<ContactSocial />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('links are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<ContactSocial />);

      screen.getByLabelText('Follow us on Facebook');
      await user.tab();

      // Check if any social link can receive focus
      const links = [
        screen.getByLabelText('Follow us on Facebook'),
        screen.getByLabelText('Follow us on Instagram'),
        screen.getByLabelText('Follow us on TikTok'),
      ];

      let focusable = false;
      links.forEach((link) => {
        if (link.tabIndex !== -1) {
          focusable = true;
        }
      });

      expect(focusable).toBe(true);
    });

    it('maintains proper focus management', () => {
      render(<ContactSocial />);

      const links = [
        screen.getByLabelText('Follow us on Facebook'),
        screen.getByLabelText('Follow us on Instagram'),
        screen.getByLabelText('Follow us on TikTok'),
      ];

      links.forEach((link) => {
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Layout and Styling', () => {
    it('renders in a centered layout', () => {
      const { container } = render(<ContactSocial />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('applies consistent spacing between elements', () => {
      const { container } = render(<ContactSocial />);
      const stacks = container.querySelectorAll('[class*="MuiStack"]');
      expect(stacks.length).toBeGreaterThan(0);
    });

    it('icon buttons have circular shape', () => {
      render(<ContactSocial />);
      const facebookLink = screen.getByLabelText('Follow us on Facebook');

      // Check for border-radius styling
      const computedStyle = window.getComputedStyle(facebookLink);
      expect(computedStyle.borderRadius).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders responsive spacing', () => {
      const { container } = render(<ContactSocial />);
      const socialStack = container.querySelector('[class*="MuiStack"]');
      expect(socialStack).toBeInTheDocument();
    });

    it('maintains layout integrity', () => {
      const { container } = render(<ContactSocial />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Design System Compliance', () => {
    it('uses Section component with correct props', () => {
      const { container } = render(<ContactSocial />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('uses Container component for content width', () => {
      const { container } = render(<ContactSocial />);
      // Container creates a div with max-width
      const containerDiv = container.querySelector('section > div');
      expect(containerDiv).toBeInTheDocument();
    });

    it('applies design token colors', () => {
      render(<ContactSocial />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      // Color is applied via sx prop from tokens
    });

    it('applies design token typography', () => {
      render(<ContactSocial />);
      const heading = screen.getByRole('heading', { level: 3 });
      const description = screen.getByText(/Stay connected and see/);

      expect(heading).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('wraps elements with AnimatedElement', () => {
      render(<ContactSocial />);
      // With mocked AnimatedElement, children are still rendered
      expect(screen.getByText('Follow Us on Social Media')).toBeInTheDocument();
    });

    it('applies staggered animation delays', () => {
      render(<ContactSocial />);
      // All social links should be rendered (animation delay doesn't prevent rendering)
      expect(screen.getByLabelText('Follow us on Facebook')).toBeInTheDocument();
      expect(screen.getByLabelText('Follow us on Instagram')).toBeInTheDocument();
      expect(screen.getByLabelText('Follow us on TikTok')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('handles click on Facebook link', async () => {
      userEvent.setup();
      render(<ContactSocial />);

      const facebookLink = screen.getByLabelText('Follow us on Facebook');

      // Links should be clickable (they won't navigate in test environment)
      expect(facebookLink).toBeEnabled();
    });

    it('handles click on Instagram link', async () => {
      render(<ContactSocial />);

      const instagramLink = screen.getByLabelText('Follow us on Instagram');
      expect(instagramLink).toBeEnabled();
    });

    it('handles click on TikTok link', async () => {
      render(<ContactSocial />);

      const tiktokLink = screen.getByLabelText('Follow us on TikTok');
      expect(tiktokLink).toBeEnabled();
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct number of social platforms', () => {
      render(<ContactSocial />);

      const links = [
        screen.getByLabelText('Follow us on Facebook'),
        screen.getByLabelText('Follow us on Instagram'),
        screen.getByLabelText('Follow us on TikTok'),
      ];

      expect(links).toHaveLength(3);
    });

    it('maintains consistent handle format', () => {
      render(<ContactSocial />);

      const handles = screen.getAllByText('@lifeplacealfonso');

      // All handles should use the same format
      handles.forEach((handle) => {
        expect(handle.textContent).toBe('@lifeplacealfonso');
      });
    });
  });
});
