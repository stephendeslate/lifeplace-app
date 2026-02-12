import {
  parsePhoneNumberWithError,
  isValidPhoneNumber,
} from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { z } from "zod";

const DEFAULT_COUNTRY: CountryCode = "PH";

/**
 * Validate a phone number. Defaults to PH if no country code provided.
 * Accepts E.164 (+639123456789), local PH (09123456789),
 * and any valid international number with country code.
 */
export function validatePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  if (!phone || !phone.trim()) return false;
  return isValidPhoneNumber(phone.trim(), defaultCountry);
}

/**
 * Normalize a phone number to E.164 format (e.g., '+639123456789').
 * Returns null if invalid.
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (!phone || !phone.trim()) return null;
  try {
    const parsed = parsePhoneNumberWithError(phone.trim(), defaultCountry);
    if (parsed.isValid()) {
      return parsed.format("E.164");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a phone number for display (international format).
 * Returns the original input if the number is invalid.
 */
export function formatPhoneDisplay(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string {
  if (!phone || !phone.trim()) return phone;
  try {
    const parsed = parsePhoneNumberWithError(phone.trim(), defaultCountry);
    if (parsed.isValid()) {
      return parsed.formatInternational();
    }
    return phone;
  } catch {
    return phone;
  }
}

/**
 * Zod schema for phone validation.
 * Allows empty strings (chain with .min(1) for required fields).
 */
export const phoneSchema = z.string().refine(
  (value) => {
    if (!value || !value.trim()) return true;
    return validatePhoneNumber(value);
  },
  {
    message:
      "Please enter a valid phone number (e.g., 09123456789 or +639123456789)",
  },
);
