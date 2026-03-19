import type { BookingFlowStep, ContactInfoStepConfiguration } from '@/types/bookingflows';

export interface ContactInfoStepConfigProps {
  step: BookingFlowStep;
  config?: ContactInfoStepConfiguration | null;
  onUpdate: (updatedStep: BookingFlowStep) => void;
  isLoading?: boolean;
}

export interface ContactInfoConfigFormData {
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_company: boolean;
  custom_fields: CustomField[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
}

export const defaultFormData: ContactInfoConfigFormData = {
  require_full_name: true,
  require_email: true,
  require_phone: true,
  require_address: false,
  require_company: false,
  custom_fields: [],
  offer_account_creation: true,
  require_account_creation: false,
};

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
];
