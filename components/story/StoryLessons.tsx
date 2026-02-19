'use client'

// components/story/StoryLessons.tsx
// Karty z wyekstrahowanymi lekcjami story.
// Implementacja STORY-2.6.

import type { StoryLesson } from '@/types/story.types'

interface Props {
  lessons: StoryLesson[]
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function StoryLessons({ lessons }: Props) {
  return (
    <div>
      <div style={{
        fontSize: '11px',
        color: '#4b4569',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '8px',
        fontWeight: 600,
      }}>
        Extracted Lessons
      </div>

      {lessons.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#3d3757' }}>
          Brak wyekstrahowanych lekcji
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              style={{
                background: '#13111c',
                borderRadius: '7px',
                padding: '8px 10px',
                borderLeft: '2px solid #7c3aed',
              }}
            >
              {/* Meta line */}
              <div style={{
                fontSize: '10px',
                color: '#818cf8',
                fontWeight: 600,
                marginBottom: '4px',
              }}>
                Auto-extracted · {lesson.extractedBy} · {formatDate(lesson.extractedAt)}
              </div>

              {/* Lesson text */}
              <div style={{
                fontSize: '11px',
                color: '#6b7280',
                lineHeight: '1.4',
              }}>
                {lesson.text}
              </div>

              {/* Tags */}
              {lesson.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {lesson.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '9px',
                        color: '#818cf8',
                        background: '#2d1b4a',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
