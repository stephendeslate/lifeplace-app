// frontend/client-portal/src/utils/bookingValidation.ts

import { z } from 'zod';

// Common validation patterns
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*\d)/,
    'Password must contain at least one lowercase letter and one number'
  );

const nameSchema = z
  .string()
  .min(1, 'This field is required')
  .max(100, 'Name is too long');

// Auth validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  first_name: nameSchema,
  last_name: nameSchema,
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const acceptInvitationSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Booking step validation schemas
export const introductionStepSchema = z.object({
  event_type: z.number().positive('Please select an event type'),
  event_date: z.date().optional(),
  guest_count: z.number().min(1, 'Guest count must be at least 1').optional(),
  special_requests: z.string().max(1000, 'Message is too long').optional(),
  referral_source: z.string().max(100).optional(),
});

export const contactInfoStepSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  company: z.string().max(200, 'Company name is too long').optional().or(z.literal('')),
  create_account: z.boolean().default(false),
  password: z.string().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
}).refine((data) => {
  // If create_account is true and user is not authenticated, password is required
  if (data.create_account && data.password !== undefined) {
    return data.password.length >= 8;
  }
  return true;
}, {
  message: 'Password must be at least 8 characters when creating an account',
  path: ['password'],
});

export const dateTimeStepSchema = z.object({
  selected_date: z.date(),
  selected_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration_hours: z.number().min(1, 'Duration must be at least 1 hour').max(24),
  setup_time: z.number().min(0).max(24).optional(),
  cleanup_time: z.number().min(0).max(24).optional(),
  special_timing_requests: z.string().max(500).optional().or(z.literal('')),
});

export const packageSelectionStepSchema = z.object({
  selected_package: z.number().positive('Please select a package'),
  customizations: z.record(z.string(), z.unknown()).optional(),
  custom_requests: z.string().max(1000).optional().or(z.literal('')),
});

export const addonSelectionStepSchema = z.object({
  selected_addons: z.array(z.number()).default([]),
  addon_customizations: z.record(z.string(), z.unknown()).optional(),
  quantity_adjustments: z.record(z.string(), z.number()).optional(),
});

export const questionnaireStepSchema = z.object({
  responses: z.record(z.string(), z.unknown()),
  completed_sections: z.array(z.string()).optional(),
});

export const paymentInfoStepSchema = z.object({
  payment_method: z.enum(['CARD', 'BANK_TRANSFER', 'CASH', 'CHECK', 'PAYMENT_PLAN']),
  payment_gateway: z.number().positive('Please select a payment method'),
  card_details: z.object({
    name_on_card: z.string().min(1, 'Cardholder name is required').optional(),
    billing_address: z.object({
      line1: z.string().min(1, 'Address line 1 is required').optional(),
      line2: z.string().optional(),
      city: z.string().min(1, 'City is required').optional(),
      state: z.string().min(1, 'State is required').optional(),
      postal_code: z.string().min(1, 'Postal code is required').optional(),
      country: z.string().min(1, 'Country is required').optional(),
    }).optional(),
    save_card: z.boolean().default(false).optional(),
  }).optional(),
  payment_plan: z.object({
    plan_type: z.enum(['FULL', 'DEPOSIT', 'INSTALLMENTS']).optional(),
    deposit_percentage: z.number().min(0).max(100).optional(),
    installment_count: z.number().min(2).max(12).optional(),
  }).optional(),
  special_instructions: z.string().max(500).optional().or(z.literal('')),
});

export const pricingSummaryStepSchema = z.object({
  subtotal: z.number().min(0),
  tax_amount: z.number().min(0),
  discount_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0),
  breakdown: z.array(z.object({
    item_name: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    total_price: z.number().min(0),
    type: z.enum(['PACKAGE', 'ADDON', 'TAX', 'DISCOUNT', 'FEE']),
  })),
});

export const reviewStepSchema = z.object({
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions to proceed',
  }),
  privacy_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the privacy policy to proceed',
  }),
  marketing_consent: z.boolean().default(false),
  final_notes: z.string().max(1000).optional().or(z.literal('')),
});

export const confirmationStepSchema = z.object({
  confirmation_number: z.string(),
  booking_reference: z.string(),
  payment_status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  next_steps: z.array(z.string()),
  contact_info: z.object({
    support_email: z.string().email(),
    support_phone: z.string(),
  }),
});

// Combined booking data schema for validation of complete booking
export const completeBookingSchema = z.object({
  introduction: introductionStepSchema.partial(),
  contact_info: contactInfoStepSchema,
  datetime: dateTimeStepSchema,
  package_selection: packageSelectionStepSchema,
  addon_selection: addonSelectionStepSchema.optional(),
  questionnaire: questionnaireStepSchema.optional(),
  payment_info: paymentInfoStepSchema,
  pricing_summary: pricingSummaryStepSchema,
  review: reviewStepSchema,
});

// Helper function to get validation errors in a user-friendly format
export const getValidationErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  return errors;
};

// Helper function to validate individual booking steps
export const validateBookingStep = (stepType: string, data: unknown) => {
  try {
    switch (stepType) {
      case 'introduction':
        return { isValid: true, data: introductionStepSchema.parse(data), errors: {} };
      case 'contact_info':
        return { isValid: true, data: contactInfoStepSchema.parse(data), errors: {} };
      case 'datetime':
        return { isValid: true, data: dateTimeStepSchema.parse(data), errors: {} };
      case 'package_selection':
        return { isValid: true, data: packageSelectionStepSchema.parse(data), errors: {} };
      case 'addon_selection':
        return { isValid: true, data: addonSelectionStepSchema.parse(data), errors: {} };
      case 'questionnaire':
        return { isValid: true, data: questionnaireStepSchema.parse(data), errors: {} };
      case 'payment_info':
        return { isValid: true, data: paymentInfoStepSchema.parse(data), errors: {} };
      case 'pricing_summary':
        return { isValid: true, data: pricingSummaryStepSchema.parse(data), errors: {} };
      case 'review':
        return { isValid: true, data: reviewStepSchema.parse(data), errors: {} };
      default:
        return { isValid: false, data: null, errors: { step: 'Unknown step type' } };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, data: null, errors: getValidationErrors(error) };
    }
    return { isValid: false, data: null, errors: { general: 'Validation failed' } };
  }
};

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;
export type IntroductionStepData = z.infer<typeof introductionStepSchema>;
export type ContactInfoStepData = z.infer<typeof contactInfoStepSchema>;
export type DateTimeStepData = z.infer<typeof dateTimeStepSchema>;
export type PackageSelectionStepData = z.infer<typeof packageSelectionStepSchema>;
export type AddonSelectionStepData = z.infer<typeof addonSelectionStepSchema>;
export type QuestionnaireStepData = z.infer<typeof questionnaireStepSchema>;
export type PaymentInfoStepData = z.infer<typeof paymentInfoStepSchema>;
export type PricingSummaryStepData = z.infer<typeof pricingSummaryStepSchema>;
export type ReviewStepData = z.infer<typeof reviewStepSchema>;
export type ConfirmationStepData = z.infer<typeof confirmationStepSchema>;
export type CompleteBookingData = z.infer<typeof completeBookingSchema>;