import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TOPICS,
  TOPIC_EXAMPLES,
  TOPIC_EXAMPLE_LABELS,
  isPhysicsTopic,
  solveTopicProblem,
  validateExplainIR,
} from '../engines/topics/explainIR.js'
import { useSubscription } from '../contexts/SubscriptionContext'
import { aiAPI } from '../services/api'
import {
  DemoStageShell,
  FormulaChip,
  StepAnswer,
  LearningDemoRail,
} from './learning/LearningDemoParts.jsx'
import {
  stepToLearningPhase,
  resolveLearningTrack,
  phaseFlags,
} from '../engines/learningDemo.js'
import './LogicPanel.css'
import './TopicPanel.css'

const EXAMPLE_HINTS = {
  derivative: {
    deriv_poly: 'x³−3x → 逐项求导',
    deriv_tangent: '切点 + 斜率 → 切线',
    deriv_mono: 'f′=0 → 数轴增减',
  },
  conic: {
    ellipse_e: 'a、b → c → e=c/a',
    hyper_focus: 'c²=a²+b² → 焦点',
    circle_r: '配方 → 圆心半径',
  },
  phys_static: {
    phys_weight: 'G = mg',
    phys_find_F: 'F = ma 求力',
  },
  phys_motion: {
    phys_kinematic: 'a=2 · t=3s → 求 v',
    phys_displacement: 'a=2 · t=4s → 求 s',
    phys_v2as: 'a=4 · s=8m → 求 v',
  },
  phys_dynamics: {
    phys_newton: 'a = F / m',
    phys_weight: 'G = mg',
    phys_find_F: 'F = ma 求力',
    phys_work: 'W = Fs',
    phys_ke: 'Ek = ½mv²',
    phys_pe: 'Ep = mgh',
  },
  phys_circuit: {
    phys_ohm: 'U = IR',
  },
  phys_efield: {
    phys_efield_def: 'E = F / q',
  },
  phys_bfield: {
    phys_lorentz: '左手定则 → 圆周',
  },
  phys_induction: {
    phys_faraday: 'ε = |ΔΦ/Δt|',
  },
}

function buildChildrenMap(nodes) {
  return Object.fromEntries((nodes || []).map((n) => [n.id, n]))
}

function collectRevealed(steps, upTo) {
  const set = new Set()
  for (let i = 0; i <= upTo; i++) {
    for (const id of steps[i]?.highlightNodeIds || []) set.add(id)
  }
  return set
}

