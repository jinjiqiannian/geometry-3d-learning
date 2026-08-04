import { describe, it, expect } from 'vitest'
import {
  detectSubject,
  resolveSubjectNav,
  HUB_SAMPLES,
} from '../subjectRouter.js'

describe('subjectRouter', () => {
  it('detects combo / geometry / derivative / conic', () => {
    expect(detectSubject('从5人选正副组长').subject).toBe('combo')
    expect(detectSubject('正方体棱长为2求体对角线').subject).toBe('geometry')
    expect(detectSubject('求 f(x)=x³−3x 的导数').subject).toBe('derivative')
    expect(detectSubject('椭圆 x²/25+y²/16=1 的离心率').subject).toBe('conic')
  })

  it('detects physics topics', () => {
    expect(detectSubject('从静止加速求速度').subject).toBe('phys_motion')
    expect(detectSubject('欧姆定律 U=IR').subject).toBe('phys_circuit')
  })

  it('falls back to geometry with low confidence', () => {
    const r = detectSubject('随便一句话')
    expect(r.subject).toBe('geometry')
    expect(r.confidence).toBe('low')
  })

  it('resolveSubjectNav maps physics to domain', () => {
    const nav = resolveSubjectNav('phys_motion')
    expect(nav.domain).toBe('physics')
    expect(nav.physicsTopic).toBe('phys_motion')
  })

  it('HUB_SAMPLES has at least 6 cross-subject cards', () => {
    expect(HUB_SAMPLES.length).toBeGreaterThanOrEqual(6)
    const subjects = new Set(HUB_SAMPLES.map((s) => s.subject))
    expect(subjects.has('geometry')).toBe(true)
    expect(subjects.has('combo')).toBe(true)
  })
})
