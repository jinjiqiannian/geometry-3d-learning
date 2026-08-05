import {
  LEARNING_PHASE_ORDER,
  getPhaseLabel,
  phaseFlags,
  stepToLearningPhase,
} from '../../engines/learningDemo.js'
import './LearningDemo.css'

export function FormulaChip({ text, show }) {
  if (!show || !text) return null
  return <div className="ld-formula-chip is-pop">{text}</div>
}

export function StepAnswer({ text, show }) {
  if (!show || !text) return null
  return <p className="ld-step-answer is-pop">{text}</p>
}

export function DemoWhy({ children }) {
  if (!children) return null
  return <p className="ld-why">{children}</p>
}

/**
 * 四段式进度条 — 全板块统一
 */
export function LearningDemoRail({ stepIndex, totalSteps, trackId, className = '' }) {
  const phase = stepToLearningPhase(stepIndex, totalSteps)
  const activeIdx = LEARNING_PHASE_ORDER.indexOf(phase)

  return (
    <nav
      className={`ld-rail${className ? ` ${className}` : ''}`}
      aria-label="学习节奏"
    >
      {LEARNING_PHASE_ORDER.map((p, i) => (
        <span
          key={p}
          className={[
            'ld-rail-step',
            i < activeIdx ? 'is-done' : '',
            i === activeIdx ? 'is-current' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="ld-rail-dot" aria-hidden="true" />
          <span className="ld-rail-label">{getPhaseLabel(trackId, p)}</span>
        </span>
      ))}
    </nav>
  )
}

/**
 * 演示舞台外壳 — 统一 data-phase / 公式 / 结论
 */
export function DemoStageShell({
  trackId,
  stepIndex,
  totalSteps = 4,
  title,
  kind,
  className = '',
  formula,
  answer,
  why,
  caption,
  children,
}) {
  const { phase, showFormula, showAnswer, playing } = phaseFlags(
    stepToLearningPhase(stepIndex, totalSteps),
  )
  const live = playing ? 'ld-live is-playing' : 'ld-live'

  return (
    <div
      className={`demo-stage ld-stage ${live} ${className}`.trim()}
      data-phase={phase}
      data-kind={kind || trackId}
    >
      {title && <p className="demo-stage-title">{title}</p>}
      {children}
      <FormulaChip text={formula} show={showFormula} />
      <StepAnswer text={answer} show={showAnswer} />
      {why && <DemoWhy>{why}</DemoWhy>}
      {caption && <p className="topic-demo-caption ld-caption">{caption}</p>}
    </div>
  )
}
