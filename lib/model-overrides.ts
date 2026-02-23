// lib/model-overrides.ts
// Stub — runtime cost overrides singleton.
// This file is intentionally minimal. STORY-5.2 will implement the full PATCH endpoint
// and populate this map with database-persisted overrides.
//
// Shape: canonical_key → partial cost override
// Example: 'kimi-k2.5' → { input: 0.5, output: 1.0 }

export const modelOverrides: Map<string, { input?: number; output?: number }> = new Map()
