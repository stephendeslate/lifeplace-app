// frontend/admin-crm/src/utils/security.ts

import DOMPurify from 'dompurify';

/**
 * Security utility functions for the admin CRM application
 */

/**
 * Securely sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML content
 * @param context - Context of the HTML (email, template, preview, etc.)
 * @returns Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (
  html: string,
  context: 'email' | 'template' | 'preview' | 'strict' = 'strict',
): string => {
  if (!html) return '';

  // Define allowed tags based on context
  let allowedTags: string[];
  let allowedAttr: string[];

  switch (context) {
    case 'email':
      allowedTags = [
        'p',
        'br',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'ul',
        'ol',
        'li',
        'blockquote',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'hr',
      ];
      allowedAttr = ['href', 'src', 'alt', 'title', 'class', 'width', 'height', 'align'];
      break;

    case 'template':
      allowedTags = [
        'p',
        'br',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'sub',
        'sup',
        'ul',
        'ol',
        'li',
        'blockquote',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'hr',
        'pre',
        'code',
      ];
      allowedAttr = ['href', 'src', 'alt', 'title', 'class', 'width', 'height', 'align'];
      break;

    case 'preview':
      allowedTags = [
        'p',
        'br',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'sub',
        'sup',
        'ul',
        'ol',
        'li',
        'blockquote',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'hr',
        'pre',
        'code',
        'small',
        'mark',
        'del',
        'ins',
      ];
      allowedAttr = [
        'href',
        'src',
        'alt',
        'title',
        'class',
        'width',
        'height',
        'align',
        'colspan',
        'rowspan',
      ];
      break;

    case 'strict':
    default:
      allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u'];
      allowedAttr = [];
      break;
  }

  // Use DOMPurify with safe configuration
  let sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttr,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'svg'],
    FORBID_ATTR: [
      'onload',
      'onerror',
      'onclick',
      'onmouseover',
      'onmouseout',
      'onkeydown',
      'onkeyup',
    ],
  });

  // Additional security: remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Force external links to open in new tab (post-processing)
  if (context !== 'strict') {
    sanitized = sanitized.replace(/<a\s+([^>]*href=["'][^"']*["'][^>]*)>/gi, (_, attrs) => {
      if (!attrs.includes('target=')) {
        attrs += ' target="_blank" rel="noopener noreferrer"';
      }
      return `<a ${attrs}>`;
    });
  }

  return sanitized;
};

/**
 * Sanitize CSS content for custom styles
 * @param css - Raw CSS content
 * @returns Sanitized CSS safe for rendering
 */
export const sanitizeCSS = (css: string): string => {
  if (!css) return '';

  // Remove potentially dangerous CSS properties and values
  const dangerousPatterns = [
    /javascript:/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*data:/gi,
    /@import/gi,
    /binding:/gi,
    /-moz-binding/gi,
    /behavior:/gi,
  ];

  let sanitized = css;
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
};

/**
 * Escape HTML entities to prevent XSS when displaying raw text
 * @param text - Raw text content
 * @returns Escaped text safe for HTML display
 */
export const escapeHTML = (text: string): string => {
  if (!text) return '';

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#47;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Validate and sanitize URLs to prevent malicious redirects
 * @param url - URL to validate
 * @returns Sanitized URL or null if invalid
 */
export const sanitizeURL = (url: string): string | null => {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Only allow safe protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * Security headers for API requests
 */
export const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};
