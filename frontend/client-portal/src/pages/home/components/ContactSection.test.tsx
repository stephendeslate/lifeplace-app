// pages/home/components/ContactSection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ContactSection } from './ContactSection';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock AnimatedElement to render children directly
vi.mock('../../../design-system/components/AnimatedElement', () => ({
  AnimatedElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock shared design system Button
vi.mock('@shared/design-system', () => ({
  Button: ({ children, onClick, variant, size, endIcon, ariaLabel, ...props }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
      {endIcon && <span data-testid="end-icon">{endIcon}</span>}
    </button>
  ),
}));

describe('ContactSection', () => {
  const mockOnNavigateToBooking = vi.fn();
  const mockOnNavigateToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the section heading', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByRole('heading', { name: /Ready to Create Memories?/i })).toBeInTheDocument();
    });

    it('should render the section description', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(
        screen.getByText(/Contact us today to discuss your event/i)
      ).toBeInTheDocument();
    });

    it('should render all three contact cards', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Alfonso, Cavite')).toBeInTheDocument();

      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('(02) 123-4567')).toBeInTheDocument();

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('info@lifeplacealfonso.com')).toBeInTheDocument();
    });

    it('should render the primary CTA button', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const ctaButton = screen.getByRole('button', { name: /Book your event now/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('data-variant', 'terracotta');
      expect(ctaButton).toHaveAttribute('data-size', 'large');
    });
  });

  describe('Authentication States', () => {
    it('should show "Create Account" button when user is not authenticated', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const createAccountButton = screen.getByRole('button', { name: /Create a new account/i });
      expect(createAccountButton).toBeInTheDocument();
      expect(createAccountButton).toHaveAttribute('data-variant', 'secondary');
    });

    it('should NOT show "Create Account" button when user is authenticated', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: true });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.queryByRole('button', { name: /Create a new account/i })).not.toBeInTheDocument();
    });

    it('should always show "Get In Touch" button regardless of auth state', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: true });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByRole('button', { name: /Book your event now/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onNavigateToBooking when primary CTA is clicked', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const ctaButton = screen.getByRole('button', { name: /Book your event now/i });
      fireEvent.click(ctaButton);

      expect(mockOnNavigateToBooking).toHaveBeenCalledTimes(1);
    });

    it('should call onNavigateToRegister when "Create Account" is clicked', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const createAccountButton = screen.getByRole('button', { name: /Create a new account/i });
      fireEvent.click(createAccountButton);

      expect(mockOnNavigateToRegister).toHaveBeenCalledTimes(1);
    });

    it('should handle missing callback functions gracefully', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(<ContactSection />);

      const ctaButton = screen.getByRole('button', { name: /Book your event now/i });

      // Should not throw an error when clicked without callbacks
      expect(() => fireEvent.click(ctaButton)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const heading = screen.getByRole('heading', { name: /Ready to Create Memories?/i });
      expect(heading.tagName).toBe('H2');
    });

    it('should have aria-labels on buttons', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByRole('button', { name: /Book your event now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create a new account/i })).toBeInTheDocument();
    });

    it('should render contact information as readable text', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      // All contact information should be accessible
      expect(screen.getByText('Alfonso, Cavite')).toBeInTheDocument();
      expect(screen.getByText('(02) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('info@lifeplacealfonso.com')).toBeInTheDocument();
    });

    it('should have proper semantic structure with section element', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      const { container } = render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      // Section component should render as a section element
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Design System Integration', () => {
    it('should use terracotta variant for primary button', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /Book your event now/i });
      expect(primaryButton).toHaveAttribute('data-variant', 'terracotta');
    });

    it('should use secondary variant for Create Account button', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const secondaryButton = screen.getByRole('button', { name: /Create a new account/i });
      expect(secondaryButton).toHaveAttribute('data-variant', 'secondary');
    });

    it('should use large size for all buttons', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('data-size', 'large');
      });
    });

    it('should render arrow icon on primary button', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /Book your event now/i });
      const endIcon = within(primaryButton).getByTestId('end-icon');
      expect(endIcon).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('should display correct location information', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Alfonso, Cavite')).toBeInTheDocument();
    });

    it('should display correct phone information', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('(02) 123-4567')).toBeInTheDocument();
    });

    it('should display correct email information', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });

      render(
        <ContactSection
          onNavigateToBooking={mockOnNavigateToBooking}
          onNavigateToRegister={mockOnNavigateToRegister}
        />
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('info@lifeplacealfonso.com')).toBeInTheDocument();
    });
  });
});
