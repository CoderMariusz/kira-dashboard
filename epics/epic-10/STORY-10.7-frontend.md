---
story_id: STORY-10.7
title: "Widok /settings/users — tabela, role dropdown, delete modal, invite modal"
epic: EPIC-10
domain: frontend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-10.5, STORY-10.2]
blocks: none
tags: [settings, users, table, modal, invite, rbac, frontend]
---

## 🎯 User Story
Admin zarządza użytkownikami przez UI — zmienia role, usuwa, zaprasza nowych.

## Plik
`app/settings/users/page.tsx`

## Layout
```
⚙️ Ustawienia / [Użytkownicy] [System]       ← sub-nav
─────────────────────────────────────────
Użytkownicy                    [+ Zaproś]    ← header
─────────────────────────────────────────
┌─────────────────────────────────────────┐
│ Email          │ Rola    │ Data  │ Akcje │
│ m@test.com     │[ADMIN▼] │15 sty │ [🗑]  │
│ a@test.com     │[HELPER▼]│20 sty │ [🗑]  │
└─────────────────────────────────────────┘
```

## Komponenty

**RoleBadge** — kolorowe badge per rola:
- ADMIN → `bg-[#818cf8]/20 text-[#818cf8] border-[#818cf8]/40`
- HELPER_PLUS → `bg-emerald-500/20 text-emerald-400 border-emerald-500/40`
- HELPER → `bg-slate-500/20 text-slate-400 border-slate-500/40`

**RoleDropdown** (shadcn Select) — zmiana roli inline:
- onChange → `useUsers().updateRole(id, newRole)` + toast "Rola zaktualizowana"
- Zablokowany dla currentUser.id (własna rola niezmienalna)
- Błąd → toast czerwony + rollback

**DeleteButton** — ikona trash → ConfirmModal:
- Tytuł: "Usuń dostęp użytkownika"
- Body: "Czy usunąć dostęp dla **{email}**? Konto Supabase pozostaje."
- Przyciski: "Anuluj" (szary) / "Usuń dostęp" (czerwony)
- Po confirm → `deleteUser(id)` + toast + usunięcie wiersza

**InviteModal** (shadcn Dialog) — otwierany przyciskiem "+ Zaproś":
- Pole email: input + walidacja Zod `z.string().email()`
- Select rola: ADMIN/HELPER_PLUS/HELPER
- Submit → `inviteUser({ email, role })` + toast "Zaproszenie wysłane na {email}" + zamknięcie

## Stany widoku
- Loading: skeleton 3 wiersze tabeli (shimmer)
- Empty: ikona + "Brak użytkowników. Zaproś pierwszą osobę." + przycisk invite
- Error: alert + komunikat PL + "Spróbuj ponownie"
- Filled: tabela jak wyżej

## AC
- Tabela renderuje UserWithRole z email, rolą, datą
- Dropdown zmienia rolę natychmiast (optimistic) + toast
- Własny rekord: dropdown disabled
- Delete z potwierdzeniem → usunięcie wiersza
- Invite modal → wysyłka + toast sukcesu
- Guard: próba wejścia non-ADMIN → /403 (z STORY-10.2)

## DoD
- [ ] Tabela z danymi lub skeleton/empty/error
- [ ] RoleDropdown z optimistic update
- [ ] DeleteModal z potwierdzeniem
- [ ] InviteModal z Zod walidacją i toast
- [ ] Sub-nav Users/System linki działają
- [ ] Mobile 375px bez horizontal scroll
