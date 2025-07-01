// frontend/client-portal/src/components/booking/steps/index.ts

import type { ConfirmationStepConfig, ContactInfoStepConfig, DateTimeStepConfig, EventDetailsStepConfig, IntroductionStepConfig, PaymentInfoStepConfig } from '../../../types/bookingflow.types';

export { default as IntroductionStep } from './IntroductionStep';
export { default as EventDetailsStep } from './EventDetailsStep';
export { default as DateTimeStep } from './DateTimeStep';
export { default as QuestionnaireStep } from './QuestionnaireStep';
export { default as PackageSelectionStep } from './PackageSelectionStep';
export { default as AddonSelectionStep } from './AddonSelectionStep';
export { default as ContactInfoStep } from './ContactInfoStep';
export { default as PaymentInfoStep } from './PaymentInfoStep';
export { default as ReviewBookingStep } from './ReviewBookingStep';
export { default as ConfirmationStep } from './ConfirmationStep';

// Base step component props interface
export interface BaseStepComponentProps {
  stepData: any;
  sessionId: string;
  onDataChange: (data: any) => void;
  onValidationChange: (isValid: boolean, errors?: Record<string, string>) => void;
  isActive: boolean;
  isCompleted: boolean;
}

// Extended interfaces for specific step types
export interface IntroductionStepProps extends BaseStepComponentProps {
  configuration: IntroductionStepConfig;
}

export interface EventDetailsStepProps extends BaseStepComponentProps {
  configuration: EventDetailsStepConfig;
}

export interface DateTimeStepProps extends BaseStepComponentProps {
  configuration: DateTimeStepConfig;
}

export interface ContactInfoStepProps extends BaseStepComponentProps {
  configuration: ContactInfoStepConfig;
}

export interface PaymentInfoStepProps extends BaseStepComponentProps {
  configuration: PaymentInfoStepConfig;
}

export interface ConfirmationStepProps extends BaseStepComponentProps {
  configuration: ConfirmationStepConfig;
  bookingReference?: string;
  createdEvent?: any;
}

export interface ReviewBookingStepProps extends BaseStepComponentProps {
  onNavigateToStep?: (stepIndex: number) => void;
}

// Generic step props for steps that don't have specific configuration types yet
export interface GenericStepProps extends BaseStepComponentProps {
  configuration: any;
}

// Re-export step configuration types for convenience
export type {
  IntroductionStepConfig,
  EventDetailsStepConfig,
  DateTimeStepConfig,
  ContactInfoStepConfig,
  PaymentInfoStepConfig,
  ConfirmationStepConfig,
  SessionStepData,
  ProductOption,
  PaymentGateway,
} from '../../../types/bookingflow.types';