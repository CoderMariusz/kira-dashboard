// hooks/home/errors.ts
// Wspólne komunikaty błędów HTTP dla hooków modułu home

export const HOME_ERROR_MESSAGES: Record<number, string> = {
  400: 'Sprawdź poprawność wypełnionych pól',
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Element nie został znaleziony',
  500: 'Wystąpił błąd serwera — spróbuj ponownie za chwilę',
}

export function getErrorMessage(statusCode: number): string {
  return HOME_ERROR_MESSAGES[statusCode] ?? 'Wystąpił nieoczekiwany błąd'
}
