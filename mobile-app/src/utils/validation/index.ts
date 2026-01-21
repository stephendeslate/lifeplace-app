/**
 * Validation Utilities
 *
 * Zod-based runtime validation for API responses.
 */

export {
  // Utilities
  validateResponse,
  validateResponseStrict,
  // Auth schemas
  UserSchema,
  LoginResponseSchema,
  TokenRefreshResponseSchema,
  SessionSchema,
  SessionsListSchema,
  // Event schemas
  EventSchema,
  EventsListSchema,
  PaginatedEventsSchema,
  // Payment schemas
  InvoiceSchema,
  InvoicesListSchema,
  FinancialSummarySchema,
  // Quote schemas
  QuoteSchema,
  QuotesListSchema,
  // Contract schemas
  ContractSchema,
  ContractsListSchema,
  // Generic schemas
  DetailResponseSchema,
  ErrorResponseSchema,
  // Types
  type ValidatedUser,
  type ValidatedLoginResponse,
  type ValidatedEvent,
  type ValidatedInvoice,
  type ValidatedQuote,
  type ValidatedContract,
} from './schemas';
