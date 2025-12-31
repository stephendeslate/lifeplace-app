/**
 * Booking Types - Main Export
 * Re-exports all booking-related types from their respective modules
 */

// Core Types
export type {
  EventType,
  StepType,
  BookingFlow,
  BookingFlowStep,
  BookingFlowSummary,
  PaymentTermsConfig,
  StepConfiguration as BaseStepConfiguration,
  StepDisplayCondition,
  StepValidationRules,
} from './core.types';

export { STEP_TYPE_LABELS } from './core.types';

// API Types
export type {
  BookingSessionCreate,
  BookingSessionUpdate,
  BookingSessionStartResponse,
  BookingSessionGetResponse,
  BookingSessionUpdateResponse,
  BookingCompletionResult,
  ValidationError,
  StepValidationResult,
  ApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  RecoverableSessionInfo,
} from './api.types';

// Payment Types
export type {
  PaymentGatewayCode,
  PaymentGateway,
  PaymentGatewayPublicConfig,
  PaymentGatewayResponse,
  SavedPaymentMethod,
  PaymentIntent,
  PaymentType,
  PaymentSelection,
  PaymentCalculation,
  PaymentPlanSettings,
  BankTransferDetails,
} from './payment.types';

export { PAYMENT_GATEWAY_LABELS, PAYMENT_GATEWAY_ICONS } from './payment.types';

// Questionnaire Types
export type {
  QuestionnaireFieldType,
  FieldOption,
  QuestionnaireValidationRules,
  ConditionalRule,
  ConditionalLogic,
  QuestionnaireField,
  Questionnaire,
  QuestionnaireStepItem,
  UploadedFile,
  QuestionnaireFieldValue,
  QuestionnaireFieldValues,
  QuestionnaireStepData,
  FormattedQuestionnaireResponse,
  QuestionnaireStepConfiguration,
  QuestionnaireFieldResponse,
} from './questionnaire.types';

export { QUESTIONNAIRE_FIELD_TYPE_LABELS } from './questionnaire.types';

// Venue Types
export type {
  VenueOperatingRulesPublic,
  VenuePublic,
  PackageVenuePublic,
  RentableVenue,
  RentableVenueWithEventType,
  EventTypePricing,
  CalculatedEventTimes,
  VenueTimeCalculation,
  DurationBreakdown,
  VenueAvailabilityResponse,
  VenueSelectionStepData,
  VenueSelectionStepConfiguration,
  MatchedPackage,
  MatchedPackageVenue,
  CustomPackageEstimate,
  FindMatchingPackagesRequest,
  FindMatchingPackagesResponse,
  CreateFromVenuesRequest,
  CreateFromVenuesResponse,
} from './venues.types';

// Step Data Types
export type {
  ContactCustomFields,
  ProductAttributes,
  IntroductionStepData,
  DateTimeStepData,
  SelectedPackage,
  PackageSelectionStepData,
  SelectedAddon,
  AddonSelectionStepData,
  PricingSummaryStepData,
  ContactInfoStepData,
  PaymentStepData,
  ConfirmationStepData,
  StepData,
  PricingLineItem,
  VenueExcessHours,
  PricingCalculation,
  ProductOption,
  ProductCategory,
  Discount,
  BookingReviewSummary,
} from './stepData.types';

// Step Configuration Types
export type {
  CustomField,
  IntroductionStepConfiguration,
  DateTimeStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  ContactInfoStepConfiguration,
  EffectivePaymentTerms,
  PaymentInfoStepConfiguration,
  ConfirmationStepConfiguration,
  PricingSummaryStepConfiguration,
  StepConfiguration,
  StepConfigurationMap,
} from './stepConfigurations.types';

// Booking Data Types
export type {
  QuestionnaireResponse,
  BookingData,
  SessionUpdatePayload,
  BookingSession,
  SessionRecoveryInfo,
  StoredSession,
  SessionSyncStatus,
} from './bookingData.types';

// State Management Types
export type {
  StepDataMap,
  AnyStepData,
  PartialStepDataState,
  BookingProgress,
  BookingUIState,
  RecoverableSession,
  BookingState,
  BookingActions,
  BookingContextValue,
} from './state.types';

export { createInitialBookingState } from './state.types';
