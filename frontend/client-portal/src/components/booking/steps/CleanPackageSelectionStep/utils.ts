// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep/utils.ts

import type { BookingFlowStep } from '@/types/booking';

/**
 * Extracts the guest count from questionnaire responses by finding fields
 * marked with is_guest_count in the booking flow's questionnaire step configuration.
 * Returns null if no guest count field is found or no responses exist.
 */
export function extractGuestCount(
  questionnaireResponses: Record<string, unknown> | undefined,
  enabledSteps:
    | Array<{
        step_type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- configuration_data shape varies by step_type
        configuration_data: any;
      }>
    | undefined,
): number | null {
  if (!questionnaireResponses || !enabledSteps) return null;

  let totalGuests = 0;
  let found = false;

  for (const step of enabledSteps) {
    if (step.step_type !== 'questionnaire' || !step.configuration_data) continue;
    const items = step.configuration_data.questionnaire_items || [];
    for (const item of items) {
      const fields = item.questionnaire_details?.fields || [];
      for (const field of fields) {
        if (field.is_guest_count) {
          const key = `field_${field.id}`;
          const value = questionnaireResponses[key];
          if (value != null) {
            const num = typeof value === 'number' ? value : parseInt(String(value), 10);
            if (!isNaN(num)) {
              totalGuests += num;
              found = true;
            }
          }
        }
      }
    }
  }

  return found ? totalGuests : null;
}

/**
 * Extracts child pricing configuration from the booking flow's payment_info step.
 * Returns { enabled, tiers } where enabled is true only when child_pricing_enabled
 * is true AND at least one tier is configured.
 */
export function extractChildPricingConfig(enabledSteps: BookingFlowStep[] | undefined): {
  enabled: boolean;
  tiers: Array<{
    min_age: number;
    max_age: number;
    discount_percentage: number;
    label: string;
  }>;
} {
  if (!enabledSteps) return { enabled: false, tiers: [] };
  for (const step of enabledSteps) {
    if (step.step_type !== 'payment_info' || !step.configuration_data) continue;
    const configData = step.configuration_data as unknown as Record<string, unknown>;
    const effectiveTerms = configData.effective_payment_terms as
      | Record<string, unknown>
      | undefined;
    if (!effectiveTerms) continue;
    const enabled = effectiveTerms.child_pricing_enabled === true;
    const tiers = (effectiveTerms.child_pricing_tiers || []) as Array<{
      min_age: number;
      max_age: number;
      discount_percentage: number;
      label: string;
    }>;
    return { enabled: enabled && tiers.length > 0, tiers };
  }
  return { enabled: false, tiers: [] };
}
