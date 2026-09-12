import { describe, it, expect } from 'vitest'
import {
  detectSubject,
  resolveSubjectNav,
  HUB_SAMPLES,
  getSubjectLabel,
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
    // 回归：自由落体 / 平抛等不在原关键词表里，曾被判成 geometry，
    // 于是解题页渲染出一个与题目毫无关系的默认立方体
    for (const t of [
      '质量 2kg 的物体从 5m 高处自由落下，g 取 10m/s²，求落地时的速度大小。',
      '小球从楼顶自由落体，求落地速度',
      '物体以初速度水平抛出做平抛运动，求水平位移',
    ]) {
      expect(detectSubject(t).subject, t).toBe('phys_motion')
    }
    expect(detectSubject('欧姆定律 U=IR').subject).toBe('phys_circuit')
    expect(
      detectSubject(
        '正方形abcd内存在匀强磁场，电子从ab中点射出',
      ).subject,
    ).toBe('phys_bfield')
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

  it('getSubjectLabel returns display names', () => {
    expect(getSubjectLabel('geometry')).toBe('立体几何')
    expect(getSubjectLabel('combo')).toBe('排列组合 / 概率')
    expect(getSubjectLabel('phys_motion')).toBe('物理')
  })
})