function TreeNode({ node, byId, highlighted, revealed, depth }) {
  if (!node) return null
  const seen = revealed.has(node.id)
  const on = highlighted.has(node.id)
  const kids = (node.children || []).map((id) => byId[id]).filter(Boolean)
  return (
    <li
      className={`logic-tree-node${seen ? ' is-revealed' : ' is-pending'}${on ? ' is-on' : ''}`}
      data-depth={depth}
    >
      <div className="logic-tree-card">
        <span className="logic-tree-label">{node.label}</span>
        {on && node.why && <p className="logic-tree-why">{node.why}</p>}
      </div>
      {kids.length > 0 && (
        <ul className="logic-tree-branch">
          {kids.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              byId={byId}
              highlighted={highlighted}
              revealed={revealed}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/** 解题步骤 → 演示分阶（统一四段式） */
function TopicDemoStage({ topic, problemType, stepIndex, totalSteps, step, filmKey, answer }) {
  if (isPhysicsTopic(topic)) {
    return (
      <PhysicsDemo
        key={filmKey}
        problemType={problemType}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        step={step}
        answer={answer}
      />
    )
  }
  if (topic === 'derivative') {
    return (
      <DerivativeDemo
        problemType={problemType}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        step={step}
        filmKey={filmKey}
        answer={answer}
      />
    )
  }
  return (
    <ConicDemo
      problemType={problemType}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      step={step}
      filmKey={filmKey}
      answer={answer}
    />
  )
}

function physCaption(problemType, stepIndex, answer) {
  const n = stepIndex ?? 0
  const map = {
    phys_newton: [
      '合力一直推着物体 → 产生加速度',
      '变形：a = F / m（别颠倒）',
      '代入数字，单位用 N、kg、m/s²',
      `加速度 ${answer}`,
    ],
    phys_find_F: [
      '加速度由合力产生',
      '写出 F = ma',
      '代入 m、a',
      `合力 ${answer}`,
    ],
    phys_work: [
      '力与位移同向，物体被持续推动',
      '同向：W = Fs',
      `功 ${answer}`,
    ],
    phys_kinematic: [
      '速度在均匀增加（匀加速）',
      '写出 v = v₀ + at',
      '把 v₀、a、t 代入',
      `末速度 ${answer}`,
    ],
    phys_displacement: [
      '物体持续前进，位移在累积',
      '求位移用 s = v₀t + ½at²',
      '代入 a、t，先算 t²',
      `位移 ${answer}`,
    ],
    phys_v2as: [
      '没有时间：看速度如何随位移涨',
      '选 v² = v₀² + 2as',
      '算出 v² 后开方',
      `末速度 ${answer}`,
    ],
    phys_weight: [
      '重力始终竖直向下拉',
      'G = m × g',
      `重力 ${answer}`,
    ],
    phys_ke: [
      '物体在动 → 有动能',
      'Ek = ½mv²（别漏 ½ 与平方）',
      `动能 ${answer}`,
    ],
    phys_pe: [
      '高度在变 → 势能在变',
      'Ep = mgh',
      `势能 ${answer}`,
    ],
    phys_ohm: [
      '电流在回路里持续流动',
      '写出 U = IR',
      '代入 I、R',
      `电压 ${answer}`,
    ],
    phys_efield_def: [
      '试探电荷在场中持续受力',
      '除掉 q：E = F/q',
      `场强 ${answer}`,
    ],
    phys_lorentz: [
      '粒子垂直磁场飞入',
      '左手定则定出力方向',
      '力始终垂直速度 → 匀速圆周',
      `${answer}`,
    ],
    phys_faraday: [
      '磁通量在持续变化',
      '算出 ΔΦ',
      'ε = |ΔΦ/Δt|',
      `电动势 ${answer}`,
    ],
  }
  const lines = map[problemType] || [`${answer || '跟步骤看讲解'}`]
  return lines[Math.min(n, lines.length - 1)]
}

/** 物理演示 — 统一四段式，代入步才开运动 */
function PhysicsDemo({ problemType, stepIndex, totalSteps, step, answer }) {
  const phase = stepToLearningPhase(stepIndex, totalSteps)
  const { showFormula, showAnswer, playing } = phaseFlags(phase)
  const live = `phys-live topic-demo ld-stage${playing ? ' is-playing' : ''}`
  const caption = physCaption(problemType, stepIndex, answer)
  const formula = step?.formula
  const why = step?.why

  if (problemType === 'phys_newton' || problemType === 'phys_find_F') {
    const formula = problemType === 'phys_find_F' ? 'F = ma' : 'a = F / m'
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="newton" data-phase={phase}>
        <p className="demo-stage-title">方法：F=ma — 看物体被加速推走</p>
        <div className="phys-stage">
          <div className="phys-accel-track">
            <div className={`phys-accel-force${showFormula ? ' is-on' : ''}`}>→ F</div>
            <div className="phys-accel-box">m</div>
            <div className={`phys-accel-a${showFormula ? ' is-on' : ''}`}>a</div>
          </div>
        </div>
        <FormulaChip text={formula} show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_work') {
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="work" data-phase={phase}>
        <p className="demo-stage-title">方法：同向推动 — 看位移累积成功</p>
        <div className="phys-stage">
          <div className="phys-work-live">
            <span className={`phys-work-f${showFormula ? ' is-on' : ''}`}>→ F</span>
            <div className="phys-work-rail">
              <div className="phys-work-slider">■</div>
            </div>
            <span className={`phys-work-s${showFormula ? ' is-on' : ''}`}>s</span>
            <span className={`phys-work-w${showFormula ? ' is-on' : ''}`}>W=Fs</span>
          </div>
        </div>
        <FormulaChip text="W = F · s" show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (
    problemType === 'phys_kinematic' ||
    problemType === 'phys_displacement' ||
    problemType === 'phys_v2as'
  ) {
    const title =
      problemType === 'phys_displacement'
        ? '方法：位移累积 — 看小车越跑越远'
        : problemType === 'phys_v2as'
          ? '方法：速度随位移涨 — 看加速冲刺'
          : '方法：匀加速 — 看速度条持续上涨'
    const formula =
      problemType === 'phys_displacement'
        ? 's = v₀t + ½at²'
        : problemType === 'phys_v2as'
          ? 'v² = v₀² + 2as'
          : 'v = v₀ + at'
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="motion" data-phase={phase}>
        <p className="demo-stage-title">{title}</p>
        <div className="phys-stage">
          <div className="phys-motion-live">
            <div className="phys-motion-rail">
              <div className="phys-motion-car">▮</div>
            </div>
            <div className={`phys-motion-meter${showFormula ? ' is-on' : ''}`}>
              <div className="phys-motion-needle" />
              <span>v</span>
            </div>
          </div>
        </div>
        <FormulaChip text={formula} show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_weight') {
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="weight" data-phase={phase}>
        <p className="demo-stage-title">方法：重力 G=mg — 方向竖直向下</p>
        <div className="phys-stage">
          <div className="phys-weight-live">
            <div className="phys-weight-hook" />
            <div className="phys-weight-mass">m</div>
            <div className={`phys-weight-g${showFormula ? ' is-on' : ''}`}>↓ G</div>
          </div>
        </div>
        <FormulaChip text="G = mg" show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_ke' || problemType === 'phys_pe') {
    const isKe = problemType === 'phys_ke'
    return (
      <div
        className={`demo-stage topic-demo ${live}`}
        data-kind={isKe ? 'ke' : 'pe'}
        data-phase={phase}
      >
        <p className="demo-stage-title">
          {isKe ? '方法：动能 — 看物体在跑道上冲刺' : '方法：势能 — 看物体在升高/下降'}
        </p>
        <div className="phys-stage">
          {isKe ? (
            <div className="phys-ke-live">
              <div className="phys-ke-ball" />
            </div>
          ) : (
            <div className="phys-pe-live">
              <div className="phys-pe-lift">m</div>
              <span className={`phys-pe-h${showFormula ? ' is-on' : ''}`}>h</span>
            </div>
          )}
        </div>
        <FormulaChip text={isKe ? 'Ek = ½mv²' : 'Ep = mgh'} show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_ohm') {
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="ohm" data-phase={phase}>
        <p className="demo-stage-title">方法：欧姆定律 — 看电荷在回路里跑</p>
        <div className="phys-stage">
          <div className="phys-ohm-live">
            <svg viewBox="0 0 240 100" className="phys-ohm-svg" aria-hidden="true">
              <rect x="20" y="20" width="200" height="60" rx="8" className="phys-ohm-loop" />
              {playing && (
                <>
                  <circle r="5" className="phys-ohm-dot">
                    <animateMotion
                      dur="2.4s"
                      repeatCount="indefinite"
                      path="M28,28 H212 V72 H28 Z"
                    />
                  </circle>
                  <circle r="5" className="phys-ohm-dot">
                    <animateMotion
                      dur="2.4s"
                      begin="-0.8s"
                      repeatCount="indefinite"
                      path="M28,28 H212 V72 H28 Z"
                    />
                  </circle>
                  <circle r="5" className="phys-ohm-dot">
                    <animateMotion
                      dur="2.4s"
                      begin="-1.6s"
                      repeatCount="indefinite"
                      path="M28,28 H212 V72 H28 Z"
                    />
                  </circle>
                </>
              )}
              <text x="100" y="55" className="phys-ohm-label">
                R
              </text>
            </svg>
            <div className={`phys-ohm-eq${showFormula ? ' is-on' : ''}`}>U = IR</div>
          </div>
        </div>
        <FormulaChip text="U = IR" show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_efield_def') {
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="efield" data-phase={phase}>
        <p className="demo-stage-title">方法：场强 — 看试探电荷被场推着走</p>
        <div className="phys-stage">
          <div className="phys-efield-live">
            <div className="phys-efield-stream">
              <span /><span /><span /><span /><span />
            </div>
            <div className="phys-efield-charge">+q</div>
          </div>
        </div>
        <FormulaChip text="E = F / q" show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_lorentz') {
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="lorentz" data-phase={phase}>
        <p className="demo-stage-title">方法：洛伦兹力 — 看粒子在磁场里绕圈</p>
        <div className="phys-stage">
          <div className="phys-lorentz-live">
            <div className="phys-lorentz-field">××××××</div>
            <div className="phys-lorentz-orbit">
              <div className="phys-lorentz-dot" />
            </div>
          </div>
        </div>
        <FormulaChip text="F = qvB" show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  if (problemType === 'phys_faraday') {
    return (
      <div className={`demo-stage topic-demo ${live}`} data-kind="faraday" data-phase={phase}>
        <p className="demo-stage-title">方法：感应电动势 — 看磁通量起伏变化</p>
        <div className="phys-stage">
          <div className="phys-faraday-live">
            <div className="phys-faraday-coil">线圈</div>
            <div className="phys-faraday-wave" />
          </div>
        </div>
        <FormulaChip text="ε = |ΔΦ / Δt|" show={showFormula} />
        <StepAnswer text={answer} show={showAnswer} />
        <p className="topic-demo-caption">{caption}</p>
      </div>
    )
  }

  return (
    <div className={`demo-stage topic-demo ${live}`} data-phase={phase}>
      <p className="demo-stage-title">方法演示</p>
      <p className="topic-demo-caption">{caption}</p>
    </div>
  )
}

function DerivativeDemo({ problemType, stepIndex, totalSteps, step, filmKey, answer }) {
  const why = step?.why
  const formula = step?.formula

  if (problemType === 'deriv_tangent') {
    const visPhase =
      stepIndex <= 0 ? 'curve' : stepIndex === 1 ? 'slope' : stepIndex === 2 ? 'point' : 'line'
    const caption =
      visPhase === 'curve'
        ? '先有曲线，切线斜率来自导数'
        : visPhase === 'slope'
          ? '算出斜率 k = f′(x₀)'
          : visPhase === 'point'
            ? '再找切点 (x₀, f(x₀))'
            : `点斜式画出切线 → ${answer}`
    return (
      <DemoStageShell
        key={filmKey}
        trackId="derivative"
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        title="演示：切线三步"
        formula={formula || 'y − y₀ = k(x − x₀)'}
        answer={answer}
        why={why}
        caption={caption}
        className="topic-demo"
      >
        <svg className="topic-svg" viewBox="0 0 280 140" aria-hidden="true">
          <line x1="20" y1="70" x2="260" y2="70" className="topic-axis" />
          <line x1="140" y1="10" x2="140" y2="130" className="topic-axis" />
          {/* y = x³−3x 示意：过 (1,-2) 附近的三次形 */}
          <path
            className={`topic-curve${visPhase !== 'curve' ? ' is-dim' : ''}`}
            d="M 40 90 C 80 20, 100 20, 140 70 C 180 120, 200 120, 240 50"
            fill="none"
          />
          {visPhase !== 'curve' && (
            <text x="168" y="28" className="topic-svg-label">
              k = f′(1)
            </text>
          )}
          {(visPhase === 'point' || visPhase === 'line') && (
            <circle cx="175" cy="95" r="5" className="topic-dot is-pop" />
          )}
          {visPhase === 'line' && (
            <line
              x1="40"
              y1="95"
              x2="260"
              y2="95"
              className="topic-tangent is-pop"
            />
          )}
          {visPhase === 'line' && (
            <text x="200" y="88" className="topic-svg-label topic-svg-accent">
              y = −2
            </text>
          )}
        </svg>
      </DemoStageShell>
    )
  }

  if (problemType === 'deriv_mono') {
    const visPhase =
      stepIndex <= 0 ? 'factor' : stepIndex === 1 ? 'zeros' : stepIndex === 2 ? 'sign' : 'done'
    const caption =
      visPhase === 'factor'
        ? 'f′ 因式分解，看清零点'
        : visPhase === 'zeros'
          ? '临界点把实轴切开'
          : visPhase === 'sign'
            ? '每段取试验点，读 f′ 正负'
            : answer
    return (
      <DemoStageShell
        key={filmKey}
        trackId="derivative"
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        title="演示：单调性数轴"
        formula={formula || "f′(x)=0"}
        answer={answer}
        why={why}
        caption={caption}
        className="topic-demo"
      >
        <div className="topic-numberline">
          <div className="topic-nl-track" />
          <span className={`topic-nl-mark${visPhase !== 'factor' ? ' is-on' : ''}`} style={{ left: '28%' }}>
            −1
          </span>
          <span className={`topic-nl-mark${visPhase !== 'factor' ? ' is-on' : ''}`} style={{ left: '72%' }}>
            1
          </span>
          {(visPhase === 'sign' || visPhase === 'done') && (
            <>
              <span className="topic-nl-arrow up" style={{ left: '10%' }}>
                ↗ 增
              </span>
              <span className="topic-nl-arrow down" style={{ left: '48%' }}>
                ↘ 减
              </span>
              <span className="topic-nl-arrow up" style={{ left: '82%' }}>
                ↗ 增
              </span>
            </>
          )}
        </div>
      </DemoStageShell>
    )
  }

  const visPhase =
    stepIndex <= 0 ? 'split' : stepIndex === 1 ? 't1' : stepIndex === 2 ? 't2' : 'merge'
  const caption =
    visPhase === 'split'
      ? '拆开每一项，分别求导'
      : visPhase === 't1'
        ? '幂法则：(xⁿ)′ = n xⁿ⁻¹'
        : visPhase === 't2'
          ? '一次项：系数就是导数'
          : `合并 → f′(x) = ${answer}`
  return (
    <DemoStageShell
      key={filmKey}
      trackId="derivative"
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="演示：逐项求导"
      formula={formula || "(xⁿ)′ = n xⁿ⁻¹"}
      answer={answer}
      why={why}
      caption={caption}
      className="topic-demo"
    >
      <div className="topic-term-row">
        <div className={`topic-term${visPhase === 'split' || visPhase === 't1' || visPhase === 'merge' ? ' is-on' : ''}`}>
          <span className="topic-term-before">x³</span>
          <span className="topic-term-arrow">→</span>
          <span className={`topic-term-after${visPhase === 't1' || visPhase === 'merge' ? ' is-show' : ''}`}>
            3x²
          </span>
        </div>
        <div className={`topic-term${visPhase === 'split' || visPhase === 't2' || visPhase === 'merge' ? ' is-on' : ''}`}>
          <span className="topic-term-before">−3x</span>
          <span className="topic-term-arrow">→</span>
          <span className={`topic-term-after${visPhase === 't2' || visPhase === 'merge' ? ' is-show' : ''}`}>
            −3
          </span>
        </div>
      </div>
    </DemoStageShell>
  )
}

function ConicDemo({ problemType, stepIndex, totalSteps, step, filmKey, answer }) {
  const why = step?.why
  const formula = step?.formula

  if (problemType === 'hyper_focus') {
    const visPhase =
      stepIndex <= 0 ? 'type' : stepIndex === 1 ? 'ab' : stepIndex === 2 ? 'c' : 'foci'
    const caption =
      visPhase === 'type'
        ? '正项在 x → 焦点在 x 轴'
        : visPhase === 'ab'
          ? '读出 a²、b²'
          : visPhase === 'c'
            ? '双曲线：c² = a² + b²（加）'
            : `焦点 ${answer}`
    return (
      <DemoStageShell
        key={filmKey}
        trackId="conic"
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        title="演示：双曲线焦点"
        formula={formula || 'c² = a² + b²'}
        answer={answer}
        why={why}
        caption={caption}
        className="topic-demo"
      >
        <svg className="topic-svg" viewBox="0 0 280 140" aria-hidden="true">
          <line x1="20" y1="70" x2="260" y2="70" className="topic-axis" />
          <line x1="140" y1="10" x2="140" y2="130" className="topic-axis" />
          <path
            className="topic-curve"
            d="M 55 20 C 95 70, 95 70, 55 120"
            fill="none"
          />
          <path
            className="topic-curve"
            d="M 225 20 C 185 70, 185 70, 225 120"
            fill="none"
          />
          {(visPhase === 'c' || visPhase === 'foci') && (
            <>
              <circle cx="80" cy="70" r="5" className="topic-dot is-pop" />
              <circle cx="200" cy="70" r="5" className="topic-dot is-pop" />
            </>
          )}
          {visPhase === 'foci' && (
            <>
              <text x="55" y="62" className="topic-svg-label">
                F₁
              </text>
              <text x="205" y="62" className="topic-svg-label">
                F₂
              </text>
            </>
          )}
        </svg>
        <div className="topic-abc-row">
          <span className={visPhase !== 'type' ? 'is-on' : ''}>a²</span>
          <span className="topic-abc-op">+</span>
          <span className={visPhase === 'c' || visPhase === 'foci' ? 'is-on' : ''}>b²</span>
          <span className="topic-abc-op">=</span>
          <span className={visPhase === 'c' || visPhase === 'foci' ? 'is-on topic-abc-c' : ''}>c²</span>
        </div>
      </DemoStageShell>
    )
  }

  if (problemType === 'circle_r') {
    const visPhase =
      stepIndex <= 0 ? 'x' : stepIndex === 1 ? 'y' : stepIndex === 2 ? 'r2' : 'done'
    const caption =
      visPhase === 'x'
        ? '先配方 x，得到圆心横坐标'
        : visPhase === 'y'
          ? '再配方 y，得到圆心纵坐标'
          : visPhase === 'r2'
            ? '右边凑出 r²'
            : answer
    return (
      <DemoStageShell
        key={filmKey}
        trackId="conic"
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        title="演示：配方成圆"
        formula={formula || '(x−a)²+(y−b)²=r²'}
        answer={answer}
        why={why}
        caption={caption}
        className="topic-demo"
      >
        <svg className="topic-svg" viewBox="0 0 280 140" aria-hidden="true">
          <line x1="20" y1="100" x2="260" y2="100" className="topic-axis" />
          <line x1="50" y1="20" x2="50" y2="120" className="topic-axis" />
          <circle
            cx="140"
            cy="70"
            r={visPhase === 'x' ? 20 : visPhase === 'y' ? 35 : 48}
            className={`topic-circle-ring${visPhase !== 'x' ? ' is-grow' : ''}`}
            fill="none"
          />
          {(visPhase === 'r2' || visPhase === 'done') && (
            <circle cx="140" cy="70" r="4" className="topic-dot is-pop" />
          )}
          {visPhase === 'done' && (
            <text x="148" y="66" className="topic-svg-label topic-svg-accent">
              C
            </text>
          )}
        </svg>
      </DemoStageShell>
    )
  }

  const visPhase = stepIndex <= 0 ? 'ab' : stepIndex === 1 ? 'c' : 'e'
  const caption =
    visPhase === 'ab'
      ? '较大分母是 a²，焦点在对应轴'
      : visPhase === 'c'
        ? '椭圆：c² = a² − b²（减）'
        : '离心率 e = c/a，且 0＜e＜1'
  return (
    <DemoStageShell
      key={filmKey}
      trackId="conic"
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="演示：椭圆 a → c → e"
      formula={formula || 'c² = a² − b²'}
      answer={answer}
      why={why}
      caption={caption}
      className="topic-demo"
    >
      <svg className="topic-svg" viewBox="0 0 280 140" aria-hidden="true">
        <line x1="20" y1="70" x2="260" y2="70" className="topic-axis" />
        <line x1="140" y1="15" x2="140" y2="125" className="topic-axis" />
        <ellipse
          cx="140"
          cy="70"
          rx="90"
          ry="55"
          className="topic-ellipse"
          fill="none"
        />
        <line
          x1="140"
          y1="70"
          x2="230"
          y2="70"
          className={`topic-seg${visPhase === 'ab' || visPhase === 'c' || visPhase === 'e' ? ' is-on' : ''}`}
        />
        <text x="178" y="64" className="topic-svg-label">
          a
        </text>
        <line
          x1="140"
          y1="70"
          x2="140"
          y2="125"
          className={`topic-seg topic-seg-b${visPhase === 'ab' || visPhase === 'c' || visPhase === 'e' ? ' is-on' : ''}`}
        />
        <text x="146" y="110" className="topic-svg-label">
          b
        </text>
        {(visPhase === 'c' || visPhase === 'e') && (
          <>
            <circle cx="95" cy="70" r="4" className="topic-dot is-pop" />
            <circle cx="185" cy="70" r="4" className="topic-dot is-pop" />
            <text x="78" y="62" className="topic-svg-label">
              c
            </text>
          </>
        )}
      </svg>
      <div className="topic-abc-row">
        <span className={visPhase === 'e' ? 'is-on topic-abc-c' : ''}>e</span>
        <span className="topic-abc-op">=</span>
        <span className={visPhase === 'c' || visPhase === 'e' ? 'is-on' : ''}>c</span>
        <span className="topic-abc-op">/</span>
        <span className="is-on">a</span>
        {visPhase === 'e' && <span className="topic-abc-ans">= {answer}</span>}
      </div>
    </DemoStageShell>
  )
}

/**
 * 导数 / 圆锥曲线：步骤 + 具体演示动画 + 思路树
 */
/**
 * @param {{ topic: string, boot?: { type: 'sample'|'text', key?: string, text?: string, nonce: number }, onBackToHub?: () => void }} props
 */
export default function TopicPanel({ topic, boot, onBackToHub }) {
  const meta = TOPICS[topic]
  const examples = TOPIC_EXAMPLES[topic]
  const labels = TOPIC_EXAMPLE_LABELS[topic]
  const hints = EXAMPLE_HINTS[topic] || {}
  const exampleKeys = Object.keys(examples || {})
  const {
    checkCanGenerate,
    recordUsage,
    remaining,
    isPro,
    triggerPaywall,
    checkCanExportPpt,
  } = useSubscription()

  const [input, setInput] = useState('')
  const [ir, setIr] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pptLoading, setPptLoading] = useState(false)
  const [filmKey, setFilmKey] = useState(0)
  const bootNonceRef = useRef(null)

  const byId = useMemo(() => buildChildrenMap(ir?.nodes), [ir])
  const root = ir ? byId[ir.rootId] : null
  const step = ir?.steps?.[currentStep] || ir?.steps?.[0]
  const highlighted = useMemo(
    () => new Set(step?.highlightNodeIds || []),
    [step],
  )
  const revealed = useMemo(
    () => (ir ? collectRevealed(ir.steps, currentStep) : new Set()),
    [ir, currentStep],
  )

  const applyIr = (next) => {
    setIr(next)
    setCurrentStep(0)
    setError('')
    setFilmKey((k) => k + 1)
  }

  /** 样例免费：不占额度，先体验方法动画 */
  const selectExample = (key) => {
    if (!examples?.[key]) return
    setInput(examples[key].goal)
    applyIr(examples[key])
  }

  const solveText = async (raw) => {
    const text = String(raw || '').trim()
    if (text.length < 4) {
      setError(`请先输入一道${meta?.label || ''}题`)
      return
    }
    if (!checkCanGenerate()) return

    const local = solveTopicProblem(topic, text)
    if (local) {
      applyIr(local)
      await recordUsage('generate', text)
      return
    }
    setLoading(true)
    setError('本地未命中，正在用 AI 拆解…')
    try {
      const aiTopic = isPhysicsTopic(topic) ? 'physics' : topic
      const res = await aiAPI.explain(text, aiTopic)
      const next = res?.data
      if (!next || !Array.isArray(next.steps) || next.steps.length === 0) {
        throw new Error(res?.error || 'AI 返回无效')
      }
      if (!validateExplainIR(next).ok) {
        throw new Error(validateExplainIR(next).errors.join('；') || 'AI 返回无效')
      }
      applyIr(next)
      await recordUsage('generate', text)
    } catch (e) {
      setError(e?.message || meta?.hint)
    } finally {
      setLoading(false)
    }
  }

  const handleSolve = async () => {
    await solveText(input)
  }

  /** Hub 传入样例 / 题目后自动开讲 */
  useEffect(() => {
    if (!boot || boot.nonce == null || boot.nonce === bootNonceRef.current) return
    bootNonceRef.current = boot.nonce
    if (boot.type === 'sample' && boot.key && examples?.[boot.key]) {
      selectExample(boot.key)
      return
    }
    if (boot.type === 'text' && boot.text) {
      setInput(boot.text)
      void solveText(boot.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot.nonce 驱动一次
  }, [boot, topic])

  const goStep = (i) => {
    setCurrentStep(i)
    // 物理动画持续播放，切步骤只换文案；导数/圆锥仍按镜刷新
    if (!isPhysicsTopic(topic)) setFilmKey((k) => k + 1)
  }

  const handleExportPPT = async () => {
    if (!ir || !checkCanExportPpt()) return
    setPptLoading(true)
    try {
      const { generateExplainPPT } = await import('../engines/pptExporter')
      await generateExplainPPT({
        title: meta?.kicker || meta?.label || '方法讲解',
        goal: ir.goal,
        coreIdea: ir.coreIdea,
        steps: ir.steps,
        answer: ir.answer,
      })
    } catch (err) {
      console.error('PPT export failed:', err)
      setError(err?.message || 'PPT 导出失败')
    } finally {
      setPptLoading(false)
    }
  }

  const showQuotaWarn = !isPro && Number.isFinite(remaining) && remaining <= 3 && remaining > 0
  const showQuotaEmpty = !isPro && remaining === 0

  return (
    <div className="logic-panel topic-panel">
      {ir && (
        <div className="logic-solving-bar">
          <button
            type="button"
            className="logic-solving-back"
            onClick={() => {
              setIr(null)
              setCurrentStep(0)
              setError('')
              setInput('')
              if (onBackToHub) onBackToHub()
            }}
          >
            ← 换一道
          </button>
          <span className="logic-solving-meta">答案 {ir.answer}</span>
        </div>
      )}
      <header className="logic-panel-head">
        <p className="logic-panel-kicker">{meta.kicker} · 动画演示</p>
        <h2 className="logic-panel-title">{meta.title}</h2>

        {showQuotaWarn && (
          <div className="wp-upgrade-banner">
            <span className="wp-upgrade-banner-text">
              今日还剩 <strong>{remaining}</strong> 次免费理解（样例不占次数）
            </span>
            <button
              type="button"
              className="wp-upgrade-banner-btn"
              onClick={() =>
                triggerPaywall('额度将用尽，升级 Pro 解锁无限理解')
              }
            >
              升级无限使用 →
            </button>
          </div>
        )}
        {showQuotaEmpty && (
          <div className="wp-upgrade-banner danger">
            <span className="wp-upgrade-banner-text">今日免费次数已用完</span>
            <button
              type="button"
              className="wp-upgrade-banner-btn"
              onClick={() =>
                triggerPaywall('今日免费次数已用完，升级 Pro 继续使用')
              }
            >
              升级 Pro →
            </button>
          </div>
        )}

        <div className="logic-compose">
          <textarea
            className="logic-compose-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSolve()
              }
            }}
            placeholder={meta.placeholder}
            rows={3}
            spellCheck={false}
          />
          <div className="logic-compose-row">
            <button
              type="button"
              className="logic-compose-submit"
              onClick={handleSolve}
              disabled={loading || showQuotaEmpty}
            >
              {loading ? '理解中…' : '开始理解'}
            </button>
            <span className="logic-compose-hint">
              {isPro
                ? 'Ctrl + Enter · Pro 无限额度'
                : `Ctrl + Enter · 样例免费 · 今日剩 ${Number.isFinite(remaining) ? remaining : '∞'} 次`}
            </span>
          </div>
          {error && <p className="logic-compose-error">{error}</p>}
        </div>

        <div className="logic-examples-wrap">
          <span className="logic-type-label">试样例</span>
          <div className="logic-examples-grid">
            {exampleKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`logic-example-card${ir?.problemType === key ? ' is-active' : ''}`}
                onClick={() => selectExample(key)}
              >
                <span className="logic-example-card-label">{labels[key]}</span>
                <span className="logic-example-card-hint">{hints[key] || ''}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {!ir ? (
        <p className="logic-empty-hint">输入题目后点「开始理解」，或点上方样例。</p>
      ) : (
        <>
      <p className="logic-goal">{ir.goal}</p>
      {ir.coreIdea && (
        <p className="logic-core">
          <span>核心</span>
          {ir.coreIdea}
        </p>
      )}

      <div className="logic-body">
        <section className="logic-steps" aria-label="解题步骤">
          <h3 className="logic-section-title">一步步拆解</h3>
          <ol className="logic-step-list">
            {ir.steps.map((s, i) => (
              <li key={s.index}>
                <button
                  type="button"
                  className={`logic-step${i === currentStep ? ' is-current' : ''}${i < currentStep ? ' is-done' : ''}`}
                  onClick={() => goStep(i)}
                >
                  <span className="logic-step-idx">{s.index}</span>
                  <div className="logic-step-main">
                    <strong>{s.title}</strong>
                    <p>{s.content}</p>
                    {s.why && <p className="logic-step-why">注意：{s.why}</p>}
                    {s.formula && (
                      <code className="logic-step-formula">{s.formula}</code>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ol>
          <div className="logic-step-nav">
            <button
              type="button"
              disabled={currentStep <= 0}
              onClick={() => goStep(Math.max(0, currentStep - 1))}
            >
              上一步
            </button>
            <button
              type="button"
              disabled={currentStep >= ir.steps.length - 1}
              onClick={() => goStep(Math.min(ir.steps.length - 1, currentStep + 1))}
            >
              下一步
            </button>
            <button
              type="button"
              className="logic-play-btn"
              onClick={handleExportPPT}
              disabled={pptLoading}
            >
              {pptLoading ? '导出中…' : isPro ? '导出 PPT' : '导出 PPT · Pro'}
            </button>
            <span className="logic-answer">答案 {ir.answer}</span>
          </div>
        </section>

        <section className="logic-viz" aria-label="演示与思路树">
          <h3 className="logic-section-title">具体演示（跟步骤变）</h3>
          <LearningDemoRail
            stepIndex={currentStep}
            totalSteps={ir.steps.length}
            trackId={resolveLearningTrack(topic)}
          />
          <TopicDemoStage
            topic={topic}
            problemType={ir.problemType}
            stepIndex={currentStep}
            totalSteps={ir.steps.length}
            step={step}
            filmKey={filmKey}
            answer={ir.answer}
          />

          <div className="logic-film-caption">
            <span className="logic-film-beat">
              第 {currentStep + 1}/{ir.steps.length} 镜
            </span>
            <p className="logic-film-why">{step?.why || step?.content}</p>
            {step?.formula && (
              <code className="logic-film-formula">{step.formula}</code>
            )}
          </div>

          <h3 className="logic-section-title">思路树</h3>
          <ul className="logic-tree-root">
            <TreeNode
              node={root}
              byId={byId}
              highlighted={highlighted}
              revealed={revealed}
              depth={0}
            />
          </ul>
        </section>
      </div>
        </>
      )}
    </div>
  )
}
