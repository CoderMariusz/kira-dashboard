/**
 * Input sanitization utilities for API routes.
 * 
 * Strips HTML tags and limits string length to prevent XSS and overflow.
 * React JSX already escapes output, but defense-in-depth is good practice.
 */

const HTML_TAG_REGEX = /<[^>]*>/g;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Sanitize a text input: trim, strip HTML tags, enforce max length.
 * 
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized string
 */
export function sanitizeText(input: string, maxLength = 200): string {
  return input
    .trim()
    .replace(HTML_TAG_REGEX, '')
    .slice(0, maxLength);
}

/**
 * Validate and sanitize a hex color string.
 * Returns the color if valid, or the fallback color.
 * 
 * @param color - User-provided color string
 * @param fallback - Default color if invalid
 * @returns Valid hex color
 */
export function sanitizeColor(color: string, fallback = '#6B7280'): string {
  const trimmed = color.trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : fallback;
}
