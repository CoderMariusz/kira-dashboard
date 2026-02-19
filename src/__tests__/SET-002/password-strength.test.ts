/**
 * Test: SET-002 - Password Strength Validation
 * Tests password strength validation requirements
 */

import {
  validatePasswordStrength,
  validatePasswordChange,
  type PasswordValidationResult,
} from '@/lib/utils/password-validation';

describe('SET-002: Password Strength Validation', () => {
  describe('validatePasswordStrength', () => {
    test('should reject password that is too short', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
      expect(result.strength).toBe('weak');
    });

    test('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('verylongpassword123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });

    test('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('VERYLONGPASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });

    test('should reject password without number', () => {
      const result = validatePasswordStrength('VeryLongPassword!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should reject password without special character', () => {
      const result = validatePasswordStrength('VeryLongPassword123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      );
    });

    test('should accept strong password', () => {
      const result = validatePasswordStrength('MyStr0ngP@ssw0rd');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
      expect(result.score).toBe(100);
    });

    test('should accept good password', () => {
      const result = validatePasswordStrength('GoodPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('good');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    test('should return score progression', () => {
      const weak = validatePasswordStrength('Weak1!');
      const fair = validatePasswordStrength('FairPass1!');
      const good = validatePasswordStrength('GoodPass123!');
      const strong = validatePasswordStrength('MyStr0ngP@ssw0rd!');

      expect(weak.score).toBeLessThan(fair.score);
      expect(fair.score).toBeLessThan(good.score);
      expect(good.score).toBeLessThan(strong.score);
    });

    test('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];
      specialChars.forEach((char) => {
        const password = `VeryLongPass123${char}`;
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
      });
    });

    test('should handle very long password', () => {
      const longPassword = 'A'.repeat(100) + 'b1!';
      const result = validatePasswordStrength(longPassword);
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
    });
  });

  describe('validatePasswordChange', () => {
    test('should reject if passwords do not match', () => {
      const result = validatePasswordChange(
        'CurrentPass123!',
        'NewPass123!@',
        'DifferentPass123!'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Passwords do not match');
    });

    test('should reject if new password equals current password', () => {
      const password = 'SamePassword123!';
      const result = validatePasswordChange(password, password, password);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'New password must be different from current password'
      );
    });

    test('should validate new password strength', () => {
      const result = validatePasswordChange(
        'CurrentPass123!',
        'Weak1!',
        'Weak1!'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 12 characters long'
      );
    });

    test('should accept valid password change', () => {
      const result = validatePasswordChange(
        'OldPassword123!',
        'NewPassword456@',
        'NewPassword456@'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
    });

    test('should handle null-like inputs gracefully', () => {
      expect(() => validatePasswordStrength('')).not.toThrow();
    });

    test('should accept password with multiple special characters', () => {
      const result = validatePasswordStrength('Pass!@#$%123word');
      expect(result.valid).toBe(true);
    });

    test('should accept password with numbers scattered throughout', () => {
      const result = validatePasswordStrength('P1a2s3s4w5o6r7d!');
      expect(result.valid).toBe(true);
    });
  });
});
