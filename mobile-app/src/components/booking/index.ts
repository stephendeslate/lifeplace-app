/**
 * Booking Components - Barrel Export
 *
 * Central export for all booking-related components.
 */

// Container & Navigation (6.6)
export { BookingContainer } from './BookingContainer';
export { StepRenderer, type StepComponentProps } from './StepRenderer';
export { BookingProgressIndicator, type ProgressVariant } from './BookingProgressIndicator';
export { SessionTimer } from './SessionTimer';
export { SessionRecoverySheet } from './SessionRecoverySheet';
export { BookingNavigation } from './BookingNavigation';
export { PricingSummaryBar } from './PricingSummaryBar';

// Event Type Selection (6.7)
export { EventTypeSelection } from './EventTypeSelection';
export { EventTypeCard } from './EventTypeCard';
export { EventTypeDetailModal } from './EventTypeDetailModal';

// Date Availability (Race Condition Handling)
export { DateUnavailableModal } from './DateUnavailableModal';

// Step Components (6.9)
export {
  IntroductionStep,
  VenueSelectionStep,
  DateTimeStep,
  PackageSelectionStep,
  AddonSelectionStep,
  QuestionnaireStep,
  PricingSummaryStep,
  ContactInfoStep,
  PaymentStep,
  ConfirmationStep,
} from './steps';

// Questionnaire Field Components (6.9)
export {
  TextField,
  NumberField,
  SelectField,
  DropdownField,
  DateField,
  TimeField,
  PhoneField,
  EmailField,
  AddressField,
  ToggleField,
  SliderField,
  RatingField,
  SignatureField,
  FileUploadField,
  FIELD_COMPONENTS,
  type FieldComponentType,
} from './fields';
