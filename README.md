# 🏠 Kira Family Dashboard

Family task management PWA with Kanban boards and shopping lists - powered by Kira AI.

## Features

- **Kanban Boards**: 🏠 Dom (3 columns) & 💼 Praca (4 columns)
- **Shopping Lists**: Categorized with progress tracking
- **Real-time Sync**: Changes visible instantly to all users
- **Kira Integration**: Add tasks via natural language
- **PWA**: Installable, works offline

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **UI**: Tailwind CSS + shadcn/ui
- **DnD**: @dnd-kit
- **State**: Zustand + React Query

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service key (server-side) |
| `KIRA_API_KEY` | API key for Kira webhook |

## Deployment

Deployed on [Vercel](https://vercel.com). Push to `main` for auto-deploy.

---

Built with ❤️ by Mariusz & Kira 🦊
