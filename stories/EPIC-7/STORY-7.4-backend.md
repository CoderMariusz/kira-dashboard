---
story_id: STORY-7.4
title: "Eval report export — CSV/JSON download endpoint"
epic: EPIC-7
module: eval
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 2h
depends_on: [STORY-7.1]
blocks: []
tags: [api, export, csv, json, eval, report]
---

## 🎯 User Story

**Jako** admin Kiry
**Chcę** pobrać wyniki eval runu jako plik CSV lub JSON
**Żeby** przeanalizować wyniki w arkuszu kalkulacyjnym lub zarchiwizować raport poza dashboardem

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/api/eval/runs/[run_id]/export`
- Plik: `/app/api/eval/runs/[run_id]/export/route.ts`
- Wywołanie z: przycisk „Eksportuj" na stronie `/eval/runs/[run_id]` (STORY-7.3)

### Powiązane pliki
- `GET /api/eval/runs/[run_id]` (STORY-7.1) — ta sama logika pobrania danych runu
- `RunDetailResponse` — typy z STORY-7.1
- Auth middleware (STORY-3.3) — tylko admin

### Stan systemu przed tą story
- STORY-7.1 gotowe: `GET /api/eval/runs/[run_id]` działa i zwraca `RunDetailResponse`
- Auth middleware działa — tylko rola `admin`

---

## ✅ Acceptance Criteria

### AC-1: GET /api/eval/runs/:run_id/export?format=csv — pobieranie CSV
GIVEN: admin jest zalogowany z ważnym JWT i run o podanym ID istnieje
WHEN: wysyła `GET /api/eval/runs/<run_id>/export?format=csv`
THEN: system zwraca 200 z Content-Type `text/csv; charset=utf-8`, Content-Disposition `attachment; filename="eval-run-<run_id_short>-<date>.csv"`
AND: plik CSV zawiera nagłówek: `task_id,task_title,model,score,passed,started_at,duration_ms,notes`
AND: każdy wiersz odpowiada jednemu `EvalResult` z runu

### AC-2: GET /api/eval/runs/:run_id/export?format=json — pobieranie JSON
GIVEN: admin jest zalogowany z ważnym JWT i run o podanym ID istnieje
WHEN: wysyła `GET /api/eval/runs/<run_id>/export?format=json`
THEN: system zwraca 200 z Content-Type `application/json`, Content-Disposition `attachment; filename="eval-run-<run_id_short>-<date>.json"`
AND: plik JSON to `RunDetailResponse` (pełny obiekt z `results[]`) sformatowany z wcięciami (pretty-print)

### AC-3: Domyślny format — CSV
GIVEN: admin wysyła `GET /api/eval/runs/<run_id>/export` bez parametru `format`
WHEN: żądanie dociera do serwera
THEN: system zachowuje się jak dla `format=csv` — zwraca CSV

### AC-4: Autoryzacja — tylko admin
GIVEN: użytkownik z rolą `home` lub bez tokena próbuje wywołać endpoint export
WHEN: wysyła żądanie
THEN: system zwraca 401 (brak tokena) lub 403 (nieprawidłowa rola) — bez generowania pliku

### AC-5: Run nie istnieje — 404
GIVEN: admin wysyła żądanie export dla `run_id` który nie istnieje w Bridge
WHEN: Bridge zwraca brak wyników
THEN: system zwraca 404 z `{ "error": "Run nie istnieje", "run_id": "<podany_id>" }` — nie generuje pustego pliku

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

```
Method: GET
Path: /api/eval/runs/[run_id]/export
Auth: Bearer token (Supabase JWT)
Role: admin
Query: format (optional, default: "csv", allowed: "csv" | "json")
```

### Request Schema

```typescript
// Query params
interface ExportQuery {
  format?: "csv" | "json"  // default: "csv"
}
```

### Response Schema

```typescript
// format=csv → Content-Type: text/csv
// Nagłówek CSV:
// task_id,task_title,model,score,passed,started_at,duration_ms,notes
// Przykładowy wiersz:
// "task-001","Sprawdź status pipeline","kimi-k2.5",85,true,"2026-03-05T18:00:00Z",3200,""

