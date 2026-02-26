---
story_id: STORY-11.5
title: "Developer konfiguruje branch protection rules i required status checks na main"
epic: EPIC-11
module: ci-cd
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 1h
depends_on: STORY-11.1, STORY-11.2, STORY-11.3, STORY-11.4
blocks: none
tags: [ci, github, branch-protection, security]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby branch `main` był chroniony i wymagał zielonych status checks przed merge
**Żeby** przypadkowy push lub merge z czerwonymi testami nie trafił na produkcję

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
GitHub repo → Settings → Branches → Branch protection rules dla `main`

Opcjonalnie: `.github/branch-protection.json` (dokumentacja reguł, nie jest automatycznie stosowany)

### Stan systemu przed tą story
- STORY-11.1 DONE — CI workflow (lint, typecheck, test)
- STORY-11.2 DONE — preview deploy
- STORY-11.3 DONE — production deploy
- STORY-11.4 DONE — E2E testy

---

## ✅ Acceptance Criteria

### AC-1: Bezpośredni push do main zablokowany
GIVEN: developer próbuje `git push origin main` bezpośrednio (bez PR)
WHEN: GitHub sprawdza branch protection
THEN: push jest odrzucony z komunikatem "protected branch hook declined"

### AC-2: Merge wymaga zielonych status checks
GIVEN: PR z czerwonym CI (lint fail lub testy fail)
WHEN: developer próbuje kliknąć "Merge pull request"
THEN: przycisk jest szary/zablokowany, widoczna lista failujących checks

### AC-3: Wymagane status checks: lint, typecheck, test
GIVEN: PR otwarty
WHEN: sprawdzasz sekcję "Required checks" w PR
THEN: widoczne checkboxy dla: `lint`, `typecheck`, `test` (z workflow CI)

### AC-4: PR wymaga co najmniej 1 review (opcjonalne — do decyzji Mariusza)
GIVEN: PR gotowy do merge
WHEN: nikt nie zatwierdził PR
THEN: merge zablokowany do czasu approval (jeśli włączone)

### AC-5: Stale approvals są odwoływane po nowym pushu
GIVEN: PR z approval, developer pushuje nowy commit
WHEN: GitHub wykrywa nowy commit na branchu PR
THEN: poprzedni approval jest odwoływany — wymagana ponowna review

---

## ⚙️ Szczegóły Backend

### Konfiguracja branch protection (przez GitHub UI lub API)

**GitHub UI:** Settings → Branches → Add rule → Branch name pattern: `main`

```
✅ Require a pull request before merging
  ✅ Require approvals: 0 (lub 1 jeśli chcesz review)
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Required status checks:
    - lint (workflow: CI)
    - typecheck (workflow: CI)
    - test (workflow: CI)

✅ Do not allow bypassing the above settings
❌ Allow force pushes (wyłączone)
❌ Allow deletions (wyłączone)
```

### Alternatywnie — GitHub API (do automatyzacji)

```bash
# Skrypt do ustawienia branch protection via API
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/CoderMariusz/kira-dashboard/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["lint", "typecheck", "test"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": null,
    "restrictions": null
  }'
```

### Dokumentacja reguł (opcjonalnie)

```json
// .github/branch-protection.json
{
  "branch": "main",
  "required_checks": ["lint", "typecheck", "test"],
  "require_pr": true,
  "allow_force_push": false,
  "allow_delete": false,
  "enforce_admins": false,
  "note": "Skonfigurowane manualnie przez STORY-11.5"
}
```

---

## ⚠️ Edge Cases

### EC-1: Mariusz chce pushować bezpośrednio do main (hotfix)
Scenariusz: krytyczny bugfix — brak czasu na PR
Oczekiwane zachowanie: `enforce_admins: false` — admin może ominąć protection. Nie rekomendowane jako rutyna.

### EC-2: Status checks nie pojawiają się na liście wymaganych
Scenariusz: workflow jeszcze nie był uruchomiony — GitHub nie zna nazw jobów
Oczekiwane zachowanie: uruchom workflow raz ręcznie (push do jakiegoś brancha), potem status checks pojawią się na liście

### EC-3: Brak review requirement — merge bez code review
Scenariusz: solo developer, review requirement zbędny
Oczekiwane zachowanie: `required_pull_request_reviews: null` — brak wymagania review, tylko CI musi być zielony

---

## 🚫 Out of Scope tej Story
- Required reviews (decyzja Mariusza — domyślnie wyłączone)
- Code owners (CODEOWNERS file)
- Signed commits requirement

---

## ✔️ Definition of Done
- [ ] Branch protection rule dla `main` aktywna w GitHub repo
- [ ] Bezpośredni push do `main` zablokowany
- [ ] Merge wymaga zielonych: lint, typecheck, test
- [ ] Force push wyłączony
- [ ] Usunięcie brancha `main` zablokowane
- [ ] Story review przez PO
