---
story_id: STORY-12.3
title: "Supabase Realtime — subscribe do zmian tabel, push do SSE klientów"
epic: EPIC-12
module: sync
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: /api/events (SSE endpoint)
priority: must
estimated_effort: 6h
depends_on: [STORY-12.1, STORY-2.1]
blocks: [STORY-12.5]
tags: [realtime, supabase, sse, websocket, postgres_changes, backend]
---

## 🎯 User Story

**Jako** Angelika (home_plus) używająca KiraBoard na telefonie
**Chcę** żeby lista zakupów aktualizowała się automatycznie gdy ktoś doda lub zaznaczy pozycję
**Żeby** nie musieć ręcznie odświeżać strony i widzieć zmiany w czasie rzeczywistym (≤ 10 sekund)

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Serwer: `server.cjs` — inicjalizacja Supabase Realtime channel
- SSE endpoint: `GET /api/events` (STORY-2.1 — już istnieje)
- Supabase tabele: `kb_shopping_items`, `kb_tasks` (obserwowane)
- Frontend: reaguje na SSE events (STORY-12.5)

### Powiązane pliki
- `server.cjs` — główny serwer, tu inicjujemy channel subscription
- `lib/supabase.js` — klient Supabase z kluczem service_role
- SSE manager (STORY-2.1): `clients` Map lub Set z aktywnymi połączeniami SSE

### Stan systemu przed tą story
- Supabase tabele kb_* istnieją z RLS (STORY-12.1)
- SSE endpoint `/api/events` istnieje i obsługuje klientów (STORY-2.1)
- `@supabase/supabase-js` v2 zainstalowany (obsługuje Realtime)
- Klient Supabase z service_role key skonfigurowany

---

## ✅ Acceptance Criteria

### AC-1: Supabase Realtime channel uruchomiony przy starcie serwera
GIVEN: Serwer `server.cjs` startuje
WHEN: Inicjalizacja serwera jest kompletna
THEN: Supabase Realtime channel jest subskrybowany dla tabel: `kb_shopping_items`, `kb_tasks`
AND: Subscription używa `postgres_changes` event dla operacji `INSERT`, `UPDATE`, `DELETE`
AND: Log `console.log('[Realtime] Subscribed to kb_shopping_items, kb_tasks')` jest widoczny

### AC-2: Zmiana w kb_shopping_items → push do SSE klientów
GIVEN: Co najmniej jeden klient jest podłączony do SSE (`/api/events`)
AND: Supabase Realtime subscription jest aktywna
WHEN: Rekord w tabeli `kb_shopping_items` zostaje INSERT/UPDATE/DELETE (przez sync engine lub bezpośrednio)
THEN: Serwer otrzymuje zdarzenie `postgres_changes` od Supabase w ciągu ≤ 3 sekund
AND: Serwer pushuje do WSZYSTKICH aktywnych SSE klientów event:
```
event: shopping_update
data: {"table":"kb_shopping_items","eventType":"INSERT|UPDATE|DELETE","record":{...},"oldRecord":{...}}
```

### AC-3: Zmiana w kb_tasks → push do SSE klientów
GIVEN: Klient jest podłączony do SSE
WHEN: Rekord w `kb_tasks` zostaje zmieniony
THEN: SSE event `task_update` jest wysłany do wszystkich klientów z analogiczną strukturą jak shopping_update
AND: `oldRecord` zawiera poprzedni stan rekordu (dostępny dla UPDATE i DELETE)

### AC-4: Auto-reconnect gdy Realtime connection dropnie
GIVEN: Supabase Realtime WebSocket zostaje rozłączony (timeout, restart)
WHEN: Serwer wykrywa `CHANNEL_ERROR` lub `TIMED_OUT` status
THEN: Serwer próbuje ponownie subskrybować po 5 sekundach (retry z backoffem: 5s, 10s, 30s)
AND: `console.warn('[Realtime] Connection lost, reconnecting...')` jest logowany
AND: SSE klienci nie otrzymują błędu — po reconnect normalnie zaczyna działać

### AC-5: Obsługa braku SSE klientów
GIVEN: Żaden klient nie jest podłączony do SSE
WHEN: Supabase Realtime emituje zdarzenie
THEN: Serwer odbiera zdarzenie ale nic nie wysyła (brak klientów do powiadomienia)
AND: Brak błędów w logach — graceful no-op

### AC-6: Realtime event zawiera pełne dane rekordu
GIVEN: Supabase Realtime subscription jest skonfigurowana z `{ return: 'representation' }`
WHEN: UPDATE na `kb_shopping_items`
THEN: Payload zawiera zarówno `record` (nowy stan) jak i `old_record` (poprzedni stan)
AND: Dane są wystarczające do aktualizacji UI bez dodatkowego fetch

---

## ⚙️ Szczegóły Backend

### Endpoint(y)
Brak nowego endpointu — używamy istniejącego SSE `/api/events` (STORY-2.1).
Nowy kod: inicjalizacja Supabase Realtime channel w `server.cjs`.

### Logika biznesowa (krok po kroku)

