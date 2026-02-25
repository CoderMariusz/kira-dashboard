import { NextResponse } from 'next/server'

describe('Response debug', () => {
  it('checks NextResponse.json body readability', async () => {
    const res = NextResponse.json({ foo: 'bar' }, { status: 200 })
    console.log('body type:', typeof res.body)
    console.log('body ctor:', res.body?.constructor?.name)
    console.log('body keys:', res.body ? Object.keys(res.body) : 'null')
    
    let textResult = 'N/A'
    try {
      textResult = await res.text()
    } catch(e) {
      textResult = `ERROR: ${(e as Error).message}`
    }
    console.log('text():', JSON.stringify(textResult))
    
    // Check internal properties
    const r = res as unknown as Record<string, unknown>
    console.log('_bodyText:', r['_bodyText'])
    console.log('_bodyInit:', typeof r['_bodyInit'])
    
    expect(1).toBe(1)
  })
})
