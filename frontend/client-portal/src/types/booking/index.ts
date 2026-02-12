// frontend/client-portal/src/types/booking/index.ts

// Re-export all booking-related types from their respective files

// Core types
export type {
  EventType,
  BookingFlow,
  BookingFlowStep,
  StepType,
  StepConfiguration,
} from "./core.types";

// API types
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
} from "./api.types";

// Payment types
export type { PaymentGateway, PaymentGatewayResponse } from "./payment.types";

// Step configuration types
export type {
  IntroductionStepConfiguration,
  DateTimeStepConfiguration,
  QuestionnaireStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  PricingSummaryStepConfiguration,
  ContactInfoStepConfiguration,
  PaymentInfoStepConfiguration,
  ConfirmationStepConfiguration,
  ProductCategory,
  ProductOption,
} from "./stepConfigurations.types";

// Questionnaire types
export type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireStepItem,
  QuestionnaireDetailResponse,
} from "./questionnaire.types";

// Step data types
export type {
  IntroductionStepData,
  DateTimeStepData,
  QuestionnaireStepData,
  AttendeeBreakdown,
  SelectedPackage,
  PackageSelectionStepData,
  SelectedAddon,
  AddonSelectionStepData,
  PricingSummaryStepData,
  ContactInfoStepData,
  PaymentStepData,
  ConfirmationStepData,
  VenueSelectionStepData,
  StepData,
  Discount,
  PricingCalculation,
  PricingLineItem,
  EventSummary,
  PackageLineItem,
  AddonLineItem,
  PricingBreakdown,
  PaymentSummary,
  ContactSummary,
  QuestionnaireResponseSummary,
  BookingReviewSummary,
} from "./stepData.types";

// State management types
export type {
  BookingProgress,
  BookingUIState,
  BookingState,
  BookingActions,
} from "./state.types";

// Booking data
export type {
  BookingData,
  SessionUpdatePayload,
  BookingSession,
} from "./bookingData.types";

// Venue types
export type {
  VenueOperatingRulesPublic,
  VenuePublic,
  PackageVenuePublic,
  CalculatedEventTimes,
  DurationBreakdown,
  EarlyCheckinInfo,
  LateCheckoutInfo,
  VenueTimeCalculation,
  CalculateTimesRequest,
  VenueAvailabilityResponse,
  DateTimeWithVenueData,
  RentableVenue,
  VenueSelectionStepConfiguration,
  CreateFromVenuesRequest,
  CreateFromVenuesResponse,
} from "./venues.types";
