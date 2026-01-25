/**
 * Booking Store Tests
 *
 * Tests for the Zustand booking store that manages the multi-step booking flow.
 * The store is NOT persisted (booking sessions are ephemeral).
 */

import {
  useBookingStore,
  selectCurrentFlow,
  selectCurrentStep,
  selectCurrentStepIndex,
  selectBookingData,
  selectPricing,
  selectIsLoading,
  selectValidationErrors,
  selectTotalSteps,
  selectIsFirstStep,
  selectIsLastStep,
} from '../bookingStore';
import type { BookingFlow, BookingFlowStep, BookingSession } from '@/types/api';

// =============================================================================
// TEST SETUP
// =============================================================================

// Store initial state for reset between tests
const initialState = useBookingStore.getState();

// Mock booking flow steps
const mockSteps: BookingFlowStep[] = [
  { id: '1', step_type: 'introduction', order: 0, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '2', step_type: 'venue_selection', order: 1, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '3', step_type: 'date_time', order: 2, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '4', step_type: 'package_selection', order: 3, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '5', step_type: 'addon_selection', order: 4, is_enabled: false, is_required: false, is_skippable: true, display_conditions: {}, configuration: {}, validation_rules: {} }, // Disabled
  { id: '6', step_type: 'pricing_summary', order: 5, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '7', step_type: 'contact_info', order: 6, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '8', step_type: 'payment_info', order: 7, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
  { id: '9', step_type: 'confirmation', order: 8, is_enabled: true, is_required: true, is_skippable: false, display_conditions: {}, configuration: {}, validation_rules: {} },
];

// Mock booking flow
const mockFlow: BookingFlow = {
  id: '1',
  name: 'Wedding Booking',
  event_type: { id: '1', name: 'Wedding', is_active: true },
  steps: mockSteps,
  is_active: true,
  allow_guest_booking: true,
  require_account_creation: false,
  auto_approve_bookings: false,
  enable_progress_saving: true,
  max_advance_booking_days: 365,
  min_advance_booking_days: 1,
  allow_discounts: true,
  require_immediate_payment: false,
  is_test_mode: false,
};

// Mock booking session
const mockSession: BookingSession = {
  session_id: 'test-session-123',
  booking_flow: mockFlow,
  current_step: mockSteps[0],
  completed_steps: [],
  booking_data: {},
  validation_errors: {},
  is_completed: false,
  is_abandoned: false,
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  progress_percentage: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock contact info
const mockContactInfo = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+639123456789',
};

// Reset store state before each test
beforeEach(() => {
  useBookingStore.setState(initialState);
});

// =============================================================================
// TESTS
// =============================================================================

describe('bookingStore', () => {
  // ===========================================================================
  // INITIAL STATE
  // ===========================================================================

  describe('initial state', () => {
    it('has empty available flows', () => {
      expect(useBookingStore.getState().availableFlows).toEqual([]);
    });

    it('has null current flow', () => {
      expect(useBookingStore.getState().currentFlow).toBeNull();
    });

    it('has null current session', () => {
      expect(useBookingStore.getState().currentSession).toBeNull();
    });

    it('has initial booking data with empty arrays', () => {
      const { bookingData } = useBookingStore.getState();
      expect(bookingData.selectedVenues).toEqual([]);
      expect(bookingData.selectedPackages).toEqual([]);
      expect(bookingData.selectedAddons).toEqual([]);
      expect(bookingData.eventDate).toBeNull();
      expect(bookingData.contactInfo).toBeNull();
    });

    it('has initial pricing with zero values', () => {
      const { pricing } = useBookingStore.getState();
      expect(pricing.subtotal).toBe(0);
      expect(pricing.taxAmount).toBe(0);
      expect(pricing.discountAmount).toBe(0);
      expect(pricing.totalPrice).toBe(0);
      expect(pricing.currency).toBe('USD');
    });

    it('is not loading by default', () => {
      expect(useBookingStore.getState().isLoading).toBe(false);
    });
  });

  // ===========================================================================
  // FLOW MANAGEMENT
  // ===========================================================================

  describe('flow management', () => {
    it('sets available flows', () => {
      useBookingStore.getState().setAvailableFlows([mockFlow]);
      expect(useBookingStore.getState().availableFlows).toEqual([mockFlow]);
    });

    it('sets current flow', () => {
      useBookingStore.getState().setCurrentFlow(mockFlow);
      expect(useBookingStore.getState().currentFlow).toEqual(mockFlow);
    });

    it('clears current flow', () => {
      useBookingStore.getState().setCurrentFlow(mockFlow);
      useBookingStore.getState().setCurrentFlow(null);
      expect(useBookingStore.getState().currentFlow).toBeNull();
    });
  });

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  describe('session management', () => {
    it('sets current session', () => {
      useBookingStore.getState().setCurrentSession(mockSession);
      expect(useBookingStore.getState().currentSession).toEqual(mockSession);
    });

    it('clears current session', () => {
      useBookingStore.getState().setCurrentSession(mockSession);
      useBookingStore.getState().setCurrentSession(null);
      expect(useBookingStore.getState().currentSession).toBeNull();
    });
  });

  // ===========================================================================
  // STEP MANAGEMENT
  // ===========================================================================

  describe('step management', () => {
    it('sets current step with index', () => {
      useBookingStore.getState().setCurrentStep(mockSteps[0], 0);

      const state = useBookingStore.getState();
      expect(state.currentStep).toEqual(mockSteps[0]);
      expect(state.currentStepIndex).toBe(0);
    });

    it('updates step and index together', () => {
      useBookingStore.getState().setCurrentStep(mockSteps[2], 2);

      const state = useBookingStore.getState();
      expect(state.currentStep?.step_type).toBe('date_time');
      expect(state.currentStepIndex).toBe(2);
    });
  });

  // ===========================================================================
  // BOOKING DATA UPDATES
  // ===========================================================================

  describe('updateBookingData', () => {
    it('updates venue selections', () => {
      useBookingStore.getState().updateBookingData({
        selectedVenues: ['venue-1', 'venue-2'],
      });

      expect(useBookingStore.getState().bookingData.selectedVenues).toEqual(['venue-1', 'venue-2']);
    });

    it('updates package selections', () => {
      useBookingStore.getState().updateBookingData({
        selectedPackages: ['pkg-1'],
      });

      expect(useBookingStore.getState().bookingData.selectedPackages).toEqual(['pkg-1']);
    });

    it('updates addon selections', () => {
      useBookingStore.getState().updateBookingData({
        selectedAddons: ['addon-1', 'addon-2'],
      });

      expect(useBookingStore.getState().bookingData.selectedAddons).toEqual(['addon-1', 'addon-2']);
    });

    it('updates event date', () => {
      useBookingStore.getState().updateBookingData({
        eventDate: '2025-06-15',
      });

      expect(useBookingStore.getState().bookingData.eventDate).toBe('2025-06-15');
    });

    it('updates time selections', () => {
      useBookingStore.getState().updateBookingData({
        startTime: '10:00',
        endTime: '18:00',
      });

      const { bookingData } = useBookingStore.getState();
      expect(bookingData.startTime).toBe('10:00');
      expect(bookingData.endTime).toBe('18:00');
    });

    it('updates contact info', () => {
      useBookingStore.getState().updateBookingData({
        contactInfo: mockContactInfo,
      });

      expect(useBookingStore.getState().bookingData.contactInfo).toEqual(mockContactInfo);
    });

    it('updates questionnaire responses', () => {
      useBookingStore.getState().updateBookingData({
        questionnaireResponses: {
          field_1: 'Answer 1',
          field_2: 42,
        },
      });

      expect(useBookingStore.getState().bookingData.questionnaireResponses).toEqual({
        field_1: 'Answer 1',
        field_2: 42,
      });
    });

    it('updates discount code', () => {
      useBookingStore.getState().updateBookingData({
        discountCode: 'SAVE10',
      });

      expect(useBookingStore.getState().bookingData.discountCode).toBe('SAVE10');
    });

    it('clears validation errors for updated fields', () => {
      // Set up validation errors
      useBookingStore.setState({
        validationErrors: {
          selectedVenues: ['Please select a venue'],
          eventDate: ['Please select a date'],
        },
      });

      // Update only selectedVenues
      useBookingStore.getState().updateBookingData({
        selectedVenues: ['venue-1'],
      });

      const { validationErrors } = useBookingStore.getState();
      expect(validationErrors.selectedVenues).toBeUndefined();
      expect(validationErrors.eventDate).toEqual(['Please select a date']); // Not cleared
    });

    it('preserves other booking data when updating', () => {
      useBookingStore.getState().updateBookingData({
        selectedVenues: ['venue-1'],
        eventDate: '2025-06-15',
      });

      useBookingStore.getState().updateBookingData({
        selectedPackages: ['pkg-1'],
      });

      const { bookingData } = useBookingStore.getState();
      expect(bookingData.selectedVenues).toEqual(['venue-1']);
      expect(bookingData.eventDate).toBe('2025-06-15');
      expect(bookingData.selectedPackages).toEqual(['pkg-1']);
    });
  });

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  describe('cache management', () => {
    it('sets venue details cache', () => {
      const venueDetails = {
        'venue-1': { id: 1, name: 'Garden Venue' },
        'venue-2': { id: 2, name: 'Ballroom' },
      };

      useBookingStore.getState().setVenueDetails(venueDetails as any);
      expect(useBookingStore.getState().venueDetails).toEqual(venueDetails);
    });

    it('sets package details cache', () => {
      const packageDetails = {
        'pkg-1': { id: 1, name: 'Premium Package' },
      };

      useBookingStore.getState().setPackageDetails(packageDetails as any);
      expect(useBookingStore.getState().packageDetails).toEqual(packageDetails);
    });

    it('sets addon details cache', () => {
      const addonDetails = {
        'addon-1': { id: 1, name: 'Photo Booth' },
      };

      useBookingStore.getState().setAddonDetails(addonDetails as any);
      expect(useBookingStore.getState().addonDetails).toEqual(addonDetails);
    });

    it('merges new cache items with existing', () => {
      useBookingStore.getState().setVenueDetails({ 'v1': { id: 1 } } as any);
      useBookingStore.getState().setVenueDetails({ 'v2': { id: 2 } } as any);

      const { venueDetails } = useBookingStore.getState();
      expect(Object.keys(venueDetails)).toContain('v1');
      expect(Object.keys(venueDetails)).toContain('v2');
    });
  });

  // ===========================================================================
  // UI STATE
  // ===========================================================================

  describe('UI state', () => {
    it('sets error message', () => {
      useBookingStore.getState().setError('Something went wrong');
      expect(useBookingStore.getState().error).toBe('Something went wrong');
    });

    it('clears error message', () => {
      useBookingStore.getState().setError('Error');
      useBookingStore.getState().setError(null);
      expect(useBookingStore.getState().error).toBeNull();
    });

    it('sets validation errors', () => {
      const errors = {
        selectedVenues: ['Please select a venue'],
        eventDate: ['Invalid date'],
      };

      useBookingStore.getState().setValidationErrors(errors);
      expect(useBookingStore.getState().validationErrors).toEqual(errors);
    });

    it('sets loading state', () => {
      useBookingStore.getState().setLoading(true);
      expect(useBookingStore.getState().isLoading).toBe(true);
    });

    it('sets validating state', () => {
      useBookingStore.getState().setValidating(true);
      expect(useBookingStore.getState().isValidating).toBe(true);
    });

    it('sets submitting state', () => {
      useBookingStore.getState().setSubmitting(true);
      expect(useBookingStore.getState().isSubmitting).toBe(true);
    });
  });

  // ===========================================================================
  // PRICING
  // ===========================================================================

  describe('pricing', () => {
    it('updates subtotal', () => {
      useBookingStore.getState().updatePricing({ subtotal: 50000 });
      expect(useBookingStore.getState().pricing.subtotal).toBe(50000);
    });

    it('updates tax amount', () => {
      useBookingStore.getState().updatePricing({ taxAmount: 6000 });
      expect(useBookingStore.getState().pricing.taxAmount).toBe(6000);
    });

    it('updates discount amount', () => {
      useBookingStore.getState().updatePricing({ discountAmount: 5000 });
      expect(useBookingStore.getState().pricing.discountAmount).toBe(5000);
    });

    it('updates total price', () => {
      useBookingStore.getState().updatePricing({ totalPrice: 51000 });
      expect(useBookingStore.getState().pricing.totalPrice).toBe(51000);
    });

    it('updates currency', () => {
      useBookingStore.getState().updatePricing({ currency: 'PHP' });
      expect(useBookingStore.getState().pricing.currency).toBe('PHP');
    });

    it('updates multiple pricing fields at once', () => {
      useBookingStore.getState().updatePricing({
        subtotal: 50000,
        taxAmount: 6000,
        discountAmount: 5000,
        totalPrice: 51000,
        currency: 'PHP',
      });

      const { pricing } = useBookingStore.getState();
      expect(pricing.subtotal).toBe(50000);
      expect(pricing.taxAmount).toBe(6000);
      expect(pricing.discountAmount).toBe(5000);
      expect(pricing.totalPrice).toBe(51000);
      expect(pricing.currency).toBe('PHP');
    });

    it('preserves existing pricing when partial update', () => {
      useBookingStore.getState().updatePricing({
        subtotal: 50000,
        currency: 'PHP',
      });

      useBookingStore.getState().updatePricing({ totalPrice: 56000 });

      const { pricing } = useBookingStore.getState();
      expect(pricing.subtotal).toBe(50000);
      expect(pricing.currency).toBe('PHP');
      expect(pricing.totalPrice).toBe(56000);
    });
  });

  // ===========================================================================
  // RESET BOOKING
  // ===========================================================================

  describe('resetBooking', () => {
    beforeEach(() => {
      // Set up a complete booking state
      useBookingStore.setState({
        currentFlow: mockFlow,
        currentSession: mockSession,
        currentStep: mockSteps[3],
        currentStepIndex: 3,
        bookingData: {
          selectedVenues: ['venue-1'],
          selectedPackages: ['pkg-1'],
          selectedAddons: ['addon-1'],
          eventDate: '2025-06-15',
          endDate: null,
          startTime: '10:00',
          endTime: '18:00',
          duration: 8,
          numParticipants: 150,
          eventName: 'Wedding',
          contactInfo: mockContactInfo,
          questionnaireResponses: { field_1: 'answer' },
          discountCode: 'SAVE10',
        },
        venueDetails: { 'v1': {} as never },
        packageDetails: { 'p1': {} as never },
        addonDetails: { 'a1': {} as never },
        isLoading: true,
        isValidating: true,
        isSubmitting: true,
        error: 'Previous error',
        validationErrors: { field: ['error'] },
        pricing: {
          subtotal: 50000,
          taxAmount: 6000,
          discountAmount: 5000,
          totalPrice: 51000,
          currency: 'PHP',
        },
      });
    });

    it('clears current flow', () => {
      useBookingStore.getState().resetBooking();
      expect(useBookingStore.getState().currentFlow).toBeNull();
    });

    it('clears current session', () => {
      useBookingStore.getState().resetBooking();
      expect(useBookingStore.getState().currentSession).toBeNull();
    });

    it('resets step index to 0', () => {
      useBookingStore.getState().resetBooking();
      expect(useBookingStore.getState().currentStepIndex).toBe(0);
    });

    it('resets booking data to initial values', () => {
      useBookingStore.getState().resetBooking();

      const { bookingData } = useBookingStore.getState();
      expect(bookingData.selectedVenues).toEqual([]);
      expect(bookingData.selectedPackages).toEqual([]);
      expect(bookingData.eventDate).toBeNull();
      expect(bookingData.contactInfo).toBeNull();
    });

    it('clears all caches', () => {
      useBookingStore.getState().resetBooking();

      const state = useBookingStore.getState();
      expect(state.venueDetails).toEqual({});
      expect(state.packageDetails).toEqual({});
      expect(state.addonDetails).toEqual({});
    });

    it('resets UI state', () => {
      useBookingStore.getState().resetBooking();

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isValidating).toBe(false);
      expect(state.isSubmitting).toBe(false);
      expect(state.error).toBeNull();
      expect(state.validationErrors).toEqual({});
    });

    it('resets pricing to initial values', () => {
      useBookingStore.getState().resetBooking();

      const { pricing } = useBookingStore.getState();
      expect(pricing.subtotal).toBe(0);
      expect(pricing.taxAmount).toBe(0);
      expect(pricing.discountAmount).toBe(0);
      expect(pricing.totalPrice).toBe(0);
      expect(pricing.currency).toBe('USD');
    });
  });

  // ===========================================================================
  // NAVIGATION HELPERS
  // ===========================================================================

  describe('navigation', () => {
    beforeEach(() => {
      // Set up flow with steps (note: step at index 4 is disabled)
      useBookingStore.setState({
        currentFlow: mockFlow,
        currentStep: mockSteps[0], // introduction
        currentStepIndex: 0,
      });
    });

    describe('goToNextStep', () => {
      it('advances to next enabled step', () => {
        useBookingStore.getState().goToNextStep();

        const state = useBookingStore.getState();
        expect(state.currentStep?.step_type).toBe('venue_selection');
        expect(state.currentStepIndex).toBe(1);
      });

      it('skips disabled steps', () => {
        // Move to step before disabled addon_selection (index 4)
        useBookingStore.setState({
          currentStep: mockSteps[3], // package_selection
          currentStepIndex: 3,
        });

        useBookingStore.getState().goToNextStep();

        // Should skip addon_selection (disabled) and go to pricing_summary
        const state = useBookingStore.getState();
        expect(state.currentStep?.step_type).toBe('pricing_summary');
      });

      it('does not advance past last step', () => {
        const enabledSteps = mockSteps.filter(s => s.is_enabled);
        const lastStep = enabledSteps[enabledSteps.length - 1];

        useBookingStore.setState({
          currentStep: lastStep,
          currentStepIndex: enabledSteps.length - 1,
        });

        useBookingStore.getState().goToNextStep();

        // Should stay on last step
        expect(useBookingStore.getState().currentStep?.step_type).toBe('confirmation');
      });

      it('does nothing when no current flow', () => {
        useBookingStore.setState({ currentFlow: null });

        useBookingStore.getState().goToNextStep();

        expect(useBookingStore.getState().currentStepIndex).toBe(0);
      });
    });

    describe('goToPreviousStep', () => {
      it('goes back to previous enabled step', () => {
        useBookingStore.setState({
          currentStep: mockSteps[1], // venue_selection
          currentStepIndex: 1,
        });

        useBookingStore.getState().goToPreviousStep();

        const state = useBookingStore.getState();
        expect(state.currentStep?.step_type).toBe('introduction');
        expect(state.currentStepIndex).toBe(0);
      });

      it('does not go before first step', () => {
        useBookingStore.setState({
          currentStep: mockSteps[0],
          currentStepIndex: 0,
        });

        useBookingStore.getState().goToPreviousStep();

        expect(useBookingStore.getState().currentStepIndex).toBe(0);
      });

      it('does nothing when no current flow', () => {
        useBookingStore.setState({ currentFlow: null, currentStepIndex: 2 });

        useBookingStore.getState().goToPreviousStep();

        expect(useBookingStore.getState().currentStepIndex).toBe(2);
      });
    });

    describe('goToStep', () => {
      it('navigates to specific step by index', () => {
        useBookingStore.getState().goToStep(3);

        const state = useBookingStore.getState();
        expect(state.currentStepIndex).toBe(3);
      });

      it('does not navigate to invalid index', () => {
        useBookingStore.getState().goToStep(100);

        expect(useBookingStore.getState().currentStepIndex).toBe(0);
      });

      it('does not navigate to negative index', () => {
        useBookingStore.setState({ currentStepIndex: 2 });

        useBookingStore.getState().goToStep(-1);

        expect(useBookingStore.getState().currentStepIndex).toBe(2);
      });

      it('does nothing when no current flow', () => {
        useBookingStore.setState({ currentFlow: null, currentStepIndex: 0 });

        useBookingStore.getState().goToStep(3);

        expect(useBookingStore.getState().currentStepIndex).toBe(0);
      });
    });
  });

  // ===========================================================================
  // SELECTORS
  // ===========================================================================

  describe('selectors', () => {
    beforeEach(() => {
      useBookingStore.setState({
        currentFlow: mockFlow,
        currentStep: mockSteps[2],
        currentStepIndex: 2,
        bookingData: {
          selectedVenues: ['venue-1'],
          selectedPackages: [],
          selectedAddons: [],
          eventDate: '2025-06-15',
          endDate: null,
          startTime: null,
          endTime: null,
          duration: null,
          numParticipants: null,
          eventName: null,
          contactInfo: null,
          questionnaireResponses: {},
          discountCode: null,
        },
        pricing: {
          subtotal: 50000,
          taxAmount: 6000,
          discountAmount: 0,
          totalPrice: 56000,
          currency: 'PHP',
        },
        isLoading: true,
        validationErrors: { field: ['error'] },
      });
    });

    it('selectCurrentFlow returns current flow', () => {
      const state = useBookingStore.getState();
      expect(selectCurrentFlow(state)).toEqual(mockFlow);
    });

    it('selectCurrentStep returns current step', () => {
      const state = useBookingStore.getState();
      expect(selectCurrentStep(state)?.step_type).toBe('date_time');
    });

    it('selectCurrentStepIndex returns step index', () => {
      const state = useBookingStore.getState();
      expect(selectCurrentStepIndex(state)).toBe(2);
    });

    it('selectBookingData returns booking data', () => {
      const state = useBookingStore.getState();
      const data = selectBookingData(state);
      expect(data.selectedVenues).toEqual(['venue-1']);
      expect(data.eventDate).toBe('2025-06-15');
    });

    it('selectPricing returns pricing info', () => {
      const state = useBookingStore.getState();
      const pricing = selectPricing(state);
      expect(pricing.subtotal).toBe(50000);
      expect(pricing.totalPrice).toBe(56000);
    });

    it('selectIsLoading returns loading state', () => {
      const state = useBookingStore.getState();
      expect(selectIsLoading(state)).toBe(true);
    });

    it('selectValidationErrors returns validation errors', () => {
      const state = useBookingStore.getState();
      expect(selectValidationErrors(state)).toEqual({ field: ['error'] });
    });

    it('selectTotalSteps returns count of enabled steps only', () => {
      const state = useBookingStore.getState();
      // mockFlow has 9 steps but 1 is disabled
      expect(selectTotalSteps(state)).toBe(8);
    });

    it('selectIsFirstStep returns true on first step', () => {
      useBookingStore.setState({ currentStepIndex: 0 });
      const state = useBookingStore.getState();
      expect(selectIsFirstStep(state)).toBe(true);
    });

    it('selectIsFirstStep returns false on other steps', () => {
      const state = useBookingStore.getState();
      expect(selectIsFirstStep(state)).toBe(false);
    });

    it('selectIsLastStep returns true on last step', () => {
      const enabledSteps = mockSteps.filter(s => s.is_enabled);
      useBookingStore.setState({
        currentStepIndex: enabledSteps.length - 1,
      });

      const state = useBookingStore.getState();
      expect(selectIsLastStep(state)).toBe(true);
    });

    it('selectIsLastStep returns false on other steps', () => {
      const state = useBookingStore.getState();
      expect(selectIsLastStep(state)).toBe(false);
    });
  });
});
