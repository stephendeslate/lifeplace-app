/**
 * Questionnaire Field Components - Barrel Export
 *
 * All 14 field types for dynamic questionnaire forms.
 */

// Text Fields
export { TextField } from './TextField';
export { default as TextFieldDefault } from './TextField';

// Number Field
export { NumberField } from './NumberField';
export { default as NumberFieldDefault } from './NumberField';

// Selection Fields
export { SelectField } from './SelectField';
export { default as SelectFieldDefault } from './SelectField';

export { DropdownField } from './DropdownField';
export { default as DropdownFieldDefault } from './DropdownField';

// Date & Time Fields
export { DateField } from './DateField';
export { default as DateFieldDefault } from './DateField';

export { TimeField } from './TimeField';
export { default as TimeFieldDefault } from './TimeField';

// Contact Fields
export { PhoneField } from './PhoneField';
export { default as PhoneFieldDefault } from './PhoneField';

export { EmailField } from './EmailField';
export { default as EmailFieldDefault } from './EmailField';

export { AddressField } from './AddressField';
export { default as AddressFieldDefault } from './AddressField';

// Toggle & Boolean Fields
export { ToggleField } from './ToggleField';
export { default as ToggleFieldDefault } from './ToggleField';

// Range & Rating Fields
export { SliderField } from './SliderField';
export { default as SliderFieldDefault } from './SliderField';

export { RatingField } from './RatingField';
export { default as RatingFieldDefault } from './RatingField';

// Special Fields
export { SignatureField } from './SignatureField';
export { default as SignatureFieldDefault } from './SignatureField';

export { FileUploadField } from './FileUploadField';
export { default as FileUploadFieldDefault } from './FileUploadField';

// Field Type to Component Mapping
export const FIELD_COMPONENTS = {
  TEXT: 'TextField',
  TEXTAREA: 'TextField',
  NUMBER: 'NumberField',
  SELECT: 'SelectField',
  MULTISELECT: 'SelectField',
  RADIO: 'SelectField',
  CHECKBOX: 'SelectField',
  DROPDOWN: 'DropdownField',
  DATE: 'DateField',
  TIME: 'TimeField',
  DATETIME: 'DateField',
  PHONE: 'PhoneField',
  EMAIL: 'EmailField',
  ADDRESS: 'AddressField',
  TOGGLE: 'ToggleField',
  BOOLEAN: 'ToggleField',
  SLIDER: 'SliderField',
  RANGE: 'SliderField',
  RATING: 'RatingField',
  SIGNATURE: 'SignatureField',
  FILE: 'FileUploadField',
  IMAGE: 'FileUploadField',
} as const;

export type FieldComponentType = keyof typeof FIELD_COMPONENTS;
