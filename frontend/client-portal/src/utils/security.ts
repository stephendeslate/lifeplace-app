// frontend/client-portal/src/utils/security.ts

import DOMPurify from 'dompurify';

/**
 * Security utility functions for the client portal application
 */

/**
 * Securely sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML content
 * @param context - Context of the HTML (email, content, strict)
 * @returns Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (html: string, context: 'email' | 'content' | 'strict' = 'strict'): string => {
  if (!html) return '';

  // Use DOMPurify with safe default configuration
  let sanitized = DOMPurify.sanitize(html, {
    // Allow common safe tags
    ALLOWED_TAGS: context === 'strict' 
      ? ['p', 'br', 'strong', 'b', 'em', 'i', 'u']
      : ['p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
         'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote',
         'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr'],
    
    // Allow safe attributes
    ALLOWED_ATTR: context === 'strict'
      ? []
      : ['href', 'src', 'alt', 'title', 'class', 'width', 'height', 'align'],
    
    // Remove dangerous tags and attributes
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'svg'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup'],
  });

  // Additional security: remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Force external links to open in new tab (post-processing)
  if (context === 'email' || context === 'content') {
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
 * Sanitize CSS content for custom styles (used in booking flow)
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
    /-webkit-binding/gi,
    /vbscript:/gi,
    /mocha:/gi,
    /livescript:/gi,
  ];
  
  let sanitized = css;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove CSS that could be used for phishing or misleading content
  const phishingPatterns = [
    /position\s*:\s*fixed/gi,
    /position\s*:\s*absolute/gi,
    /z-index\s*:\s*9999/gi,
  ];
  
  phishingPatterns.forEach(pattern => {
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