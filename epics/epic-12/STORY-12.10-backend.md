---
story_id: STORY-12.10
title: "API /api/nightclaw/* — migracja z lokalnych plików na Supabase"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: STORY-12.2, STORY-12.5
blocks: STORY-12.14
tags: [api, nightclaw, supabase, migration]
---

## 🎯 User Story

**Jako** użytkownik dashboardu
**Chcę** żeby strona NightClaw (/dashboard/nightclaw) ładowała dane z Supabase
**Żeby** widział digest, research i skills-diff na Vercelu bez dostępu do lokalnych plików

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie — 4 endpointy do migracji
- `app/api/nightclaw/digest/route.ts` — czyta pliki .kira/nightclaw/digest/
- `app/api/nightclaw/history/route.ts` — listuje pliki digest + runs z Bridge
- `app/api/nightclaw/research/route.ts` — czyta pliki .kira/nightclaw/solutions/
- `app/api/nightclaw/skills-diff/route.ts` — czyta git diff z ~/.openclaw/skills/

### Docelowe zachowanie
Wszystkie 4 czytają z tabel Supabase: `nightclaw_digests`, `nightclaw_research`, `nightclaw_skills_diff`

---

## ✅ Acceptance Criteria

### AC-1: GET /api/nightclaw/digest czyta z Supabase
GIVEN: zalogowany użytkownik
WHEN: GET /api/nightclaw/digest?date=2026-02-26
THEN: JSON z content_md, summary, stories_done z tabeli `nightclaw_digests`

### AC-2: GET /api/nightclaw/digest (bez daty) — latest
GIVEN: zalogowany użytkownik
WHEN: GET /api/nightclaw/digest (bez query params)
THEN: zwraca najnowszy digest (ORDER BY run_date DESC LIMIT 1)

### AC-3: GET /api/nightclaw/history zwraca listę digest summaries
GIVEN: zalogowany użytkownik
WHEN: GET /api/nightclaw/history?limit=30
THEN: JSON tablica z {run_date, summary, stories_done, stories_failed} z `nightclaw_digests`, max 30 pozycji

### AC-4: GET /api/nightclaw/research zwraca listę research findings
GIVEN: zalogowany użytkownik
WHEN: GET /api/nightclaw/research
THEN: JSON tablica z {slug, title, problem, solution, status} z `nightclaw_research`

### AC-5: GET /api/nightclaw/skills-diff czyta z Supabase
GIVEN: zalogowany użytkownik
WHEN: GET /api/nightclaw/skills-diff?date=2026-02-26
THEN: JSON z {skills: [{skill_name, diff_content, lines_added, lines_removed}]} z `nightclaw_skills_diff`

### AC-6: Auth wymagana na wszystkich
GIVEN: request bez JWT
WHEN: GET /api/nightclaw/*
THEN: 401

---

## ⚙️ Szczegóły Backend

### GET /api/nightclaw/digest

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const date = request.nextUrl.searchParams.get('date')
  const supabase = await createClient()

  let query = supabase.from('nightclaw_digests').select('*')

  if (date) {
    query = query.eq('run_date', date).single()
  } else {
    query = query.order('run_date', { ascending: false }).limit(1).single()
  }

  const { data, error } = await query
  if (error || !data) {
    return NextResponse.json({ error: 'No digest found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
```

### GET /api/nightclaw/history

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '30'), 90)
  const supabase = await createClient()

  const { data } = await supabase
    .from('nightclaw_digests')
    .select('run_date, summary, stories_done, stories_failed, models_used')
    .order('run_date', { ascending: false })
    .limit(limit)

  return NextResponse.json({ data: data ?? [] })
}
```

### GET /api/nightclaw/research

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const status = request.nextUrl.searchParams.get('status')
  const supabase = await createClient()

  let query = supabase.from('nightclaw_research')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query
  return NextResponse.json({ data: data ?? [] })
}
```

### GET /api/nightclaw/skills-diff

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const date = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const supabase = await createClient()

  const { data } = await supabase
    .from('nightclaw_skills_diff')
    .select('*')
    .eq('run_date', date)

  return NextResponse.json({
    skills: data ?? [],
    total_modified: data?.length ?? 0,
  })
}
```

### Zachowaj kompatybilność z frontend types
Sprawdź: `grep -r "NightclawDigest\|DigestResponse\|SkillsDiff" /Users/mariuszkrawczyk/codermariusz/kira-dashboard/types/`
Upewnij się że response schema pasuje do istniejących typów.

---

## ⚠️ Edge Cases

### EC-1: Brak danych NightClaw (pierwszy deploy, sync jeszcze nie przebiegł)
Scenariusz: Supabase puste — frontend ładuje pustą stronę
Oczekiwane zachowanie: zwróć `{ data: [] }` / empty state. Frontend powinien obsługiwać.

### EC-2: date query param w złym formacie
Scenariusz: `?date=26-02-2026` zamiast `?date=2026-02-26`
Oczekiwane zachowanie: Supabase zwróci 0 wyników (DATE cast fail) → graceful empty response

---

## 🚫 Out of Scope
- NightClaw model stats (osobna tabela — jeśli potrzebna, EPIC-13)
- Write operations (NightClaw crony piszą przez service_role)

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 endpointy czytają z Supabase (nie z lokalnych plików)
- [ ] Usunięto: `fs.readFile`, `execSync`, `readFile` z nightclaw routes
- [ ] Auth wymagana
- [ ] Frontend NightClaw page ładuje dane z Supabase
- [ ] Działa na Vercelu (preview deploy)
- [ ] Story review przez PO
