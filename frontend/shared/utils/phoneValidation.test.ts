import { describe, expect, it } from "vitest";
import {
  validatePhoneNumber,
  normalizePhoneNumber,
  formatPhoneDisplay,
  phoneSchema,
} from "./phoneValidation";

describe("validatePhoneNumber", () => {
  // Valid PH formats
  it.each([
    "09123456789",
    "+639123456789",
    "9123456789",
    "+63 912 345 6789",
    "0912-345-6789",
  ])("accepts valid PH number: %s", (phone) => {
    expect(validatePhoneNumber(phone)).toBe(true);
  });

  // Valid international numbers
  it.each([
    "+14155551234",
    "+442071234567",
    "+81312345678",
    "+61412345678",
    "+1 415 555 1234",
  ])("accepts valid international number: %s", (phone) => {
    expect(validatePhoneNumber(phone)).toBe(true);
  });

  // Invalid numbers
  it.each(["", "   ", "1234", "09abc456789", "not-a-number", "+0000000000"])(
    "rejects invalid number: %s",
    (phone) => {
      expect(validatePhoneNumber(phone)).toBe(false);
    },
  );

  it("returns false for null/undefined-like inputs", () => {
    expect(validatePhoneNumber("")).toBe(false);
    expect(validatePhoneNumber(null as unknown as string)).toBe(false);
    expect(validatePhoneNumber(undefined as unknown as string)).toBe(false);
  });
});

describe("normalizePhoneNumber", () => {
  it.each([
    ["09123456789", "+639123456789"],
    ["+639123456789", "+639123456789"],
    ["9123456789", "+639123456789"],
    ["+63 912 345 6789", "+639123456789"],
    ["0912-345-6789", "+639123456789"],
    ["+14155551234", "+14155551234"],
    ["+442071234567", "+442071234567"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it("returns null for invalid numbers", () => {
    expect(normalizePhoneNumber("1234")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePhoneNumber("")).toBeNull();
  });
});

describe("formatPhoneDisplay", () => {
  it("formats PH number in international format", () => {
    const result = formatPhoneDisplay("09123456789");
    expect(result).toContain("+63");
  });

  it("formats US number in international format", () => {
    const result = formatPhoneDisplay("+14155551234");
    expect(result).toContain("+1");
  });

  it("returns original string for invalid number", () => {
    expect(formatPhoneDisplay("1234")).toBe("1234");
  });

  it("returns empty string for empty input", () => {
    expect(formatPhoneDisplay("")).toBe("");
  });
});

describe("phoneSchema (Zod)", () => {
  it("accepts valid phone numbers", () => {
    const result = phoneSchema.safeParse("+639123456789");
    expect(result.success).toBe(true);
  });

  it("accepts empty string (optional by design)", () => {
    const result = phoneSchema.safeParse("");
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    const result = phoneSchema.safeParse("1234");
    expect(result.success).toBe(false);
  });

  it("accepts international numbers", () => {
    const result = phoneSchema.safeParse("+14155551234");
    expect(result.success).toBe(true);
  });
});
