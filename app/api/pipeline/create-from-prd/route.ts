export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/utils/require-admin'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

interface Story {
  id: string
  title: string
  domain: 'database' | 'auth' | 'backend' | 'wiring' | 'frontend'
  size: 'short' | 'medium' | 'long'
  dod: string
}

interface Epic {
  epic_id: string
  title: string
  stories: Story[]
}

interface AiResponse {
  epics: Epic[]
}

interface SuccessResponse {
  project_key: string
  epics: Array<Epic & { stories_count: number }>
  epics_count: number
  stories_count: number
  bridge_output: string
}

const SYSTEM_PROMPT = `Jesteś architektem oprogramowania. Na podstawie PRD i odpowiedzi na pytania wygeneruj strukturę projektu.

ZASADY:
- Max 5 epików, max 5 stories per epic
- Każdy epic ma: epic_id ("EPIC-1" itd.), title (po polsku lub angielsku), stories[]
- Każda story ma: id ("STORY-1.1" itd.), title (konkretna akcja), domain ("database"|"auth"|"backend"|"wiring"|"frontend"), size ("short"|"medium"|"long"), dod (definicja ukończenia, 1 zdanie)
- Zacznij od domeny database/auth, potem backend, wiring, frontend
- Nie generuj story dla funkcji poza zakresem PRD

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "epics": [
    {
      "epic_id": "EPIC-1",
      "title": "Auth & Onboarding",
      "stories": [
        { "id": "STORY-1.1", "title": "...", "domain": "database", "size": "short", "dod": "..." }
      ]
    }
  ]
}`

function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match?.[1]) return match[1].trim()
  return raw.trim()
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function buildBridgeCommand(args: string): string {
  return `cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate && python -m bridge.cli ${args}`
}

