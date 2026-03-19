// Shared types for EnhancedContactInfoStep sub-components

import type {
  ContactInfoStepData,
  ContactInfoStepConfiguration,
  BookingFlow,
  StepValidationResult,
} from '@/types/booking';

export interface EnhancedContactInfoStepProps {
  stepData?: ContactInfoStepData;
  config?: ContactInfoStepConfiguration;
  onDataChange: (data: ContactInfoStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  flowConfig: BookingFlow | null;
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
}

export interface ValidationState {
  email: 'idle' | 'validating' | 'valid' | 'invalid';
  phone: 'idle' | 'validating' | 'valid' | 'invalid';
  full_name: 'idle' | 'validating' | 'valid' | 'invalid';
}
