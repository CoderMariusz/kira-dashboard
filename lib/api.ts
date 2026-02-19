// lib/api.ts
// HTTP client dla wewnętrznych Next.js API routes (write operations).
// Eksportuje apiFetch() do wywołań POST/PATCH/DELETE przez hooki.

/**
 * Mapowanie kodów HTTP na czytelne komunikaty błędów po polsku.
 * Używane przez useStoryActions do formatowania błędów.
 */
export const SSE_ERROR_MESSAGES: Record<number, string> = {
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Story nie została znaleziona',
  409: 'Story jest już w tym statusie',
  422: 'Nieprawidłowa zmiana stanu story — sprawdź aktualny status',
  500: 'Błąd serwera — spróbuj ponownie za chwilę',
}

/**
 * Klient HTTP dla wewnętrznych Next.js API routes.
 * Rzuca Error z czytelnym komunikatem przy HTTP error lub błędzie sieciowym.
 *
 * @param path  - Ścieżka API np. '/api/stories/STORY-1.3/start'
 * @param options - Opcjonalne opcje fetch (method, headers, body, itp.)
 * @returns Promise<Response> — odpowiedź gdy response.ok === true
 * @throws Error z komunikatem `HTTP {status}: {message}` gdy !response.ok
 * @throws Error z komunikatem sieciowym gdy fetch się nie powiódł
 *
 * @example
 *   await apiFetch('/api/stories/STORY-1.3/start', {
 *     method: 'POST',
 *     body: JSON.stringify({}),
 *   })
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = SSE_ERROR_MESSAGES[response.status] ?? 'Nieznany błąd'
    throw new Error(`HTTP ${response.status}: ${message}`)
  }

  return response
}
