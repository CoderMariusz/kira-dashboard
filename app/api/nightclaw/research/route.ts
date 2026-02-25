/**
 * app/api/nightclaw/research/route.ts
 * STORY-9.4 — GET /api/nightclaw/research
 *
 * Lists all .md files from solutions/ directory with metadata.
 * Excludes _pending-apply.md (internal file).
 *
 * Auth: requireAuth — 401 for unauthenticated requests.
 * Empty/missing directory: { files: [] } (not 500).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
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

// ─── File paths ───────────────────────────────────────────────────────────────

const KIRA_DIR = process.env.KIRA_DIR || '/Users/mariuszkrawczyk/codermariusz/kira'
const SOLUTIONS_DIR = `${KIRA_DIR}/.kira/nightclaw/solutions`

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Type guard: auth result is an error response */
function isErrorResponse(result: RequireAuthResult): result is NextResponse {
  return result instanceof Response
}

/** Check if filename is a valid research file (ends with .md, not _pending-apply.md) */
function isValidResearchFile(filename: string | { name: string }): boolean {
  const name = typeof filename === 'string' ? filename : filename.name
  return name.endsWith('.md') && name !== '_pending-apply.md'
}

/** Extract title from first # header, or use filename without .md */
function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/)
    if (match) {
      return match[1]!.trim()
    }
  }
  // Fallback: filename without .md extension
  return filename.replace(/\.md$/, '')
}

/** Extract preview: first 3 non-header lines, max 200 chars */
function extractPreview(content: string): string {
  const lines = content.split('\n')
  const nonHeaderLines: string[] = []

  for (const line of lines) {
    // Skip header lines (starting with #)
    if (/^#+\s*/.test(line)) {
      continue
    }
    // Skip empty lines
    if (line.trim().length === 0) {
      continue
    }
    nonHeaderLines.push(line.trim())
    if (nonHeaderLines.length >= 3) {
      break
    }
  }

  const preview = nonHeaderLines.join(' ')
  return preview.length > 200 ? preview.slice(0, 200) : preview
}

/** Get file stats, returning null on error */
async function getFileStats(filePath: string): Promise<{ mtime: Date } | null> {
  try {
    const stats = await stat(filePath)
    return { mtime: stats.mtime }
  } catch {
    return null
  }
}

/** Read file content, returning null on error */
async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  // 1. Auth check
  const authResult = await requireAuth(req)
  if (isErrorResponse(authResult)) return authResult

  // 2. Read directory — return empty array if missing or empty
  let entries: string[] = []
  try {
    entries = await readdir(SOLUTIONS_DIR)
  } catch (err) {
    // ENOENT (directory doesn't exist) → return empty files array
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ files: [] })
    }
    // Other errors → return empty files array (graceful degradation)
    return NextResponse.json({ files: [] })
  }

  // 3. Filter to valid research files
  const validEntries = entries.filter(isValidResearchFile)
  
  // 4. Extract filenames (handle both strings and Dirent objects)
  const validFilenames = validEntries.map((entry) =>
    typeof entry === 'string' ? entry : entry.name
  )

  // 4. Build file list with metadata
  const files: ResearchFile[] = []

  for (const filename of validFilenames) {
    const filePath = join(SOLUTIONS_DIR, filename)

    // Read content
    const content = await readFileContent(filePath)
    if (content === null) {
      continue // Skip files we can't read
    }

    // Get stats
    const stats = await getFileStats(filePath)
    const modifiedAt = stats?.mtime ?? new Date()

    // Build file entry
    files.push({
      filename,
      title: extractTitle(content, filename),
      preview: extractPreview(content),
      content,
      modified_at: modifiedAt.toISOString(),
    })
  }

  // 5. Sort by modified_at descending (newest first)
  files.sort((a, b) => {
    return new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
  })

  // 6. Build and return response
  const response: ResearchResponse = { files }
  return NextResponse.json(response)
}
