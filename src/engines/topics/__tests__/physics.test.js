import { describe, it, expect } from 'vitest'
import {
  solvePhysics,
  PHYSICS_EXAMPLES,
  PHYSICS_SECTION_IDS,
  PHYSICS_GROUPS,
  isPhysicsTopic,
  getGroupIdForTopic,
} from '../physics.js'
import { solveTopicProblem, validateExplainIR, TOPIC_EXAMPLES } from '../explainIR.js'

describe('physics focus: mechanics + electro', () => {
  it('keeps seven topics in two groups', () => {
    expect(PHYSICS_GROUPS.map((g) => g.label)).toEqual(['力学', '电磁'])
    expect(PHYSICS_SECTION_IDS).toHaveLength(7)
    expect(getGroupIdForTopic('phys_efield')).toBe('electro')
    expect(getGroupIdForTopic('phys_static')).toBe('mechanics')
  })

  it('examples validate where present', () => {
    for (const sectionId of PHYSICS_SECTION_IDS) {
      expect(TOPIC_EXAMPLES[sectionId]).toBeTruthy()
      for (const ir of Object.values(PHYSICS_EXAMPLES[sectionId] || {})) {
        expect(validateExplainIR(ir).ok).toBe(true)
      }
    }
    expect(PHYSICS_EXAMPLES.phys_circuit.phys_ohm.answer).toBe('12 V')
    expect(PHYSICS_EXAMPLES.phys_induction.phys_faraday.answer).toBe('0.2 V')
  })

  it('solves mechanics locally', () => {
    expect(
      solveTopicProblem(
        'phys_motion',
        '物体初速为 0，加速度 2 m/s²，求 3 s 后的速度',
      )?.answer,
    ).toBe('6 m/s')
    expect(
      solvePhysics('质量 4 kg 的物体受 12 N 合力，求加速度', 'phys_dynamics')
        ?.answer,
    ).toBe('3 m/s²')
    expect(
      solvePhysics('质量 5 kg 的物体，取 g=10 m/s²，求重力大小', 'phys_static')
        ?.answer,
    ).toBe('50 N')
  })

  it('solves electro method examples', () => {
    expect(
      solvePhysics('电阻 6 Ω 的导体中电流为 2 A，求两端电压', 'phys_circuit')
        ?.answer,
    ).toBe('12 V')
    expect(
      solvePhysics(
        '穿过线圈的磁通量在 0.2 s 内从 0.01 Wb 变为 0.05 Wb，求感应电动势',
        'phys_induction',
      )?.answer,
    ).toBe('0.2 V')
    expect(
      solvePhysics('带电粒子垂直进入匀强磁场，说明它做什么运动', 'phys_bfield')
        ?.answer,
    ).toBe('匀速圆周，r=mv/(qB)')
  })

  it('does not hijack gaokao magnetic-field problems into Lorentz sample', () => {
    const gaokao =
      '如图，边长为l的正方形abcd内存在匀强磁场，磁感应强度大小为B，方向垂直于纸面（abcd所在平面）向外。ab边中点有一电子发源O，可向磁场内沿垂直于ab边的方向发射电子。已知电子的比荷为k。则从a、d两点射出的电子的速度大小分别为'
    const ir = solvePhysics(gaokao, 'phys_bfield')
    expect(ir).toBeTruthy()
    expect(ir.goal).toBe(gaokao)
    expect(ir.answer).toBe('kBl/4，5kBl/4')
    expect(ir.goal).not.toContain('说明它做什么运动')
  })

  it('returns null for unfamiliar magnetic-field text so AI can take over', () => {
    expect(
      solvePhysics(
        '带电粒子以速度v斜射入匀强磁场B，求螺距与周期',
        'phys_bfield',
      ),
    ).toBeNull()
  })

  it('scopes sections and legacy map', () => {
    expect(
      solveTopicProblem(
        'phys_dynamics',
        '物体初速为 0，加速度 2 m/s²，求 3 s 后的速度',
      ),
    ).toBeNull()
    expect(
      solvePhysics('物体初速为 0，加速度 2 m/s²，求 3 s 后的速度', 'phys_efield'),
    ).toBeNull()
    expect(isPhysicsTopic('phys_force')).toBe(true)
  })
})
