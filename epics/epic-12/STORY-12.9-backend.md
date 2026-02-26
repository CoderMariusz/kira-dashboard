---
story_id: STORY-12.9
title: "API /api/stories/[id]/advance — write przez Bridge HTTP webhook zamiast execSync"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: STORY-12.1, STORY-12.7
blocks: STORY-12.14
tags: [api, bridge, webhook, write-operations, advance, supabase]
---

## 🎯 User Story

**Jako** ADMIN na dashboardzie
**Chcę** żeby "Advance story" i "Start story" działały na Vercelu
**Żeby** moc zarządzać pipeline bez SSH do Mac Mini

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `app/api/stories/[id]/advance/route.ts` — istniejący, ale używa `execSync` + `BRIDGE_DIR`
- `app/api/stories/[id]/start/route.ts` — istniejący, `execSync`

### Aktualne zachowanie
Dashboard wykonuje `execSync('python -m bridge.cli advance ...')` — wymaga lokalnego systemu plików.

### Docelowe zachowanie — 3 opcje (wybierz jedną):

**Opcja A: Bridge HTTP API (preferowane)**
Bridge nasłuchuje na `http://127.0.0.1:8199`. Dashboard na Vercelu nie ma dostępu bezpośrednio, ALE:
- Ekspozycja przez Cloudflare Tunnel lub ngrok → Bridge API dostępne publicznie
- Dashboard wysyła request do tunelu → Bridge wykonuje advance → Bridge syncuje do Supabase

**Opcja B: Supabase Function (Edge Function)**
- Dashboard wstawia rekord do `bridge_commands` (Supabase)
- Bridge polling lub Supabase Realtime łapie nową komendę → wykonuje → aktualizuje status

**Opcja C: Dual mode (teraz + przyszłość)**
- Na Vercelu: wstaw command do `bridge_commands` tabeli (async)
- Lokalnie: zachowaj `execSync` jako fallback (instant)

### Rekomendacja
**Opcja C (dual mode)** — najłatwiejsza do implementacji, nie wymaga tunelu, działa od razu.

---

## ✅ Acceptance Criteria

### AC-1: Advance działa na Vercelu (bez Bridge lokalnego)
GIVEN: dashboard na Vercelu, ADMIN zalogowany
WHEN: klika "Advance" na story STORY-7.1 do statusu REVIEW
THEN: komenda zapisana do `bridge_commands` w Supabase, toast "Komenda wysłana — Bridge przetworzy w ciągu minuty"

### AC-2: Advance działa lokalnie (instant — fallback)
GIVEN: dashboard na localhost, `BRIDGE_DIR` ustawione
WHEN: klika "Advance"
THEN: `execSync` jak dotychczas → natychmiastowy rezultat

### AC-3: Bridge przetwarza komendy z Supabase
GIVEN: rekord w `bridge_commands` ze statusem `pending`
WHEN: Bridge sync script uruchomiony (co 5 min lub polling)
THEN: Bridge wykonuje komendę, aktualizuje rekord na `completed` lub `failed`

### AC-4: Start story działa analogicznie
GIVEN: story w statusie READY
WHEN: ADMIN klika "Start" na Vercelu
THEN: komenda `start` w `bridge_commands`, Bridge przetwarza

### AC-5: Tylko ADMIN może advance/start
GIVEN: użytkownik z rolą HELPER
WHEN: POST /api/stories/STORY-7.1/advance
THEN: 403 Forbidden

### AC-6: Frontend pokazuje status komendy
GIVEN: komenda wysłana (pending)
WHEN: user patrzy na UI
THEN: toast "Komenda w kolejce..." → po przetworzeniu → dane odświeżone

---

## 🗄️ Nowa tabela: bridge_commands

```sql
CREATE TABLE IF NOT EXISTS bridge_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL DEFAULT 'kira-dashboard',
  story_id    TEXT NOT NULL,
  command     TEXT NOT NULL,     -- 'advance' | 'start'
  payload     JSONB NOT NULL,   -- {"status": "REVIEW"} | {}
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|completed|failed
  result      JSONB,            -- output po wykonaniu
  error       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE bridge_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_commands" ON bridge_commands
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN'));
```

## ⚙️ Szczegóły Backend

