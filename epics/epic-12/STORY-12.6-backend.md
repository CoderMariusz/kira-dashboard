---
story_id: STORY-12.6
title: "Developer syncuje patterns i lessons z lokalnych plików do Supabase"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-12.3
blocks: STORY-12.11
tags: [sync, patterns, lessons, supabase, python]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby patterns i lessons z lokalnych plików markdown były zsynchronizowane do Supabase
**Żeby** strona /dashboard/patterns działała na Vercelu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`scripts/sync_patterns_to_supabase.py` — nowy skrypt

### Źródła danych
- `kira/.kira/nightclaw/patterns.md`
- `kira/.kira/nightclaw/anti-patterns.md`
- `kira/.kira/LESSONS_LEARNED.md`

### Stan systemu przed tą story
- STORY-12.3 DONE — tabele `kira_patterns`, `kira_lessons` istnieją

---

## ✅ Acceptance Criteria

### AC-1: Patterns z patterns.md i anti-patterns.md w Supabase
GIVEN: pliki patterns.md i anti-patterns.md istnieją
WHEN: sync uruchomiony
THEN: rekordy w `kira_patterns` z `type=PATTERN` i `type=ANTI_PATTERN` odpowiednio

### AC-2: Lessons z LESSONS_LEARNED.md w Supabase
GIVEN: plik LESSONS_LEARNED.md z sekcjami OPS-001, OPS-002...
WHEN: sync uruchomiony
THEN: każda sekcja jako osobny rekord w `kira_lessons` z `id=OPS-XXX`

### AC-3: Upsert bezpieczny przy wielokrotnym uruchomieniu
GIVEN: sync uruchomiony 2x
THEN: brak duplikatów, zaktualizowane istniejące

### AC-4: Import historyczny jednorazowy — wszystkie istniejące dane
GIVEN: patterns.md z 50+ wpisami
WHEN: pierwsze uruchomienie skryptu
THEN: wszystkie 50+ patterns w Supabase

---

## ⚙️ Szczegóły Backend

### Parser patterns.md

Format bloku pattern w pliku:
```markdown
### PATTERN: Nazwa kategorii
**Model:** kimi-k2.5
**Domain:** backend
**Date:** [2026-02-20]
Opis tekstu patternu...
**Tags:** #tag1 #tag2
**Related:** STORY-1.1, STORY-2.3
```

### Parser LESSONS_LEARNED.md

Format:
```markdown
## OPS-001: Tytuł lekcji
**Date:** 2026-02-15
**Severity:** HIGH
**Story:** STORY-7.1
Opis problemu...
**Root cause:** ...
**Fix:** ...
```

### Szkielet skryptu

```python
# scripts/sync_patterns_to_supabase.py
import os, hashlib, re
from pathlib import Path
from supabase import create_client

KIRA_DIR = Path('/Users/mariuszkrawczyk/codermariusz/kira')
PROJECT_ID = 'kira-dashboard'

def parse_patterns(filepath: Path, pattern_type: str) -> list:
    """Parse patterns.md or anti-patterns.md into records."""
    if not filepath.exists():
        return []
    content = filepath.read_text()
    # Użyj regex do parsowania bloków — dostosuj do faktycznego formatu pliku
    records = []
    # Sprawdź faktyczny format: cat .kira/nightclaw/patterns.md | head -50
    # Implementuj parser dopasowany do struktury
    return records

def parse_lessons(filepath: Path) -> list:
    """Parse LESSONS_LEARNED.md into lesson records."""
    if not filepath.exists():
        return []
    content = filepath.read_text()
    records = []
    # Parsuj sekcje ## OPS-XXX
    # Implementuj parser dopasowany do faktycznego formatu
    return records

def main():
    supabase = create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_KEY']
    )
    patterns = (
        parse_patterns(KIRA_DIR / '.kira/nightclaw/patterns.md', 'PATTERN') +
        parse_patterns(KIRA_DIR / '.kira/nightclaw/anti-patterns.md', 'ANTI_PATTERN')
    )
    if patterns:
        supabase.table('kira_patterns').upsert(
            patterns, on_conflict='id'
        ).execute()
        print(f"[patterns] Synced {len(patterns)}")

    lessons = parse_lessons(KIRA_DIR / '.kira/LESSONS_LEARNED.md')
    if lessons:
        supabase.table('kira_lessons').upsert(
            lessons, on_conflict='id'
        ).execute()
        print(f"[lessons] Synced {len(lessons)}")
```

**⚠️ WAŻNE:** Implementator musi najpierw sprawdzić faktyczny format plików:
```bash
head -80 /Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/patterns.md
head -80 /Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/anti-patterns.md
head -80 /Users/mariuszkrawczyk/codermariusz/kira/.kira/LESSONS_LEARNED.md
```
i napisać parser dopasowany do faktycznej struktury.

---

## ⚠️ Edge Cases

### EC-1: Plik patterns.md nie istnieje
Oczekiwane zachowanie: `if not filepath.exists(): return []` — skip gracefully

### EC-2: Nierozpoznany format bloku
Oczekiwane zachowanie: loguj warning, pomiń blok, kontynuuj z następnymi

### EC-3: Długi tekst patternu (>2000 znaków)
Oczekiwane zachowanie: TEXT w PostgreSQL nie ma limitu — OK, ale API może truncować przy zwracaniu

---

## 🚫 Out of Scope
- API endpoints (STORY-12.11)
- Write operations z dashboardu do pliku .md (pozostaje przez API write do Supabase)

---

## ✔️ Definition of Done
- [ ] `scripts/sync_patterns_to_supabase.py` istnieje
- [ ] Parser dopasowany do faktycznego formatu plików (nie generyczny)
- [ ] Uruchomiony — dane w `kira_patterns` i `kira_lessons`
- [ ] Upsert bezpieczny
- [ ] Błędy parsowania logowane, nie crashują skrypt
- [ ] Story review przez PO
