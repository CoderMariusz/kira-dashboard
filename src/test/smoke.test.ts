import { describe, it, expect } from 'vitest'

describe('Smoke Test', () => {
  it('vitest is working', () => {
    expect(1 + 1).toBe(2)
  })

  it('environment is jsdom', () => {
    expect(typeof document).toBe('object')
  })
})
