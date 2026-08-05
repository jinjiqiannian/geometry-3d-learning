import { describe, it, expect } from 'vitest'
import { parseProblemToSemantic } from '../geometryValidator.js'
import { generateLocalSteps } from '../explanationEngine.js'
import { parseProblemSync } from '../problemParser.js'

describe('cuboid long/width/height for UI path', () => {
  const text = '长方体长3、宽4、高5，求体积'

  it('parseProblemToSemantic keeps a,b,c', () => {
    const s = parseProblemToSemantic(text)
    expect(s.shape).toBe('cuboid')
    expect(s.params?.a).toBe(3)
    expect(s.params?.b).toBe(4)
    expect(s.params?.c).toBe(5)
    expect(s.size).toBe(3)
  })

  it('UI-like generateLocalSteps answers 60', () => {
    const semantic = parseProblemToSemantic(text)
    const parsed = {
      type: semantic.shape,
      size: semantic.size,
      params: semantic.params,
      labels: semantic.points,
    }
    const steps = generateLocalSteps(text, parsed)
    const last = steps[steps.length - 1]
    const ans = String(last?.finalAnswer?.value || last?.content || '')
    expect(ans).toContain('60')
  })

  it('parseProblemSync still 60', () => {
    const p = parseProblemSync(text)
    const steps = generateLocalSteps(text, p)
    const last = steps[steps.length - 1]
    expect(String(last?.finalAnswer?.value || '')).toContain('60')
  })
})