async function runBridgeCommand(args: string): Promise<string> {
  const command = buildBridgeCommand(args)
  const { stdout, stderr } = await execAsync(command, {
    shell: '/bin/bash',
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  })

  return [stdout, stderr].filter(Boolean).join('\n').trim()
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  if (process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline') {
    return NextResponse.json(
      { error: 'Rejestracja projektów wymaga lokalnego Bridge CLI — niedostępne w trybie production' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Nieprawidłowe ciało zapytania — wymagany JSON' },
      { status: 400 }
    )
  }

  const prdText = typeof body.prd_text === 'string' ? body.prd_text.trim() : ''
  const projectName = typeof body.project_name === 'string' ? body.project_name.trim() : ''
  const projectKey = typeof body.project_key === 'string' ? body.project_key.trim() : ''
  const answers = body.answers
  // project_path optional — defaults to sibling dir next to kira-dashboard
  const projectPath =
    typeof body.project_path === 'string' && body.project_path.trim()
      ? body.project_path.trim()
      : path.join(process.cwd(), '..', projectKey)

  if (prdText.length < 50 || prdText.length > 20_000) {
    return NextResponse.json(
      { error: 'PRD musi mieć od 50 do 20 000 znaków' },
      { status: 400 }
    )
  }

  if (projectName.length < 2 || projectName.length > 100) {
    return NextResponse.json(
      { error: 'Nazwa projektu musi mieć od 2 do 100 znaków' },
      { status: 400 }
    )
  }

  if (projectKey.length < 3 || projectKey.length > 40 || !/^[a-z0-9-]+$/.test(projectKey)) {
    return NextResponse.json(
      { error: 'Klucz projektu może zawierać tylko małe litery, cyfry i myślniki (a-z, 0-9, -)' },
      { status: 400 }
    )
  }

  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers) ||
    Object.values(answers).some(value => typeof value !== 'string')
  ) {
    return NextResponse.json(
      { error: 'Pole answers musi być obiektem key-value string' },
      { status: 400 }
    )
  }

  let rawContent: string
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000,
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `PRD:\n${prdText}\n\nOdpowiedzi na pytania:\n${JSON.stringify(answers, null, 2)}`,
        },
      ],
    })

    const firstBlock = message.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      console.error('[POST /api/pipeline/create-from-prd] Unexpected Anthropic response:', message)
      return NextResponse.json(
        { error: 'AI nie zdołało wygenerować struktury projektu — spróbuj ponownie' },
        { status: 422 }
      )
    }

    rawContent = firstBlock.text
  } catch (error) {
    console.error('[POST /api/pipeline/create-from-prd] Anthropic API error:', error)
    return NextResponse.json(
      { error: 'Serwis AI tymczasowo niedostępny' },
      { status: 503 }
    )
  }

  let parsed: AiResponse
  try {
    parsed = JSON.parse(extractJson(rawContent)) as AiResponse
  } catch (error) {
    console.error('[POST /api/pipeline/create-from-prd] AI JSON parse error:', error, rawContent)
    return NextResponse.json(
      { error: 'AI nie zdołało wygenerować struktury projektu — spróbuj ponownie' },
      { status: 422 }
    )
  }

  if (!Array.isArray(parsed?.epics) || parsed.epics.length === 0) {
    return NextResponse.json(
      { error: 'AI nie zdołało wygenerować struktury projektu — spróbuj ponownie' },
      { status: 422 }
    )
  }

  const epics = parsed.epics
    .slice(0, 5)
    .filter(epic => {
      if (!epic || typeof epic !== 'object') return false
      if (typeof epic.epic_id !== 'string' || typeof epic.title !== 'string') return false
      if (!Array.isArray(epic.stories)) return false

      return epic.stories.every(story => {
        return (
          typeof story?.id === 'string' &&
          typeof story?.title === 'string' &&
          typeof story?.domain === 'string' &&
          typeof story?.size === 'string' &&
          typeof story?.dod === 'string'
        )
      })
    })

  if (epics.length === 0) {
    return NextResponse.json(
      { error: 'AI nie zdołało wygenerować struktury projektu — spróbuj ponownie' },
      { status: 422 }
    )
  }

  const bridgeOutput: string[] = []
  const tempFiles: string[] = []

  const addProjectArgs = [
    'projects add',
    `--key ${shellEscape(projectKey)}`,
    `--name ${shellEscape(projectName)}`,
    '--type nextjs',
    `--path ${shellEscape(projectPath)}`,
  ].join(' ')

  try {
    const addOutput = await runBridgeCommand(addProjectArgs)
    bridgeOutput.push(`[projects add]\n${addOutput}`)
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n')

    if (output.toLowerCase().includes('already exists')) {
      return NextResponse.json(
        { error: 'Projekt o tym kluczu już istnieje w Bridge' },
        { status: 409 }
      )
    }

    console.error('[POST /api/pipeline/create-from-prd] bridge projects add failed:', output)
    return NextResponse.json(
      { error: 'Błąd serwera — sprawdź logi Bridge CLI' },
      { status: 500 }
    )
  }

  try {
    for (const epic of epics) {
      const tempFile = `/tmp/stories-${epic.epic_id.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}.json`
      tempFiles.push(tempFile)

      await writeFile(tempFile, JSON.stringify(epic.stories, null, 2), 'utf-8')

      // plan-epic requires --file-path (path to epic markdown file)
      const epicFile = `/tmp/epic-${epic.epic_id.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}.md`
      tempFiles.push(epicFile)
      await writeFile(epicFile, `# ${epic.title}\n\nGenerated by create-from-prd.\n`, 'utf-8')

      const planArgs = [
        'plan-epic',
        `--epic-id ${shellEscape(epic.epic_id)}`,
        `--title ${shellEscape(epic.title)}`,
        `--file-path ${shellEscape(epicFile)}`,
        `--project ${shellEscape(projectKey)}`,
        `--stories-file ${shellEscape(tempFile)}`,
      ].join(' ')

      try {
        const epicOutput = await runBridgeCommand(planArgs)
        bridgeOutput.push(`[plan-epic ${epic.epic_id}]\n${epicOutput}`)
      } catch (error) {
        const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
        const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n')
        console.error(`[POST /api/pipeline/create-from-prd] bridge plan-epic failed (${epic.epic_id}):`, output)
        bridgeOutput.push(`[plan-epic ${epic.epic_id} ERROR]\n${output}`)
      }
    }
  } finally {
    for (const file of tempFiles) {
      try {
        await unlink(file)
      } catch (cleanupError) {
        console.error(`[POST /api/pipeline/create-from-prd] cleanup failed for ${file}:`, cleanupError)
      }
    }
  }

  const epicsWithCount = epics.map(epic => ({
    ...epic,
    stories_count: epic.stories.length,
  }))

  const storiesCount = epicsWithCount.reduce((sum, epic) => sum + epic.stories_count, 0)

  return NextResponse.json(
    {
      project_key: projectKey,
      epics: epicsWithCount,
      epics_count: epicsWithCount.length,
      stories_count: storiesCount,
      bridge_output: bridgeOutput.join('\n\n'),
    } satisfies SuccessResponse,
    { status: 200 }
  )
}