### API Route (dual mode)

```typescript
// app/api/stories/[id]/advance/route.ts
export async function POST(request, { params }) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const { id } = await params
  const { status } = await request.json()

  // Mode 1: Local Bridge (if available)
  const bridgeDir = process.env['BRIDGE_DIR']
  if (bridgeDir) {
    // Istniejąca logika execSync
    const result = runBridgeCLI(bridgeDir, 'advance', id, status)
    return NextResponse.json({ ok: true, mode: 'local', result })
  }

  // Mode 2: Supabase command queue (Vercel)
  const supabase = await createClient()
  const { error } = await supabase
    .from('bridge_commands')
    .insert({
      story_id: id,
      command: 'advance',
      payload: { status },
      created_by: auth.user.id,
    })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    mode: 'queued',
    message: 'Komenda w kolejce — Bridge przetworzy w ciągu minuty',
  })
}
```

### Bridge command processor (Python — dodaj do sync script)

```python
def process_commands(supabase, bridge_dir):
    """Fetch pending commands from Supabase and execute them."""
    resp = supabase.table('bridge_commands') \
        .select('*') \
        .eq('status', 'pending') \
        .order('created_at') \
        .limit(10) \
        .execute()

    for cmd in resp.data:
        try:
            supabase.table('bridge_commands').update({
                'status': 'processing'
            }).eq('id', cmd['id']).execute()

            if cmd['command'] == 'advance':
                result = subprocess.run(
                    ['python', '-m', 'bridge.cli', 'advance',
                     '--project', cmd['project_id'],
                     '--to', cmd['payload']['status'],
                     cmd['story_id']],
                    cwd=bridge_dir, capture_output=True, text=True, timeout=30
                )
            elif cmd['command'] == 'start':
                result = subprocess.run(
                    ['python', '-m', 'bridge.cli', 'start-story', cmd['story_id']],
                    cwd=bridge_dir, capture_output=True, text=True, timeout=30
                )

            supabase.table('bridge_commands').update({
                'status': 'completed',
                'result': {'stdout': result.stdout, 'returncode': result.returncode},
                'processed_at': datetime.now(timezone.utc).isoformat(),
            }).eq('id', cmd['id']).execute()

        except Exception as e:
            supabase.table('bridge_commands').update({
                'status': 'failed',
                'error': str(e),
                'processed_at': datetime.now(timezone.utc).isoformat(),
            }).eq('id', cmd['id']).execute()
```

---

## ⚠️ Edge Cases

### EC-1: Duplikat komendy (user klika 2x szybko)
Scenariusz: dwa pending commands dla tego samego story
Oczekiwane zachowanie: Bridge wykonuje oba — drugi może failować (story already in status X). OK.

### EC-2: Bridge offline — komendy w kolejce
Scenariusz: Mac Mini wyłączony, komendy pending >1h
Oczekiwane zachowanie: komendy czekają. Po restart Bridge — przetworzone. UI: "Oczekuje na Bridge..."

### EC-3: Vercel cold start — `BRIDGE_DIR` undefined
Scenariusz: env var nie ustawiona na Vercelu (celowo — nie ma Bridge)
Oczekiwane zachowanie: automatyczny fallback na Supabase queue mode

### EC-4: Race condition — advance + sync
Scenariusz: user advance'uje → Bridge przetwarza → ale stary sync jeszcze nie zaktualizował Supabase
Oczekiwane zachowanie: UI pokazuje optimistic update (jak dotychczas), Supabase dogania po sync

---

## 🚫 Out of Scope
- Cloudflare Tunnel / ngrok setup (EPIC-13 nice-to-have)
- Bulk operations przez command queue
- Real-time notification po przetworzeniu (EPIC-13)

---

## ✔️ Definition of Done
- [ ] Tabela `bridge_commands` w Supabase
- [ ] Advance działa na Vercelu (queue mode)
- [ ] Advance działa lokalnie (execSync fallback)
- [ ] Start story działa analogicznie
- [ ] Bridge command processor w sync script
- [ ] Tylko ADMIN może wysyłać komendy (RLS + requireAdmin)
- [ ] Toast informujący o trybie (instant vs queued)
- [ ] Testy: unit test advance route z mockiem Supabase
- [ ] Story review przez PO
