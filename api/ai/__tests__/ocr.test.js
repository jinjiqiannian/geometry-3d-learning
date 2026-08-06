import { describe, it, expect } from 'vitest'
import {
  splitImagePayload,
  buildImageUrl,
  normalizeOcrPayload,
} from '../ocr.js'

describe('api/ai/ocr helpers', () => {
  it('splits data URL into mime + pure base64', () => {
    const hit = splitImagePayload('data:image/png;base64,abc123XYZ')
    expect(hit.mime).toBe('image/png')
    expect(hit.base64).toBe('abc123XYZ')
  })

  it('zhipu buildImageUrl strips to pure base64', () => {
    expect(
      buildImageUrl({ stripDataUrlPrefix: true }, 'image/jpeg', 'QUJD'),
    ).toBe('QUJD')
    expect(
      buildImageUrl({ stripDataUrlPrefix: false }, 'image/jpeg', 'QUJD'),
    ).toBe('data:image/jpeg;base64,QUJD')
  })

  it('normalizeOcrPayload keeps physics text', () => {
    const raw = JSON.stringify({
      text: '正方形abcd内存在匀强磁场，求从a、d射出速度',
      visionHints: {},
    })
    expect(normalizeOcrPayload(raw).text).toContain('匀强磁场')
  })
})
