---
story_id: STORY-3.6
title: "Strona /login — formularz logowania z redirectem per rola"
epic: EPIC-3
module: auth
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: epics/kira-dashboard-mockup-v3.html
api_reference: none
priority: must
estimated_effort: 4h
depends_on: STORY-3.2, STORY-3.5
blocks: STORY-3.7
tags: [form, validation, auth, dark-theme, login, supabase-auth, redirect, rbac]
---

## 🎯 User Story

**Jako** użytkownik rodziny Krawczyków (Mariusz, Angelika, Zuza lub Iza)
**Chcę** zalogować się do Kira Dashboard przez stronę `/login` wpisując email i hasło
**Żeby** po zalogowaniu automatycznie trafić do widoku odpowiedniego dla mojej roli — Mariusz do dashboardu, Angelika do home, Zuza/Iza do zadań

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/login`
Plik: `src/app/login/page.tsx`

To jest strona publiczna — dostępna bez aktywnej sesji. Middleware (STORY-3.3) powinien przekierować niezalogowanego usera na `/login` z każdej chronionej strony. Strona `/login` powinna z kolei przekierować **zalogowanego** usera z powrotem do jego widoku (jeśli ktoś wejdzie na `/login` mając aktywną sesję).

### Powiązane pliki
- `src/lib/supabase/client.ts` — `createClient()` — do wywołania `supabase.auth.signInWithPassword()` i `supabase.auth.resetPasswordForEmail()`
- `src/contexts/RoleContext.tsx` — `useUser()` — do odczytu roli po zalogowaniu i redirect logic
- `src/types/auth.types.ts` — typ `Role` — do type-safe switch na roli przy redirect

### Architektura pliku

Plik `src/app/login/page.tsx` ma być `'use client'` (Client Component). NIE używaj Server Component dla tej strony — wymaga useState i event handlerów.

### Design system

Projekt używa **Tailwind CSS** + **shadcn/ui**. Jednak strona login używa **własnych inline-styles / custom Tailwind klas** zgodnych z dark theme (NIE domyślnych shadcn stylów, które są jasne).

Kolory dark theme z mockupu:
- Background strony: `#13111c`
- Karta logowania: `#1a1730`
- Border karty: gradient lub `#3b3d7a`
- Przycisk główny: gradient `linear-gradient(135deg, #7c3aed, #3b82f6)`
- Tekst główny: `#e6edf3`
- Tekst pomocniczy/label: `#6b7280`
- Input background: `#13111c`
- Input border: `#2a2540`
- Input border focus: `#7c3aed`
- Error tekst: `#f87171` (red-400)

### Stan systemu przed tą story
- **STORY-3.2 DONE**: Supabase Auth skonfigurowany; `createClient()` działa
- **STORY-3.5 DONE**: `useUser()` hook dostępny; `RoleProvider` opakowuje aplikację
- Routes `/dashboard`, `/home`, `/home/tasks` istnieją (EPIC-1/2) lub są zaplanowane

---

## ✅ Acceptance Criteria

### AC-1: Strona /login renderuje formularz dark theme
GIVEN: Użytkownik niezalogowany wchodzi na `http://localhost:3000/login`
WHEN: Strona się załaduje
THEN: Na stronie widoczna jest karta logowania z:
  - Logo/emoji (🌟) i tekst "System Kira" na górze karty
  - Input email z placeholder `twoj@email.pl`
  - Input password z placeholder `••••••••` (type="password")
  - Przycisk "Zaloguj się" (fioletowy gradient)
  - Link "Zapomniałeś hasła?"
  - Tło strony w kolorze `#13111c` (ciemny fiolet)
  - Karta na środku ekranu z tłem `#1a1730` i border gradient

### AC-2: Walidacja client-side — email
GIVEN: Strona /login jest załadowana, pole email jest puste lub nieprawidłowe
WHEN: Użytkownik klika "Zaloguj się" bez wypełnienia emaila
THEN: Pod polem email pojawia się komunikat błędu: `"Podaj adres email"`
AND: Formularz NIE jest wysyłany do Supabase

WHEN: Użytkownik wpisuje `niemail` (brak @) i klika "Zaloguj się"
THEN: Pod polem email pojawia się: `"Nieprawidłowy format adresu email"`

### AC-3: Walidacja client-side — hasło
GIVEN: Email wpisany poprawnie
WHEN: Użytkownik wpisuje hasło krótsze niż 8 znaków i klika "Zaloguj się"
THEN: Pod polem password pojawia się: `"Hasło musi mieć co najmniej 8 znaków"`
AND: Formularz NIE jest wysyłany do Supabase

