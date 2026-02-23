// frontend/admin-crm/src/utils/validation.test.ts

import { describe, it, expect } from 'vitest';
import {
  clientFormSchema,
  clientUpdateSchema,
  eventFormSchema,
  productFormSchema,
  paymentFormSchema,
  templateFormSchema,
  bookingFlowFormSchema,
  userFormSchema,
  loginSchema,
  changePasswordSchema,
  acceptInvitationSchema,
  getValidationErrors,
} from './validation';

describe('Validation Schemas', () => {
  // ============================================
  // Client Form Schema
  // ============================================
  describe('clientFormSchema', () => {
    it('validates correct client data', () => {
      const validData = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = clientFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates client with optional profile', () => {
      const validData = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        profile: {
          company: 'Acme Inc',
          phone: '+14155551234',
        },
      };

      const result = clientFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
        expect(result.error.issues[0].message).toContain('valid email');
      }
    });

    it('rejects empty email', () => {
      const invalidData = {
        email: '',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('rejects missing first_name', () => {
      const invalidData = {
        email: 'test@example.com',
        first_name: '',
        last_name: 'Doe',
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('first_name');
      }
    });

    it('rejects first_name exceeding max length', () => {
      const invalidData = {
        email: 'test@example.com',
        first_name: 'a'.repeat(101),
        last_name: 'Doe',
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('first_name');
        expect(result.error.issues[0].message).toContain('too long');
      }
    });

    it('validates phone number with various formats', () => {
      const validPhones = ['09123456789', '+639123456789', '+14155551234', '+442071234567'];

      validPhones.forEach((phone) => {
        const data = {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          profile: { phone },
        };
        const result = clientFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid phone number format', () => {
      const invalidData = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        profile: {
          phone: 'not-a-phone-abc',
        },
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Client Update Schema
  // ============================================
  describe('clientUpdateSchema', () => {
    it('allows partial updates', () => {
      const partialData = {
        first_name: 'Jane',
      };

      const result = clientUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('allows empty object (no updates)', () => {
      const result = clientUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('still validates email format when provided', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = clientUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Login Schema
  // ============================================
  describe('loginSchema', () => {
    it('validates correct login credentials', () => {
      const validData = {
        email: 'admin@example.com',
        password: 'secretpassword',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const invalidData = {
        email: '',
        password: 'secretpassword',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('rejects missing password', () => {
      const invalidData = {
        email: 'admin@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'secretpassword',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Change Password Schema
  // ============================================
  describe('changePasswordSchema', () => {
    it('validates correct password change data', () => {
      const validData = {
        current_password: 'oldpassword123',
        new_password: 'NewPassword1',
        confirm_password: 'NewPassword1',
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects when passwords do not match', () => {
      const invalidData = {
        current_password: 'oldpassword123',
        new_password: 'NewPassword1',
        confirm_password: 'DifferentPassword1',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('match'))).toBe(true);
      }
    });

    it('rejects weak password (too short)', () => {
      const invalidData = {
        current_password: 'oldpassword123',
        new_password: 'Short1',
        confirm_password: 'Short1',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8 characters');
      }
    });

    it('rejects password without uppercase', () => {
      const invalidData = {
        current_password: 'oldpassword123',
        new_password: 'alllowercase1',
        confirm_password: 'alllowercase1',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('rejects password without lowercase', () => {
      const invalidData = {
        current_password: 'oldpassword123',
        new_password: 'ALLUPPERCASE1',
        confirm_password: 'ALLUPPERCASE1',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects password without number', () => {
      const invalidData = {
        current_password: 'oldpassword123',
        new_password: 'NoNumbersHere',
        confirm_password: 'NoNumbersHere',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Accept Invitation Schema
  // ============================================
  describe('acceptInvitationSchema', () => {
    it('validates correct invitation acceptance', () => {
      const validData = {
        password: 'ValidPass1',
        confirm_password: 'ValidPass1',
        terms_accepted: true,
      };

      const result = acceptInvitationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects when terms not accepted', () => {
      const invalidData = {
        password: 'ValidPass1',
        confirm_password: 'ValidPass1',
        terms_accepted: false,
      };

      const result = acceptInvitationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('terms'))).toBe(true);
      }
    });

    it('rejects mismatched passwords', () => {
      const invalidData = {
        password: 'ValidPass1',
        confirm_password: 'DifferentPass1',
        terms_accepted: true,
      };

      const result = acceptInvitationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Event Form Schema
  // ============================================
  describe('eventFormSchema', () => {
    it('validates correct event data', () => {
      const validData = {
        name: 'Wedding Reception',
        event_type: 1,
        status: 'CONFIRMED' as const,
        start_date: new Date('2024-06-15'),
        client: 1,
      };

      const result = eventFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates all status types', () => {
      const statuses = ['LEAD', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;

      statuses.forEach((status) => {
        const data = {
          name: 'Test Event',
          event_type: 1,
          status,
          start_date: new Date(),
          client: 1,
        };
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid status', () => {
      const invalidData = {
        name: 'Test Event',
        event_type: 1,
        status: 'INVALID_STATUS',
        start_date: new Date(),
        client: 1,
      };

      const result = eventFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects missing event name', () => {
      const invalidData = {
        name: '',
        event_type: 1,
        status: 'CONFIRMED',
        start_date: new Date(),
        client: 1,
      };

      const result = eventFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects negative total_price', () => {
      const invalidData = {
        name: 'Test Event',
        event_type: 1,
        status: 'CONFIRMED' as const,
        start_date: new Date(),
        client: 1,
        total_price: -100,
      };

      const result = eventFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Product Form Schema
  // ============================================
  describe('productFormSchema', () => {
    it('validates correct product data', () => {
      const validData = {
        name: 'Premium Package',
        category: 1,
        base_price: 1500.0,
        currency: 'USD',
        is_active: true,
      };

      const result = productFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects negative price', () => {
      const invalidData = {
        name: 'Test Product',
        category: 1,
        base_price: -50,
        currency: 'USD',
      };

      const result = productFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects invalid currency code length', () => {
      const invalidData = {
        name: 'Test Product',
        category: 1,
        base_price: 100,
        currency: 'USDD', // 4 chars, should be 3
      };

      const result = productFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Payment Form Schema
  // ============================================
  describe('paymentFormSchema', () => {
    it('validates correct payment data', () => {
      const validData = {
        amount: 500.0,
        payment_method: 'CARD' as const,
      };

      const result = paymentFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates all payment methods', () => {
      const methods = ['CARD', 'BANK_TRANSFER', 'CASH', 'CHECK', 'OTHER'] as const;

      methods.forEach((method) => {
        const data = {
          amount: 100,
          payment_method: method,
        };
        const result = paymentFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('rejects zero or negative amount', () => {
      const invalidData = {
        amount: 0,
        payment_method: 'CARD' as const,
      };

      const result = paymentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Template Form Schema
  // ============================================
  describe('templateFormSchema', () => {
    it('validates correct email template', () => {
      const validData = {
        name: 'Welcome Email',
        template_type: 'EMAIL' as const,
        subject: 'Welcome to LifePlace',
        body: 'Hello {{name}}, welcome!',
        is_active: true,
      };

      const result = templateFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates SMS template without subject', () => {
      const validData = {
        name: 'Reminder SMS',
        template_type: 'SMS' as const,
        body: 'Your appointment is tomorrow.',
        is_active: true,
      };

      const result = templateFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty body', () => {
      const invalidData = {
        name: 'Empty Template',
        template_type: 'EMAIL' as const,
        body: '',
      };

      const result = templateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Booking Flow Form Schema
  // ============================================
  describe('bookingFlowFormSchema', () => {
    it('validates correct booking flow', () => {
      const validData = {
        name: 'Standard Booking',
        description: 'Our standard booking process',
        is_active: true,
        is_default: false,
      };

      const result = bookingFlowFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates with payment gateways', () => {
      const validData = {
        name: 'Premium Booking',
        is_active: true,
        allowed_payment_gateways: [1, 2, 3],
      };

      const result = bookingFlowFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const invalidData = {
        name: '',
        is_active: true,
      };

      const result = bookingFlowFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // User Form Schema
  // ============================================
  describe('userFormSchema', () => {
    it('validates correct admin user', () => {
      const validData = {
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN' as const,
        is_active: true,
      };

      const result = userFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates client user', () => {
      const validData = {
        email: 'client@example.com',
        first_name: 'Client',
        last_name: 'User',
        role: 'CLIENT' as const,
        is_active: true,
      };

      const result = userFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const invalidData = {
        email: 'user@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'INVALID_ROLE',
      };

      const result = userFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // getValidationErrors Helper
  // ============================================
  describe('getValidationErrors', () => {
    it('converts Zod errors to flat object', () => {
      const invalidData = {
        email: 'invalid',
        first_name: '',
        last_name: 'Doe',
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = getValidationErrors(result.error);
        expect(typeof errors).toBe('object');
        expect(errors.email).toBeDefined();
        expect(errors.first_name).toBeDefined();
      }
    });

    it('handles nested paths', () => {
      const invalidData = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        profile: {
          phone: 'invalid-phone-abc',
        },
      };

      const result = clientFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = getValidationErrors(result.error);
        expect(errors['profile.phone']).toBeDefined();
      }
    });
  });
});
