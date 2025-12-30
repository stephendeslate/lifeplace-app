/**
 * Security Utilities
 * Input sanitization, XSS prevention, validation
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Strip HTML tags from a string
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Escape HTML special characters for safe display
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}

/**
 * Validate and sanitize a URL
 */
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

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
    if (!['http:', 'https:'].includes(parsed.protocol)) {
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
  if (!email || typeof email !== 'string') return false;

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * Validate Philippine phone number
 * Accepts: +63xxxxxxxxxx, 09xxxxxxxxx, 9xxxxxxxxx
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  const cleaned = phone.replace(/[\s\-()]/g, '');

  return (
    /^\+63\d{10}$/.test(cleaned) ||  // +63xxxxxxxxxx
    /^09\d{9}$/.test(cleaned) ||     // 09xxxxxxxxx
    /^9\d{9}$/.test(cleaned)         // 9xxxxxxxxx
  );
}

/**
 * Format phone number to standard format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Convert to +63 format
  if (/^09\d{9}$/.test(cleaned)) {
    return `+63${cleaned.slice(1)}`;
  }

  if (/^9\d{9}$/.test(cleaned)) {
    return `+63${cleaned}`;
  }

  if (/^\+63\d{10}$/.test(cleaned)) {
    return cleaned;
  }

  return phone;
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
    return { score: 0, label: 'Too weak', feedback: ['Enter a password'] };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  // Character type checks
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score += 0.5;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 0.5;
  else feedback.push('Add special characters');

  // Common patterns penalty
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein'];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score -= 1;
    feedback.push('Avoid common passwords');
  }

  // Sequential characters penalty
  if (/(.)\1{2,}/.test(password)) {
    score -= 0.5;
    feedback.push('Avoid repeated characters');
  }

  const normalizedScore = Math.max(0, Math.min(4, Math.floor(score)));

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

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
  if (!name || typeof name !== 'string') return 'file';

  return name
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Replace problematic characters with underscore
    .replace(/[<>:"|?*]/g, '_')
    // Remove leading/trailing dots and spaces
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // Limit length
    .slice(0, 200)
    // Default if empty
    || 'file';
}

/**
 * Validate file type against allowed types
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  if (!mimeType || !allowedTypes.length) return false;

  return allowedTypes.some(allowed => {
    // Exact match
    if (allowed === mimeType) return true;

    // Wildcard match (e.g., "image/*")
    if (allowed.endsWith('/*')) {
      const category = allowed.slice(0, -2);
      return mimeType.startsWith(category + '/');
    }

    // Extension match (e.g., ".pdf")
    if (allowed.startsWith('.')) {
      const ext = allowed.slice(1).toLowerCase();
      const mimeExts: Record<string, string[]> = {
        pdf: ['application/pdf'],
        jpg: ['image/jpeg'],
        jpeg: ['image/jpeg'],
        png: ['image/png'],
        gif: ['image/gif'],
        doc: ['application/msword'],
        docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      };
      return mimeExts[ext]?.includes(mimeType) || false;
    }

    return false;
  });
}

/**
 * Validate file size
 */
export function validateFileSize(
  sizeBytes: number,
  maxSizeMB: number
): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Generate a random token (for CSRF, etc.)
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'credit_card', 'cvv', 'ssn'];

  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key] as Record<string, unknown>);
    }
  }

  return masked;
}
