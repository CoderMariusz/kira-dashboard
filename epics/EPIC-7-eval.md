---
epic_id: EPIC-7
title: "Eval Page — Zarządzanie Golden Tasks & Regression Testing"
module: eval
status: draft
priority: should
estimated_size: L
risk: medium
---

## 📋 OPIS

EPIC-7 rozbudowuje istniejącą stronę `/dashboard/eval` z prostego widoku pass/fail w kompletny system regression testingu pipeline'u Kiry. Mariusz może zarządzać zestawem *golden tasks* (dodawać, edytować, usuwać zadania testowe z oczekiwanym outputem), przeglądać pełną historię runów z diff'em wyników i szybko identyfikować regresje po aktualizacji modelu lub kodu. Strona działa jako centrum jakości — jedno miejsce gdzie widać czy Kira nadal działa tak samo dobrze jak tydzień temu.

## 🎯 CEL BIZNESOWY

Mariusz wykrywa regresję pipeline'u w < 2 minuty po manualnym triggerze — widzi które golden tasks zaczęły failować i co konkretnie się zmieniło (diff expected vs actual output).

## 👤 PERSONA

**Mariusz (Admin / Developer)** — prowadzi aktywny rozwój pipeline'u Kiry, regularnie zmienia modele i prompty. Potrzebuje pewności że każda zmiana nie psuje dotychczasowego zachowania. Korzysta z eval page po każdym deploy'u lub zmianie modelu, oczekuje szybkiego "czy wszystko działa" i szczegółów gdy coś się posypało.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- **EPIC-1**: Dashboard foundation — layout strony, sidebar, routing do `/dashboard/eval`
- **EPIC-3**: Auth + Multi-User — RBAC potrzebny do kontroli kto może zarządzać golden tasks (ADMIN only dla CRUD, read dla pozostałych)
- **Bridge API**: Istniejące endpointy `/api/eval/overview` i `POST /api/eval/run` — już zaimplementowane (obecny `EvalFrameworkPanel` z nich korzysta)

### Blokuje (ten epic odblokowuje):
- Brak — EPIC-7 jest liściem w drzewie zależności; nie blokuje żadnego innego epicu

## 📦 ZAKRES (In Scope)

