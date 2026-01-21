/**
 * Booking Helpers
 * Validation, formatting, and session utilities for booking flow
 */

import type {
  BookingFlowStep,
  BookingSession,
  StepType,
  SelectedPackage,
  SelectedAddon,
  PricingCalculation,
} from '@/types/booking';
import { formatCurrency } from './currency';
import { formatPhilippinesTime } from './timezone';

/**
 * Check if a session has expired
 * Includes a 5-minute buffer for safety
 */
export function isSessionExpired(expiresAt: string): boolean {
  if (!expiresAt) return true;

  const expiryTime = new Date(expiresAt).getTime();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer

  return Date.now() > expiryTime - bufferMs;
}

/**
 * Get remaining time until session expires
 */
export function getSessionRemainingTime(expiresAt: string): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
} {
  if (!expiresAt) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const remaining = new Date(expiresAt).getTime() - Date.now();

  if (remaining <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds, isExpired: false };
}

/**
 * Format session remaining time for display
 */
export function formatSessionTime(expiresAt: string): string {
  const { hours, minutes, isExpired } = getSessionRemainingTime(expiresAt);

  if (isExpired) return 'Expired';

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Get human-readable step name
 */
export function getStepDisplayName(stepType: StepType): string {
  const names: Record<StepType, string> = {
    introduction: 'Introduction',
    venue_selection: 'Venue Selection',
    date_time: 'Date & Time',
    questionnaire: 'Questionnaire',
    package_selection: 'Package Selection',
    addon_selection: 'Add-ons',
    pricing_summary: 'Pricing Summary',
    contact_info: 'Contact Information',
    payment_info: 'Payment',
    confirmation: 'Confirmation',
  };

  return names[stepType] || stepType;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  currentIndex: number,
  totalSteps: number,
  completedSteps: number[] = []
): number {
  if (totalSteps === 0) return 0;

  // Use completed steps if available, otherwise use current index
  const completed = completedSteps.length > 0
    ? completedSteps.length
    : currentIndex;

  return Math.round((completed / totalSteps) * 100);
}

/**
 * Find the next required step
 */
export function getNextRequiredStep(
  steps: BookingFlowStep[],
  completedStepIds: number[]
): BookingFlowStep | null {
  return steps.find(step =>
    step.is_enabled &&
    step.is_required &&
    !completedStepIds.includes(step.id)
  ) || null;
}

/**
 * Check if a step can be skipped
 */
export function canSkipStep(step: BookingFlowStep | null): boolean {
  if (!step) return false;
  return step.is_skippable && !step.is_required;
}

/**
 * Check if user can navigate to a step
 */
export function canNavigateToStep(
  targetIndex: number,
  currentIndex: number,
  completedSteps: number[],
  steps: BookingFlowStep[]
): boolean {
  // Can always go back
  if (targetIndex < currentIndex) return true;

  // Can go to current step
  if (targetIndex === currentIndex) return true;

  // Can only go forward if all previous required steps are completed
  for (let i = currentIndex; i < targetIndex; i++) {
    const step = steps[i];
    if (step.is_required && !completedSteps.includes(step.id)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate required fields are present
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Deep merge step data
 */
export function mergeStepData<T extends Record<string, unknown>>(
  existing: T | undefined,
  updates: Partial<T>
): T {
  if (!existing) {
    return updates as T;
  }

  const result = { ...existing };

  for (const key of Object.keys(updates)) {
    const newValue = updates[key as keyof T];
    const existingValue = existing[key as keyof T];

    if (
      newValue !== undefined &&
      typeof newValue === 'object' &&
      newValue !== null &&
      !Array.isArray(newValue) &&
      typeof existingValue === 'object' &&
      existingValue !== null &&
      !Array.isArray(existingValue)
    ) {
      // Deep merge objects
      (result as Record<string, unknown>)[key] = mergeStepData(
        existingValue as Record<string, unknown>,
        newValue as Record<string, unknown>
      );
    } else if (newValue !== undefined) {
      (result as Record<string, unknown>)[key] = newValue;
    }
  }

  return result;
}

/**
 * Calculate total from selected packages
 */
export function calculatePackagesTotal(packages: SelectedPackage[]): number {
  return packages.reduce((sum, pkg) => {
    const basePrice = parseFloat(pkg.price) * pkg.quantity;
    const excessCost = pkg.excess_hour_cost ? parseFloat(pkg.excess_hour_cost) : 0;
    return sum + basePrice + excessCost;
  }, 0);
}

/**
 * Calculate total from selected addons
 */
export function calculateAddonsTotal(addons: SelectedAddon[]): number {
  return addons.reduce((sum, addon) => {
    return sum + parseFloat(addon.price) * addon.quantity;
  }, 0);
}

/**
 * Format pricing summary for display
 */
export function formatPricingSummary(pricing: PricingCalculation): {
  items: Array<{ label: string; value: string; type: string }>;
  total: string;
} {
  const items: Array<{ label: string; value: string; type: string }> = [];

  // Add line items
  pricing.lineItems.forEach(item => {
    items.push({
      label: item.quantity > 1 ? `${item.item_name} (×${item.quantity})` : item.item_name,
      value: formatCurrency(item.total_price),
      type: item.type,
    });
  });

  // Add subtotal if different from total
  if (pricing.subtotal !== pricing.total) {
    items.push({
      label: 'Subtotal',
      value: pricing.formattedSubtotal,
      type: 'SUBTOTAL',
    });
  }

  // Add tax if applicable
  if (parseFloat(pricing.tax) > 0) {
    items.push({
      label: `Tax (${(pricing.tax_rate * 100).toFixed(0)}%)`,
      value: pricing.formattedTax,
      type: 'TAX',
    });
  }

  // Add discount if applicable
  if (parseFloat(pricing.discount) > 0) {
    items.push({
      label: pricing.discount_code ? `Discount (${pricing.discount_code})` : 'Discount',
      value: `-${pricing.formattedDiscount}`,
      type: 'DISCOUNT',
    });
  }

  return {
    items,
    total: pricing.formattedTotal,
  };
}

/**
 * Format booking summary for confirmation
 */
export function formatBookingSummary(session: BookingSession): {
  eventType: string;
  dateRange: string;
  venues: string[];
  packages: Array<{ name: string; quantity: number; price: string }>;
  addons: Array<{ name: string; quantity: number; price: string }>;
  contact: { name: string; email: string; phone?: string };
  totalPrice: string;
} {
  const { booking_data } = session;

  return {
    eventType: booking_data.event_type_name || 'Event',
    dateRange: booking_data.date_time
      ? formatPhilippinesTime(booking_data.date_time.start_date, 'PPP')
      : 'Not selected',
    venues: [], // Would need to look up venue names
    packages: (booking_data.selected_packages || []).map(pkg => ({
      name: pkg.name,
      quantity: pkg.quantity,
      price: formatCurrency(pkg.price),
    })),
    addons: (booking_data.selected_addons || []).map(addon => ({
      name: addon.name,
      quantity: addon.quantity,
      price: formatCurrency(addon.price),
    })),
    contact: {
      name: booking_data.contact_info?.full_name || '',
      email: booking_data.contact_info?.email || '',
      phone: booking_data.contact_info?.phone,
    },
    totalPrice: session.total_price ? formatCurrency(session.total_price) : '₱0',
  };
}

/**
 * Generate a short booking reference for display
 */
export function formatBookingReference(reference: string): string {
  // If reference is long, show first 4 and last 4 characters
  if (reference.length > 12) {
    return `${reference.slice(0, 4)}...${reference.slice(-4)}`;
  }
  return reference;
}

/**
 * Check if booking data has minimum required fields for completion
 */
export function isBookingReadyForCompletion(session: BookingSession): {
  isReady: boolean;
  missingSteps: string[];
} {
  const missingSteps: string[] = [];
  const { booking_data } = session;

  // Check required data
  if (!booking_data.date_time?.start_date) {
    missingSteps.push('Date & Time');
  }

  if (!booking_data.selected_packages?.length) {
    missingSteps.push('Package Selection');
  }

  if (!booking_data.contact_info?.full_name || !booking_data.contact_info?.email) {
    missingSteps.push('Contact Information');
  }

  if (!booking_data.terms_accepted) {
    missingSteps.push('Terms & Conditions');
  }

  return {
    isReady: missingSteps.length === 0,
    missingSteps,
  };
}

/**
 * Get step icon name (Phosphor icon)
 */
export function getStepIcon(stepType: StepType): string {
  const icons: Record<StepType, string> = {
    introduction: 'Info',
    venue_selection: 'Buildings',
    date_time: 'Calendar',
    questionnaire: 'ClipboardText',
    package_selection: 'Package',
    addon_selection: 'PlusCircle',
    pricing_summary: 'Receipt',
    contact_info: 'User',
    payment_info: 'CreditCard',
    confirmation: 'CheckCircle',
  };

  return icons[stepType] || 'Circle';
}
