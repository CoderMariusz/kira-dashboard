---
story_id: STORY-12.5
title: "NightClaw cron zapisuje digest, research i skills-diff do Supabase"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-12.2
blocks: STORY-12.10
tags: [sync, nightclaw, supabase, python, cron]
---

## 🎯 User Story

**Jako** NightClaw cron job
**Chcę** żeby po zakończeniu analizy nocnej dane były zapisywane do Supabase
**Żeby** dashboard /dashboard/nightclaw pokazywał aktualne dane bez dostępu do lokalnych plików

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Modyfikacja prompta cron jobów NightClaw (lub nowy skrypt Python):
- `nightclaw-digest` cron → po zapisaniu digest MD → push do Supabase
- `nightclaw-autolearn-apply` → po zapisaniu solutions → push research do Supabase
- `nightclaw-skill-evolution` → po edycji skills → push skills-diff do Supabase

Alternatywnie: nowy cron `nightclaw-supabase-sync` uruchamiany po nocnych cronach (o 5:00 AM).

### Powiązane pliki
- `.kira/nightclaw/digest/YYYY-MM-DD.md` → `nightclaw_digests`
- `.kira/nightclaw/solutions/` → `nightclaw_research`
- Skills diff przez git → `nightclaw_skills_diff`

### Stan systemu przed tą story
- STORY-12.2 DONE — tabele Supabase istnieją

---

## ✅ Acceptance Criteria

### AC-1: Digest z pliku .md zapisany do Supabase po nocnym run
GIVEN: plik `.kira/nightclaw/digest/2026-02-26.md` istnieje
WHEN: sync script uruchomiony
THEN: rekord w `nightclaw_digests` z `run_date=2026-02-26` i `content_md` z pliku

### AC-2: Research solutions zapisane do Supabase
GIVEN: pliki `*.md` w `.kira/nightclaw/solutions/` (nie `_pending-apply.md`)
WHEN: sync uruchomiony
THEN: każdy plik jako osobny rekord w `nightclaw_research` z `slug=filename_bez_extension`

### AC-3: Skills-diff wygenerowany i zapisany
GIVEN: SKILL.md pliki w `~/.openclaw/skills/` z commitami w git
WHEN: sync uruchomiony
THEN: rekordy w `nightclaw_skills_diff` dla skills zmienionych w ostatnich 24h

### AC-4: Duplikaty obsłużone przez upsert
GIVEN: sync uruchomiony dwa razy tego samego dnia
THEN: brak duplikatów — stary rekord zaktualizowany

---

## ⚙️ Szczegóły Backend

### Nowy skrypt: `scripts/sync_nightclaw_to_supabase.py`

