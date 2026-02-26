# EPIC-11 — CI/CD: GitHub Actions & Automated Deployment

## Cel
Zbudować pełny pipeline CI/CD oparty na GitHub Actions, który:
- uruchamia testy automatycznie na każdy PR i push do `main`
- deployuje preview do Vercel na każdy PR
- deployuje produkcję do Vercel po merge do `main`
- blokuje merge gdy testy fail
- raportuje wyniki w PR jako status checks

## Zakres

### Stories
| ID | Domena | Tytuł | Model |
|----|--------|-------|-------|
| STORY-11.1 | backend | GitHub Actions — CI workflow (lint + typecheck + unit tests) | kimi-k2.5 |
| STORY-11.2 | backend | GitHub Actions — Preview deploy na Vercel przy PR | kimi-k2.5 |
| STORY-11.3 | backend | GitHub Actions — Production deploy na Vercel po merge do main | kimi-k2.5 |
| STORY-11.4 | backend | GitHub Actions — E2E Playwright tests w CI | sonnet-4.6 |
| STORY-11.5 | backend | Branch protection rules + required status checks | kimi-k2.5 |
| STORY-11.6 | backend | Secrets management — Vercel + Supabase env vars w GitHub | kimi-k2.5 |

## Tech Stack
- GitHub Actions (YAML workflows)
- Vercel CLI + `amondnet/vercel-action`
- Jest + Playwright w CI
- `actions/cache` dla node_modules

## Out of Scope
- Self-hosted runners
- Docker builds w CI
- Slack/Discord notifications (EPIC-13)
