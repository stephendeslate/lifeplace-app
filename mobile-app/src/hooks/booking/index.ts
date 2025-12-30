/**
 * Booking Hooks - Barrel Export
 *
 * Central export for all booking-related hooks.
 */

// Booking Flows
export {
  useEventTypes,
  useAvailableFlows,
  useBookingFlow,
  useFlowSteps,
  usePrefetchBookingFlow,
  useInvalidateBookingFlows,
  useGetCachedFlow,
  useGetCachedEventTypes,
  bookingFlowKeys,
} from './useBookingFlows';

// Booking Session
export {
  useBookingSession,
  useRecoverableSession,
  useStartSession,
  useUpdateSessionData,
  useValidateStepData,
  useGoToStep,
  useCalculatePricing,
  useCompleteBooking,
  useAbandonSession,
  useRecoverSession,
  useDiscardRecoverableSession,
  useInvalidateBookingSessions,
  useGetCachedSession,
  bookingSessionKeys,
} from './useBookingSession';

// Navigation
export {
  useBookingNavigation,
  type NavigationState,
} from './useBookingNavigation';

// Venues
export {
  useActiveVenues,
  useRentableVenues,
  useVenue,
  useVenueAvailability,
  useFindMatchingPackages,
  useCreateFromVenues,
  useCalculateVenueTimes,
  useCheckDateAvailability,
  useValidateVenueSelection,
  useUpdateVenueSelection,
  useCustomPackageEstimate,
  usePrefetchVenue,
  useInvalidateVenues,
  venueKeys,
} from './useVenues';

// Products
export {
  useProductCategories,
  useProductOptions,
  usePackages,
  useAddons,
  usePackagesByCategory,
  useAddonsByCategory,
  useProduct,
  useProductsByIds,
  useDiscounts,
  useValidateDiscountCode,
  useValidatePackageSelection,
  useUpdatePackageSelection,
  useValidateAddonSelection,
  useUpdateAddonSelection,
  useAvailableProducts,
  useGroupedProducts,
  useSortedProducts,
  usePackagePrice,
  useAddonPrice,
  usePrefetchProduct,
  useInvalidateProducts,
  productKeys,
} from './useProducts';

// Questionnaire
export {
  useQuestionnaires,
  useQuestionnaire,
  useQuestionnaireFields,
  useUploadQuestionnaireFile,
  useDeleteQuestionnaireFile,
  useValidateQuestionnaire,
  useUpdateQuestionnaire,
  useFieldVisibility,
  useVisibleFields,
  useGroupedFields,
  useValidateQuestionnaireData,
  usePrefetchQuestionnaire,
  useInvalidateQuestionnaires,
  questionnaireKeys,
} from './useQuestionnaire';

// Contact Info
export {
  useCheckEmailExists,
  useValidateContactInfo,
  useUpdateContactInfo,
  useDefaultContactInfo,
  useValidateContactInfoData,
  useRequiredFieldLabels,
  useFormatContactInfo,
  useMaskEmail,
  useMaskPhone,
} from './useContactInfo';

// Payment
export {
  usePaymentGateways,
  useFlowPaymentGateways,
  usePaymentGateway,
  useGatewayPublicConfig,
  useValidatePayment,
  useUpdatePayment,
  useCalculateDeposit,
  useCalculateBalance,
  useFormatAmount,
  useGatewayDisplayName,
  useGatewayIcon,
  useSupportedPaymentMethods,
  useIsTestMode,
  useSupportsFeature,
  useValidatePaymentMethod,
  useValidateAmountLimits,
  useFormatPaymentData,
  useValidatePaymentData,
  usePrefetchGateway,
  useInvalidatePayments,
  paymentKeys,
} from './usePayment';

// Booking Payment (Stripe integration)
export { useBookingPayment } from './useBookingPayment';

// Confirmation
export {
  useBookingDetails,
  useReceiptUrl,
  useCompleteBooking as useCompleteBookingConfirmation,
  useResendConfirmation,
  useValidateConfirmation,
  useUpdateConfirmation,
  useFormatBookingReference,
  useStatusDisplay,
  usePaymentStatusDisplay,
  useCalendarEvent,
  useNextSteps,
  useIsFullyConfirmed,
  useInvalidateConfirmations,
  confirmationKeys,
} from './useConfirmation';

// Pricing
export {
  useCalculatePricing as useCalculateSessionPricing,
  useApplyDiscountCode,
  useRemoveDiscountCode,
  useValidatePricingSummary,
  useUpdatePricingSummary,
  usePackagesTotal,
  useAddonsTotal,
  useSubtotal,
  useTaxAmount,
  useTotalWithTax,
  useTotalWithDiscount,
  useFormattedPricingSummary,
  useValidatePricingSummaryData,
} from './usePricing';