```python
import os, sqlite3, subprocess
from datetime import datetime, date, timezone, timedelta
from pathlib import Path
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
KIRA_DIR = Path('/Users/mariuszkrawczyk/codermariusz/kira')
SKILLS_DIR = Path('/Users/mariuszkrawczyk/.openclaw/skills')

def sync_digest(supabase):
    digest_dir = KIRA_DIR / '.kira/nightclaw/digest'
    today = date.today()
    digest_file = digest_dir / f'{today}.md'
    if not digest_file.exists():
        print(f"[digest] No digest for {today}")
        return
    content = digest_file.read_text()
    # Wyciągnij summary (pierwsze 3 zdania po nagłówku)
    lines = [l for l in content.split('\n') if l.strip() and not l.startswith('#')]
    summary = ' '.join(lines[:3])[:500]
    supabase.table('nightclaw_digests').upsert({
        'run_date': str(today),
        'content_md': content,
        'summary': summary,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }, on_conflict='run_date').execute()
    print(f"[digest] Synced {today}")

def sync_research(supabase):
    solutions_dir = KIRA_DIR / '.kira/nightclaw/solutions'
    if not solutions_dir.exists():
        return
    records = []
    for f in solutions_dir.glob('*.md'):
        if f.name.startswith('_'):  # skip _pending-apply.md
            continue
        slug = f.stem
        content = f.read_text()
        # Wyciągnij title z pierwszej linii
        title = content.split('\n')[0].lstrip('#').strip() or slug
        records.append({
            'slug': slug, 'title': title,
            'problem': content[:1000], 'solution': None,
            'status': 'pending',
            'updated_at': datetime.now(timezone.utc).isoformat(),
        })
    if records:
        supabase.table('nightclaw_research').upsert(
            records, on_conflict='slug'
        ).execute()
        print(f"[research] Synced {len(records)} items")

def sync_skills_diff(supabase):
    try:
        # Znajdź skills zmienione w ostatnich 24h
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD', '--', '*/SKILL.md'],
            cwd=SKILLS_DIR, capture_output=True, text=True, timeout=10
        )
        changed = [l.strip() for l in result.stdout.splitlines() if l.strip()]
    except Exception as e:
        print(f"[skills-diff] git error: {e}")
        return

    today = date.today()
    records = []
    for path in changed:
        skill_name = path.split('/')[0]
        try:
            diff = subprocess.run(
                ['git', 'diff', 'HEAD~1', 'HEAD', '--', path],
                cwd=SKILLS_DIR, capture_output=True, text=True, timeout=10
            ).stdout
            lines_added = diff.count('\n+') - diff.count('\n+++')
            lines_removed = diff.count('\n-') - diff.count('\n---')
            records.append({
                'run_date': str(today),
                'skill_name': skill_name, 'skill_path': path,
                'diff_content': diff[:5000],  # max 5KB
                'lines_added': max(0, lines_added),
                'lines_removed': max(0, lines_removed),
                'modified_at': datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            continue

    if records:
        supabase.table('nightclaw_skills_diff').upsert(
            records, on_conflict='run_date,skill_name'
        ).execute()
        print(f"[skills-diff] Synced {len(records)} skills")

if __name__ == '__main__':
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    sync_digest(supabase)
    sync_research(supabase)
    sync_skills_diff(supabase)
```

### Cron do dodania (po wszystkich nocnych cronach — 5:00 AM)

```json
{
  "name": "nightclaw-supabase-sync",
  "schedule": { "kind": "cron", "expr": "0 5 * * *", "tz": "Europe/London" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "model": "glm",
    "message": "Run: cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate && SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL /Users/mariuszkrawczyk/codermariusz/kira-dashboard/.env.local | cut -d= -f2) SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_KEY /Users/mariuszkrawczyk/codermariusz/kira-dashboard/.env.local | cut -d= -f2) python scripts/sync_nightclaw_to_supabase.py 2>&1 | tail -10",
    "timeoutSeconds": 60
  },
  "delivery": { "mode": "none" }
}
```

---

## ⚠️ Edge Cases

### EC-1: Git nie ma poprzedniego commita (świeże repozytorium)
Scenariusz: `git diff HEAD~1 HEAD` failuje gdy tylko 1 commit
Oczekiwane zachowanie: `try/except` + fallback `git diff HEAD` lub pusty wynik

### EC-2: Digest plik z poprzedniego dnia (cron o 5:00 AM może uruchamiać się z datą D-1)
Scenariusz: NightClaw tworzy plik o 2:00 AM — `date.today()` o 5:00 AM to nadal ta sama data ✅

### EC-3: Solutions directory nie istnieje
Scenariusz: NightClaw nigdy nie uruchomił się lub katalog usunięty
Oczekiwane zachowanie: `if not solutions_dir.exists(): return` — skip gracefully

---

## 🚫 Out of Scope tej Story
- Sync Bridge stories (STORY-12.4)
- API endpoints (STORY-12.10)

---

## ✔️ Definition of Done
- [ ] `scripts/sync_nightclaw_to_supabase.py` istnieje i działa
- [ ] Uruchomiony ręcznie — dane w Supabase
- [ ] Cron `nightclaw-supabase-sync` dodany (5:00 AM codziennie)
- [ ] Upsert bezpieczny przy wielokrotnym uruchomieniu
- [ ] Błędy git obsłużone gracefully
- [ ] Story review przez PO
