# KiraBoard — Inspiracje z Open Source + Backup Review

## 1. Co zachowujemy z istniejących plików projektu

### kira-dashboard-mockup-v3.html — ZACHOWAĆ CAŁOŚĆ ✅

Ten plik to **złoto**. Zawiera kompletny, przetestowany design system:
- Pełna paleta kolorów CSS (#0d0c1a, #1a1730, #818cf8, #2a2540, #4ade80, #f87171, #fbbf24)
- Dwupoziomowy sidebar (icon rail 54px + side nav 198px) — gotowe CSS
- Stat cards, model cards z sparkline, pipeline rows, eval bars — pixel-perfect
- Activity feed z timeline dots, patterns/lessons cards, NightClaw card
- Modal story detail, toast notifications
- Chart.js konfiguracja (velocity, cost, sparklines)

**Jak użyć:** Kiedy będziemy budować React pages, ten mockup to nasz design reference. CSS z mockupu → Tailwind classes w _shared/tailwind.config.ts. Layouts → React components.

### EPICi (1-12) — ZACHOWAĆ JAKO REFERENCE ✅

Wszystkie EPICi zostają w projekcie jako knowledge base. EPIC-0 (nowy) je "nadpisuje" architekturalnie, ale stories z EPIC-5, 6, 7, 8, 9 mają **szczegółowe implementacje API** (request/response types, walidacja, error handling) których warto użyć 1:1 w React pages `api.cjs` files.

Najcenniejsze fragmenty do copy-paste:
- **EPIC-6** (Pipeline PRD): Pełna specyfikacja Claude API prompts, prd-questions/create-from-prd endpoint specs
- **EPIC-8** (Patterns): Parser markdown → JSON, typy PatternCard/Lesson, kolory severity
- **EPIC-9** (NightClaw): Endpoint specs dla digest/research/skills-diff
- **EPIC-10** (Settings): System status API specs, user management CRUD

---

## 2. Projekty Open Source — inspiracje i pomysły do wbudowania

### 🥇 Dashy (24K stars) — dashy.to
**Co robi:** Self-hosted personal dashboard, status checking, 50+ widgetów, themes, editor UI, multi-page.

**Co wziąć dla KiraBoard:**
- **Status checking** — Dashy ma wbudowany health check per service (ping, HTTP status code, response time). KiraBoard mógłby mieć widget `service-health` który automatycznie pinguje listę URL-i i pokazuje zielony/czerwony/żółty status. Prosty do zrobienia, ogromna wartość.
- **Icon packs** — Dashy ma integrację z ponad 3000 ikon (Material Design, Font Awesome, SI). Moglibyśmy dodać icon picker do naszych widgetów.
- **Keyboard shortcuts** — Dashy ma globalne skróty (search, navigate, toggle sections). Warto mieć w KiraBoard: `/` = search, `Ctrl+1-9` = switch page.

### 🥇 Beszel (19K stars) — beszel.dev
**Co robi:** Lightweight server monitoring z historical data, Docker stats, alerts. PocketBase backend.

**Co wziąć:**
- **Alert system** — konfigurowalne alerty na CPU/memory/disk z progami (warning/critical). KiraBoard mógłby mieć alert rules: "jeśli Bridge nie odpowiada > 5 min → toast + email". Proste do zrobienia w sync script.
- **Historical data charts** — Beszel ma piękne time-series charts z zoom i range selection. Warto zaimplementować podobne dla Bridge runs (7d/30d/90d).
- **Container monitoring cards** — czyste UI cards z status per Docker container. Reuse pattern dla OpenClaw/Bridge/NightClaw status.

### 🥈 KitchenOwl (1.2K stars) — kitchenowl.com
**Co robi:** Self-hosted grocery list + recipe manager. Flask + Flutter.

**Co wziąć dla Home module:**
- **Smart suggestions** — KitchenOwl uczy się co kupujesz najczęściej i sugeruje itemy. KiraBoard mógłby trackować historię zakupów i na górze listy pokazywać "Najczęściej kupowane" — zero AI, zwykły `COUNT(*) GROUP BY name ORDER BY count DESC LIMIT 5`.
- **Kategorie z emoji** — 🥬 Warzywa, 🥛 Nabiał, 🍞 Pieczywo, 🧴 Chemia. Proste, ale sprawia że lista jest natychmiast czytelna na telefonie.
- **Offline PWA support** — KitchenOwl działa offline. Dla Angeliki w sklepie to kluczowe. Nasz Home page mógłby cache'ować shopping list w localStorage z sync kiedy online.

### 🥈 Grocy (7K stars) — grocy.info
**Co robi:** ERP domowy — zakupy, obowiązki, przepisy, kalendarz, śledzenie dat ważności.

**Co wziąć:**
- **Chores tracking** — Grocy ma system obowiązków domowych z scheduling, assignment per person, tracking kiedy ostatnio zrobione. To świetne rozszerzenie naszego Kanban — zamiast ręcznego tworzenia zadań "Odkurzanie" co tydzień, system automatycznie tworzy recurring tasks.
- **Calendar view** — integracja obowiązków + zakupów + zadań w jednym kalendarzu. LobsterBoard ma widget Calendar (iCal) — możemy rozszerzyć go o lokalne eventy z tasks/shopping.
- **Feature flags** — Grocy pozwala wyłączać moduły które nie potrzebujesz. Dobry pattern: Mariusz widzi 9 pages, Angelika 2, a nieużywane można ukryć w settings.

### 🥈 Planka (12K stars) — planka.app
**Co robi:** Open source Trello alternative. Real-time Kanban.

**Co wziąć:**
- **Real-time sync** — Planka synchronizuje board w real-time między userami. Kluczowe dla naszego Kanban — Angelika dodaje zadanie, Zuza widzi je natychmiast. Implementacja: Supabase Realtime subscriptions (mamy to w planie).
- **Card detail modal** — Rich card z checklist, attachments, comments, due dates, labels. Nasz TaskCard mógłby mieć uproszczoną wersję: title, description, due date, assigned_to, priority badge.
- **Board permission model** — Planka ma per-board permissions. Uproszczona wersja: tasks board widoczny dla wszystkich, ale "edit" wymaga home_plus lub admin role.

### 🥉 Vikunja (4K stars) — vikunja.io
**Co robi:** Self-hosted to-do z list/kanban/gantt/table views.

**Co wziąć:**
- **Multiple views** — ta sama lista zadań pokazana jako List, Kanban, lub Calendar. Nasz Home Tasks mógłby mieć toggle: 📋 Lista | 📊 Kanban | 📅 Kalendarz. Na telefonie domyślnie Lista (prostsze), na desktopie Kanban.
- **Quick-add** — Vikunja ma inline quick-add z natural language parsing ("Kupić mleko jutro" → task z due date). Proste regex parsing, duży UX win.
- **Todoist import** — jeśli rodzina używa jakiegoś todo app, import byłby fajny, ale niska prioretyt.

### 🥉 Nullboard — nullboard.io
**Co robi:** Single-page minimalist kanban. Zero dependencies, jeden plik HTML.

**Co wziąć:**
- **Simplicity pattern** — Nullboard jest tak prosty że nie potrzebuje instrukcji. Nasz Home kanban powinien być równie intuicyjny: otwierasz → widzisz 3 kolumny → drag & drop → gotowe. Zero onboardingu.
- **localStorage backup** — Nullboard trzyma wszystko w localStorage z eksportem do JSON. Dobry pattern na offline fallback.

---

## 3. Pomysły na unikalne features KiraBoard

Na podstawie researchu i tego co konkurencja NIE ma:

### 💡 Feature 1: "Smart Morning Briefing" (widget)
Każdego ranka widget który agreguje:
- Co NightClaw zrobił w nocy (1-liner summary)
- Ile tasks do zrobienia dziś (z due dates)
- Co jest na liście zakupów (count)
- Status Bridge/OpenClaw (green/red)
- Pogoda na dziś

Jeden rzut oka — wiesz wszystko. Żaden z researched dashboardów tego nie robi.

### 💡 Feature 2: "Family Activity Feed" (shared)
Grocy i Planka mają activity per-user. My możemy zrobić **shared family feed**:
- "Angelika dodała Mleko do zakupów" (2 min temu)
- "Zuza oznaczyła 'Odkurzanie' jako Done" (15 min temu)
- "Kira zakończyła STORY-8.3" (1h temu)
- "NightClaw znalazł nowy pattern" (6h temu)

Jeden stream wszystkiego co się dzieje. Mariusz widzi aktywność pipeline + rodziny. Angelika widzi aktywność rodziny. Powerful.

### 💡 Feature 3: "Quick Actions" (mobile FAB)
Na mobile Home, floating action button z 3 szybkimi akcjami:
- ➕ Dodaj do zakupów (otwiera input z auto-suggest)
- ✅ Szybkie zadanie (title + assign + done)
- 📸 Zeskanuj (camera → OCR → dodaj itemy do listy)

Trzecia opcja (OCR) to ambitne, ale realne z Tesseract.js na kliencie.

### 💡 Feature 4: "Recurring Tasks" (a la Grocy Chores)
Zamiast ręcznego tworzenia "Pranie" co tydzień:
```json
{
  "title": "Pranie",
  "recurrence": "weekly",
  "assigned_to": "rotate",  // Zuza → Iza → Zuza...
  "auto_create": true
}
```
Sync script automatycznie tworzy task w kolumnie "todo" gdy nadchodzi termin. Proste do zrobienia w sync_to_supabase.js cron.

### 💡 Feature 5: "Dashboard Presets per Role"
LobsterBoard ma template gallery. Rozszerzenie: **preset per role**.
- Mariusz loguje się → ładuje "Admin Dashboard" template (Pipeline widgets + AI Usage + System Health)
- Angelika loguje się → ładuje "Home Dashboard" template (Shopping + Tasks + Calendar + Weather)
- Konfigurowalny — każdy user może customizować swój dashboard, ale default jest sensowny.

---

## 4. Podsumowanie priorytetów

### WBUDOWAĆ w Fazę 0-1 (niski koszt, wysoka wartość):
- Kategorie z emoji w shopping list (KitchenOwl)
- Service health check widget (Dashy pattern)
- Keyboard shortcuts (Dashy)
- Morning briefing widget

### WBUDOWAĆ w Fazę 3 (Home module):
- Smart suggestions "najczęściej kupowane" (KitchenOwl)
- Multiple views toggle Lista/Kanban/Kalendarz (Vikunja)
- Recurring tasks (Grocy Chores)
- Family Activity Feed
- Quick-add z inline parsing (Vikunja)
- Mobile FAB z quick actions
- Offline PWA cache dla shopping list

### ROZWAŻYĆ w przyszłości:
- Dashboard presets per role
- OCR scan → shopping list
- Alert rules (email/push) inspirowane Bezsel
- Todoist/Google Tasks import
