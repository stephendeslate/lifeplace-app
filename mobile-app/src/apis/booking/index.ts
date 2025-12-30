/**
 * Booking API Layer - Barrel Export
 *
 * Central export for all booking-related API modules.
 */

// Core API - Session management, flows, completion
export { BookingCoreAPI } from './core.api';

// Step-specific APIs
export { IntroductionAPI } from './introduction.api';
export { DateTimeAPI } from './datetime.api';
export { VenuesAPI } from './venues.api';
export { ProductsAPI } from './products.api';
export type { ProductCategory, ProductOption, Discount } from './products.api';
export { QuestionnaireAPI } from './questionnaire.api';
export { ContactInfoAPI } from './contact_info.api';
export { PaymentAPI } from './payment.api';
export { ConfirmationAPI } from './confirmation.api';
export type { BookingDetails } from './confirmation.api';

// Default export for convenience
export { BookingCoreAPI as default } from './core.api';
