/**
 * app/api/nightclaw/research/route.ts
 * STORY-9.4 — GET /api/nightclaw/research
 *
 * Lists and returns all .md files from the NightClaw solutions/ directory.
 * Skips _pending-apply.md (internal file).
 * Each file includes: filename, title, preview, content, modified_at.
 * Sorted by modified_at descending (newest first).
 *
 * Auth: requireAuth — 401 for unauthenticated requests.
 * Missing / empty dir: { files: [] } (not 500).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { Dirent } from 'fs'
import { requireAuth } from '@/lib/auth/requireRole'
import type { RequireAuthResult } from '@/lib/auth/requireRole'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearchFile {
  filename: string
  title: string
  preview: string
  content: string
  modified_at: string
}

interface ResearchResponse {
  files: ResearchFile[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const KIRA_DIR = process.env.KIRA_DIR || '/Users/mariuszkrawczyk/codermariusz/kira'
const SOLUTIONS_DIR = `${KIRA_DIR}/.kira/nightclaw/solutions`

const SKIP_FILE = '_pending-apply.md'
const PREVIEW_MAX_CHARS = 200
const PREVIEW_MAX_LINES = 3

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Type guard: auth result is an error response */
function isErrorResponse(result: RequireAuthResult): result is NextResponse {
  return result instanceof Response
}

/**
 * Extract the title from file content.
 * Returns the text of the first line starting with '#', stripped of '#' and whitespace.
 * Falls back to filename without '.md' extension.
 */
function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      // Strip all leading '#' chars and surrounding whitespace
      return trimmed.replace(/^#+\s*/, '').trim()
    }
  }
  // Fallback: filename without .md
  return filename.replace(/\.md$/, '')
}

/**
 * Extract preview: first 3 non-header, non-empty lines joined with ' ', max 200 chars.
 * Headers are lines starting with '#'.
 */
function extractPreview(content: string): string {
  const lines = content.split('\n')
  const nonHeaderLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip headers and blank lines
    if (!trimmed || trimmed.startsWith('#')) continue
    nonHeaderLines.push(trimmed)
    if (nonHeaderLines.length >= PREVIEW_MAX_LINES) break
  }

  const joined = nonHeaderLines.join(' ')
  return joined.length > PREVIEW_MAX_CHARS ? joined.slice(0, PREVIEW_MAX_CHARS) : joined
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req?: Request): Promise<Response> {
  // 1. Auth check
  const authResult = await requireAuth(req)
  if (isErrorResponse(authResult)) return authResult

  // 2. Read solutions directory — graceful on ENOENT
  let entries: Dirent[]
  try {
    entries = await readdir(SOLUTIONS_DIR, { withFileTypes: true }) as Dirent[]
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      return NextResponse.json<ResearchResponse>({ files: [] })
    }
    throw err
  }

  // 3. Filter: only .md files, skip _pending-apply.md, skip non-files
  const mdEntries = entries.filter(
    (e) => e.isFile() && (e.name as string).endsWith('.md') && e.name !== SKIP_FILE
  )

  if (mdEntries.length === 0) {
    return NextResponse.json<ResearchResponse>({ files: [] })
  }

  // 4. Read each file + stat in parallel, skip on error
  const fileResults = await Promise.all(
    mdEntries.map(async (entry): Promise<ResearchFile | null> => {
      const filePath = `${SOLUTIONS_DIR}/${entry.name}`
      try {
        const [content, fileStat] = await Promise.all([
          readFile(filePath, 'utf-8'),
          stat(filePath).catch(() => null),
        ])

        const modified_at = fileStat
          ? fileStat.mtime.toISOString()
          : new Date().toISOString()

        const entryName = entry.name as string
        return {
          filename: entryName,
          title: extractTitle(content, entryName),
          preview: extractPreview(content),
          content,
          modified_at,
        }
      } catch {
        // Skip files that can't be read
        return null
      }
    })
  )

  // 5. Filter nulls (skipped files)
  const files = fileResults.filter((f): f is ResearchFile => f !== null)

  // 6. Sort by modified_at descending (newest first)
  files.sort((a, b) => {
    const aTime = new Date(a.modified_at).getTime()
    const bTime = new Date(b.modified_at).getTime()
    return bTime - aTime
  })

  return NextResponse.json<ResearchResponse>({ files })
}
