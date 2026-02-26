---
story_id: STORY-11.6
title: "Developer konfiguruje secrets management — Vercel i Supabase env vars w GitHub"
epic: EPIC-11
module: ci-cd
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 1h
depends_on: none
blocks: STORY-11.2, STORY-11.3, STORY-11.4
tags: [ci, github, secrets, vercel, supabase, security]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby wszystkie wrażliwe klucze (Vercel, Supabase) były bezpiecznie przechowywane w GitHub Secrets
**Żeby** workflows miały dostęp do kluczy bez trzymania ich w plikach repo

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
GitHub repo → Settings → Secrets and variables → Actions

### Stan systemu przed tą story
- Projekt na Vercelu istnieje (`kira-dashboard`)
- Supabase projekt istnieje (klucze w `.env.local` lokalnie)
- Token Vercel znany (z TOOLS.md)

---

## ✅ Acceptance Criteria

### AC-1: Wszystkie wymagane secrets dodane do GitHub
GIVEN: developer wchodzi w GitHub repo → Settings → Secrets → Actions
WHEN: przegląda listę secrets
THEN: widzi wszystkie 7 secrets z tabeli poniżej — żaden nie brakuje

### AC-2: Workflows mają dostęp do secrets
GIVEN: workflow CI/preview/deploy uruchomiony
WHEN: job odwołuje się do `${{ secrets.VERCEL_TOKEN }}`
THEN: wartość jest dostępna — job nie failuje z "secret not found"

### AC-3: Secrets nie są logowane w Actions output
GIVEN: workflow używa secrets
WHEN: przeglądasz logi Actions
THEN: wartości secrets są zamaskowane jako `***`

### AC-4: `.env.local` nie jest w repo
GIVEN: `git status` w kira-dashboard
WHEN: sprawdzasz tracked files
THEN: `.env.local` jest w `.gitignore` i nie jest commitowany

### AC-5: Env vars Supabase dostępne w Next.js na Vercelu
GIVEN: production deploy na Vercelu
WHEN: aplikacja startuje
THEN: `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` są dostępne (ustawione w Vercel dashboard)

---

## ⚙️ Szczegóły Backend

### Lista wymaganych GitHub Secrets

| Secret name | Wartość / Źródło | Używany w |
|-------------|-----------------|-----------|
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens: `kXwfWoZBcge4uoOaW1kKKo4t` | 11.2, 11.3 |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` po `vercel link` | 11.2, 11.3 |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` po `vercel link` | 11.2, 11.3 |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` → wartość `NEXT_PUBLIC_SUPABASE_URL` | 11.1, 11.4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` → wartość `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 11.1, 11.4 |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → API → service_role key | 11.4 (seed) |
| `TEST_USER_EMAIL` | `test@kira.dev` | 11.4 |
| `TEST_USER_PASSWORD` | hasło konta testowego | 11.4 |

### Jak pobrać VERCEL_ORG_ID i PROJECT_ID

```bash
cd /Users/mariuszkrawczyk/codermariusz/kira-dashboard
export VERCEL_TOKEN=kXwfWoZBcge4uoOaW1kKKo4t
npx vercel link --token $VERCEL_TOKEN --yes
cat .vercel/project.json
# {"orgId":"codermariuszs-projects","projectId":"prj_XXXX"}
```

### Dodanie secrets przez GitHub CLI (szybsze niż UI)

```bash
gh secret set VERCEL_TOKEN --body "kXwfWoZBcge4uoOaW1kKKo4t" --repo CoderMariusz/kira-dashboard
gh secret set VERCEL_ORG_ID --body "codermariuszs-projects" --repo CoderMariusz/kira-dashboard
gh secret set VERCEL_PROJECT_ID --body "prj_XXXX" --repo CoderMariusz/kira-dashboard
# itd.
```

### Vercel env vars (osobno od GitHub Secrets)

Env vars dla Vercela ustawiamy RÓWNIEŻ w Vercel dashboard (żeby preview i production deploye miały dostęp):

```bash
# Przez Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production --token $VERCEL_TOKEN
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token $VERCEL_TOKEN
vercel env add SUPABASE_SERVICE_KEY production --token $VERCEL_TOKEN
# Repeat for "preview" environment
```

### .gitignore check

```
# Upewnij się że te wpisy są w .gitignore:
.env
.env.local
.env.*.local
.vercel
```

---

## ⚠️ Edge Cases

### EC-1: `.vercel/project.json` jest commitowany do repo
Scenariusz: po `vercel link` plik jest tracked przez git
Oczekiwane zachowanie: dodaj `.vercel` do `.gitignore` lub zostaw — plik nie zawiera sekretów (tylko IDs)

### EC-2: VERCEL_TOKEN wygasa
Scenariusz: token ma expiry date
Oczekiwane zachowanie: utwórz token bez expiry w Vercel dashboard lub ustaw reminder do rotacji

### EC-3: NEXT_PUBLIC_* secrets widoczne w bundle JS
Scenariusz: `NEXT_PUBLIC_` zmienne są publiczne — widoczne w przeglądarce
Oczekiwane zachowanie: to jest oczekiwane zachowanie dla Supabase ANON key — jest publiczna. Service key (`SUPABASE_SERVICE_KEY`) nigdy nie trafia do `NEXT_PUBLIC_*`.

---

## 🚫 Out of Scope tej Story
- Rotacja sekretów (manual)
- HashiCorp Vault lub AWS Secrets Manager
- Supabase Row Level Security (EPIC-12)

---

## ✔️ Definition of Done
- [ ] Wszystkie 8 secrets dodane do GitHub repo
- [ ] `VERCEL_ORG_ID` i `VERCEL_PROJECT_ID` pobrane i zapisane
- [ ] Env vars dodane w Vercel dashboard (production + preview)
- [ ] `.env.local` i `.vercel` w `.gitignore`
- [ ] Workflow 11.1 uruchomiony testowo — secrets dostępne (brak błędu "secret not found")
- [ ] Konto testowe `test@kira.dev` utworzone w Supabase
- [ ] Story review przez PO
