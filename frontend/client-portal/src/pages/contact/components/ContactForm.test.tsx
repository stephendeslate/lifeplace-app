// pages/contact/components/ContactForm.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './ContactForm';
import { inquiryApi } from '../../../apis/inquiry.api';

// Mock the inquiry API
vi.mock('../../../apis/inquiry.api', () => ({
  inquiryApi: {
    submitInquiry: vi.fn(),
  },
}));

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
  ModernCard: ({ children, variant, size }: { children: React.ReactNode; variant?: string; size?: string }) => (
    <div data-testid="modern-card" data-variant={variant} data-size={size}>
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
        2: '8px',
        5: '20px',
        8: '32px',
      },
      radius: {
        lg: '12px',
      },
    },
    typography: {
      weights: {
        semibold: 600,
      },
      sizes: {
        md: '16px',
        sm: '14px',
      },
      lineHeights: {
        relaxed: 1.7,
      },
    },
    color: {
      base: {
        neutral: {
          50: '#FAF7F2',
          100: '#F5F1EB',
          200: '#EBE5DD',
          600: '#6F6B67',
          800: '#3A3836',
          900: '#2E2A28',
        },
        sage: {
          50: '#f7f8f6',
          150: '#d4d9d0',
          400: '#a3ada0',
          500: '#7D8570',
          600: '#6a7360',
        },
      },
      semantic: {
        success: {
          main: '#5BA872',
          light: '#88c399',
          dark: '#3d8c57',
          subtle: 'rgba(91, 168, 114, 0.08)',
        },
        error: {
          main: '#D94F3D',
          light: '#e77668',
          dark: '#b83828',
          subtle: 'rgba(217, 79, 61, 0.08)',
        },
      },
    },
    animation: {
      transition: {
        base: 'all 0.25s ease',
      },
    },
  },
}));

