/**
 * Custom hook for form validation
 * Provides reusable validation logic
 */

import { useState, useCallback } from 'react';

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

interface UseFormValidationOptions {
  rules: ValidationRule[];
}

/**
 * Hook for managing form validation state and logic
 */
export function useFormValidation({ rules }: UseFormValidationOptions) {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (value: string): boolean => {
      for (const rule of rules) {
        if (!rule.validate(value)) {
          setError(rule.message);
          return false;
        }
      }
      setError(null);
      return true;
    },
    [rules]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    validate,
    clearError,
    hasError: !!error,
  };
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value: string) => value.trim().length > 0,
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value: string) => value.trim().length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value: string) => value.trim().length <= max,
    message: message || `Maximum ${max} characters allowed`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => regex.test(value),
    message,
  }),
};
