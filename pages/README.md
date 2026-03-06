# KiraBoard Page Development Guide

This guide explains how to create new React pages for KiraBoard.

## Creating a New Page

### Step 1: Copy the Example Template

```bash
cp -r pages/_example pages/my-page
```

Replace `my-page` with your desired page ID (kebab-case, no spaces).

### Step 2: Configure Page Metadata

Edit `pages/my-page/page.json`:

```json
{
  "title": "My Page",
  "icon": "🚀",
  "order": 10,
  "hidden": false
}
```

| Field | Description |
|-------|-------------|
| `title` | Display name in navigation |
| `icon` | Emoji icon for the page |
| `order` | Sort order in navigation (lower = first) |
| `hidden` | If `true`, page won't appear in nav (but accessible via URL) |

### Step 3: Develop Your React App

Edit `pages/my-page/src/App.tsx`:

```tsx
import { useAuth } from '@shared/hooks/useAuth';
import { useApi } from '@shared/hooks/useApi';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const { apiFetch } = useApi();

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold text-indigo-400">My Page 🚀</h1>
      {user && <p>Welcome, {user.name}!</p>}
      {isAdmin && <p>You have admin privileges.</p>}
    </div>
  );
}
```

### Step 4: Build the Page

```bash
cd pages/my-page
npm install
npm run build
```

This creates `pages/my-page/dist/` with compiled assets.

### Step 5: Restart Server

Pages are auto-discovered on server startup:

```bash
# From project root
node server.cjs
```

Your new page will be available at `http://localhost:8080/pages/my-page/`

---

## Shared Components

Located in `pages/_shared/components/ui/`:

| Component | Import Path | Description |
|-----------|-------------|-------------|
| `Button` | `@shared/components/ui/button` | Styled button with variants |
| `Card` | `@shared/components/ui/card` | Container with header/content/footer |
| `Dialog` | `@shared/components/ui/dialog` | Modal dialog with overlay |
| `Input` | `@shared/components/ui/input` | Form input field |

### Example Usage

```tsx
import { Button } from '@shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Hello</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default">Click me</Button>
  </CardContent>
</Card>
```

---

## Available Hooks

Located in `pages/_shared/hooks/`:

### `useAuth()`

Authentication hook — provides current user info.

```tsx
import { useAuth } from '@shared/hooks/useAuth';

function MyComponent() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Not authenticated</p>;

  return (
    <div>
      <p>Welcome, {user.name} ({user.role})</p>
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

**Returns:**
- `user: User | null` — current user object (`{ name, role, avatar }`)
- `loading: boolean` — true while fetching user data
- `isAdmin: boolean` — true if user role is 'admin'

### `useApi()`

API fetch wrapper — handles authentication headers.

```tsx
import { useApi } from '@shared/hooks/useApi';

function MyComponent() {
  const { apiFetch } = useApi();

  const handleClick = async () => {
    try {
      const data = await apiFetch('/api/tasks');
      console.log(data);
    } catch (err) {
      console.error('API error:', err);
    }
  };

  return <button onClick={handleClick}>Load Tasks</button>;
}
```

**Returns:**
- `apiFetch(path, options?)` — authenticated fetch function
  - Automatically adds `Authorization: Bearer <token>` header
  - Sets `Content-Type: application/json`
  - Throws on non-OK responses

---

## Project Structure

```
pages/
├── _example/           # Template for new pages
│   ├── page.json       # Page metadata
│   ├── package.json    # Dependencies
│   ├── vite.config.ts  # Build configuration
│   └── src/
│       ├── App.tsx     # Main component
│       └── main.tsx    # Entry point
├── _shared/            # Shared resources
│   ├── components/ui/  # Reusable UI components
│   ├── hooks/          # React hooks (useAuth, useApi)
│   ├── lib/            # Utilities (cn, etc.)
│   └── types/          # TypeScript definitions
└── README.md           # This file
```

---

## Tips

1. **Always use shared hooks** — `useAuth` and `useApi` handle auth automatically
2. **Use Tailwind classes** — Dark theme is pre-configured with `bg-gray-900` and `text-white`
3. **Build before testing** — The server serves from `dist/`, not `src/`
4. **Check browser console** — Vite provides helpful error messages during development
