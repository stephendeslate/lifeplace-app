/**
 * Booking Validation
 * Zod schemas for all 10 booking steps
 */

import { z } from 'zod';
import type {
  StepType,
  ContactInfoStepConfiguration,
  VenueSelectionStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  QuestionnaireField,
} from '@/types/booking';

// ============ Common Validators ============

/**
 * Philippine phone number validation
 * Accepts: +63xxxxxxxxxx, 09xxxxxxxxx, 9xxxxxxxxx
 */
export const philippinePhoneSchema = z.string().refine(
  (value) => {
    if (!value) return true; // Allow empty if not required
    const cleaned = value.replace(/[\s\-()]/g, '');
    return (
      /^\+63\d{10}$/.test(cleaned) || // +63xxxxxxxxxx
      /^09\d{9}$/.test(cleaned) ||     // 09xxxxxxxxx
      /^9\d{9}$/.test(cleaned)         // 9xxxxxxxxx
    );
  },
  { message: 'Please enter a valid Philippine phone number' }
);

/**
 * Email validation
 */
export const emailSchema = z.string().email('Please enter a valid email address');

/**
 * Required string that's not just whitespace
 */
export const requiredStringSchema = z.string().min(1, 'This field is required').transform(s => s.trim());

/**
 * Optional string that transforms empty to undefined
 */
export const optionalStringSchema = z.string().optional().transform(s => s?.trim() || undefined);

// ============ Step Schemas ============

/**
 * Introduction step schema
 */
export const introductionSchema = z.object({
  acknowledged: z.boolean().refine(
    (val) => val === true,
    { message: 'Please acknowledge to continue' }
  ),
});

/**
 * Venue selection step schema
 */
export const venueSelectionSchema = z.object({
  selected_venue_ids: z.array(z.number()).min(1, 'Please select at least one venue'),
});

/**
 * Create venue selection schema with constraints
 */
export function createVenueSelectionSchema(minVenues: number = 1, maxVenues: number = 10) {
  return z.object({
    selected_venue_ids: z.array(z.number())
      .min(minVenues, `Please select at least ${minVenues} venue${minVenues > 1 ? 's' : ''}`)
      .max(maxVenues, `You can select up to ${maxVenues} venues`),
  });
}

/**
 * Date/time step schema
 */
export const dateTimeSchema = z.object({
  start_date: z.string().min(1, 'Please select a date'),
  end_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  venue_id: z.number().optional(),
  is_flexible: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['end_date'] }
);

/**
 * Selected package schema
 */
export const selectedPackageSchema = z.object({
  product_id: z.number(),
  name: z.string(),
  price: z.string(),
  quantity: z.number().min(1),
  is_tax_inclusive: z.boolean().optional(),
  price_with_tax: z.string().optional(),
  included_hours: z.number().optional(),
  excess_hours: z.number().optional(),
  excess_hour_rate: z.string().optional(),
  is_custom_bundle: z.boolean().optional(),
});

/**
 * Package selection step schema
 */
export const packageSelectionSchema = z.object({
  selected_packages: z.array(selectedPackageSchema).min(1, 'Please select at least one package'),
  venue_additional_hours: z.record(z.string(), z.number()).optional(),
  use_custom_bundle: z.boolean().optional(),
});

/**
 * Create package selection schema with constraints
 */
export function createPackageSelectionSchema(minSelection: number = 1, maxSelection: number = 10) {
  return z.object({
    selected_packages: z.array(selectedPackageSchema)
      .min(minSelection, `Please select at least ${minSelection} package${minSelection > 1 ? 's' : ''}`)
      .max(maxSelection, `You can select up to ${maxSelection} packages`),
    venue_additional_hours: z.record(z.string(), z.number()).optional(),
    use_custom_bundle: z.boolean().optional(),
  });
}

/**
 * Selected addon schema
 */
export const selectedAddonSchema = z.object({
  product_id: z.number(),
  name: z.string(),
  price: z.string(),
  quantity: z.number().min(1),
  is_tax_inclusive: z.boolean().optional(),
  price_with_tax: z.string().optional(),
  category_id: z.number().optional(),
});

/**
 * Addon selection step schema (addons are optional)
 */
export const addonSelectionSchema = z.object({
  selected_addons: z.array(selectedAddonSchema).default([]),
  venue_additional_hours: z.record(z.string(), z.number()).optional(),
});

/**
 * Create addon selection schema with constraints
 */
export function createAddonSelectionSchema(minSelection: number = 0, maxSelection: number = 100) {
  return z.object({
    selected_addons: z.array(selectedAddonSchema)
      .min(minSelection, minSelection > 0 ? `Please select at least ${minSelection} add-on${minSelection > 1 ? 's' : ''}` : undefined)
      .max(maxSelection, `You can select up to ${maxSelection} add-ons`),
    venue_additional_hours: z.record(z.string(), z.number()).optional(),
  });
}

/**
 * Pricing summary step schema
 */
