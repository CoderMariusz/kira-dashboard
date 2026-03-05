---
story_id: STORY-0.7
title: "React Pages scaffold — _shared + Vite build infra"
epic: EPIC-0
module: infrastructure
domain: infrastructure
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-0.1]
blocks: [STORY-0.9]
tags: [react, vite, scaffold, infrastructure, frontend-infra]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć gotowy scaffold `pages/_shared/` z React/Tailwind/shadcn i działający przykład `pages/_example/`
**Żeby** każda kolejna React page (EPIC-2, EPIC-3, EPIC-4 itd.) mogła być zbudowana i serwowana przez KiraBoard bez dodatkowej konfiguracji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
```
pages/
├── _shared/          ← wspólne zależności i komponenty
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components/ui/  (button, card, input, dialog, badge, toast)
│   ├── hooks/          (useAuth.ts, useApi.ts)
│   ├── lib/cn.ts
│   └── types/index.ts
└── _example/         ← działająca example page
    ├── page.json
    ├── index.html
    ├── src/main.tsx
    ├── src/App.tsx
    ├── vite.config.ts
    ├── package.json
    └── dist/         ← po build
```

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo istnieje
- Node.js ≥ 18, npm dostępny
- Vite + React + Tailwind do zainstalowania per page

---

## ✅ Acceptance Criteria

### AC-1: _example build się pomyślnie
GIVEN: `pages/_example/` istnieje z `package.json` i `vite.config.ts`
WHEN: Wykonasz `cd pages/_example && npm install && npm run build`
THEN: Generuje `dist/index.html` bez błędów

### AC-2: _example serwowany przez KiraBoard server
GIVEN: `dist/index.html` zbudowany, server uruchomiony
WHEN: Otworzysz `http://localhost:8080/pages/_example/` lub `http://localhost:8080/pages/_example/dist/`
THEN: Strona ładuje się z React componentem "Hello KiraBoard"

### AC-3: _shared alias działa w _example
GIVEN: `vite.config.ts` skonfigurowany z aliasem `@shared`
WHEN: `pages/_example/src/App.tsx` importuje `import { cn } from '@shared/lib/cn'`
THEN: Build nie rzuca błędów TypeScript

### AC-4: Tailwind styles ładowane w przykładzie
GIVEN: `_example` ma `tailwind.config.ts` wskazujący na `_shared`
WHEN: App.tsx używa klas Tailwind (np. `className="bg-gray-900 text-white p-4"`)
THEN: Styles są widoczne w przeglądarce po build

---

## 🔧 Szczegóły implementacji

### `pages/_shared/package.json`
```json
{
  "name": "@kiraboard/shared",
  "private": true,
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

### `pages/_shared/lib/cn.ts`
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### `pages/_shared/hooks/useAuth.ts`
```typescript
import { useState, useEffect } from 'react';

interface User { name: string; role: string; avatar: string; }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('kiraboard_token');
    if (!token) { setLoading(false); return; }
    
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setUser(data.user); setLoading(false); })
      .catch(() => { localStorage.removeItem('kiraboard_token'); setLoading(false); });
  }, []);
  
  return { user, loading, isAdmin: user?.role === 'admin' };
}
```

### `pages/_shared/hooks/useApi.ts`
```typescript
export function useApi() {
  const token = localStorage.getItem('kiraboard_token');
  
  const apiFetch = async (path: string, options?: RequestInit) => {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  };
  
  return { apiFetch };
}
```

### `pages/_example/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/pages/_example/dist/',
  resolve: {
    alias: { '@shared': path.resolve(__dirname, '../_shared') },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
```

### `pages/_example/page.json`
```json
{ "title": "Example", "icon": "🧪", "order": 99, "hidden": true }
```

### `pages/_example/src/App.tsx`
```tsx
import { useAuth } from '@shared/hooks/useAuth';
import { cn } from '@shared/lib/cn';

export default function App() {
  const { user, loading } = useAuth();
  return (
    <div className={cn('min-h-screen bg-gray-900 text-white p-8')}>
      <h1 className="text-3xl font-bold text-indigo-400">Hello KiraBoard 🦊</h1>
      {loading ? <p>Loading...</p> : (
        <p className="mt-4 text-gray-300">
          {user ? `Welcome, ${user.name} (${user.role})` : 'Not authenticated'}
        </p>
      )}
    </div>
  );
}
```

---

## ⚠️ Edge Cases

### EC-1: Konflikt wersji React między _shared i _example
Scenariusz: `_shared/package.json` ma React 19, ale `_example/package.json` też deklaruje React — podwójne instancje
Oczekiwane zachowanie: Vite alias + `resolve.dedupe: ['react', 'react-dom']` w `vite.config.ts` rozwiązuje problem

### EC-2: Tailwind nie generuje klas dla `_shared` componentów
Scenariusz: `tailwind.config.ts` skanuje tylko pliki w `_example/src/`
Oczekiwane zachowanie: `content` w tailwind.config musi zawierać `'../\_shared/**/*.{ts,tsx}'`

---

## 🚫 Out of Scope tej Story
- Treść stron pipeline/home/chat — EPIC-2, EPIC-3, EPIC-4
- shadcn/ui CLI setup (tylko manual component files)
- Server-side rendering
- Module federation

---

## ✔️ Definition of Done
- [ ] `pages/_shared/` istnieje z `package.json`, `tsconfig.json`, `tailwind.config.ts`
- [ ] Shared components: `button.tsx`, `card.tsx`, `input.tsx`, `dialog.tsx`
- [ ] Shared hooks: `useAuth.ts`, `useApi.ts`
- [ ] `pages/_example/` istnieje z `vite.config.ts`, `src/main.tsx`, `src/App.tsx`
- [ ] `cd pages/_example && npm install && npm run build` → sukces
- [ ] `dist/index.html` generuje się
- [ ] KiraBoard server serwuje stronę example
- [ ] `@shared` alias działa w build
- [ ] Tailwind classes renderują się poprawnie
