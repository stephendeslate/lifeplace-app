// frontend/admin-crm/src/apis/bookingflows/index.ts

// Re-export types
export type { BookingFlowQueryParams } from './flows';
export type { BookingFlowStepQueryParams } from './flow-steps';

// Import all functions to reassemble the bookingFlowsApi object
import {
  getBookingFlows,
  getBookingFlow,
  createBookingFlow,
  updateBookingFlow,
  deleteBookingFlow,
  duplicateBookingFlow,
  getActiveBookingFlows,
} from './flows';

import { getFlowPaymentGateways } from './flow-payment-gateways';

import {
  getFlowSteps,
  getBookingFlowSteps,
  getBookingFlowStep,
  createBookingFlowStep,
  updateBookingFlowStep,
  deleteBookingFlowStep,
  reorderSteps,
  getAvailableStepTypes,
} from './flow-steps';

import {
  getStepConfiguration,
  updateStepConfiguration,
  getPaymentTermsConfiguration,
  updatePaymentTermsConfiguration,
  migrateAvailabilityToDateTime,
  getStepValidationRules,
  getAvailabilitySettings,
  getPaymentOptions,
  getAvailableQuestionnaires,
  assignQuestionnaires,
  getAvailablePackages,
  getAvailableAddons,
  getAvailableCategories,
} from './step-configuration';

import {
  getBookingSessions,
  getBookingSession,
  createBookingSession,
  updateBookingSessionData,
  completeBooking,
  abandonSession,
} from './sessions';

import {
  getPublicBookingFlows,
  startPublicSession,
  getPublicPaymentGateways,
} from './public-flows';

import { getFlowAnalytics, getAllAnalytics, updateDailyAnalytics } from './analytics';

export const bookingFlowsApi = {
  // Booking Flows CRUD
  getBookingFlows,
  getBookingFlow,
  createBookingFlow,
  updateBookingFlow,
  deleteBookingFlow,
  duplicateBookingFlow,
  getActiveBookingFlows,

  // Payment Gateways
  getFlowPaymentGateways,

  // Flow Steps Management
  getFlowSteps,
  getBookingFlowSteps,
  getBookingFlowStep,
  createBookingFlowStep,
  updateBookingFlowStep,
  deleteBookingFlowStep,
  reorderSteps,
  getAvailableStepTypes,

  // Step Configuration Management
  getStepConfiguration,
  updateStepConfiguration,
  getPaymentTermsConfiguration,
  updatePaymentTermsConfiguration,
  migrateAvailabilityToDateTime,
  getStepValidationRules,
  getAvailabilitySettings,
  getPaymentOptions,
  getAvailableQuestionnaires,
  assignQuestionnaires,
  getAvailablePackages,
  getAvailableAddons,
  getAvailableCategories,

  // Booking Sessions Management
  getBookingSessions,
  getBookingSession,
  createBookingSession,
  updateBookingSessionData,
  completeBooking,
  abandonSession,

  // Public Booking Flow Endpoints
  getPublicBookingFlows,
  startPublicSession,
  getPublicPaymentGateways,

  // Analytics
  getFlowAnalytics,
  getAllAnalytics,
  updateDailyAnalytics,
};
