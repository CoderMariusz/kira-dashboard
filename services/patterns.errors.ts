// services/patterns.errors.ts
// STORY-8.3 — Polish error messages for Patterns API

export const PATTERN_ERROR_MESSAGES: Record<number, string> = {
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Zasób nie został znaleziony',
  500: 'Błąd serwera — spróbuj ponownie za chwilę',
}

// Network error (fetch threw — server unreachable)
export const NETWORK_ERROR_MESSAGE =
  'Nie można połączyć się z serwerem — sprawdź połączenie'
