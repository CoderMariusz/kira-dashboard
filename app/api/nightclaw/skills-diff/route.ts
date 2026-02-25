/**
 * app/api/nightclaw/skills-diff/route.ts
 * STORY-9.3 — GET /api/nightclaw/skills-diff
 *
 * Returns a list of SKILL.md files modified since the last NightClaw commit,
 * along with their git diffs, line counts, and modification timestamps.
 *
 * Auth: requireAuth — 401 for unauthenticated requests.
 * Git error / no repo → graceful: { skills: [], total_modified: 0, error: "git unavailable" }
 * No changes → { skills: [], total_modified: 0 }
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { requireAuth } from '@/lib/auth/requireRole'
import type { RequireAuthResult } from '@/lib/auth/requireRole'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillDiff {
  name: string         // e.g. "kira-orchestrator"
  path: string         // e.g. "skills/kira-orchestrator/SKILL.md"
  diff: string         // raw diff string
  lines_added: number
  lines_removed: number
  modified_at: string  // ISO 8601 from git log
}

interface SkillsDiffResponse {
  skills: SkillDiff[]
  total_modified: number
  error?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILLS_REPO = '/Users/mariuszkrawczyk/.openclaw/skills'
const GIT_TIMEOUT_MS = 10_000  // 10 seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Type guard: auth result is an error response */
function isErrorResponse(result: RequireAuthResult): result is NextResponse {
  return result instanceof Response
}

/**
 * Run a git command in the skills repo with a 10s timeout.
 * Returns stdout as a string. Throws on error.
 */
function runGit(cmd: string): string {
  const output = execSync(cmd, {
    cwd: SKILLS_REPO,
    timeout: GIT_TIMEOUT_MS,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return typeof output === 'string' ? output : output.toString()
}

/**
 * Parse modified SKILL.md file paths from `git log --diff-filter=M --name-only` output.
 * Returns an array of relative paths like ["skills/kira-orchestrator/SKILL.md"].
 */
function parseModifiedPaths(logOutput: string): string[] {
  const lines = logOutput.split('\n')
  return lines
    .map(l => l.trim())
    .filter(l => l.endsWith('SKILL.md') && l.includes('/'))
}

/**
 * Extract skill name from path.
 * "skills/kira-orchestrator/SKILL.md" → "kira-orchestrator"
 */
function extractSkillName(filePath: string): string {
  const parts = filePath.split('/')
  // Path format: skills/<name>/SKILL.md
  // So name is always the second-to-last segment (before SKILL.md)
  if (parts.length >= 2) {
    return parts[parts.length - 2] ?? filePath
  }
  return filePath
}

/**
 * Count lines added (starting with "+" but not "+++") in a diff string.
 */
function countLinesAdded(diff: string): number {
  return diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).length
}

/**
 * Count lines removed (starting with "-" but not "---") in a diff string.
 */
function countLinesRemoved(diff: string): number {
  return diff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).length
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req?: Request): Promise<Response> {
  // 1. Auth check
  const authResult = await requireAuth(req)
  if (isErrorResponse(authResult)) return authResult

  // 2. Get modified SKILL.md files from git log
  let modifiedPaths: string[]
  try {
    const logOutput = runGit(
      `git log --diff-filter=M --name-only -1 -- "*/SKILL.md"`
    )
    modifiedPaths = parseModifiedPaths(logOutput)
  } catch {
    // Git unavailable or not a repo — graceful fallback
    const response: SkillsDiffResponse = {
      skills: [],
      total_modified: 0,
      error: 'git unavailable',
    }
    return NextResponse.json(response)
  }

  // 3. No changes
  if (modifiedPaths.length === 0) {
    const response: SkillsDiffResponse = { skills: [], total_modified: 0 }
    return NextResponse.json(response)
  }

  // 4. For each modified file, get its diff and last commit date
  const skills: SkillDiff[] = []

  for (const filePath of modifiedPaths) {
    try {
      // Get per-file diff
      const diff = runGit(`git diff HEAD~1 HEAD -- "${filePath}"`)

      // Get last modification timestamp (ISO 8601)
      const modifiedAt = runGit(
        `git log -1 --format=%aI -- "${filePath}"`
      ).trim()

      skills.push({
        name: extractSkillName(filePath),
        path: filePath,
        diff,
        lines_added: countLinesAdded(diff),
        lines_removed: countLinesRemoved(diff),
        modified_at: modifiedAt,
      })
    } catch {
      // Skip this file gracefully if diff fails
      continue
    }
  }

  // 5. Build response
  const response: SkillsDiffResponse = {
    skills,
    total_modified: skills.length,
  }

  return NextResponse.json(response)
}
