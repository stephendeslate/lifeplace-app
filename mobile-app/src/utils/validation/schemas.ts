/**
 * API Response Schemas
 *
 * Zod schemas for runtime validation of API responses.
 * Use these schemas to validate critical API responses and catch
 * unexpected data shapes before they cause runtime errors.
 *
 * Usage:
 * ```ts
 * import { validateResponse, LoginResponseSchema } from '@/utils/validation/schemas';
 *
 * const response = await api.post('/users/login/', credentials);
 * const data = validateResponse(LoginResponseSchema, response.data);
 * ```
 */

import { z } from 'zod';
import { logger } from '../logger';

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates API response data against a Zod schema.
 * Logs validation errors but returns data as-is to prevent app crashes.
 *
 * @param schema - Zod schema to validate against
 * @param data - Response data to validate
 * @param context - Optional context for error logging
 * @returns Parsed and validated data (or original data if validation fails in non-strict mode)
 */
export function validateResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    logger.warn('API response validation failed', {
      context,
      errors: result.error.issues.map((e: z.core.$ZodIssue) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    });

    // In development, we might want to throw
    // In production, return the data and let TypeScript handle it
    if (__DEV__) {
      logger.warn(
        `Response validation failed${context ? ` for ${context}` : ''}:`,
        result.error.issues
      );
    }

    // Return the original data cast to the expected type
    // This prevents app crashes from unexpected API changes
    return data as z.infer<T>;
  }

  return result.data;
}

/**
 * Strict validation that throws on failure.
 * Use for critical operations where invalid data should halt execution.
 */
export function validateResponseStrict<T extends z.ZodType>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    logger.error('Critical API response validation failed', {
      context,
      error,
    });
    throw error;
  }
}

// =============================================================================
// USER & AUTH SCHEMAS
// =============================================================================

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  phone_number: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  profile_picture: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const LoginResponseSchema = z.object({
  user: UserSchema,
  access: z.string(),
  refresh: z.string(),
});

export const TokenRefreshResponseSchema = z.object({
  access: z.string(),
  refresh: z.string().optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  ip_address: z.string(),
  last_active: z.string(),
  is_current: z.boolean(),
});

export const SessionsListSchema = z.array(SessionSchema);

// =============================================================================
// EVENT SCHEMAS
// =============================================================================

export const EventSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['LEAD', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'DRAFT']),
  event_type: z.object({
    id: z.number(),
    name: z.string(),
  }).nullable().optional(),
  venue: z.object({
    id: z.number(),
    name: z.string(),
  }).nullable().optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  total_amount: z.string().nullable().optional(),
  payment_status: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE']).optional(),
});

export const EventsListSchema = z.array(EventSchema);

export const PaginatedEventsSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: EventsListSchema,
});

// =============================================================================
// PAYMENT SCHEMAS
// =============================================================================

export const InvoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  event: z.object({
    id: z.number(),
    name: z.string(),
  }),
  amount: z.string(),
  due_date: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']),
  paid_amount: z.string().optional(),
  balance_due: z.string().optional(),
});

export const InvoicesListSchema = z.array(InvoiceSchema);

export const FinancialSummarySchema = z.object({
  total_amount: z.string(),
  total_paid: z.string(),
  total_balance: z.string(),
  overdue_amount: z.string(),
  upcoming_payments: z.array(z.object({
    id: z.number(),
    amount: z.string(),
    due_date: z.string(),
    event_name: z.string(),
  })).optional(),
});

// =============================================================================
// QUOTE SCHEMAS
// =============================================================================

export const QuoteSchema = z.object({
  id: z.number(),
  quote_number: z.string(),
  event: z.object({
    id: z.number(),
    name: z.string(),
  }),
  total_amount: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  valid_until: z.string().nullable().optional(),
  created_at: z.string(),
});

export const QuotesListSchema = z.array(QuoteSchema);

// =============================================================================
// CONTRACT SCHEMAS
// =============================================================================

export const ContractSchema = z.object({
  id: z.number(),
  event: z.object({
    id: z.number(),
    title: z.string(),
  }),
  template: z.object({
    id: z.number(),
    name: z.string(),
  }),
  status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'CANCELLED']),
  expires_at: z.string().nullable().optional(),
  signature_progress: z.object({
    total: z.number(),
    signed: z.number(),
  }).optional(),
});

export const ContractsListSchema = z.array(ContractSchema);

// =============================================================================
// GENERIC RESPONSE SCHEMAS
// =============================================================================

export const DetailResponseSchema = z.object({
  detail: z.string(),
});

export const ErrorResponseSchema = z.object({
  detail: z.string().optional(),
  code: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedLoginResponse = z.infer<typeof LoginResponseSchema>;
export type ValidatedEvent = z.infer<typeof EventSchema>;
export type ValidatedInvoice = z.infer<typeof InvoiceSchema>;
export type ValidatedQuote = z.infer<typeof QuoteSchema>;
export type ValidatedContract = z.infer<typeof ContractSchema>;
