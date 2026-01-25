/**
 * Booking Validation Tests
 *
 * Tests for Zod schemas used to validate all booking flow steps.
 */

import {
  philippinePhoneSchema,
  emailSchema,
  requiredStringSchema,
  optionalStringSchema,
  introductionSchema,
  venueSelectionSchema,
  createVenueSelectionSchema,
  dateTimeSchema,
  packageSelectionSchema,
  createPackageSelectionSchema,
  addonSelectionSchema,
  createAddonSelectionSchema,
  pricingSummarySchema,
  contactInfoSchema,
  createContactInfoSchema,
  paymentSchema,
  confirmationSchema,
  validateStepData,
  validateField,
  createFieldSchema,
  createQuestionnaireSchema,
  getStepSchema,
} from './bookingValidation';
import type { ContactInfoStepConfiguration, QuestionnaireField } from '@/types/booking';

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

describe('Common Validators', () => {
  describe('philippinePhoneSchema', () => {
    it('accepts +63 format with 10 digits', () => {
      const result = philippinePhoneSchema.safeParse('+639123456789');
      expect(result.success).toBe(true);
    });

    it('accepts 09 format with 9 more digits', () => {
      const result = philippinePhoneSchema.safeParse('09123456789');
      expect(result.success).toBe(true);
    });

    it('accepts 9 format with 9 more digits', () => {
      const result = philippinePhoneSchema.safeParse('9123456789');
      expect(result.success).toBe(true);
    });

    it('allows empty string when not required', () => {
      const result = philippinePhoneSchema.safeParse('');
      expect(result.success).toBe(true);
    });

    it('rejects invalid formats', () => {
      const result = philippinePhoneSchema.safeParse('1234567890');
      expect(result.success).toBe(false);
    });

    it('rejects too short numbers', () => {
      const result = philippinePhoneSchema.safeParse('+6391234567');
      expect(result.success).toBe(false);
    });

    it('ignores spaces and dashes in phone numbers', () => {
      const result = philippinePhoneSchema.safeParse('+63 912-345-6789');
      expect(result.success).toBe(true);
    });
  });

  describe('emailSchema', () => {
    it('accepts valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('rejects email without domain', () => {
      const result = emailSchema.safeParse('test@');
      expect(result.success).toBe(false);
    });
  });

  describe('requiredStringSchema', () => {
    it('accepts non-empty string', () => {
      const result = requiredStringSchema.safeParse('hello');
      expect(result.success).toBe(true);
    });

    it('rejects empty string', () => {
      const result = requiredStringSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('trims whitespace', () => {
      const result = requiredStringSchema.safeParse('  hello  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('hello');
      }
    });
  });

  describe('optionalStringSchema', () => {
    it('accepts string', () => {
      const result = optionalStringSchema.safeParse('hello');
      expect(result.success).toBe(true);
    });

    it('accepts undefined', () => {
      const result = optionalStringSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('transforms empty string to undefined', () => {
      const result = optionalStringSchema.safeParse('');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });
  });
});

// =============================================================================
// STEP SCHEMAS
// =============================================================================

describe('Step Schemas', () => {
  describe('introductionSchema', () => {
    it('accepts acknowledged true', () => {
      const result = introductionSchema.safeParse({ acknowledged: true });
      expect(result.success).toBe(true);
    });

    it('rejects acknowledged false', () => {
      const result = introductionSchema.safeParse({ acknowledged: false });
      expect(result.success).toBe(false);
    });

    it('rejects missing acknowledged', () => {
      const result = introductionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('venueSelectionSchema', () => {
    it('accepts array with venue IDs', () => {
      const result = venueSelectionSchema.safeParse({ selected_venue_ids: [1, 2] });
      expect(result.success).toBe(true);
    });

    it('rejects empty array', () => {
      const result = venueSelectionSchema.safeParse({ selected_venue_ids: [] });
      expect(result.success).toBe(false);
    });

    it('rejects missing venue_ids', () => {
      const result = venueSelectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('createVenueSelectionSchema', () => {
    it('enforces minimum venues', () => {
      const schema = createVenueSelectionSchema(2, 5);
      const result = schema.safeParse({ selected_venue_ids: [1] });
      expect(result.success).toBe(false);
    });

    it('enforces maximum venues', () => {
      const schema = createVenueSelectionSchema(1, 2);
      const result = schema.safeParse({ selected_venue_ids: [1, 2, 3] });
      expect(result.success).toBe(false);
    });

    it('accepts valid venue count', () => {
      const schema = createVenueSelectionSchema(1, 3);
      const result = schema.safeParse({ selected_venue_ids: [1, 2] });
      expect(result.success).toBe(true);
    });
  });

  describe('dateTimeSchema', () => {
    it('accepts valid date', () => {
      const result = dateTimeSchema.safeParse({ start_date: '2025-06-15' });
      expect(result.success).toBe(true);
    });

    it('rejects empty start_date', () => {
      const result = dateTimeSchema.safeParse({ start_date: '' });
      expect(result.success).toBe(false);
    });

    it('accepts date with optional end_date', () => {
      const result = dateTimeSchema.safeParse({
        start_date: '2025-06-15',
        end_date: '2025-06-16',
      });
      expect(result.success).toBe(true);
    });

    it('rejects end_date before start_date', () => {
      const result = dateTimeSchema.safeParse({
        start_date: '2025-06-15',
        end_date: '2025-06-14',
      });
      expect(result.success).toBe(false);
    });

    it('accepts same start and end date', () => {
      const result = dateTimeSchema.safeParse({
        start_date: '2025-06-15',
        end_date: '2025-06-15',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional time fields', () => {
      const result = dateTimeSchema.safeParse({
        start_date: '2025-06-15',
        start_time: '10:00',
        end_time: '18:00',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('packageSelectionSchema', () => {
    const validPackage = {
      product_id: 1,
      name: 'Premium Package',
      price: '50000.00',
      quantity: 1,
    };

    it('accepts valid package selection', () => {
      const result = packageSelectionSchema.safeParse({
        selected_packages: [validPackage],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty packages array', () => {
      const result = packageSelectionSchema.safeParse({
        selected_packages: [],
      });
      expect(result.success).toBe(false);
    });

    it('accepts packages with optional fields', () => {
      const result = packageSelectionSchema.safeParse({
        selected_packages: [{
          ...validPackage,
          is_tax_inclusive: true,
          included_hours: 8,
        }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createPackageSelectionSchema', () => {
    const validPackage = {
      product_id: 1,
      name: 'Package',
      price: '1000.00',
      quantity: 1,
    };

    it('enforces minimum selection', () => {
      const schema = createPackageSelectionSchema(2, 5);
      const result = schema.safeParse({ selected_packages: [validPackage] });
      expect(result.success).toBe(false);
    });

    it('enforces maximum selection', () => {
      const schema = createPackageSelectionSchema(1, 1);
      const result = schema.safeParse({
        selected_packages: [validPackage, { ...validPackage, product_id: 2 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('addonSelectionSchema', () => {
    const validAddon = {
      product_id: 1,
      name: 'Photo Booth',
      price: '10000.00',
      quantity: 1,
    };

    it('accepts empty addons array (optional)', () => {
      const result = addonSelectionSchema.safeParse({ selected_addons: [] });
      expect(result.success).toBe(true);
    });

    it('accepts valid addon selection', () => {
      const result = addonSelectionSchema.safeParse({
        selected_addons: [validAddon],
      });
      expect(result.success).toBe(true);
    });

    it('provides default empty array', () => {
      const result = addonSelectionSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selected_addons).toEqual([]);
      }
    });
  });

  describe('pricingSummarySchema', () => {
    it('accepts with terms_accepted true', () => {
      const result = pricingSummarySchema.safeParse({ terms_accepted: true });
      expect(result.success).toBe(true);
    });

    it('rejects with terms_accepted false', () => {
      const result = pricingSummarySchema.safeParse({ terms_accepted: false });
      expect(result.success).toBe(false);
    });

    it('accepts optional discount code', () => {
      const result = pricingSummarySchema.safeParse({
        terms_accepted: true,
        applied_discount_code: 'SAVE10',
      });
      expect(result.success).toBe(true);
    });

    it('rejects special_requests over 1000 characters', () => {
      const result = pricingSummarySchema.safeParse({
        terms_accepted: true,
        special_requests: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('contactInfoSchema', () => {
    const validContact = {
      full_name: 'John Doe',
      email: 'john@example.com',
    };

    it('accepts valid contact info', () => {
      const result = contactInfoSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it('rejects short full_name', () => {
      const result = contactInfoSchema.safeParse({
        ...validContact,
        full_name: 'J',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = contactInfoSchema.safeParse({
        ...validContact,
        email: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional phone', () => {
      const result = contactInfoSchema.safeParse({
        ...validContact,
        phone: '+639123456789',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createContactInfoSchema', () => {
    it('makes fields required based on config', () => {
      const config: ContactInfoStepConfiguration = {
        require_full_name: true,
        require_email: true,
        require_phone: true,
        require_address: false,
        require_city: false,
        require_postal_code: false,
        require_country: false,
        require_company: false,
        require_account_creation: false,
        show_job_title: false,
        offer_account_creation: false,
        show_welcome_back_for_authenticated: false,
        prefill_from_profile: false,
      };

      const schema = createContactInfoSchema(config);
      const result = schema.safeParse({
        full_name: 'John Doe',
        email: 'john@example.com',
        // Missing required phone
      });
      expect(result.success).toBe(false);
    });

    it('validates password requirements when account creation required', () => {
      const config: ContactInfoStepConfiguration = {
        require_full_name: true,
        require_email: true,
        require_phone: false,
        require_address: false,
        require_city: false,
        require_postal_code: false,
        require_country: false,
        require_company: false,
        require_account_creation: true,
        show_job_title: false,
        offer_account_creation: true,
        show_welcome_back_for_authenticated: false,
        prefill_from_profile: false,
        password_requirements: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_number: true,
          require_special: false,
        },
      };

      const schema = createContactInfoSchema(config);

      // Password without uppercase should fail
      const result = schema.safeParse({
        full_name: 'John Doe',
        email: 'john@example.com',
        create_account: true,
        password: 'lowercaseonly123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paymentSchema', () => {
    it('accepts valid payment data', () => {
      const result = paymentSchema.safeParse({
        payment_method: 'card',
        payment_type: 'FULL',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty payment_method', () => {
      const result = paymentSchema.safeParse({
        payment_method: '',
        payment_type: 'FULL',
      });
      expect(result.success).toBe(false);
    });

    it('only accepts FULL or DEPOSIT payment types', () => {
      const result = paymentSchema.safeParse({
        payment_method: 'card',
        payment_type: 'PARTIAL',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('confirmationSchema', () => {
    it('accepts empty object', () => {
      const result = confirmationSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts booking_reference', () => {
      const result = confirmationSchema.safeParse({
        booking_reference: 'BK-2025-001',
      });
      expect(result.success).toBe(true);
    });

    it('validates completion_status enum', () => {
      const result = confirmationSchema.safeParse({
        completion_status: 'completed',
      });
      expect(result.success).toBe(true);

      const invalidResult = confirmationSchema.safeParse({
        completion_status: 'invalid',
      });
      expect(invalidResult.success).toBe(false);
    });
  });
});

// =============================================================================
// QUESTIONNAIRE VALIDATION
// =============================================================================

describe('Questionnaire Validation', () => {
  describe('createFieldSchema', () => {
    it('creates text field schema', () => {
      const field: QuestionnaireField = {
        id: 1,
        field_type: 'text',
        label: 'Name',
        is_required: true,
        order: 0,
        validation_rules: {
          min_length: 2,
          max_length: 50,
        },
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse('John').success).toBe(true);
      expect(schema.safeParse('J').success).toBe(false); // Too short
    });

    it('creates email field schema', () => {
      const field: QuestionnaireField = {
        id: 2,
        field_type: 'email',
        label: 'Email',
        is_required: true,
        order: 0,
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse('test@example.com').success).toBe(true);
      expect(schema.safeParse('invalid').success).toBe(false);
    });

    it('creates number field schema with min/max', () => {
      const field: QuestionnaireField = {
        id: 3,
        field_type: 'number',
        label: 'Guests',
        is_required: true,
        order: 0,
        validation_rules: {
          min_value: 10,
          max_value: 500,
        },
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse(150).success).toBe(true);
      expect(schema.safeParse(5).success).toBe(false); // Below min
      expect(schema.safeParse(600).success).toBe(false); // Above max
    });

    it('creates rating field schema', () => {
      const field: QuestionnaireField = {
        id: 4,
        field_type: 'rating',
        label: 'Rating',
        is_required: true,
        order: 0,
        validation_rules: {
          min_rating: 1,
          max_rating: 5,
        },
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse(3).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(6).success).toBe(false);
    });

    it('creates boolean field schema', () => {
      const field: QuestionnaireField = {
        id: 5,
        field_type: 'boolean',
        label: 'Agree',
        is_required: true,
        order: 0,
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse('yes').success).toBe(false);
    });

    it('creates select field schema with options', () => {
      const field: QuestionnaireField = {
        id: 6,
        field_type: 'select',
        label: 'Color',
        is_required: true,
        order: 0,
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
        ],
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse('red').success).toBe(true);
      expect(schema.safeParse('green').success).toBe(false);
    });

    it('makes field optional when not required', () => {
      const field: QuestionnaireField = {
        id: 7,
        field_type: 'text',
        label: 'Notes',
        is_required: false,
        order: 0,
      };

      const schema = createFieldSchema(field);

      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse(null).success).toBe(true);
    });
  });

  describe('createQuestionnaireSchema', () => {
    it('creates schema for multiple fields', () => {
      const fields: QuestionnaireField[] = [
        { id: 1, field_type: 'text', label: 'Name', is_required: true, order: 0 },
        { id: 2, field_type: 'email', label: 'Email', is_required: true, order: 1 },
        { id: 3, field_type: 'number', label: 'Age', is_required: false, order: 2 },
      ];

      const schema = createQuestionnaireSchema(fields);

      const result = schema.safeParse({
        field_1: 'John',
        field_2: 'john@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('uses field_id as key prefix', () => {
      const fields: QuestionnaireField[] = [
        { id: 42, field_type: 'text', label: 'Answer', is_required: true, order: 0 },
      ];

      const schema = createQuestionnaireSchema(fields);

      expect(schema.safeParse({ field_42: 'Test' }).success).toBe(true);
      expect(schema.safeParse({ field_1: 'Test' }).success).toBe(false);
    });
  });
});

// =============================================================================
// MAIN VALIDATOR FUNCTIONS
// =============================================================================

describe('Validation Functions', () => {
  describe('getStepSchema', () => {
    it('returns introduction schema', () => {
      const schema = getStepSchema('introduction');
      expect(schema.safeParse({ acknowledged: true }).success).toBe(true);
    });

    it('returns venue_selection schema', () => {
      const schema = getStepSchema('venue_selection');
      expect(schema.safeParse({ selected_venue_ids: [1] }).success).toBe(true);
    });

    it('returns empty object for unknown step', () => {
      const schema = getStepSchema('unknown_step' as any);
      expect(schema.safeParse({}).success).toBe(true);
    });
  });

  describe('validateStepData', () => {
    it('validates introduction step', () => {
      const result = validateStepData('introduction', { acknowledged: true });
      expect(result.success).toBe(true);
    });

    it('returns errors for invalid data', () => {
      const result = validateStepData('introduction', { acknowledged: false });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('uses configuration for venue_selection', () => {
      const config = { min_venues: 2, max_venues: 3 };
      const result = validateStepData('venue_selection', { selected_venue_ids: [1] }, config);
      expect(result.success).toBe(false);
    });

    it('returns configuration error when venue config missing required fields', () => {
      const result = validateStepData('venue_selection', { selected_venue_ids: [1] }, {});
      expect(result.success).toBe(false);
      expect(result.errors?._configuration).toBeDefined();
    });

    it('uses configuration for package_selection', () => {
      const config = { min_selection: 1, max_selection: 2 };
      const validPackage = { product_id: 1, name: 'Pkg', price: '100', quantity: 1 };
      const result = validateStepData('package_selection', { selected_packages: [validPackage] }, config);
      expect(result.success).toBe(true);
    });

    it('uses configuration for contact_info', () => {
      const config: ContactInfoStepConfiguration = {
        require_full_name: true,
        require_email: true,
        require_phone: true,
        require_address: false,
        require_city: false,
        require_postal_code: false,
        require_country: false,
        require_company: false,
        require_account_creation: false,
        show_job_title: false,
        offer_account_creation: false,
        show_welcome_back_for_authenticated: false,
        prefill_from_profile: false,
      };

      const result = validateStepData('contact_info', {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+639123456789',
      }, config);

      expect(result.success).toBe(true);
    });
  });

  describe('validateField', () => {
    it('returns valid for valid value', () => {
      const result = validateField('test@example.com', emailSchema);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns error message for invalid value', () => {
      const result = validateField('invalid', emailSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles null input gracefully', () => {
    const result = validateStepData('introduction', null);
    expect(result.success).toBe(false);
  });

  it('handles undefined input gracefully', () => {
    const result = validateStepData('introduction', undefined);
    expect(result.success).toBe(false);
  });

  it('handles empty object input', () => {
    const result = validateStepData('introduction', {});
    expect(result.success).toBe(false);
  });

  it('formats error paths correctly', () => {
    const result = validateStepData('venue_selection', { selected_venue_ids: [] }, { min_venues: 1, max_venues: 5 });
    expect(result.success).toBe(false);
    expect(result.errors?.selected_venue_ids).toBeDefined();
  });

  it('handles nested validation error paths', () => {
    const result = validateStepData('date_time', {
      start_date: '2025-06-15',
      end_date: '2025-06-14', // Before start
    });
    expect(result.success).toBe(false);
    expect(result.errors?.end_date).toBeDefined();
  });
});
