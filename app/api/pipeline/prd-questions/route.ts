// app/api/pipeline/prd-questions/route.ts
// POST /api/pipeline/prd-questions — generuje max 5 pytań funkcjonalnych z PRD przez Claude Haiku
// Implemented in STORY-6.1
//
// NOTE: ANTHROPIC_API_KEY musi być ustawiony w .env.local i na Vercel.
// Obecnie w .env.local jest zakomentowany — odkomentuj przed użyciem.

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/utils/require-admin'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrdQuestion {
  id: string
  text: string
  type: 'text' | 'choice'
  options?: string[]
  required: boolean
}

interface SuccessResponse {
  questions: PrdQuestion[]
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Jesteś asystentem Product Managera. Na podstawie dostarczonego PRD (Product Requirements Document) zadaj dokładnie od 3 do 5 KRÓTKICH pytań wyjaśniających.

ZASADY (rygorystycznie przestrzegaj):
1. Pytaj WYŁĄCZNIE o funkcjonalność i zachowanie produktu
2. NIE pytaj nigdy o: technologię, framework, bazę danych, cloud, deployment, stack, język programowania, API external
3. Pytaj o: kto będzie używał produktu, jakie są kluczowe przepływy użytkownika, jakie są integracje zewnętrzne (biznesowe, nie techniczne), jaki jest zakres MVP vs. przyszłe wersje, jakie są krytyczne przypadki użycia

Zwróć WYŁĄCZNIE poprawny JSON w formacie:
{
  "questions": [
    {
      "id": "q1",
      "text": "pytanie po polsku",
      "type": "text",
      "required": true
    },
    {
      "id": "q2",
      "text": "pytanie po polsku z opcjami",
      "type": "choice",
      "options": ["opcja 1", "opcja 2", "opcja 3"],
      "required": true
    }
  ]
}

Nie dodawaj żadnego tekstu poza JSON.`

// ─── Helper: extract JSON from possible markdown code block ──────────────────

function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match && match[1]) return match[1].trim()
  return raw.trim()
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  // 1. AUTH CHECK — requires ADMIN role
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  // 2. Parse request body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Nieprawidłowe ciało zapytania — wymagany JSON' },
      { status: 400 }
    )
  }

  const prdText: string = typeof body?.prd_text === 'string' ? body.prd_text : ''

  // 3. Validate length (using trimmed value for EC-3)
  const trimmed = prdText.trim()
  if (trimmed.length < 50) {
    return NextResponse.json(
      { error: 'PRD musi mieć minimum 50 znaków' },
      { status: 400 }
    )
  }
  if (trimmed.length > 20_000) {
    return NextResponse.json(
      { error: 'PRD nie może przekraczać 20 000 znaków' },
      { status: 400 }
    )
  }

  // 4. Call Anthropic API
  let rawContent: string
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000,
    })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `PRD do analizy:\n\n${trimmed}`,
        },
      ],
    })

    const firstBlock = message.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      console.error('[POST /api/pipeline/prd-questions] Unexpected Anthropic response:', message)
      return NextResponse.json(
        { error: 'AI nie wygenerowało poprawnej odpowiedzi' },
        { status: 422 }
      )
    }

    rawContent = firstBlock.text
  } catch (err) {
    console.error('[POST /api/pipeline/prd-questions] Anthropic API error:', err)
    return NextResponse.json(
      { error: 'Serwis AI tymczasowo niedostępny' },
      { status: 503 }
    )
  }

  // 5. Parse JSON — handle markdown code block wrapper (EC-1)
  let parsed: { questions: PrdQuestion[] }
  try {
    const jsonStr = extractJson(rawContent)
    parsed = JSON.parse(jsonStr) as { questions: PrdQuestion[] }
  } catch (err) {
    console.error('[POST /api/pipeline/prd-questions] JSON parse error. Raw:', rawContent, err)
    return NextResponse.json(
      { error: 'AI nie wygenerowało poprawnej odpowiedzi' },
      { status: 422 }
    )
  }

  // 6. Validate structure
  if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
    console.error('[POST /api/pipeline/prd-questions] Invalid questions array:', parsed)
    return NextResponse.json(
      { error: 'AI nie wygenerowało poprawnej odpowiedzi' },
      { status: 422 }
    )
  }

  // 7. Validate each question has required fields (spec step 8)
  for (let i = 0; i < parsed.questions.length; i++) {
    const q = parsed.questions[i]
    if (
      typeof q?.id !== 'string' ||
      typeof q?.text !== 'string' ||
      typeof q?.type !== 'string' ||
      typeof q?.required !== 'boolean'
    ) {
      console.error(`[POST /api/pipeline/prd-questions] Question ${i} missing required fields:`, q)
      return NextResponse.json(
        { error: 'AI wygenerowało nieprawidłowe pytanie — brak wymaganych pól' },
        { status: 422 }
      )
    }
    // Validate type:'choice' has options with min 2 items
    if (q.type === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(opt => typeof opt === 'string')) {
        console.error(`[POST /api/pipeline/prd-questions] Question ${i} choice missing/invalid options:`, q)
        return NextResponse.json(
          { error: 'AI wygenerowało pytanie typu "choice" bez wymaganych opcji' },
          { status: 422 }
        )
      }
    }
  }

  // 8. Trim to max 5 questions (EC-2)
  const questions: PrdQuestion[] = parsed.questions.slice(0, 5)

  // 9. Return 200 with questions
  return NextResponse.json({ questions } satisfies SuccessResponse, { status: 200 })
}