### AC-4: Loading state podczas logowania
GIVEN: Poprawny email i hasło wpisane (formularz przeszedł walidację)
WHEN: Użytkownik klika "Zaloguj się" — request do Supabase jest w toku
THEN: W przycisku pojawia się spinner (animowany loader) zamiast tekstu "Zaloguj się"
AND: Przycisk jest `disabled` (niemożliwy do ponownego kliknięcia)
AND: Oba inputy (email i password) są `disabled`
AND: Link "Zapomniałeś hasła?" jest nadal klikalny

### AC-5: Sukces logowania — redirect per rola
GIVEN: Użytkownik wpisał poprawny email i hasło
AND: Supabase zwrócił sesję bez błędu
WHEN: Odpowiedź z Supabase Auth jest pomyślna
THEN: System pobiera rolę zalogowanego usera z `user_roles` (przez `useUser()` lub bezpośrednie query)
AND: Jeśli rola = `ADMIN` → redirect na `/dashboard`
AND: Jeśli rola = `HELPER_PLUS` → redirect na `/home`
AND: Jeśli rola = `HELPER` → redirect na `/home/tasks`
AND: Jeśli rola nie jest rozpoznana (null) → redirect na `/home` (fallback bezpieczny)

### AC-6: Obsługa błędu logowania z Supabase
GIVEN: Użytkownik wpisał nieprawidłowe hasło lub nieistniejący email
WHEN: Supabase zwraca błąd `Invalid login credentials`
THEN: Pod formularzem (lub nad przyciskiem) pojawia się komunikat: `"Nieprawidłowy email lub hasło"`
AND: Formularz jest odblokowany (inputy active, przycisk bez spinnera)
AND: Oba pola NIE są czyszczone (użytkownik może poprawić email bez wpisywania od nowa)

### AC-7: Redirect dla zalogowanego usera wchodzącego na /login
GIVEN: Użytkownik jest już zalogowany (aktywna sesja Supabase)
WHEN: Wchodzi bezpośrednio na `/login`
THEN: Strona automatycznie przekierowuje go do odpowiedniego widoku per rola (jak w AC-5)
AND: Formularz logowania NIE jest widoczny

### AC-8: Reset hasła — podstawowy flow
GIVEN: Użytkownik kliknął link "Zapomniałeś hasła?"
AND: Wprowadza swój email w polu email (lub otwiera modal/drugą stronę — patrz sekcja szczegółów)
WHEN: Potwierdza wysłanie linku
THEN: System wywołuje `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' })`
AND: Wyświetla komunikat: `"Sprawdź skrzynkę email — wysłaliśmy link do resetowania hasła"`
AND: Formularz logowania pozostaje widoczny (użytkownik może wrócić do logowania)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/login`
Komponent: `LoginPage`
Plik: `src/app/login/page.tsx`

### Struktura JSX i style

```
<body style="background: #13111c; min-height: 100vh; display: flex; align-items: center; justify-content: center">
  <div class="login-card"> // max-w-md, background: #1a1730, border, border-radius: 14px
    <!-- Nagłówek karty -->
    <div class="card-header"> // padding: 24px 24px 0
      <div class="logo"> // 🌟 emoji duże (48px)
      <h1>"System Kira"  // font-size: 24px, font-weight: 800
      <p class="subtitle"> // "Zaloguj się do swojego konta", color: #6b7280
    </div>
    
    <!-- Formularz -->
    <form class="card-body"> // padding: 24px
      <!-- Email field -->
      <div class="field-group">
        <label for="email">"Email"</label>
        <input type="email" id="email" placeholder="twoj@email.pl" />
        {emailError && <p class="field-error">{emailError}</p>}
      </div>
      
      <!-- Password field -->
      <div class="field-group">
        <div class="field-label-row">
          <label for="password">"Hasło"</label>
          <button type="button" onClick={handleForgotPassword}>"Zapomniałeś hasła?"</button>
        </div>
        <input type="password" id="password" placeholder="••••••••" />
        {passwordError && <p class="field-error">{passwordError}</p>}
      </div>
      
      <!-- Error globalny -->
      {formError && <div class="form-error-banner">{formError}</div>}
      
      <!-- Submit -->
      <button type="submit" disabled={isLoading}>
        {isLoading ? <Spinner /> : "Zaloguj się"}
      </button>
    </form>
    
    <!-- Success message (reset hasła) -->
    {resetMessage && <div class="success-banner">{resetMessage}</div>}
  </div>
