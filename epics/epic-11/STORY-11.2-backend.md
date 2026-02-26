---
story_id: STORY-11.2
title: "Developer konfiguruje automatyczny preview deploy na Vercel przy każdym PR"
epic: EPIC-11
module: ci-cd
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-11.1, STORY-11.6
blocks: STORY-11.5
tags: [ci, github-actions, vercel, preview-deploy]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby każdy PR automatycznie dostawał unikalny preview URL na Vercelu
**Żeby** móc weryfikować zmiany wizualnie przed merge bez ręcznego deploy

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`.github/workflows/preview.yml` — nowy workflow

### Powiązane pliki
- `.github/workflows/ci.yml` (STORY-11.1) — CI musi przejść przed deploy
- `STORY-11.6` — secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### Stan systemu przed tą story
- STORY-11.1 DONE — CI workflow działa
- STORY-11.6 DONE — secrets skonfigurowane w GitHub

---

## ✅ Acceptance Criteria

### AC-1: Preview deploy uruchamia się na PR
GIVEN: developer otwiera lub aktualizuje PR do `main`
WHEN: GitHub wykrywa zdarzenie `pull_request` (types: opened, synchronize, reopened)
THEN: workflow `preview.yml` startuje automatycznie

### AC-2: Deploy tworzy unikalny URL
GIVEN: workflow uruchomiony na PR
WHEN: Vercel CLI buduje i deployuje kod z brancha PR
THEN: zwracany jest unikalny preview URL w formacie `https://kira-dashboard-git-[branch]-[org].vercel.app`

### AC-3: URL pojawia się jako komentarz w PR
GIVEN: deploy zakończony sukcesem
WHEN: GitHub Actions bot zamieszcza komentarz w PR
THEN: komentarz zawiera preview URL, datę deploy i link do Vercel dashboard

### AC-4: Preview używa produkcyjnych env vars Supabase
GIVEN: preview deploy uruchomiony
WHEN: aplikacja ładuje się na preview URL
THEN: połączenie z Supabase działa (ten sam projekt, te same klucze co produkcja)

### AC-5: Fail w CI blokuje preview deploy
GIVEN: CI workflow (lint/test) zakończony failem
WHEN: PR jest aktualizowany
THEN: preview workflow nie startuje (uses `needs: ci` dependency)

---

## ⚙️ Szczegóły Backend

### Struktura workflow

```yaml
# .github/workflows/preview.yml
name: Preview Deploy

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Deploy to Vercel (Preview)
        id: deploy
        run: |
          DEPLOY_URL=$(npx vercel --token ${{ secrets.VERCEL_TOKEN }} --yes 2>&1 | tail -1)
          echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 **Preview deploy gotowy!**\n\n🔗 URL: ${{ steps.deploy.outputs.url }}\n\n_Deploy z brancha \`${{ github.head_ref }}\` — ${new Date().toISOString()}_`
            })
```

### Wymagane GitHub Secrets
| Secret | Wartość |
|--------|---------|
| `VERCEL_TOKEN` | token z Vercel dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | z `.vercel/project.json` po `vercel link` |
| `VERCEL_PROJECT_ID` | z `.vercel/project.json` po `vercel link` |

### Jak uzyskać ORG_ID i PROJECT_ID
```bash
cd /Users/mariuszkrawczyk/codermariusz/kira-dashboard
vercel link --token $VERCEL_TOKEN
cat .vercel/project.json
# {"orgId": "...", "projectId": "..."}
```

---

## ⚠️ Edge Cases

### EC-1: Vercel CLI zwraca więcej niż jeden URL w output
Scenariusz: `tail -1` łapie inną linię niż URL
Oczekiwane zachowanie: użyj `vercel --token ... --yes 2>/dev/null | grep "https://"` jako fallback

### EC-2: PR z fork repo — brak dostępu do secrets
Scenariusz: zewnętrzny PR nie ma dostępu do `secrets.VERCEL_TOKEN`
Oczekiwane zachowanie: workflow skips gracefully — dodaj `if: github.event.pull_request.head.repo.full_name == github.repository`

### EC-3: Vercel build fail (błąd w kodzie)
Scenariusz: `next build` failuje na Vercelu
Oczekiwane zachowanie: job kończy się `failure`, komentarz w PR informuje o błędzie budowania

---

## 🚫 Out of Scope tej Story
- Production deploy (STORY-11.3)
- E2E testy na preview (STORY-11.4)
- Usuwanie starych preview deployów (nice-to-have)

---

## ✔️ Definition of Done
- [ ] Plik `.github/workflows/preview.yml` istnieje
- [ ] Na każdy PR tworzony jest unikalny preview URL na Vercelu
- [ ] URL pojawia się jako komentarz bota w PR
- [ ] Preview aplikacja łączy się z Supabase (auth działa)
- [ ] Deploy nie startuje gdy CI fail
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