```
RealtimeSetup (wywołane przy starcie serwera):
1. Utwórz Supabase client z service_role key (server-side)
2. Utwórz channel: supabase.channel('kiraboard-realtime')
3. Dodaj listenery postgres_changes:
   - schema: 'public', table: 'kb_shopping_items', events: '*'
   - schema: 'public', table: 'kb_tasks', events: '*'
   - Opcje: { return: 'representation' } — full payload
4. .subscribe((status) => {
     if status === 'SUBSCRIBED' → log sukces
     if status === 'CHANNEL_ERROR' → scheduleReconnect(5000)
     if status === 'TIMED_OUT' → scheduleReconnect(5000)
   })

OnRealtimeEvent(payload):
1. Określ event type: payload.eventType ('INSERT'|'UPDATE'|'DELETE')
2. Określ table name: payload.table
3. Zbuduj SSE message:
   { table, eventType, record: payload.new, oldRecord: payload.old }
4. Pobierz aktywnych klientów SSE z SSE manager (clients Set/Map z STORY-2.1)
5. Dla każdego klienta: klient.write(`event: ${table}_update\ndata: ${JSON.stringify(msg)}\n\n`)
6. Log: `[Realtime] Pushed ${eventType} on ${table} to ${clients.size} clients`

scheduleReconnect(delayMs):
1. setTimeout(() => {
     unsubscribe stary channel
     RealtimeSetup()
   }, delayMs)
2. Eksponencjalny backoff: 5s → 10s → 30s → cap 30s
```

### Kody błędów
- Brak nowych endpoint-level błędów
- Błędy Realtime: logowane do console (nie do `kb_sync_log` — to SSE, nie sync)
- Jeśli Supabase Realtime całkowicie niedostępny → serwer działa normalnie (degraded gracefully)

---

## ⚠️ Edge Cases

### EC-1: Supabase Realtime niedostępny przy starcie
Scenariusz: Supabase jest offline gdy serwer startuje — subscription się nie powiedzie
Oczekiwane zachowanie: Serwer startuje normalnie bez Realtime; co 30 sekund próbuje ponownie; log `'[Realtime] Failed to connect, will retry in 30s'`
Komunikat dla użytkownika: Brak (fallback: frontend polling co 30s — istniejące zachowanie)

### EC-2: SSE klient rozłącza się w trakcie push
Scenariusz: Klient zamknął połączenie SSE gdy serwer próbuje wysłać event
Oczekiwane zachowanie: `write()` rzuca błąd → catch → usuń klienta z SSE manager bez crashy serwera
Komunikat dla użytkownika: Brak (klient jest offline — nie zobaczy eventu)

### EC-3: Duże payload (>64KB) od Supabase Realtime
Scenariusz: Rekord z bardzo dużą wartością (np. `kb_settings` z wielkim JSONB)
Oczekiwane zachowanie: Payload jest przesyłany bez truncation (SSE nie ma limitu); jeśli > 1MB → log warning i skip (nie crashuj klientów)
Komunikat dla użytkownika: Brak

### EC-4: 100+ klientów SSE podłączonych jednocześnie
Scenariusz: Wielu użytkowników (Angelika na wielu urządzeniach, Zuza)
Oczekiwane zachowanie: Broadcast do wszystkich klientów w pętli synchronicznej (max ~100 operacji); jeśli operacja na jednym kliencie failuje → usuń go i kontynuuj do następnego
Komunikat dla użytkownika: Brak

### EC-5: Double subscription — restart modułu bez cleanup
Scenariusz: Hot-reload lub crash loop tworzy duplikat channel
Oczekiwane zachowanie: Przy każdej inicjalizacji → `supabase.removeAllChannels()` przed `supabase.channel()` — tylko jeden aktywny channel
Komunikat dla użytkownika: Brak

---

## 🚫 Out of Scope tej Story
- Frontend reagujący na SSE events (STORY-12.5)
- Realtime dla innych tabel (kanban, settings) — rozszerzenie po MVP
- Supabase Realtime dla bridge_stories (read-only fallback — STORY-12.3 backend)
- Filtrowanie eventów per user (wszystkie zdarzenia idą do wszystkich klientów)
- Auth na poziomie SSE (już obsługiwane przez STORY-2.1)

---

## ✔️ Definition of Done
- [ ] Supabase Realtime channel subskrybuje `kb_shopping_items` i `kb_tasks` przy starcie serwera
- [ ] INSERT/UPDATE/DELETE na tych tabelach pushuje SSE event do wszystkich klientów w ≤ 3s
- [ ] Event format: `event: shopping_update\ndata: {...}\n\n` (poprawny SSE format)
- [ ] Auto-reconnect działa po utracie połączenia (test: ręczny restart Supabase)
- [ ] Brak crashy serwera gdy SSE klient jest offline
- [ ] Brak duplikat subscriptions po restart
- [ ] `console.log` loguje status subscription i każdy broadcast
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Nieautoryzowane wywołanie SSE (bez tokena) zwraca 401 (obsługiwane przez STORY-2.1)
- [ ] Story review przez PO