// format=json → Content-Type: application/json
// Pełny RunDetailResponse z pretty-print (JSON.stringify(data, null, 2))

// Kody błędów
// 400 → nieprawidłowy format (nie "csv" ani "json")
// 401 → brak tokena
// 403 → rola nie ma uprawnień
// 404 → run nie istnieje
// 502 → Bridge niedostępny
// 500 → nieoczekiwany błąd
```

### Logika biznesowa (krok po kroku)

```
1. Sprawdź token JWT → brak? 401
2. Sprawdź rolę → nie admin? 403
3. Parsuj query param format → nieprawidłowa wartość? 400
4. Pobierz dane runu przez Bridge CLI (jak w GET /api/eval/runs/:run_id):
   bridge.cli eval history --run-id <run_id> --detail --format json
5. Brak wyników / nie istnieje? → 404
6. Błąd CLI? → 502
7. Jeśli format=csv:
   a. Zbuduj string CSV z nagłówkiem + wierszami
   b. Każde pole: owinąć w cudzysłów jeśli zawiera przecinek lub nową linię
   c. notes = joined `ac_results` notes (oddzielone " | ")
   d. Ustaw headers: Content-Type=text/csv, Content-Disposition=attachment; filename=...
   e. Zwróć 200 z body jako string CSV
8. Jeśli format=json:
   a. Ustaw headers: Content-Type=application/json, Content-Disposition=attachment; filename=...
   b. Zwróć 200 z pretty-printed JSON (RunDetailResponse)

Generowanie filename:
  shortId = run_id.slice(0, 8)
  dateStr = new Date(run.started_at).toISOString().slice(0, 10)  // "2026-03-05"
  filename = `eval-run-${shortId}-${dateStr}.${format}`
```

---

## ⚠️ Edge Cases

### EC-1: Run z zerową liczbą wyników (run w toku bez gotowych tasków)
Scenariusz: run istnieje ale `results[]` jest pusta (np. eval właśnie startuje)
Oczekiwane zachowanie: CSV zwraca tylko nagłówek bez wierszy; JSON zwraca pełny obiekt z `results: []`; HTTP 200 (nie 404)

### EC-2: task_title lub notes zawiera przecinki i cudzysłowy (CSV injection)
Scenariusz: `task_title = 'Zadanie "ważne", priorytet 1'`
Oczekiwane zachowanie: wartość jest otoczona cudzysłowami i wewnętrzne cudzysłowy są zdublowane zgodnie z RFC 4180 → `"Zadanie ""ważne"", priorytet 1"`

### EC-3: Nieprawidłowy format query param
Scenariusz: `GET /api/eval/runs/<id>/export?format=xml`
Oczekiwane zachowanie: 400 z `{ "error": "Nieprawidłowy format. Dozwolone: csv, json" }`

### EC-4: Bardzo duży run (500+ tasków)
Scenariusz: eval run zawiera 500 golden tasks — duży output z Bridge
Oczekiwane zachowanie: endpoint generuje plik poprawnie; nie ma limitu pamięci (Node.js string builder wystarczy dla rozsądnych rozmiarów); timeout 30s

---

## 🚫 Out of Scope tej Story
- Eksport wielu runów naraz (bulk export) — jeden run per request
- Eksport w formacie Excel (.xlsx) — CSV wystarczy dla MVP
- Frontend button „Eksportuj" — to STORY-7.3 (przycisk dodany w detail view)
- Scheduled export (cron email raportu) — poza zakresem MVP
- Streaming download (dla bardzo dużych plików) — nie potrzebne dla eval MVP

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] CSV jest zgodne z RFC 4180 (cudzysłowy, escaping przecinków)
- [ ] JSON jest pretty-printed i zgodny z RunDetailResponse schema
- [ ] Content-Disposition ustawiony poprawnie → przeglądarka triggeruje download
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z rolą `home` zwraca 403
- [ ] Run nieistniejący zwraca 404 (nie pusty plik)
- [ ] Story review przez PO
