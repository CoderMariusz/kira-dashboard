---
epic_id: EPIC-3
title: "Auth + Multi-User (Rodzina Krawczyków)"
module: auth
status: draft
priority: must
estimated_size: L
risk: medium
---

## 📋 OPIS

EPIC-16 dodaje autentykację i system ról (RBAC) do Kira Dashboard, umożliwiając dostęp dla całej rodziny Krawczyków z różnymi widokami. Mariusz (Admin) widzi pełny pipeline dashboard, Angelika (HELPER+) widzi home dashboard (zakupy, kalendarz, zadania), a Zuza i Iza (HELPER) mają ograniczony widok domowy. Logowanie oparte na Supabase Auth (reuse z archive/), routing po zalogowaniu automatycznie kieruje do odpowiedniego widoku per rola.

## 🎯 CEL BIZNESOWY

Każdy członek rodziny po zalogowaniu widzi swój dedykowany widok w < 2 sekundy — Mariusz pipeline, Angelika home dashboard — bez możliwości dostępu do nieautoryzowanych sekcji.

## 👤 PERSONA

**Mariusz (Admin)** — pełny dostęp do pipeline dashboard, modeli, eval, write operations. Zarządza użytkownikami.
**Angelika (HELPER+)** — widzi home dashboard: lista zakupów, kanban zadań domowych, kalendarz, aktywność. Nie widzi pipeline'u.
**Zuza / Iza (HELPER)** — ograniczony widok: tylko zadania domowe i lista zakupów. Nie widzi analytics ani pipeline'u.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-14: Dashboard foundation — sidebar, layout, routing
- EPIC-15: Write operations + notifications — RBAC potrzebny do kontrolowania kto może startować stories
- Supabase projekt: Auth skonfigurowany (reuse z archive/ — login page, middleware, invite flow)

### Blokuje (ten epic odblokowuje):
- EPIC-17: Home Dashboard Integration — wymaga RBAC routing do widoku Home per rola

## 📦 ZAKRES (In Scope)

- **Supabase Auth integration** — migracja login page, middleware, session management z archive/ do nowego projektu; email/password auth
- **Role system (3 poziomy)** — ADMIN (Mariusz), HELPER_PLUS (Angelika), HELPER (Zuza/Iza); role w `user_metadata` lub dedykowanej tabeli `user_roles` w Supabase
- **RBAC middleware** — Next.js middleware sprawdza rolę z JWT i blokuje nieautoryzowane ścieżki; redirect do odpowiedniego widoku
- **Role-based routing** — po zalogowaniu: ADMIN → `/dashboard` (pipeline), HELPER_PLUS → `/home` (home dashboard), HELPER → `/home/tasks` (ograniczony)
- **Protected routes** — `/dashboard/*` tylko ADMIN, `/home/*` HELPER+ i HELPER, `/home/analytics` tylko ADMIN i HELPER+
- **User management page** — Mariusz (ADMIN) może zapraszać nowych użytkowników, przypisywać role, dezaktywować konta
- **Session management** — auto-refresh tokenu, logout, session timeout 7 dni
- **Conditional sidebar** — sidebar nawigacja adaptuje się do roli: ADMIN widzi Pipeline+Home sekcje, HELPER+ widzi tylko Home, HELPER widzi minimum

## 🚫 POZA ZAKRESEM (Out of Scope)

- **OAuth providers (Google, GitHub)** — email/password wystarczy dla rodziny; OAuth w przyszłości
- **Granularne uprawnienia per story/projekt** — RBAC na poziomie sekcji (pipeline vs home), nie per resource
- **Self-registration** — tylko invite flow przez ADMIN; brak otwartej rejestracji
- **Two-factor authentication** — niepotrzebne dla home use

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Niezalogowany użytkownik jest przekierowany na `/login` z każdej strony
- [ ] Mariusz po zalogowaniu widzi pełny dashboard pipeline z sidebar'em zawierającym wszystkie sekcje
- [ ] Angelika po zalogowaniu trafia na `/home` i nie widzi nawigacji Pipeline/Eval/Models w sidebarze
- [ ] Zuza/Iza po zalogowaniu widzi tylko `/home/tasks` i `/home/shopping` — wejście na `/dashboard` zwraca 403 lub redirect
- [ ] Mariusz może zaprosić nowego użytkownika i przypisać mu rolę z poziomu UI
- [ ] Token sesji auto-refreshuje się; po 7 dniach nieaktywności wymaga ponownego logowania

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-3.1 | database | User roles table + Supabase schema | Tabela `user_roles` (user_id, role, created_at) w Supabase z RLS policy — tylko ADMIN może modyfikować role |
| STORY-3.2 | auth | Supabase Auth setup — login page + middleware migration | Migracja login page, Supabase client, middleware z archive/ do nowego projektu; konfiguracja session refresh i protected routes |
| STORY-3.3 | auth | RBAC middleware — role-based route protection | Next.js middleware czyta rolę z JWT/user_metadata i blokuje dostęp: `/dashboard/*` → ADMIN only, `/home/*` → HELPER+ i HELPER |
| STORY-3.4 | backend | User management API — invite, role assignment, deactivation | Endpointy `POST /api/users/invite`, `PATCH /api/users/[id]/role`, `DELETE /api/users/[id]` z walidacją że caller = ADMIN |
| STORY-3.5 | wiring | Auth hooks + role context provider | Hook `useUser()` z rolą, `usePermissions()` sprawdzający dostęp, `RoleProvider` context; typy Role, Permission |
| STORY-3.6 | frontend | Login page — Supabase auth UI | Strona `/login` z email/password form, error handling, redirect po zalogowaniu per rola; dark theme consistent z dashboardem |
| STORY-3.7 | frontend | Conditional sidebar — nawigacja per rola | Sidebar adaptuje sekcje nawigacji do roli: ADMIN widzi Pipeline+Home, HELPER+ widzi Home+Analytics, HELPER widzi Tasks+Shopping |
| STORY-3.8 | frontend | User management page — invite i role management | Strona `/settings/users` (ADMIN only): lista użytkowników, formularz invite (email + rola), zmiana roli, dezaktywacja konta |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | auth |
| Priorytet | Must |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Średnie — migracja auth z archive/ może wymagać dostosowań do Next.js 16 app router |
| Domeny | database, auth, backend, wiring, frontend |
| Stack | Next.js 16, Supabase Auth, shadcn/ui, Tailwind CSS, TypeScript |
| DB | Supabase (user_roles table + Supabase Auth built-in) |
| Uwagi | Login page i middleware z archive/ to sprawdzony kod — reuse zamiast pisania od zera. Role w user_metadata Supabase lub custom table — do decyzji w STORY-3.1. |
