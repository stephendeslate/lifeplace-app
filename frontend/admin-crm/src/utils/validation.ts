// frontend/admin-crm/src/utils/validation.ts

import { z } from "zod";
import { validatePhoneNumber } from "@shared/utils/phoneValidation";

// Common validation patterns
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

const phoneSchema = z
  .string()
  .refine(
    (value) => {
      if (!value || !value.trim()) return true;
      return validatePhoneNumber(value);
    },
    { message: "Please enter a valid phone number" },
  )
  .optional()
  .nullable();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  );

const nameSchema = z
  .string()
  .min(1, "This field is required")
  .max(100, "Name is too long");

// Client validation schemas
export const clientFormSchema = z.object({
  email: emailSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  profile: z
    .object({
      company: z.string().max(200, "Company name is too long").optional(),
      phone: phoneSchema,
    })
    .optional(),
  password: z.string().optional(),
  is_active: z.boolean().default(true).optional(),
});

export const clientUpdateSchema = clientFormSchema.partial().extend({
  password: z.string().optional(),
});

// Event validation schemas
export const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required").max(255),
  event_type: z.number().positive("Please select an event type"),
  status: z.enum(["LEAD", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  start_date: z.date(),
  end_date: z.date().nullable().optional(),
  client: z.number().positive("Please select a client"),
  total_price: z
    .number()
    .min(0, "Price cannot be negative")
    .nullable()
    .optional(),
  lead_source: z.string().max(50).optional(),
});

// Product validation schemas
export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(1000, "Description is too long").optional(),
  category: z.number().positive("Please select a category"),
  base_price: z.number().min(0, "Price cannot be negative"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
  sku: z.string().max(50, "SKU is too long").optional(),
  is_active: z.boolean().default(true),
});

// Payment validation schemas
export const paymentFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  payment_method: z.enum(["CARD", "BANK_TRANSFER", "CASH", "CHECK", "OTHER"]),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Communication template validation
export const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  template_type: z.enum(["EMAIL", "SMS"]),
  subject: z.string().max(200, "Subject is too long").optional(),
  body: z.string().min(1, "Template body is required"),
  category: z.string().max(50).optional(),
  is_active: z.boolean().default(true),
});

// Questionnaire validation
export const questionnaireFieldSchema = z.object({
  label: z.string().min(1, "Field label is required").max(200),
  field_type: z.enum([
    "TEXT",
    "EMAIL",
    "NUMBER",
    "DATE",
    "SELECT",
    "MULTISELECT",
    "CHECKBOX",
    "RADIO",
    "TEXTAREA",
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  help_text: z.string().max(500).optional(),
  options: z.array(z.string()).optional(),
  validation_rules: z.record(z.string(), z.unknown()).optional(),
  order: z.number().int().min(0).default(0),
});

// Booking flow validation
export const bookingFlowFormSchema = z.object({
  name: z.string().min(1, "Flow name is required").max(100),
  description: z.string().max(500).optional(),
  event_type: z
    .number()
    .positive("Please select an event type")
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  allowed_payment_gateways: z.array(z.number()).optional(),
});

// User/Admin validation
export const userFormSchema = z.object({
  email: emailSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  role: z.enum(["ADMIN", "CLIENT"]),
  is_active: z.boolean().default(true),
  password: passwordSchema.optional(),
});

// Login validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Change password validation
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Accept invitation validation
export const acceptInvitationSchema = z
  .object({
    password: passwordSchema,
    confirm_password: z.string().min(1, "Please confirm your password"),
    terms_accepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Helper function to get validation errors in a user-friendly format
export const getValidationErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });
  return errors;
};

// Type exports for form data
export type ClientFormData = z.infer<typeof clientFormSchema>;
export type EventFormData = z.infer<typeof eventFormSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type PaymentFormData = z.infer<typeof paymentFormSchema>;
export type TemplateFormData = z.infer<typeof templateFormSchema>;
export type QuestionnaireFieldData = z.infer<typeof questionnaireFieldSchema>;
export type BookingFlowFormData = z.infer<typeof bookingFlowFormSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;
