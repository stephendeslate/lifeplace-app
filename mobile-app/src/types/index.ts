/**
 * Types - Main Barrel Export
 *
 * Re-exports all types from their respective modules for cleaner imports.
 * Instead of: import { User } from '@/types/auth.types'
 * Use: import { User } from '@/types'
 */

// =============================================================================
// AUTH TYPES
// =============================================================================
export type {
  UserRole,
  UserProfile,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthTokens,
  LoginResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  AcceptInvitationRequest,
  AuthState,
} from './auth.types';

// =============================================================================
// API TYPES (Core backend types)
// =============================================================================
export type {
  EventStatus as ApiEventStatus,
  PaymentStatus as ApiPaymentStatus,
  CheckInStatus,
  ProductType,
  PricingModel,
  QuoteStatus,
  PaymentPlanStatus,
  InstallmentStatus,
  PaymentTransactionStatus,
  InstallmentFrequency,
  BookingFlowStepType,
  VenueOperatingRules,
  Venue,
  VenueBlockedDate,
  ProductCategory as ApiProductCategory,
  ProductOption as ApiProductOption,
  Discount as ApiDiscount,
  EventType as ApiEventType,
  EventProductOption,
  Event as ApiEvent,
  QuoteLineItem,
  EventQuote,
  PaymentGateway as ApiPaymentGateway,
  PaymentMethod,
  PaymentInstallment,
  PaymentPlan,
  Payment,
  InvoiceLineItem,
  Invoice,
  BookingFlowStep as ApiBookingFlowStep,
  BookingFlow as ApiBookingFlow,
  BookingData as ApiBookingData,
  BookingSession as ApiBookingSession,
  QuestionnaireFieldType as ApiQuestionnaireFieldType,
  QuestionnaireField as ApiQuestionnaireField,
  Questionnaire as ApiQuestionnaire,
  QuestionnaireResponse as ApiQuestionnaireResponse,
  EventFeedback,
  PaginatedResponse as ApiPaginatedResponse,
  ApiError,
  PartialUpdate,
  VenueListItem,
  EventListItem,
  PackageListItem,
} from './api';

// =============================================================================
// DASHBOARD TYPES
// =============================================================================
export type {
  DashboardData,
  PendingQuote,
  PendingContract,
  OverduePayment,
  RecentMessage,
  UrgentTask,
  FinancialSummary,
  CriticalActions,
  EventStatus as DashboardEventStatus,
  Communications,
  FeaturedVenue,
  FeaturedPackage,
  ExploreData,
} from './dashboard.types';

// =============================================================================
// EVENT TYPES
// =============================================================================
export type {
  EventStatus,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
  CheckInStatus as EventCheckInStatus,
  WorkflowStageType,
  ContractStatus,
  CancelledReason,
  FileCategory,
  WorkflowStage,
  EventTask,
  TaskUpdate,
  EventTimeline,
  EventFile,
  FileUpload,
  EventNote,
  CreateNoteInput,
  EventQuestionnaire,
  EventFeedback as EventFeedbackType,
  FeedbackSubmission,
  EventContractSummary,
  SignatureProgress,
  RecentUpdate,
  Event,
  EventDetail,
  EventFilters,
  EventPreferencesUpdate,
  EventsListResponse,
} from './events.types';

// =============================================================================
// ACTION CENTER TYPES
// =============================================================================
export type {
  ActionType,
  UrgencyLevel,
  ActionItem,
  TaskActionItem,
  QuoteActionItem,
  ContractActionItem,
  PaymentActionItem,
  AnyActionItem,
  ActionCenterFilters,
  ActionCenterSortOption,
  ActionCounts,
  EventFilterOption,
} from './action-center.types';

export {
  isTaskAction,
  isQuoteAction,
  isContractAction,
  isPaymentAction,
  calculateUrgencyFromDays,
  calculateUrgencyFromPriority,
  calculateDaysUntil,
  calculateDaysPastDue,
  ACTION_TYPE_CONFIGS,
  URGENCY_CONFIGS,
  URGENCY_SCORES,
} from './action-center.types';

// =============================================================================
// DOCUMENT TYPES
// =============================================================================
export type {
  DocumentCategory,
  DocumentItem,
  DocumentUploadData,
} from './documents.types';

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================
export type {
  NotificationCategory,
  NotificationPreference,
  Notification,
  NotificationListResponse,
} from './notifications.types';

// =============================================================================
// PRIVACY TYPES
// =============================================================================
export type {
  ConsentStatus,
  ConsentHistoryResponse,
} from './privacy.types';

// =============================================================================
// EXPLORE TYPES
// =============================================================================
export type {
  VenuePublic,
  RentableVenue,
  RentableVenueWithEventType,
  PackagePublic,
  ProductCategory as ExploreProductCategory,
  EventType as ExploreEventType,
  FavoriteType,
  FavoriteItem,
  FavoritesState,
  ExploreFilters,
  ExploreTab,
  VenueAvailability,
} from './explore.types';

// =============================================================================
// BOOKING TYPES (re-exported from booking/index.ts)
// =============================================================================
export * from './booking';