</body>
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| LoginPage | Page | — | idle, loading, error, redirect |
| EmailInput | Input | value, onChange, disabled, error | focused, error, disabled |
| PasswordInput | Input | value, onChange, disabled, error | focused, error, disabled, show/hide |
| SubmitButton | Button | disabled, isLoading | idle, loading |
| FieldError | p.text | message: string | — |
| FormErrorBanner | div | message: string | — |

### Pola formularza

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| email | email | niepuste + zawiera "@" + "." po "@" | "Podaj adres email" / "Nieprawidłowy format adresu email" | tak |
| password | password | min 8 znaków, niepuste | "Podaj hasło" / "Hasło musi mieć co najmniej 8 znaków" | tak |

### Stany widoku

**Loading (podczas weryfikacji sesji przy starcie strony):**
Przy pierwszym montowaniu, zanim `useUser()` zakończy `isLoading`, strona renderuje puste tło `#13111c` lub mały spinner centralnie. NIE renderuj formularza dopóki `isLoading === true` — unikasz flash formularza dla już zalogowanych.

**Empty / Niezalogowany (normalny stan):**
Karta logowania z formularzem. Email i password puste. Przycisk aktywny.

**Loading (submit w toku):**
Przycisk pokazuje spinner (np. `<svg class="animate-spin">...</svg>` lub `loading...`). Inputy disabled. Link "Zapomniałeś hasła?" klikalny.

**Error (błąd Supabase):**
Czerwony banner pod formularzem: "Nieprawidłowy email lub hasło". Formularz odblokowany.

**Zalogowany (po sukcesie lub sesja aktywna):**
Natychmiastowy redirect — formularz nigdy nie jest widoczny. Pokazuj tylko loading.

### Flow interakcji krok po kroku

```
1. Użytkownik wchodzi na /login

2. Strona montuje się:
   → isLoading = true (stan useUser() z RoleProvider)
   → renderuj: loading state (puste tło lub centralny spinner)

3. RoleProvider zakończył ładowanie:
   a) user != null (zalogowany) → router.replace(getRedirectPath(role)) → koniec
   b) user === null (niezalogowany) → renderuj formularz logowania

4. Użytkownik wypełnia email i password

5. Użytkownik klika "Zaloguj się":
   → validateForm() → jeśli błędy → wyświetl błędy przy polach → STOP
   → setIsSubmitting(true) → przycisk spinner, inputy disabled

6. Wywołanie Supabase:
   → const { error } = await supabase.auth.signInWithPassword({ email, password })
   
   a) error === null (sukces):
      → RoleProvider wykryje SIGNED_IN przez onAuthStateChange
      → useUser() zaktualizuje role
      → W loginPage: poczekaj na role != null LUB użyj osobnego query do user_roles
      → router.replace(getRedirectPath(role))
   
   b) error != null:
      → setFormError("Nieprawidłowy email lub hasło")
      → setIsSubmitting(false)
      → inputy odblokowują się
      → NIE czyść pól

7. Użytkownik klika "Zapomniałeś hasła?":
   → jeśli email wpisany: użyj jego wartości
   → jeśli email pusty: pokaż błąd "Podaj adres email aby zresetować hasło"
   → wywołaj: supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
   → sukces: setResetMessage("Sprawdź skrzynkę email — wysłaliśmy link do resetowania hasła")
   → błąd: setFormError("Nie udało się wysłać emaila. Sprawdź adres i spróbuj ponownie.")
```

### Funkcja pomocnicza getRedirectPath

```typescript
// Definiuj w tym samym pliku lub w src/lib/auth/redirect.ts
function getRedirectPath(role: Role | null): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'HELPER_PLUS':
      return '/home';
    case 'HELPER':
      return '/home/tasks';
    default:
      return '/home'; // fallback dla null lub nieznanych ról
  }
}
```

### Implementacja redirect po zalogowaniu

Po pomyślnym `signInWithPassword`:
- Opcja A (prosta): Po sukcesie bezpośrednio query `user_roles` dla zalogowanego usera:
  ```typescript
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supabaseUser.id)
    .single()
  const redirectTo = getRedirectPath(roleData?.role as Role)
  router.replace(redirectTo)
  ```
- Opcja B (przez context): Czekaj aż `useUser().role` zmieni się z null na wartość (przez onAuthStateChange w RoleProvider). Używaj `useEffect(() => { if (user && role && !isLoading) router.replace(getRedirectPath(role)) }, [user, role, isLoading])`.
- **Zalecana Opcja A** — prostszy flow, mniej race conditions.

### Kompletna implementacja `src/app/login/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/RoleContext';
import type { Role } from '@/types/auth.types';

