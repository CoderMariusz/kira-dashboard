/**
 * app/api/patterns/route.ts
 * STORY-8.1 — GET /api/patterns
 *
 * Reads 3 markdown files from the Kira project and returns structured JSON:
 *   { patterns: PatternCard[], lessons: Lesson[], meta: PatternsResponseMeta }
 *
 * Auth: requireAuth — 401 for unauthenticated requests.
 * Missing files: gracefully return [] for that section (never 500).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { createHash } from 'crypto'
import { requireAuth } from '@/lib/auth/requireRole'
import type { RequireAuthResult } from '@/lib/auth/requireRole'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatternCard {
  id:              string
  source:          'patterns.md' | 'anti-patterns.md'
  type:            'PATTERN' | 'ANTI_PATTERN'
  category:        string
  date:            string | null
  model:           string | null
  domain:          string | null
  text:            string
  tags:            string[]
  related_stories: string[]
  occurrences:     number
}

export interface Lesson {
  id:         string
  source:     'LESSONS_LEARNED.md' | 'anti-patterns.md'
  title:      string
  severity:   'info' | 'warning' | 'critical'
  category:   string
  date:       string | null
  body:       string
  root_cause: string | null
  fix:        string | null
  lesson:     string
  tags:       string[]
}

interface PatternsResponseMeta {
  total_patterns: number
  total_lessons:  number
  sources:        string[]
  generated_at:   string
}

interface PatternsResponse {
  patterns: PatternCard[]
  lessons:  Lesson[]
  meta:     PatternsResponseMeta
}

// ─── File paths ───────────────────────────────────────────────────────────────

const KIRA_DIR = process.env.KIRA_DIR || '/Users/mariuszkrawczyk/codermariusz/kira'

const FILE_PATTERNS      = `${KIRA_DIR}/.kira/nightclaw/patterns.md`
const FILE_ANTI_PATTERNS = `${KIRA_DIR}/.kira/nightclaw/anti-patterns.md`
const FILE_LESSONS       = `${KIRA_DIR}/.kira/LESSONS_LEARNED.md`

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Type guard: auth result is an error response */
function isErrorResponse(result: RequireAuthResult): result is NextResponse {
  return result instanceof Response
}

/** Deterministic 8-char SHA256 id from date + text */
function makeId(date: string | null, text: string): string {
  return createHash('sha256')
    .update(`${date ?? ''}${text}`)
    .digest('hex')
    .slice(0, 8)
}

/** Try to read a file; returns null if not found / any error */
async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

// ─── Pattern line parser ──────────────────────────────────────────────────────

/**
 * Pattern: `- [YYYY-MM-DD] [model?] [domain?] — text` OR `- [YYYY-MM-DD] text` (no separator)
 * All bracket groups are optional.
 * Fallback: `- raw text` → date/model/domain = null, text = rest of line.
 */
const RE_FULL_PATTERN = /^-\s+\[(\d{4}-\d{2}-\d{2})\](?:\s*\[([^\]]*)\])?(?:\s*\[([^\]]*)\])?\s*[—–-]{1,2}\s*(.+)$/

/**
 * Pattern with date but NO em-dash separator (e.g., anti-pattern lines)
 * `- [YYYY-MM-DD] text` or `- [YYYY-MM-DD] [model] text`
 */
const RE_DATE_NO_SEPARATOR = /^-\s+\[(\d{4}-\d{2}-\d{2})\](?:\s*\[([^\]]*)\])?(?:\s*\[([^\]]*)\])?\s+(.+)$/

/**
 * Match a line that starts with `- ` but has no date brackets.
 * Text = everything after `- `.
 */
const RE_PLAIN_LINE = /^-\s+(.+)$/

interface ParsedPatternLine {
  date:   string | null
  model:  string | null
  domain: string | null
  text:   string
}

function parsePatternLine(line: string): ParsedPatternLine | null {
  // Try full format with em-dash separator first
  const full = RE_FULL_PATTERN.exec(line)
  if (full) {
    const [, date, second, third, text] = full
    // Determine if second/third bracket is model or domain:
    // Both are optional. If only one bracket present after date it could be
    // either model or domain — we store them positionally (second=model, third=domain).
    return {
      date:   date,
      model:  second?.trim() || null,
      domain: third?.trim() || null,
      text:   text.trim(),
    }
  }

  // Try pattern with date but no em-dash separator (anti-pattern lines)
  const dateNoSep = RE_DATE_NO_SEPARATOR.exec(line)
  if (dateNoSep) {
    const [, date, second, third, text] = dateNoSep
    return {
      date:   date,
      model:  second?.trim() || null,
      domain: third?.trim() || null,
      text:   text.trim(),
    }
  }

  // Try plain `- text` fallback
  const plain = RE_PLAIN_LINE.exec(line)
  if (plain) {
    return { date: null, model: null, domain: null, text: plain[1].trim() }
  }

  return null
}

// ─── patterns.md / anti-patterns.md parser ───────────────────────────────────

