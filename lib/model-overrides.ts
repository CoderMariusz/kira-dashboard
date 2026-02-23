// lib/model-overrides.ts
// In-memory store dla runtime overrides kosztów modeli.
// UWAGA: Jest resetowany przy każdym restarcie serwera Next.js.
// Wartości domyślne: brak wpisów (= używaj MODEL_COSTS z config/model-costs.ts)

export interface ModelCostOverride {
  cost_input_per_1m: number
  cost_output_per_1m: number
}

// Singleton — jeden obiekt na cały proces Node.js
const store = new Map<string, ModelCostOverride>()
export const modelOverrides = store
