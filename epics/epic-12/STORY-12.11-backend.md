---
story_id: STORY-12.11
title: "API /api/patterns + /api/lessons — migracja z lokalnych plików na Supabase"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-12.3, STORY-12.6
blocks: STORY-12.14
tags: [api, patterns, lessons, supabase, migration]
---

## 🎯 User Story

**Jako** użytkownik dashboardu
**Chcę** żeby strona Patterns & Lessons ładowała dane z Supabase
**Żeby** działała na Vercelu i wspierała dodawanie patterns/lessons przez UI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `app/api/patterns/route.ts` — GET + POST (STORY-8.1, 8.2)
- `app/api/lessons/route.ts` — POST (STORY-8.2)

### Aktualne zachowanie
- GET `/api/patterns` — parsuje 3 lokalne pliki MD: patterns.md, anti-patterns.md, LESSONS_LEARNED.md
- POST `/api/patterns` — dopisuje do patterns.md przez `writeFile`
- POST `/api/lessons` — dopisuje do LESSONS_LEARNED.md przez `writeFile`

### Docelowe zachowanie
- GET czyta z `kira_patterns` + `kira_lessons` (Supabase)
- POST wstawia do Supabase (+ opcjonalnie: Bridge syncuje z powrotem do plików)

---

## ✅ Acceptance Criteria

### AC-1: GET /api/patterns zwraca dane z Supabase
GIVEN: zalogowany użytkownik
WHEN: GET /api/patterns?project=kira-dashboard
THEN: JSON z `{ patterns: PatternCard[], lessons: Lesson[], meta: { ... } }`

### AC-2: GET obsługuje filtrowanie i wyszukiwanie
GIVEN: query params `type=ANTI_PATTERN` lub `search=timeout`
WHEN: GET /api/patterns?type=ANTI_PATTERN
THEN: filtruje po `type` kolumnie

GIVEN: query param `search=timeout`
WHEN: GET /api/patterns?search=timeout
THEN: `text ILIKE '%timeout%'` OR `category ILIKE '%timeout%'`

### AC-3: POST /api/patterns dodaje nowy pattern do Supabase
GIVEN: ADMIN zalogowany
WHEN: POST /api/patterns z body `{ type, category, text, tags }`
THEN: nowy rekord w `kira_patterns`, zwraca 201 z nowym id

### AC-4: POST /api/lessons dodaje nową lekcję do Supabase
GIVEN: ADMIN zalogowany
WHEN: POST /api/lessons z body `{ title, severity, description, root_cause, fix, story_id }`
THEN: nowy rekord w `kira_lessons`, zwraca 201

### AC-5: Auth i RBAC
GIVEN: request bez JWT → 401
GIVEN: HELPER próbuje POST → 403
GIVEN: ADMIN POST → 201 (sukces)

### AC-6: Response kompatybilny z frontend types
GIVEN: frontend używa `PatternCard` i `Lesson` types
WHEN: nowy endpoint zwraca dane
THEN: format identyczny — zero zmian w komponentach

---

## ⚙️ Szczegóły Backend

### GET /api/patterns (pełna przebudowa)

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'
  const type    = request.nextUrl.searchParams.get('type')     // PATTERN | ANTI_PATTERN
  const search  = request.nextUrl.searchParams.get('search')
  const supabase = await createClient()

  // Patterns
  let pQuery = supabase.from('kira_patterns').select('*').eq('project_id', project)
  if (type)   pQuery = pQuery.eq('type', type)
  if (search) pQuery = pQuery.or(`text.ilike.%${search}%,category.ilike.%${search}%`)
  const { data: patterns } = await pQuery.order('created_at', { ascending: false })

  // Lessons
  let lQuery = supabase.from('kira_lessons').select('*').eq('project_id', project)
  if (search) lQuery = lQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  const { data: lessons } = await lQuery.order('date', { ascending: false })

  return NextResponse.json({
    patterns: patterns ?? [],
    lessons: lessons ?? [],
    meta: {
      total_patterns: patterns?.length ?? 0,
      total_lessons: lessons?.length ?? 0,
      source: 'supabase',
    },
  })
}
```

### POST /api/patterns

```typescript
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  const { type, category, text, tags, model, domain } = body

  if (!type || !category || !text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const id = `pat-${Date.now().toString(36)}`
  const supabase = await createClient()

  const { error } = await supabase.from('kira_patterns').insert({
    id, project_id: 'kira-dashboard',
    source: type === 'ANTI_PATTERN' ? 'anti-patterns.md' : 'patterns.md',
    type, category, text,
    tags: tags ?? [], model, domain,
    date: new Date().toISOString().split('T')[0],
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id, ok: true }, { status: 201 })
}
```

### POST /api/lessons

```typescript
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  const { title, severity, description, root_cause, fix, story_id, tags } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'Missing title or description' }, { status: 400 })
  }

  // Auto-generate next OPS-XXX id
  const supabase = await createClient()
  const { data: lastLesson } = await supabase
    .from('kira_lessons')
    .select('id')
    .like('id', 'OPS-%')
    .order('id', { ascending: false })
    .limit(1)
    .single()

  const lastNum = lastLesson ? parseInt(lastLesson.id.replace('OPS-', '')) : 0
  const nextId = `OPS-${String(lastNum + 1).padStart(3, '0')}`

  const { error } = await supabase.from('kira_lessons').insert({
    id: nextId, project_id: 'kira-dashboard',
    title, severity: severity ?? 'MEDIUM', description,
    root_cause, fix, story_id,
    tags: tags ?? [],
    date: new Date().toISOString().split('T')[0],
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: nextId, ok: true }, { status: 201 })
}
```

---

## ⚠️ Edge Cases

### EC-1: Search z polskimi znakami (ą, ę, ó)
Scenariusz: `search=błąd` — ILIKE powinien obsługiwać
Oczekiwane zachowanie: PostgreSQL ILIKE działa z UTF-8 — powinno działać natywnie

### EC-2: Pusty `kira_patterns` (pierwszy deploy)
Scenariusz: sync nie przebiegł — brak patterns
Oczekiwane zachowanie: `{ patterns: [], lessons: [] }` — frontend wyświetla empty state

### EC-3: Duplikat id przy POST
Scenariusz: `pat-xxx` już istnieje (teoretycznie niemożliwe z timestamp)
Oczekiwane zachowanie: Supabase zwróci conflict → 500 → retry z nowym id

---

## 🚫 Out of Scope
- Sync z powrotem do plików MD (Bridge to robi)
- Full-text search (PostgreSQL tsvector — EPIC-13)
- Pattern merging / deduplication

---

## ✔️ Definition of Done
- [ ] GET /api/patterns zwraca z Supabase (usunięto fs.readFile)
- [ ] POST /api/patterns i POST /api/lessons wstawiają do Supabase
- [ ] Auth + RBAC (ADMIN write, all read)
- [ ] Filtrowanie i search działają
- [ ] Response kompatybilny z frontend types
- [ ] Frontend Patterns page ładuje dane z Supabase
- [ ] Działa na Vercelu
- [ ] Story review przez PO
