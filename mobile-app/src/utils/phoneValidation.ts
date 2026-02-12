/**
 * Phone Validation Utilities
 *
 * Validates, normalizes, and formats phone numbers using libphonenumber-js.
 * Default region: Philippines (PH). Accepts any valid international number.
 *
 * This is a standalone module (not imported from @shared) because the mobile app
 * does not share the frontend/shared package.
 */

import {
  isValidPhoneNumber,
  parsePhoneNumber,
  formatNumber,
  type CountryCode,
} from "libphonenumber-js";
import { z } from "zod";

const DEFAULT_COUNTRY: CountryCode = "PH";

/**
 * Validate a phone number.
 * Returns true if the number is valid for the given default country or as an international number.
 */
export function validatePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.trim();
  if (!cleaned) return false;

  try {
    return isValidPhoneNumber(cleaned, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Normalize a phone number to E.164 format (e.g., +639123456789).
 * Returns null if the number is invalid.
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (!phone || typeof phone !== "string") return null;
  const cleaned = phone.trim();
  if (!cleaned) return null;

  try {
    const parsed = parsePhoneNumber(cleaned, defaultCountry);
    if (parsed && parsed.isValid()) {
      return parsed.number; // E.164 format
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a phone number for display in international format.
 * Returns the original string if parsing fails.
 */
export function formatPhoneDisplay(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string {
  if (!phone || typeof phone !== "string") return phone || "";
  const cleaned = phone.trim();
  if (!cleaned) return "";

  try {
    const parsed = parsePhoneNumber(cleaned, defaultCountry);
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational();
    }
    return phone;
  } catch {
    return phone;
  }
}

/**
 * Zod schema for phone number validation.
 * Validates that the string is a valid phone number.
 */
export const phoneSchema = z.string().refine(
  (value) => {
    if (!value || !value.trim()) return true; // Allow empty if not required
    return validatePhoneNumber(value);
  },
  { message: "Please enter a valid phone number" },
);