export const pricingSummarySchema = z.object({
  applied_discount_code: z.string().optional(),
  special_requests: z.string().max(1000, 'Special requests must be less than 1000 characters').optional(),
  terms_accepted: z.boolean().refine(
    (val) => val === true,
    { message: 'Please accept the terms and conditions' }
  ),
  marketing_consent: z.boolean().optional(),
  privacy_consent: z.boolean().optional(),
});

/**
 * Contact info step schema
 */
export const contactInfoSchema = z.object({
  full_name: requiredStringSchema.pipe(z.string().min(2, 'Name must be at least 2 characters')),
  email: emailSchema,
  phone: philippinePhoneSchema.optional(),
  address: optionalStringSchema,
  city: optionalStringSchema,
  state: optionalStringSchema,
  postal_code: optionalStringSchema,
  country: optionalStringSchema,
  company: optionalStringSchema,
  job_title: optionalStringSchema,
  create_account: z.boolean().optional(),
  password: z.string().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Create contact info schema from configuration
 */
export function createContactInfoSchema(config: ContactInfoStepConfiguration) {
  const schema: Record<string, z.ZodTypeAny> = {
    full_name: config.require_full_name
      ? requiredStringSchema.pipe(z.string().min(2, 'Name must be at least 2 characters'))
      : optionalStringSchema,
    email: config.require_email ? emailSchema : emailSchema.optional(),
    phone: config.require_phone ? philippinePhoneSchema : philippinePhoneSchema.optional(),
    address: config.require_address ? requiredStringSchema : optionalStringSchema,
    city: config.require_city ? requiredStringSchema : optionalStringSchema,
    postal_code: config.require_postal_code ? requiredStringSchema : optionalStringSchema,
    country: config.require_country ? requiredStringSchema : optionalStringSchema,
    company: config.require_company ? requiredStringSchema : optionalStringSchema,
    create_account: z.boolean().optional(),
    password: z.string().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
  };

  // Add password requirements if account creation is required
  if (config.require_account_creation) {
    const pwdReqs = config.password_requirements;
    let passwordSchema = z.string().min(pwdReqs?.min_length || 8, `Password must be at least ${pwdReqs?.min_length || 8} characters`);

    if (pwdReqs?.require_uppercase) {
      passwordSchema = passwordSchema.refine(
        (val) => /[A-Z]/.test(val),
        { message: 'Password must contain an uppercase letter' }
      );
    }
    if (pwdReqs?.require_lowercase) {
      passwordSchema = passwordSchema.refine(
        (val) => /[a-z]/.test(val),
        { message: 'Password must contain a lowercase letter' }
      );
    }
    if (pwdReqs?.require_number) {
      passwordSchema = passwordSchema.refine(
        (val) => /\d/.test(val),
        { message: 'Password must contain a number' }
      );
    }
    if (pwdReqs?.require_special) {
      passwordSchema = passwordSchema.refine(
        (val) => /[!@#$%^&*(),.?":{}|<>]/.test(val),
        { message: 'Password must contain a special character' }
      );
    }

    schema.password = passwordSchema;
    schema.create_account = z.literal(true);
  }

  return z.object(schema);
}

/**
 * Payment step schema
 */
export const paymentSchema = z.object({
  payment_method: z.string().min(1, 'Please select a payment method'),
  payment_type: z.enum(['FULL', 'DEPOSIT']),
  payment_gateway_id: z.number().optional(),
  payment_gateway_code: z.string().optional(),
  payment_method_id: z.string().optional(),
  payment_method_token: z.string().optional(),
  billing_address: z.string().optional(),
  save_payment_method: z.boolean().optional(),
  completion_type: z.enum(['payment', 'quote']).optional(),
  quote_message: z.string().max(500).optional(),
  deposit_amount: z.number().optional(),
});

/**
 * Confirmation step schema (minimal validation)
 */
export const confirmationSchema = z.object({
  booking_reference: z.string().optional(),
  completion_status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

// ============ Questionnaire Field Validation ============

/**
 * Create schema for a questionnaire field
 */
export function createFieldSchema(field: QuestionnaireField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.field_type) {
    case 'text':
    case 'textarea':
    case 'url':
      schema = z.string();
      if (field.validation_rules?.min_length) {
        schema = (schema as z.ZodString).min(field.validation_rules.min_length);
      }
      if (field.validation_rules?.max_length) {
        schema = (schema as z.ZodString).max(field.validation_rules.max_length);
      }
      if (field.validation_rules?.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(field.validation_rules.pattern), field.validation_rules.pattern_message);
      }
      break;

    case 'email':
      schema = emailSchema;
      break;

    case 'phone':
      schema = philippinePhoneSchema;
      break;

    case 'number':
    case 'range':
      schema = z.number();
      if (field.validation_rules?.min_value !== undefined) {
        schema = (schema as z.ZodNumber).min(field.validation_rules.min_value);
      }
      if (field.validation_rules?.max_value !== undefined) {
        schema = (schema as z.ZodNumber).max(field.validation_rules.max_value);
      }
      break;

    case 'rating':
      const min = field.validation_rules?.min_rating ?? 1;
      const max = field.validation_rules?.max_rating ?? 5;
      schema = z.number().min(min).max(max);
      break;

    case 'date':
    case 'time':
    case 'datetime':
      schema = z.string();
      break;

    case 'boolean':
    case 'checkbox':
      schema = z.boolean();
      break;

    case 'select':
    case 'radio':
      const options = field.options?.map(o => o.value) || [];
      schema = z.enum(options as [string, ...string[]]);
      break;

    case 'multi_select':
      const multiOptions = field.options?.map(o => o.value) || [];
      schema = z.array(z.enum(multiOptions as [string, ...string[]]));
      if (field.validation_rules?.min_selections) {
        schema = (schema as z.ZodArray<z.ZodString>).min(field.validation_rules.min_selections);
      }
      if (field.validation_rules?.max_selections) {
        schema = (schema as z.ZodArray<z.ZodString>).max(field.validation_rules.max_selections);
      }
      break;

    case 'file':
      // File validation is handled separately
      schema = z.any();
      break;

    default:
      schema = z.any();
  }

  // Make optional if not required
  if (!field.is_required) {
    schema = schema.optional().nullable();
  }

  return schema;
}

/**
 * Create schema for questionnaire step
 */
export function createQuestionnaireSchema(fields: QuestionnaireField[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    const fieldKey = `field_${field.id}`;
    shape[fieldKey] = createFieldSchema(field);
  }

  return z.object(shape);
}

// ============ Main Validator ============

/**
 * Get schema for a step type
 */
export function getStepSchema(stepType: StepType): z.ZodTypeAny {
  const schemas: Record<StepType, z.ZodTypeAny> = {
    introduction: introductionSchema,
    venue_selection: venueSelectionSchema,
    date_time: dateTimeSchema,
    questionnaire: z.object({ responses: z.record(z.string(), z.unknown()) }),
    package_selection: packageSelectionSchema,
    addon_selection: addonSelectionSchema,
    pricing_summary: pricingSummarySchema,
    contact_info: contactInfoSchema,
    payment_info: paymentSchema,
    confirmation: confirmationSchema,
  };

  return schemas[stepType] || z.object({});
}

/**
 * Configuration types union for type checking
 */
type StepConfigurationUnion =
  | VenueSelectionStepConfiguration
  | PackageSelectionStepConfiguration
  | AddonSelectionStepConfiguration
  | ContactInfoStepConfiguration
  | Record<string, unknown>;

/**
 * Validate step data
 * Uses configuration values for steps that have configurable constraints
 */
export function validateStepData(
  stepType: StepType,
  data: unknown,
  config?: StepConfigurationUnion
): { success: boolean; data?: unknown; errors?: Record<string, string[]> } {
  let schema: z.ZodTypeAny;

  // Use configuration-aware schemas for steps with configurable constraints
  switch (stepType) {
    case 'venue_selection': {
      const venueConfig = config as VenueSelectionStepConfiguration | undefined;
      if (venueConfig && typeof venueConfig.min_venues === 'number' && typeof venueConfig.max_venues === 'number') {
        schema = createVenueSelectionSchema(venueConfig.min_venues, venueConfig.max_venues);
      } else {
        // Configuration is required - return error if missing
        return {
          success: false,
          errors: { _configuration: ['Venue selection step is not properly configured (missing min_venues/max_venues)'] },
        };
      }
      break;
    }
    case 'package_selection': {
      const pkgConfig = config as PackageSelectionStepConfiguration | undefined;
      if (pkgConfig && typeof pkgConfig.min_selection === 'number' && typeof pkgConfig.max_selection === 'number') {
        schema = createPackageSelectionSchema(pkgConfig.min_selection, pkgConfig.max_selection);
      } else {
        schema = packageSelectionSchema;
      }
      break;
    }
    case 'addon_selection': {
      const addonConfig = config as AddonSelectionStepConfiguration | undefined;
      if (addonConfig && typeof addonConfig.min_selection === 'number' && typeof addonConfig.max_selection === 'number') {
        schema = createAddonSelectionSchema(addonConfig.min_selection, addonConfig.max_selection);
      } else {
        schema = addonSelectionSchema;
      }
      break;
    }
    case 'contact_info': {
      const contactConfig = config as ContactInfoStepConfiguration | undefined;
      if (contactConfig) {
        schema = createContactInfoSchema(contactConfig);
      } else {
        schema = contactInfoSchema;
      }
      break;
    }
    default:
      schema = getStepSchema(stepType);
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our format
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'selected_venue_ids';
    if (!errors[path]) errors[path] = [];
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate a single field
 */
export function validateField(
  value: unknown,
  schema: z.ZodTypeAny
): { valid: boolean; error?: string } {
  const result = schema.safeParse(value);

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    error: result.error.issues[0]?.message || 'Invalid value',
  };
}
