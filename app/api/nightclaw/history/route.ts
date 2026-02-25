/**
 * app/api/nightclaw/history/route.ts
 * STORY-9.2 — GET /api/nightclaw/history
 * Returns 90-day run history for NightClaw calendar view.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { requireAuth } from '@/lib/auth/requireRole'

// Path to NightClaw digest directory
const DIGEST_DIR = '/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/digest'

// Number of days to return
const HISTORY_DAYS = 90

/**
 * Generate dates for the last N days (newest first)
 */
function getLastNDates(n: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0] ?? '')
  }
  return dates
}

/**
 * Check if a digest file has open problems.
 * Returns true if the file contains "## 🔍 Otwarte problemy" with non-empty content after it.
 */
function hasOpenProblems(content: string): boolean {
  // Look for the "## 🔍 Otwarte problemy" section
  const match = content.match(/##\s*🔍\s*Otwarte problemy\s*\n?([\s\S]*?)(?=\n## |\s*$)/)
  
  if (!match) {
    return false
  }
  
  // Check if there's non-empty content after the header
  const sectionContent = match[1]?.trim()
  if (!sectionContent) {
    return false
  }
  
  // Check if there's at least one list item (bullet point)
  return /^\s*[-*]\s+\S/m.test(sectionContent)
}

/**
 * Determine the status of a digest file.
 */
async function getDigestStatus(date: string, existingFiles: Set<string>): Promise<'ok' | 'error' | 'missing'> {
  const filename = `${date}.md`
  
  if (!existingFiles.has(filename)) {
    return 'missing'
  }
  
  try {
    const content = await readFile(join(DIGEST_DIR, filename), 'utf-8')
    
    if (hasOpenProblems(content)) {
      return 'error'
    }
    
    return 'ok'
  } catch {
    // If we can't read the file, treat it as missing
    return 'missing'
  }
}

export async function GET(): Promise<Response> {
  // Auth: require any authenticated session
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    // Get list of files in the digest directory
    let files: string[] = []
    try {
      files = await readdir(DIGEST_DIR)
    } catch (err) {
      // If directory doesn't exist or is not accessible, return empty file list
      // This will result in all "missing" statuses
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }

    // Filter to only .md files
    const mdFiles = new Set(files.filter(f => f.endsWith('.md')))

    // Get the last 90 days
    const dates = getLastNDates(HISTORY_DAYS)

    // Build entries
    const entries: Array<{ date: string; status: 'ok' | 'error' | 'missing' }> = []
    let totalRuns = 0
    let totalErrors = 0

    for (const date of dates) {
      const status = await getDigestStatus(date, mdFiles)
      entries.push({ date, status })

      if (status !== 'missing') {
        totalRuns++
      }
      if (status === 'error') {
        totalErrors++
      }
    }

    return NextResponse.json({
      entries,
      total_runs: totalRuns,
      total_errors: totalErrors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to read NightClaw history', details: message },
      { status: 500 }
    )
  }
}
