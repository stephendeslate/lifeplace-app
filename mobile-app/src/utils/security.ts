/**
 * Security Utilities
 * Input sanitization, XSS prevention, validation
 */

import {
  validatePhoneNumber as _validatePhone,
  normalizePhoneNumber as _normalizePhone,
} from "./phoneValidation";

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
  );
}

/**
 * Strip HTML tags from a string
 *
 * Security considerations:
 * - Decodes HTML entities FIRST to handle encoded attack vectors
 * - Strips dangerous event handler attributes
 * - Removes script/style tags and content
 * - Finally strips all remaining HTML tags
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== "string") return "";

  let result = input;

  // Step 1: Decode HTML entities FIRST (to catch encoded attacks like &lt;script&gt;)
  result = result
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");

  // Step 2: Remove dangerous event handler attributes from any remaining tags
  // This catches onclick, onerror, onload, onmouseover, etc.
  result = result.replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, "");
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Step 3: Remove dangerous attributes (javascript: in href/src, data-* that could be abused)
  result = result.replace(/\s*href\s*=\s*(['"])?\s*javascript:[^'">\s]*/gi, "");
  result = result.replace(/\s*src\s*=\s*(['"])?\s*javascript:[^'">\s]*/gi, "");
  result = result.replace(
    /\s*style\s*=\s*(['"])[^'"]*expression\s*\([^'"]*\1/gi,
    "",
  );

  // Step 4: Remove script tags and their content
  result = result.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Step 5: Remove style tags and their content
  result = result.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    "",
  );

  // Step 6: Remove iframe, object, embed, form tags
  result = result.replace(
    /<\s*(iframe|object|embed|form)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    "",
  );
  result = result.replace(/<\s*(iframe|object|embed|form)[^>]*\/?>/gi, "");

  // Step 7: Remove all remaining HTML tags
  result = result.replace(/<[^>]*>/g, "");

  return result.trim();
}

/**
 * Escape HTML special characters for safe display
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== "string") return "";

  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Validate and sanitize a URL
 */
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  // Check for javascript: protocol
  if (/^javascript:/i.test(trimmed)) {
    return null;
  }

  // Check for data: protocol (except images which are sometimes OK)
  if (/^data:(?!image\/)/i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.href;
  } catch {
    // If URL parsing fails, check if it's a relative URL
    if (/^\/[^/]/.test(trimmed) || /^\.\.?\//.test(trimmed)) {
      return trimmed;
    }

    return null;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;

  // RFC 5322 compliant email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * Validate phone number (PH default, accepts international).
 * Delegates to libphonenumber-js based validator.
 */
export function validatePhone(phone: string): boolean {
  return _validatePhone(phone);
}

/**
 * Format/normalize phone number to E.164 standard format.
 * Delegates to libphonenumber-js based normalizer.
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  return _normalizePhone(phone) || phone;
}

/**
 * Calculate password strength (0-4)
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  feedback: string[];
} {
  if (!password) {
    return { score: 0, label: "Too weak", feedback: ["Enter a password"] };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  else feedback.push("Use at least 8 characters");

  if (password.length >= 12) score++;

  // Character type checks
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push("Add uppercase letters");

  if (/\d/.test(password)) score += 0.5;
  else feedback.push("Add numbers");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 0.5;
  else feedback.push("Add special characters");

  // Common patterns penalty
  const commonPatterns = ["password", "123456", "qwerty", "abc123", "letmein"];
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    score -= 1;
    feedback.push("Avoid common passwords");
  }

  // Sequential characters penalty
  if (/(.)\1{2,}/.test(password)) {
    score -= 0.5;
    feedback.push("Avoid repeated characters");
  }

  const normalizedScore = Math.max(0, Math.min(4, Math.floor(score)));

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    feedback: normalizedScore < 3 ? feedback : [],
  };
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== "string") return "file";

  return (
    name
      // Remove path separators
      .replace(/[/\\]/g, "")
      // Remove null bytes and control characters
      .replace(/[\x00-\x1F\x7F]/g, "")
      // Replace problematic characters with underscore
      .replace(/[<>:"|?*]/g, "_")
      // Remove leading/trailing dots and spaces
      .replace(/^[\s.]+|[\s.]+$/g, "")
      // Limit length
      .slice(0, 200) ||
    // Default if empty
    "file"
  );
}

/**
 * Magic byte signatures for common file types.
 * Used to validate actual file content rather than trusting MIME type headers.
 */
const FILE_MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> =
  {
    // Images
    "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
    "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
    "image/gif": [{ bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF87a or GIF89a
    "image/webp": [{ bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF header
    "image/bmp": [{ bytes: [0x42, 0x4d] }], // BM

    // Documents
    "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    "application/zip": [{ bytes: [0x50, 0x4b, 0x03, 0x04] }], // PK..
    // DOCX, XLSX, PPTX are ZIP files
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      { bytes: [0x50, 0x4b, 0x03, 0x04] },
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      { bytes: [0x50, 0x4b, 0x03, 0x04] },
    ],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
    // DOC, XLS, PPT (OLE compound documents)
    "application/msword": [
      { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
    ],
    "application/vnd.ms-excel": [
      { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
    ],
    "application/vnd.ms-powerpoint": [
      { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
    ],
  };

/**
 * Validate file magic bytes against claimed MIME type.
 * Returns true if file content matches claimed type, false otherwise.
 *
 * @param fileBytes - First N bytes of the file (usually first 8-16 bytes)
 * @param claimedMimeType - The MIME type claimed by the file/browser
 */
export function validateFileMagicBytes(
  fileBytes: Uint8Array | number[],
  claimedMimeType: string,
): boolean {
  const signatures = FILE_MAGIC_BYTES[claimedMimeType];

  // If we don't have a signature for this type, we can't validate
  // In this case, rely on other validation methods
  if (!signatures || signatures.length === 0) {
    return true; // Allow unknown types (server should validate)
  }

  const bytes = Array.isArray(fileBytes) ? fileBytes : Array.from(fileBytes);

  // Check if any of the valid signatures match
  return signatures.some((sig) => {
    const offset = sig.offset || 0;

    // Check if we have enough bytes
    if (bytes.length < offset + sig.bytes.length) {
      return false;
    }

    // Compare bytes at offset
    return sig.bytes.every((byte, index) => bytes[offset + index] === byte);
  });
}

/**
 * Read first N bytes from a file for magic byte validation.
 * Works with both Blob (web) and expo-file-system file URIs.
 */
export async function readFileMagicBytes(
  file: Blob | string,
  numBytes: number = 16,
): Promise<Uint8Array | null> {
  try {
    if (file instanceof Blob) {
      // Web/Blob API
      const slice = file.slice(0, numBytes);
      const buffer = await slice.arrayBuffer();
      return new Uint8Array(buffer);
    }

    // For React Native file URIs, we'd need expo-file-system
    // This is a placeholder - actual implementation would use:
    // import * as FileSystem from 'expo-file-system';
    // const content = await FileSystem.readAsStringAsync(file, { length: numBytes, encoding: FileSystem.EncodingType.Base64 });
    // return base64ToBytes(content);

    return null; // File URI reading requires native module
  } catch {
    return null;
  }
}

/**
 * Validate file type against allowed types (MIME type check)
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[],
): boolean {
  if (!mimeType || !allowedTypes.length) return false;

  return allowedTypes.some((allowed) => {
    // Exact match
    if (allowed === mimeType) return true;

    // Wildcard match (e.g., "image/*")
    if (allowed.endsWith("/*")) {
      const category = allowed.slice(0, -2);
      return mimeType.startsWith(category + "/");
    }

    // Extension match (e.g., ".pdf")
    if (allowed.startsWith(".")) {
      const ext = allowed.slice(1).toLowerCase();
      const mimeExts: Record<string, string[]> = {
        pdf: ["application/pdf"],
        jpg: ["image/jpeg"],
        jpeg: ["image/jpeg"],
        png: ["image/png"],
        gif: ["image/gif"],
        webp: ["image/webp"],
        bmp: ["image/bmp"],
        doc: ["application/msword"],
        docx: [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        xls: ["application/vnd.ms-excel"],
        xlsx: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        ppt: ["application/vnd.ms-powerpoint"],
        pptx: [
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
      };
      return mimeExts[ext]?.includes(mimeType) || false;
    }

    return false;
  });
}

/**
 * Comprehensive file validation including magic bytes.
 * Use this for security-sensitive file uploads.
 */
export async function validateFileSecure(
  file: Blob,
  allowedTypes: string[],
  maxSizeMB: number,
): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // Check size first (fast check)
  if (!validateFileSize(file.size, maxSizeMB)) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check MIME type
  if (!validateFileType(file.type, allowedTypes)) {
    return {
      isValid: false,
      error: "File type not allowed",
    };
  }

  // Check magic bytes for spoofed MIME types
  const magicBytes = await readFileMagicBytes(file);
  if (magicBytes && !validateFileMagicBytes(magicBytes, file.type)) {
    return {
      isValid: false,
      error: "File content does not match file type",
    };
  }

  return { isValid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(
  sizeBytes: number,
  maxSizeMB: number,
): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Generate a random token (for CSRF, etc.)
 */
export function generateToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "credit_card",
    "cvv",
    "ssn",
  ];

  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      masked[key] = "***MASKED***";
    } else if (typeof masked[key] === "object" && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key] as Record<string, unknown>);
    }
  }

  return masked;
}