- **Zarządzanie golden tasks (CRUD)** — Mariusz (ADMIN) może dodawać, edytować i usuwać golden tasks przez formularz w drawrze: prompt (text), oczekiwany output (textarea), kategoria (API / Auth / CRUD / Pipeline / Reasoning / Home), model docelowy (haiku / kimi / sonnet / codex / glm), czy aktywne (toggle). Inne role mają tylko widok read-only listy.
- **Persystencja golden tasks** — zadania przechowywane w Bridge DB w tabeli `eval_tasks`; Bridge synchronizuje je z istniejącym mechanizmem eval run (zastąpienie lub rozszerzenie hardkodowanych 24 tasków).
- **Per-task wyniki runu** — tabela `eval_run_task_results` łączy run ↔ task ↔ actual_output, passed (bool), diff_score (float); umożliwia szczegółowy podgląd każdego zadania.
- **Pełna historia runów** — timeline wszystkich eval runów (nie tylko ostatnich 5): data, czas trwania, overall score, status PASS/FAIL; możliwość kliknięcia w run i zobaczenia szczegółów.
- **Diff failing tasks** — dla każdego failed task w wybranym runie: widok side-by-side (expected vs actual) z podświetlonym diff wierszowym; kolory fail `#f87171` i success `#34d399`.
- **Porównanie runów** — przy kliknięciu w run historia pokazuje delta vs poprzedni run (które tasks zmieniły status: nowe FAIL, naprawione PASS).
- **Filtrowanie po kategorii** — filter bar z kategoriami API / Auth / CRUD / Pipeline / Reasoning / Home; filtruje jednocześnie listę tasks i wyniki runu.
- **Manual trigger z UI** — istniejący przycisk "Uruchom Eval" rozszerzony o możliwość uruchomienia tylko wybranej kategorii lub tylko aktywnych tasks.
- **Info panel dla nowych użytkowników** — kolapsowany panel "Co to jest Eval?" z wyjaśnieniem co to golden tasks, po co je testujemy, jak interpretować wyniki; tooltip przy nagłówku strony.

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Automatyczne uruchamianie eval (cron/trigger po deploy'u)** — eval jest wyzwalany manualnie z UI lub przez Bridge CLI; automatyzacja CI/CD to osobny temat infrastrukturalny poza dashboardem.
- **Importowanie golden tasks z YAML** — przechowywanie w Bridge DB jest wystarczające; eksport/import plików YAML może pojawić się w późniejszej iteracji.
- **Edytor diff z inline sugestiami** — diff jest widokiem read-only; nie implementujemy edytora który auto-naprawia expected output na podstawie actual (zbyt ryzykowne, może maskować regresję).
- **Porównanie więcej niż 2 runów naraz** — widok diff ograniczony do pary: wybrany run vs bezpośrednio poprzedni run; multi-run compare to EPIC-X w przyszłości.
- **Granularne uprawnienia per kategoria** — RBAC na poziomie całej Eval page (ADMIN write / reszta read); nie implementujemy per-category ownership.
- **Cost Tracker panel** — `CostTrackerPanel` pozostaje bez zmian; EPIC-7 nie modyfikuje sekcji kosztów.

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Mariusz (ADMIN) może dodać nową golden task przez formularz — task pojawia się na liście i jest brana pod uwagę w kolejnym eval run
- [ ] Mariusz może edytować istniejącą golden task (prompt, expected output, kategoria, model, aktywność) — zmiana zapisuje się w Bridge DB
- [ ] Mariusz może usunąć golden task z potwierdzeniem — task znika z listy i nie jest uwzględniana w następnych runach
- [ ] Po kliknięciu "Uruchom Eval" widać spinner i po zakończeniu wyniki; failing tasks wyróżnione kolorem `#f87171` z diff expected vs actual
- [ ] Filtr kategorii API / Auth / CRUD / Pipeline / Reasoning / Home zawęża widoczną listę tasks i score bars
- [ ] Historia runów pokazuje co najmniej 20 ostatnich runów na timeline; kliknięcie w run otwiera szczegóły z listą task results
- [ ] Widok diff failing task pokazuje expected output vs actual output z podświetlonymi różnicami wiersz po wierszu
- [ ] Niezalogowany lub HELPER widzi stronę eval w trybie read-only — brak przycisków add/edit/delete; próba wywołania API zarządzania tasks zwraca 403
- [ ] Info panel "Co to jest Eval?" jest dostępny z poziomu strony (ikona ❓ lub "?" przycisk) i wyjaśnia cel golden tasks

## 📊 STORIES W TYM EPICU

| Story ID    | Domena   | Tytuł                                                                 | Opis jednym zdaniem                                                                                                               |
|-------------|----------|-----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| STORY-7.1   | database | Tabela `eval_tasks` + `eval_run_task_results` z migracją              | Migracja SQL tworząca tabelę golden tasks (prompt, expected_output, category, target_model, is_active) i tabelę per-task wyników runu z polami actual_output, passed, diff_score |
| STORY-7.2   | auth     | Uprawnienia RBAC do strony Eval i zarządzania golden tasks            | ADMIN może pisać do eval_tasks i triggerować runy; HELPER_PLUS i HELPER mają dostęp read-only do wyników; niezalogowani są bloko- wani przez middleware na `/dashboard/eval` |
| STORY-7.3   | backend  | CRUD API dla golden tasks — `/api/eval/tasks`                         | Endpointy GET /api/eval/tasks (lista z filtrem kategorii), POST (utwórz), PATCH /[id] (edytuj), DELETE /[id] (usuń) z walidacją ADMIN-only dla write operacji |
| STORY-7.4   | backend  | API historii runów i per-task diff — `/api/eval/runs`                 | GET /api/eval/runs (paginowana lista runów), GET /api/eval/runs/[runId] (szczegóły z tablicą task results + diff vs poprzedni run), integracja z istniejącym mechanizmem eval run w Bridge |
| STORY-7.5   | wiring   | Typy TypeScript i serwis klienta dla Eval CRUD + historia runów       | Interfejsy EvalTask, EvalTaskForm, EvalRunDetail, EvalTaskResult (z diffLines), kategorie enum; serwis evalTasksService i evalRunsService wywołujące nowe endpointy z mapowaniem błędów po polsku |
| STORY-7.6   | frontend | Golden Tasks Manager — lista, formularz CRUD, filtr kategorii         | Sekcja "Golden Tasks" strony eval: tabela tasks z kolumnami (kategoria, prompt, model, status aktywności, last result), filter bar per kategoria, drawer z formularzem add/edit (Zod + React Hook Form), modal potwierdzenia usunięcia; tryb read-only dla ról bez uprawnień |
| STORY-7.7   | frontend | Info panel "Co to jest Eval?" + onboarding tooltip                    | Kolapsowany panel wyjaśniający cel golden tasks (co to jest, jak interpretować pass/fail, dlaczego kategorie), ikona ❓ przy nagłówku strony z inline popover; widoczny dla wszystkich ról |
| STORY-7.8   | frontend | Run History Timeline + Failing Tasks Diff Viewer                      | Sekcja "Historia Runów": timeline z ikonami PASS/FAIL, kliknięcie → panel szczegółów z listą task results, failing tasks z side-by-side diff (expected #34d399 / actual #f87171) podświetlonym wiersz po wierszu, delta badge "↑ 2 naprawione / ↓ 3 nowe błędy" vs poprzedni run |

## 🏷️ METADANE

| Pole       | Wartość                                                                                           |
|------------|---------------------------------------------------------------------------------------------------|
| Moduł      | eval                                                                                              |
| Priorytet  | Should                                                                                            |
| Szacunek   | L (1–2 tygodnie)                                                                                  |
| Ryzyko     | Średnie — rozbudowa istniejącego systemu eval; ryzyko: Bridge DB może wymagać migracji w live środowisku; diff algorytm dla output może być nietrywialny |
| Domeny     | database, backend, auth, wiring, frontend                                                         |
| Stack      | Next.js 16, Supabase / Bridge DB (SQLite lub Postgres), shadcn/ui, Tailwind CSS, TypeScript, Zod, React Hook Form, diff biblioteka (np. `diff` npm lub `react-diff-viewer`) |
| Kolory     | bg `#0d0c1a`, accent `#818cf8`, success `#34d399`, fail `#f87171`, border `#2a2540`               |
| DB         | Bridge DB — tabela `eval_tasks` (golden tasks) + `eval_run_task_results` (per-task wyniki runów) |
| Kategorie  | API, Auth, CRUD, Pipeline, Reasoning, Home                                                        |
| Uwagi      | Istniejące komponenty `EvalFrameworkPanel`, `CostTrackerPanel`, `useEval`, `useEvalRun` zostają bez zmian lub z minimalnymi modyfikacjami (hooks mogą być rozszerzone, nie zastąpione). STORY-7.1 bridge-side może wymagać koordynacji z osobną PR do repozytorium `kira`. |
