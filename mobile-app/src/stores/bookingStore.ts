/**
 * Booking Store (Zustand)
 *
 * Manages the multi-step booking flow state.
 *
 * KEY CONCEPTS:
 * - This store is NOT persisted (booking sessions are ephemeral)
 * - The booking flow is a wizard with configurable steps
 * - Each step can have validation rules and display conditions
 * - Pricing is calculated server-side and stored here for display
 */

import { create } from 'zustand';

import type {
  BookingFlow,
  BookingSession,
  BookingFlowStep,
  Venue,
  ProductOption,
} from '@/types/api';

// =============================================================================
// TYPES
// =============================================================================

export interface ContactInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
}

export interface BookingData {
  // Selections
  selectedVenues: string[]; // Venue IDs
  selectedPackages: string[]; // ProductOption IDs
  selectedAddons: string[]; // ProductOption IDs

  // Date/Time
  eventDate: string | null; // ISO date string
  endDate: string | null; // ISO date string (for multi-day events)
  startTime: string | null; // HH:MM format
  endTime: string | null; // HH:MM format
  duration: number | null; // Hours

  // Details
  numParticipants: number | null;
  eventName: string | null;

  // Contact
  contactInfo: ContactInfo | null;

  // Questionnaire
  questionnaireResponses: Record<string, unknown>;

  // Discount
  discountCode: string | null;
}

interface PricingInfo {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalPrice: number;
  currency: string;
}

interface BookingState {
  // Flow State
  availableFlows: BookingFlow[];
  currentFlow: BookingFlow | null;
  currentSession: BookingSession | null;
  currentStep: BookingFlowStep | null;
  currentStepIndex: number;

  // Booking Data (user selections)
  bookingData: BookingData;

  // Cached entity data (for display without refetching)
  venueDetails: Record<string, Venue>;
  packageDetails: Record<string, ProductOption>;
  addonDetails: Record<string, ProductOption>;

  // UI State
  isLoading: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;

  // Pricing
  pricing: PricingInfo;

  // Actions
  setAvailableFlows: (flows: BookingFlow[]) => void;
  setCurrentFlow: (flow: BookingFlow | null) => void;
  setCurrentSession: (session: BookingSession | null) => void;
  setCurrentStep: (step: BookingFlowStep | null, index: number) => void;
  updateBookingData: (data: Partial<BookingData>) => void;
  setVenueDetails: (venues: Record<string, Venue>) => void;
  setPackageDetails: (packages: Record<string, ProductOption>) => void;
  setAddonDetails: (addons: Record<string, ProductOption>) => void;
  setError: (error: string | null) => void;
  setValidationErrors: (errors: Record<string, string[]>) => void;
  setLoading: (isLoading: boolean) => void;
  setValidating: (isValidating: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  updatePricing: (pricing: Partial<PricingInfo>) => void;
  resetBooking: () => void;

  // Navigation helpers
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (index: number) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialBookingData: BookingData = {
  selectedVenues: [],
  selectedPackages: [],
  selectedAddons: [],
  eventDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  duration: null,
  numParticipants: null,
  eventName: null,
  contactInfo: null,
  questionnaireResponses: {},
  discountCode: null,
};

const initialPricing: PricingInfo = {
  subtotal: 0,
  taxAmount: 0,
  discountAmount: 0,
  totalPrice: 0,
  currency: 'USD',
};

// =============================================================================
// STORE
// =============================================================================

export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  availableFlows: [],
  currentFlow: null,
  currentSession: null,
  currentStep: null,
  currentStepIndex: 0,
  bookingData: initialBookingData,
  venueDetails: {},
  packageDetails: {},
  addonDetails: {},
  isLoading: false,
  isValidating: false,
  isSubmitting: false,
  error: null,
  validationErrors: {},
  pricing: initialPricing,

  // Actions
  setAvailableFlows: (flows) => set({ availableFlows: flows }),

  setCurrentFlow: (flow) => set({ currentFlow: flow }),

  setCurrentSession: (session) => set({ currentSession: session }),

  setCurrentStep: (step, index) =>
    set({ currentStep: step, currentStepIndex: index }),

  updateBookingData: (data) =>
    set((state) => ({
      bookingData: { ...state.bookingData, ...data },
      // Clear validation errors for updated fields
      validationErrors: Object.keys(data).reduce(
        (acc, key) => {
          const { [key]: _, ...rest } = acc;
          return rest;
        },
        state.validationErrors
      ),
    })),

  setVenueDetails: (venues) =>
    set((state) => ({
      venueDetails: { ...state.venueDetails, ...venues },
    })),

  setPackageDetails: (packages) =>
    set((state) => ({
      packageDetails: { ...state.packageDetails, ...packages },
    })),

  setAddonDetails: (addons) =>
    set((state) => ({
      addonDetails: { ...state.addonDetails, ...addons },
    })),

  setError: (error) => set({ error }),

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  setLoading: (isLoading) => set({ isLoading }),

  setValidating: (isValidating) => set({ isValidating }),

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  updatePricing: (pricing) =>
    set((state) => ({
      pricing: { ...state.pricing, ...pricing },
    })),

  resetBooking: () =>
    set({
      currentFlow: null,
      currentSession: null,
      currentStep: null,
      currentStepIndex: 0,
      bookingData: initialBookingData,
      venueDetails: {},
      packageDetails: {},
      addonDetails: {},
      isLoading: false,
      isValidating: false,
      isSubmitting: false,
      error: null,
      validationErrors: {},
      pricing: initialPricing,
    }),

  // Navigation helpers
  goToNextStep: () => {
    const { currentFlow, currentStepIndex } = get();
    if (!currentFlow) return;

    const enabledSteps = currentFlow.steps.filter((s) => s.is_enabled);
    const nextIndex = currentStepIndex + 1;

    if (nextIndex < enabledSteps.length) {
      set({
        currentStep: enabledSteps[nextIndex],
        currentStepIndex: nextIndex,
      });
    }
  },

  goToPreviousStep: () => {
    const { currentFlow, currentStepIndex } = get();
    if (!currentFlow) return;

    const enabledSteps = currentFlow.steps.filter((s) => s.is_enabled);
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0) {
      set({
        currentStep: enabledSteps[prevIndex],
        currentStepIndex: prevIndex,
      });
    }
  },

  goToStep: (index) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    const enabledSteps = currentFlow.steps.filter((s) => s.is_enabled);

    if (index >= 0 && index < enabledSteps.length) {
      set({
        currentStep: enabledSteps[index],
        currentStepIndex: index,
      });
    }
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectCurrentFlow = (state: BookingState) => state.currentFlow;
export const selectCurrentStep = (state: BookingState) => state.currentStep;
export const selectCurrentStepIndex = (state: BookingState) => state.currentStepIndex;
export const selectBookingData = (state: BookingState) => state.bookingData;
export const selectPricing = (state: BookingState) => state.pricing;
export const selectIsLoading = (state: BookingState) => state.isLoading;
export const selectValidationErrors = (state: BookingState) => state.validationErrors;

/**
 * Get the total number of enabled steps in the current flow
 */
export const selectTotalSteps = (state: BookingState) =>
  state.currentFlow?.steps.filter((s) => s.is_enabled).length ?? 0;

/**
 * Check if we're on the first step
 */
export const selectIsFirstStep = (state: BookingState) =>
  state.currentStepIndex === 0;

/**
 * Check if we're on the last step
 */
export const selectIsLastStep = (state: BookingState) => {
  const totalSteps = state.currentFlow?.steps.filter((s) => s.is_enabled).length ?? 0;
  return state.currentStepIndex === totalSteps - 1;
};
