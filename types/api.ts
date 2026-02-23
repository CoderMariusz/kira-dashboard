// types/api.ts
// Shared API response types used across all route handlers and hooks.
// RULE: Define ApiResponse<T> here FIRST — hooks and routes must share these types.

/**
 * Generic API success response wrapper.
 * All endpoints that return lists MUST use this shape: { data: T[] }
 * Hooks expect this format — do NOT return bare arrays.
 */
export interface ApiResponse<T> {
  data: T[]
}

/**
 * Generic API error response.
 * Returned by all endpoints on error.
 */
export interface ApiErrorResponse {
  error: string
}
