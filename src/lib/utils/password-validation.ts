/**
 * Password validation utilities
 * Implements password strength requirements
 */

export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  score: number; // 0-100
}

/**
 * Validates password strength according to security requirements
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length (12 chars = 20 points)
  if (password.length >= 12) {
    score += 20;
  } else if (password.length >= 8) {
    score += 10;
    errors.push('Password must be at least 12 characters long');
  } else {
    errors.push('Password must be at least 12 characters long');
  }

  // Check for uppercase (20 points)
  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase (20 points)
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers (20 points)
  if (/\d/.test(password)) {
    score += 20;
  } else {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters (20 points)
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
  } else {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'fair';
  } else if (score < 80) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    valid: errors.length === 0,
    strength,
    errors,
    score,
  };
}

/**
 * Checks if password has been compromised in known breaches
 * (This is a placeholder - in production, use Have I Been Pwned API)
 */
export async function checkPasswordCompromised(password: string): Promise<boolean> {
  // Placeholder implementation
  // In production, call https://api.pwnedpasswords.com/range/
  return false;
}

/**
 * Validates password change requirements
 */
export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): PasswordValidationResult & { currentPasswordError?: string } {
  const result = validatePasswordStrength(newPassword);

  if (newPassword !== confirmPassword) {
    result.errors.push('Passwords do not match');
  }

  if (currentPassword === newPassword) {
    result.errors.push('New password must be different from current password');
  }

  return {
    ...result,
    valid: result.errors.length === 0,
  };
}
