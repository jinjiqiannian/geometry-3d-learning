import { describe, it, expect } from 'vitest'
import {
  stepToLearningPhase,
  resolveLearningTrack,
  getPhaseLabel,
  getStepLearningMeta,
  GAOKAO_BASIC_TRACKS,
} from '../learningDemo.js'

describe('learningDemo unified layer', () => {
  it('maps short step lists 1:1 to four phases', () => {
    expect(stepToLearningPhase(0, 4)).toBe('setup')
    expect(stepToLearningPhase(1, 4)).toBe('formula')
    expect(stepToLearningPhase(2, 4)).toBe('plug')
    expect(stepToLearningPhase(3, 4)).toBe('done')
  })

  it('buckets long geometry proofs into four phases', () => {
    expect(stepToLearningPhase(0, 8)).toBe('setup')
    expect(stepToLearningPhase(2, 8)).toBe('formula')
    expect(stepToLearningPhase(5, 8)).toBe('plug')
    expect(stepToLearningPhase(7, 8)).toBe('done')
  })

  it('resolves gaokao basic tracks', () => {
    expect(resolveLearningTrack('geometry')).toBe('geometry')
    expect(resolveLearningTrack('combo')).toBe('combo')
    expect(resolveLearningTrack('derivative')).toBe('derivative')
    expect(resolveLearningTrack('conic')).toBe('conic')
    expect(resolveLearningTrack('phys_motion')).toBe('physics')
  })

  it('exposes track-specific phase labels', () => {
    expect(getPhaseLabel('geometry', 'plug')).toBe('画辅助线')
    expect(getPhaseLabel('combo', 'plug')).toBe('分步计数')
    expect(getPhaseLabel('derivative', 'setup')).toBe('认函数')
    expect(getPhaseLabel('conic', 'formula')).toBe('读 a/b/c')
  })

  it('builds step meta for panels', () => {
    const meta = getStepLearningMeta(2, 4, 'derivative')
    expect(meta.phase).toBe('plug')
    expect(meta.playing).toBe(true)
    expect(meta.showFormula).toBe(true)
    expect(meta.phaseLabel).toBe('代入计算')
    expect(GAOKAO_BASIC_TRACKS.derivative.label).toBe('导数')
  })
})