function parsePatternsFile(
  content: string,
  source: 'patterns.md' | 'anti-patterns.md',
  type: 'PATTERN' | 'ANTI_PATTERN'
): PatternCard[] {
  const cards: PatternCard[] = []
  let currentCategory = 'Ogólne'

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd()

    // Category header: ## SomeName
    if (/^##\s+/.test(line)) {
      currentCategory = line.replace(/^##\s+/, '').trim()
      continue
    }

    // Skip non-bullet lines
    if (!line.trimStart().startsWith('- ')) continue

    const parsed = parsePatternLine(line.trimStart())
    if (!parsed) continue

    const { date, model, domain, text } = parsed

    const tags = [model, domain, currentCategory]
      .filter(Boolean)
      .map(t => (t as string).toLowerCase())

    cards.push({
      id:              makeId(date, text),
      source,
      type,
      category:        currentCategory,
      date,
      model,
      domain,
      text,
      tags,
      related_stories: [],
      occurrences:     1,
    })
  }

  return cards
}

// ─── LESSONS_LEARNED.md parser ───────────────────────────────────────────────

const RE_LESSON_HEADER = /^###\s+(BUG|LESSON|OBS)-(\d+):\s+(.+)$/

/**
 * Extract the text content of a named sub-section.
 * Sub-section starts after a `**Label:**` line and ends at the next `**..:**` or `---` or end.
 */
function extractSubSection(body: string, labels: string[]): string | null {
  for (const label of labels) {
    // Match **Label:** at start of a line (flexible whitespace/punctuation)
    // Note: NO 'm' flag so $ matches end-of-string, not end-of-line (fixes multiline truncation)
    const re = new RegExp(`\\*\\*${label}[:\\s]*\\*\\*\\s*\\n?([\\s\\S]*?)(?=\\*\\*[\\w ]+[:\\s]*\\*\\*|^---$|$)`, 'i')
    const m = re.exec(body)
    if (m) {
      const text = m[1].trim()
      if (text) return text
    }
  }
  return null
}

function parseLessonsFile(content: string): Lesson[] {
  const lessons: Lesson[] = []

  // Split by ### headers (keeping content under each)
  const sections = content.split(/(?=^###\s)/m)

  for (const section of sections) {
    const lines = section.split('\n')
    const headerLine = lines[0]?.trim()
    const headerMatch = RE_LESSON_HEADER.exec(headerLine ?? '')
    if (!headerMatch) continue

    const [, kind, num, title] = headerMatch
    const id = `${kind}-${num.padStart(3, '0')}`
    const severity: 'critical' | 'warning' | 'info' =
      kind === 'BUG' ? 'critical' :
      kind === 'LESSON' ? 'warning' : 'info'

    const body = lines.slice(1).join('\n')

    const whatWentWrong = extractSubSection(body, ['What went wrong', 'What went wrong:'])
    const rootCause    = extractSubSection(body, ['Root cause', 'Root cause:'])
    const fix          = extractSubSection(body, ['Fix', 'Fix:'])
    const lessonText   = extractSubSection(body, ['Lesson', 'Lesson:'])

    lessons.push({
      id,
      source:     'LESSONS_LEARNED.md',
      title:      title.trim(),
      severity,
      category:   kind,
      date:       null,
      body:       whatWentWrong ?? body.slice(0, 200).trim(),
      root_cause: rootCause,
      fix,
      lesson:     lessonText ?? title.trim(),
      tags:       [kind.toLowerCase(), severity],
    })
  }

  return lessons
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  // 1. Auth check
  const authResult = await requireAuth(req)
  if (isErrorResponse(authResult)) return authResult

  // 2. Read files concurrently (each failure is isolated)
  const [patternsContent, antiPatternsContent, lessonsContent] = await Promise.all([
    tryReadFile(FILE_PATTERNS),
    tryReadFile(FILE_ANTI_PATTERNS),
    tryReadFile(FILE_LESSONS),
  ])

  // 3. Parse each file
  const patterns: PatternCard[] = [
    ...(patternsContent !== null
      ? parsePatternsFile(patternsContent, 'patterns.md', 'PATTERN')
      : []),
    ...(antiPatternsContent !== null
      ? parsePatternsFile(antiPatternsContent, 'anti-patterns.md', 'ANTI_PATTERN')
      : []),
  ]

  const lessons: Lesson[] = lessonsContent !== null
    ? parseLessonsFile(lessonsContent)
    : []

  // 4. Build meta.sources (only files successfully read)
  const sources: string[] = [
    ...(patternsContent !== null      ? [FILE_PATTERNS]      : []),
    ...(antiPatternsContent !== null  ? [FILE_ANTI_PATTERNS]  : []),
    ...(lessonsContent !== null       ? [FILE_LESSONS]        : []),
  ]

  const response: PatternsResponse = {
    patterns,
    lessons,
    meta: {
      total_patterns: patterns.length,
      total_lessons:  lessons.length,
      sources,
      generated_at:   new Date().toISOString(),
    },
  }

  return NextResponse.json(response)
}
