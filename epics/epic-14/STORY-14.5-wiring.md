---
story_id: STORY-7.5
title: "Bridge TDD stages — TEST_RED, TEST_GREEN, QA w pipeline"
epic: EPIC-7
domain: wiring
difficulty: moderate
recommended_model: sonnet
priority: must
depends_on: []
blocks: []
---

## 🎯 Cel
Zaktualizować Bridge/pipeline żeby wymuszał TDD flow: każda story musi przejść przez TEST_RED → IMPLEMENTATION → TEST_GREEN → REVIEW → QA → DONE.

## Kontekst
Projekt Bridge: `/Users/mariuszkrawczyk/codermariusz/kira`
Uruchom: `cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate`

## ✅ Acceptance Criteria

### AC-1: Nowe statusy w Bridge
Dodaj do modelu Story (sprawdź `bridge/models.py` lub `bridge/db/models.py`):
```
READY → TEST_RED → IN_PROGRESS → TEST_GREEN → REVIEW → QA → DONE
```
Zachowaj backwards compatibility — stare statusy (IN_PROGRESS, REVIEW, DONE) nadal działają.

### AC-2: Walidacja przejść statusów
W `bridge/worker_manager.py` lub odpowiednim miejscu:
- REVIEW nie może być zatwierdzony jeśli ostatni run TEST_GREEN nie istnieje lub failed
- QA stage: osobny krok po REVIEW APPROVED

Jeśli nie ma TEST_GREEN runu → advance do REVIEW fails z komunikatem:
`"Story X.Y cannot advance to REVIEW: no passing TEST_GREEN run found"`

### AC-3: `bridge.cli advance STORY-X.Y --to TEST_RED` działa
Przetestuj komendę na lokalnym DB.

### AC-4: `bridge.cli advance STORY-X.Y --to QA` działa
QA stage = Kira uruchamia Playwright i raportuje wyniki.

### AC-5: Dokumentacja `bridge.cli status` pokazuje nowe statusy
Wynik `bridge.cli status` powinien pokazywać TEST_RED / TEST_GREEN obok IN_PROGRESS etc.

### AC-6: Testy Bridge przechodzą
- `cd kira && source .venv/bin/activate && python -m pytest tests/ -q` → wszystkie relevantne testy pass
- Minimum: test przejść statusów nie failuje

## ⚠️ Uwagi
- Nie łam backwards compatibility — stare stories (EPIC-1-6) mają status DONE bez TEST_GREEN, to OK
- Walidacja TEST_GREEN → REVIEW tylko dla nowych stories (created_at po dacie deploy)
- Lub: dodaj flagę `tdd_required: bool` per epic — łatwiejsze do kontroli

## ✔️ DoD
- [ ] `bridge.cli advance STORY-X.Y --to TEST_RED` działa
- [ ] `bridge.cli advance STORY-X.Y --to TEST_GREEN` działa
- [ ] `bridge.cli advance STORY-X.Y --to QA` działa
- [ ] REVIEW blokuje bez TEST_GREEN (dla stories z flagą `tdd_required`)
- [ ] pytest passes
- [ ] Commit na `feature/STORY-7.5` w repo kira-bridge
