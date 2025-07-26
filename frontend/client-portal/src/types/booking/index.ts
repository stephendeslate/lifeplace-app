// frontend/client-portal/src/types/booking/index.ts

// Re-export all booking-related types from their respective files

// Core types
export type {
  EventType,
  BookingFlow,
  BookingFlowStep,
  StepType,
  StepConfiguration,
  BookingSession,
} from './core.types';

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
} from './api.types';

// Payment types
export type {
  PaymentGateway,
  PaymentGatewayResponse,
} from './payment.types';

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
} from './stepConfigurations.types';

// Questionnaire types
export type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireStepItem,
  QuestionnaireDetailResponse,
} from './questionnaire.types';

// Step data types
export type {
  IntroductionStepData,
  DateTimeStepData,
  QuestionnaireStepData,
  SelectedPackage,
  PackageSelectionStepData,
  SelectedAddon,
  AddonSelectionStepData,
  PricingSummaryStepData,
  ContactInfoStepData,
  PaymentStepData,
  ReviewStepData,
  ConfirmationStepData,
  StepData,
  Discount,
  PricingCalculation
} from './stepData.types';

// State management types
export type {
  BookingProgress,
  BookingUIState,
  BookingState,
  BookingActions,
} from './state.types';