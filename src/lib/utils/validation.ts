/**
 * Validation utilities
 */

/**
 * Validates email format using standard regex pattern.
 * @param email - Email address to validate
 * @returns true if email format is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates task/epic/story creation body
 */
export function validateCreateTaskBody(
  body: unknown,
  options: { requireTitle?: boolean; maxTitleLength?: number } = {}
): ValidationResult {
  const { requireTitle = true, maxTitleLength = 255 } = options;
  
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  
  const { title } = body as { title?: unknown };
  
  if (requireTitle) {
    if (!title || typeof title !== 'string') {
      return { valid: false, error: 'title is required' };
    }
    
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return { valid: false, error: 'title cannot be empty' };
    }
    
    if (trimmedTitle.length > maxTitleLength) {
      return { valid: false, error: `title must be at most ${maxTitleLength} characters` };
    }
  }
  
  return { valid: true };
}