function getRedirectPath(role: Role | null): string {
  switch (role) {
    case 'ADMIN': return '/dashboard';
    case 'HELPER_PLUS': return '/home';
    case 'HELPER': return '/home/tasks';
    default: return '/home';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, role, isLoading: sessionLoading } = useUser();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect jeśli już zalogowany
  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(getRedirectPath(role));
    }
  }, [sessionLoading, user, role, router]);

  function validateForm(): boolean {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setFormError('');
    
    if (!email) {
      setEmailError('Podaj adres email');
      valid = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Nieprawidłowy format adresu email');
      valid = false;
    }
    
    if (!password) {
      setPasswordError('Podaj hasło');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Hasło musi mieć co najmniej 8 znaków');
      valid = false;
    }
    
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setFormError('Nieprawidłowy email lub hasło');
      setIsSubmitting(false);
      return;
    }
    
    // Pobierz rolę bezpośrednio po zalogowaniu
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();
    
    router.replace(getRedirectPath(roleData?.role as Role ?? null));
  }

  async function handleForgotPassword() {
    if (!email) {
      setEmailError('Podaj adres email aby zresetować hasło');
      return;
    }
    setResetMessage('');
    setFormError('');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setFormError('Nie udało się wysłać emaila. Sprawdź adres i spróbuj ponownie.');
    } else {
      setResetMessage('Sprawdź skrzynkę email — wysłaliśmy link do resetowania hasła');
    }
  }

  // Loading state — sesja sprawdzana
  if (sessionLoading) {
    return (
      <div style={{ background: '#13111c', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Ładowanie...</div>
      </div>
    );
  }

  // User już zalogowany — redirect w toku (useEffect wywoła router.replace)
  if (user) {
    return (
      <div style={{ background: '#13111c', minHeight: '100vh' }} />
    );
  }

  return (
    <div style={{
      background: '#13111c',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#1a1730',
        border: '1px solid #3b3d7a',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Nagłówek */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌟</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e6edf3', margin: 0 }}>
            System Kira
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>
            Zaloguj się do swojego konta
          </p>
        </div>

        {/* Formularz */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '13px', color: '#e6edf3', marginBottom: '6px', fontWeight: 500 }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="twoj@email.pl"
              disabled={isSubmitting}
              autoComplete="email"
              style={{
                width: '100%',
                background: '#13111c',
                border: `1px solid ${emailError ? '#f87171' : '#2a2540'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e6edf3',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              aria-label="Adres email"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>
                {emailError}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="password" style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500 }}>
                Hasło
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{ fontSize: '12px', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label="Zresetuj hasło"
              >
                Zapomniałeś hasła?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              placeholder="••••••••"
              disabled={isSubmitting}
              autoComplete="current-password"
              style={{
                width: '100%',
                background: '#13111c',
                border: `1px solid ${passwordError ? '#f87171' : '#2a2540'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e6edf3',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              aria-label="Hasło"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            {passwordError && (
              <p id="password-error" style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>
                {passwordError}
              </p>
            )}
          </div>

          {/* Error globalny */}
          {formError && (
            <div style={{
              background: '#3a1a1a',
              border: '1px solid #7f1d1d',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '16px',
            }} role="alert">
              {formError}
            </div>
          )}

          {/* Reset success */}
          {resetMessage && (
            <div style={{
              background: '#1a3a1a',
              border: '1px solid #2a5a2a',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#4ade80',
              fontSize: '13px',
              marginBottom: '16px',
            }} role="status">
              {resetMessage}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '11px',
              background: isSubmitting ? '#4b3a7a' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isSubmitting ? 'none' : '0 2px 10px rgba(124,58,237,0.35)',
            }}
            aria-label={isSubmitting ? 'Logowanie w toku' : 'Zaloguj się'}
          >
            {isSubmitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
                Logowanie...
              </>
            ) : (
              'Zaloguj się'
            )}
          </button>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
}
```

### Responsive / Dostępność
- Mobile (375px+): Karta ma `width: 100%` z `max-width: 420px` i padding `16px` na brzegach — nie wychodzi poza ekran. Przyciski full-width. Brak horizontal scroll.
- Tablet (768px+): Bez zmian — karta wycentrowana, ta sama szerokość.
- Desktop (1280px+): Karta wycentrowana na ciemnym tle. Ta sama szerokość `420px`.
- Keyboard navigation:
  - Tab: email → password → "Zapomniałeś hasła?" → submit button
  - Enter w polu email: fokus przechodzi do password
  - Enter w polu password: submit formularza
  - Escape: brak akcji (nie ma modalów do zamknięcia)
- ARIA:
  - `aria-label` na inputach: `"Adres email"`, `"Hasło"`
  - `aria-invalid={true}` gdy pole ma błąd
  - `aria-describedby` łączy pole z komunikatem błędu
  - `role="alert"` na errorze globalnym (czytniki ekranowe ogłoszą błąd)
  - `role="status"` na komunikacie sukcesu resetu hasła

---

## ⚠️ Edge Cases

### EC-1: Supabase nie odpowiada (timeout sieci)
Scenariusz: `supabase.auth.signInWithPassword()` rzuca wyjątek sieciowy lub trwa >10 sekund
Oczekiwane zachowanie: Wrapper try/catch łapie wyjątek. `setFormError("Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.")`. Spinner znika, formularz odblokowany.
Implementacja: Oprócz sprawdzenia `error` z Supabase, owijaj cały blok async w `try/catch`:
```typescript
try {
  const { error } = await supabase.auth.signInWithPassword(...)
  ...
} catch (networkError) {
  setFormError("Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
} finally {
  setIsSubmitting(false);
}
```

### EC-2: User zalogowany ale bez roli w user_roles (roleData === null)
Scenariusz: Zalogowano pomyślnie, ale query `user_roles` zwraca null (bug lub migracja)
Oczekiwane zachowanie: `getRedirectPath(null)` zwraca `/home` (fallback). User trafia na `/home` zamiast crashować. NIE pokazuj błędu — to edge case który powinien być wyłapany przez middleware.

### EC-3: Szybkie double-click na "Zaloguj się"
Scenariusz: User klika przycisk 2 razy szybko
Oczekiwane zachowanie: Po pierwszym kliknięciu `isSubmitting = true` i przycisk ma `disabled={true}`. Drugi klik jest ignorowany przez browser. Tylko jeden request do Supabase.

### EC-4: Wpisanie emaila z whitespace (spacja przed/po)
Scenariusz: User wpisuje ` mariusz@rodzina.pl ` z spacją
Oczekiwane zachowanie: Przed wysłaniem do Supabase przytnij: `email.trim()`. Walidacja format też powinna działać na `email.trim()`.

### EC-5: Przeglądarka auto-uzupełnia email i hasło
Scenariusz: Browser (Chrome/Safari) auto-fills pola formularza przy załadowaniu
Oczekiwane zachowanie: Formularza używa `autoComplete="email"` i `autoComplete="current-password"` — przeglądarka poprawnie uzupełnia pola. `value` i `onChange` są controlled inputs — React synchronizuje się z wartością.

### EC-6: Kliknięcie "Zapomniałeś hasła?" z pustym polem email
Scenariusz: Email nie jest wpisany
Oczekiwane zachowanie: Ustawia `emailError = "Podaj adres email aby zresetować hasło"`. Fokus przenosi się na pole email (opcjonalnie). NIE wywołuje Supabase resetPasswordForEmail.

---

## 🚫 Out of Scope tej Story
- Magic link / OTP logowanie (tylko email + password)
- Google / GitHub OAuth
- Strona `/login/reset-password` do ustawienia nowego hasła (po kliknięciu linku w emailu) — osobna story
- Formularz rejestracji — brak self-registration (tylko invite przez ADMIN)
- Animacje przejścia między stanami (skeleton loader, fade-in)
- "Zapamiętaj mnie" checkbox
- Show/hide password toggle button

---

## ✔️ Definition of Done
- [ ] Strona `/login` renderuje formularz dark theme (bg #13111c, karta #1a1730, przycisk fioletowy)
- [ ] Logo 🌟 i "System Kira" widoczne na górze karty
- [ ] Walidacja email: "Podaj adres email" gdy puste, "Nieprawidłowy format adresu email" gdy brak @
- [ ] Walidacja password: "Podaj hasło" gdy puste, "Hasło musi mieć co najmniej 8 znaków" gdy < 8 znaków
- [ ] Spinner w przycisku podczas isSubmitting, inputy disabled
- [ ] Po sukcesie: redirect ADMIN→/dashboard, HELPER_PLUS→/home, HELPER→/home/tasks
- [ ] Błąd Supabase pokazuje "Nieprawidłowy email lub hasło" — formularz odblokowany
- [ ] Zalogowany user przekierowany automatycznie (nie widzi formularza)
- [ ] Link "Zapomniałeś hasła?" wywołuje resetPasswordForEmail z odpowiednim komunikatem
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading sesji, formularz, loading submit, error)
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] `aria-invalid`, `aria-describedby`, `role="alert"` poprawnie użyte
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Kod przechodzi linter bez błędów (`next lint`)
- [ ] Story review przez PO
