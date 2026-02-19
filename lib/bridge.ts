// lib/bridge.ts
// Klient HTTP do Bridge API.
// JEDYNE miejsce w projekcie które wie o Bridge API URL.
// Wszystkie hooki i server components importują stąd fetchBridge().

/**
 * Bazowy URL Bridge API.
 * - Server-side (SSR/RSC): bezpośrednio do Bridge przez BRIDGE_URL env
 * - Client-side (browser): przez Next.js proxy /api/bridge (brak CORS problemu)
 */
const BRIDGE_URL: string =
  typeof window === 'undefined'
    ? (process.env.BRIDGE_URL ?? 'http://localhost:8199')
    : '/api/bridge'

/** Timeout pojedynczego żądania HTTP w milisekundach. */
const REQUEST_TIMEOUT_MS = 5000

/** Liczba automatycznych ponowień po failed request (łącznie: 1 próba + 1 retry). */
const MAX_RETRIES = 1

/**
 * Pomocnicza funkcja — wykonuje pojedyncze żądanie fetch z timeoutem.
 * Rzuca błąd jeśli żądanie trwa dłużej niż REQUEST_TIMEOUT_MS.
 *
 * @param url - Pełny URL do wywołania
 * @returns Promise<Response>
 * @throws Error z komunikatem 'AbortError' jeśli timeout
 * @throws Error z komunikatem sieciowym jeśli fetch się nie powiódł
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Nie cachujemy — Bridge API zwraca live data
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })
    return response
  } finally {
    // Zawsze czyścimy timeout żeby nie wyciekać pamięci
    clearTimeout(timeoutId)
  }
}

/**
 * Główna funkcja do wywołań Bridge API.
 * Obsługuje: timeout 5s, retry 1x, graceful degradation (null zamiast throw).
 *
 * Przykład użycia:
 *   const data = await fetchBridge<ProjectsResponse>('/api/projects')
 *   if (data === null) { // Bridge offline }
 *
 * @param path - Ścieżka API zaczynająca się od '/', np. '/api/projects'
 * @returns Sparsowany obiekt JSON lub null jeśli Bridge offline/timeout/error
 */
export async function fetchBridge<T>(path: string): Promise<T | null> {
  const url = `${BRIDGE_URL}${path}`
  let lastError: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url)

      if (!response.ok) {
        // HTTP error (4xx, 5xx) — nie retry, logujemy i zwracamy null
        console.error(`[Bridge] HTTP ${response.status} for ${path}`)
        return null
      }

      // Parsujemy JSON
      const data = (await response.json()) as T
      return data
    } catch (error) {
      lastError = error
      // Jeśli to nie ostatnia próba, logujemy i próbujemy ponownie
      if (attempt < MAX_RETRIES) {
        console.warn(`[Bridge] attempt ${attempt + 1} failed for ${path}, retrying...`)
        continue
      }
    }
  }

  // Wszystkie próby się nie powiodły — logujemy i zwracamy null (NIE rzucamy!)
  console.warn(`[Bridge] offline: ${path}`)
  if (lastError instanceof Error && lastError.name !== 'AbortError') {
    // Nie logujemy AbortError (to normalny timeout) — logujemy tylko nieoczekiwane błędy
    console.error('[Bridge] last error:', lastError.message)
  }
  return null
}

/**
 * Sprawdza czy Bridge API jest dostępne (ping endpoint /api/projects).
 * Zwraca true jeśli Bridge odpowiedział poprawnie, false w każdym innym przypadku.
 *
 * Przykład użycia:
 *   const online = await isBridgeOnline()
 *   if (!online) { showOfflineBanner() }
 */
export async function isBridgeOnline(): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BRIDGE_URL}/api/projects`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Eksportujemy BRIDGE_URL żeby komponenty mogły go wyświetlić (np. w System Health).
 * Nie używaj tej wartości do bezpośrednich fetch — używaj fetchBridge().
 */
export { BRIDGE_URL }