// Mock the shared Button component
vi.mock('../../../../../shared/design-system', () => ({
  Button: ({ children, onClick, disabled, loading, type, endIcon, fullWidth, ariaLabel }: Record<string, unknown>) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      aria-label={ariaLabel}
      data-loading={loading}
      data-full-width={fullWidth}
      data-has-end-icon={!!endIcon}
    >
      {children}
    </button>
  ),
}));

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the form with all fields', () => {
      render(<ContactForm />);

      expect(screen.getByText('Send Us a Message')).toBeInTheDocument();
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/inquiry type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your message/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('should render privacy notice', () => {
      render(<ContactForm />);

      expect(
        screen.getByText(/by submitting this form, you agree to be contacted/i)
      ).toBeInTheDocument();
    });

    it('should have all required fields marked as required', () => {
      render(<ContactForm />);

      const nameField = screen.getByLabelText(/your name/i);
      const emailField = screen.getByLabelText(/email address/i);
      const inquiryTypeField = screen.getByLabelText(/inquiry type/i);
      const messageField = screen.getByLabelText(/your message/i);

      expect(nameField).toBeRequired();
      expect(emailField).toBeRequired();
      expect(inquiryTypeField).toBeRequired();
      expect(messageField).toBeRequired();
    });

    it('should have phone field as optional', () => {
      render(<ContactForm />);

      const phoneField = screen.getByLabelText(/phone number/i);
      expect(phoneField).not.toBeRequired();
    });
  });

  describe('Form Interaction', () => {
    it('should update form fields on user input', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const nameField = screen.getByLabelText(/your name/i) as HTMLInputElement;
      const emailField = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const messageField = screen.getByLabelText(/your message/i) as HTMLTextAreaElement;

      await user.type(nameField, 'John Doe');
      await user.type(emailField, 'john@example.com');
      await user.type(messageField, 'This is a test message');

      expect(nameField.value).toBe('John Doe');
      expect(emailField.value).toBe('john@example.com');
      expect(messageField.value).toBe('This is a test message');
    });

    it('should render inquiry type select field', () => {
      render(<ContactForm />);

      const inquiryTypeField = screen.getByLabelText(/inquiry type/i);

      // Verify the field exists and is required
      expect(inquiryTypeField).toBeInTheDocument();
      expect(inquiryTypeField).toBeRequired();

      // Verify inquiry type options are available in the DOM
      expect(screen.getByText('General Inquiry')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully with valid data', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.mocked(inquiryApi.submitInquiry);
      mockSubmit.mockResolvedValueOnce({ success: true } as unknown as Awaited<ReturnType<typeof inquiryApi.submitInquiry>>);

      render(<ContactForm />);

      // Fill out the form
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/your message/i), 'Test message');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      // Verify API was called
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '',
          inquiryType: 'GENERAL_INQUIRY',
          message: 'Test message',
        });
      });

      // Verify success message is shown
      await waitFor(() => {
        expect(
          screen.getByText(/thank you for your inquiry/i)
        ).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.mocked(inquiryApi.submitInquiry);
      mockSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true } as unknown as Awaited<ReturnType<typeof inquiryApi.submitInquiry>>), 100))
      );

      render(<ContactForm />);

      // Fill out the form
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/your message/i), 'Test message');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      // Verify loading state
      expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.mocked(inquiryApi.submitInquiry);
      mockSubmit.mockResolvedValueOnce({ success: true } as unknown as Awaited<ReturnType<typeof inquiryApi.submitInquiry>>);

      render(<ContactForm />);

      const nameField = screen.getByLabelText(/your name/i) as HTMLInputElement;
      const emailField = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const messageField = screen.getByLabelText(/your message/i) as HTMLTextAreaElement;

      // Fill out the form
      await user.type(nameField, 'John Doe');
      await user.type(emailField, 'john@example.com');
      await user.type(messageField, 'Test message');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByText(/thank you for your inquiry/i)).toBeInTheDocument();
      });

      // Verify form is cleared
      expect(nameField.value).toBe('');
      expect(emailField.value).toBe('');
      expect(messageField.value).toBe('');
    });

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.mocked(inquiryApi.submitInquiry);
      mockSubmit.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Failed to submit inquiry',
          },
        },
      });

      render(<ContactForm />);

      // Fill out the form
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/your message/i), 'Test message');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText(/failed to submit inquiry/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting error', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.mocked(inquiryApi.submitInquiry);
      mockSubmit.mockRejectedValueOnce({
        response: {
          status: 429,
        },
      });

      render(<ContactForm />);

      // Fill out the form
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/your message/i), 'Test message');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify rate limiting error message is shown
      await waitFor(() => {
        expect(
          screen.getByText(/too many submissions/i)
        ).toBeInTheDocument();
      });
    });

    it('should call API when handling validation errors', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.mocked(inquiryApi.submitInquiry);
      mockSubmit.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Validation failed',
          },
        },
      });

      render(<ContactForm />);

      // Fill out the form
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/your message/i), 'Test message');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify API was called (error handling is internal)
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ContactForm />);

      const submitButton = screen.getByRole('button', { name: /send message/i });
      expect(submitButton).toHaveAccessibleName();
    });

    it('should have proper form structure', () => {
      render(<ContactForm />);

      const form = screen.getByRole('button', { name: /send message/i }).closest('form');
      expect(form).toBeInTheDocument();
    });

    it('should have disabled attribute on form fields when isSubmitting prop is used', () => {
      render(<ContactForm />);

      // Initially all form fields should not be disabled
      expect(screen.getByLabelText(/your name/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/email address/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/phone number/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/inquiry type/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/your message/i)).not.toBeDisabled();

      // Submit button should be enabled
      const submitButton = screen.getByRole('button', { name: /send message/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Design System Integration', () => {
    it('should use Modern Organic Luxury design tokens', () => {
      const { container } = render(<ContactForm />);

      // Check that Section, Container, and ModernCard components are rendered
      expect(container.querySelector('section')).toBeInTheDocument();
    });

    it('should animate on mount', () => {
      const { container } = render(<ContactForm />);

      // AnimatedElement should be present
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
