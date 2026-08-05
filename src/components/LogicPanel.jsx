import { useEffect, useMemo, useRef, useState } from 'react'
import { MVP_EXAMPLES, PROBLEM_TYPES, validateLogicIR } from '../engines/logicIR/schema.js'
import { solveLogicProblem } from '../engines/logicIR/solve.js'
import { useSubscription } from '../contexts/SubscriptionContext'
import { aiAPI } from '../services/api'
import './LogicPanel.css'

const TYPE_LABELS = {
  multiply_add: '分步乘加',
  perm_comb: '排列组合',
  classical_prob: '古典概率',
}

const TYPE_HINTS = {
  multiply_add: '正副组长 · 分步相乘',
  perm_comb: '选代表 · 无序组合',
  classical_prob: '红白球 · 不放回',
}

const PLACEHOLDER =
  '例如：从6人选正、副组长各1人，有多少种选法？\n或：袋中4红3白，不放回连抽2次都是红的概率？'

const PERSON_LABELS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛']

function buildChildrenMap(nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  return { byId }
}

/** 从 LogicIR 推断演示用的人数 / 球数 */
function inferDemoMeta(ir) {
  const counts = (ir.nodes || [])
    .map((n) => n.count)
    .filter((c) => typeof c === 'number' && c > 0)
  const maxCount = counts.length ? Math.max(...counts) : 5
  const n = Math.min(Math.max(maxCount, 3), 8)

  let red = 3
  let white = 2
  const m = String(ir.goal || '').match(/(\d+)\s*红.*?(\d+)\s*白/)
  if (m) {
    red = Number(m[1])
    white = Number(m[2])
  }
  return { n, red, white, k: 2 }
}

/**
 * 具体演示舞台：人选位 / 组合折叠 / 抽球
 * 跟 currentStep 切换镜头，逐步数数，比纯文字更直观。
 */
function DemoStage({ problemType, stepIndex, filmKey, meta, answer }) {
  const { n, red, white } = meta
  const people = PERSON_LABELS.slice(0, n)
  const total = red + white

  if (problemType === 'classical_prob') {
    const phase =
      stepIndex <= 0 ? 'bag' : stepIndex === 1 ? 'draw1' : stepIndex === 2 ? 'draw2' : 'done'
    const balls = [
      ...Array.from({ length: red }, (_, i) => ({ id: `r${i}`, color: 'red' })),
      ...Array.from({ length: white }, (_, i) => ({ id: `w${i}`, color: 'white' })),
    ]
    const why =
      phase === 'bag'
        ? `先数清楚：红 ${red}、白 ${white}，一共 ${total} 个`
        : phase === 'draw1'
          ? `第1次抽红：袋里还是满的 → ${red}/${total}`
          : phase === 'draw2'
            ? `不放回：红少1、总数少1 → ${Math.max(red - 1, 0)}/${Math.max(total - 1, 1)}`
            : `两步相乘（同时发生）→ ${answer}`

    return (
      <div key={filmKey} className="demo-stage demo-prob" data-phase={phase}>
        <p className="demo-stage-title">演示：不放回抽球</p>
        <div className="demo-bag">
          <span className="demo-bag-label">袋中</span>
          <div className="demo-balls">
            {balls.map((b, i) => {
              const drawn1 = phase !== 'bag' && b.color === 'red' && i === 0
              const drawn2 = (phase === 'draw2' || phase === 'done') && b.color === 'red' && i === 1
              const gone = drawn1 || drawn2
              const countPulse = phase === 'bag' && b.color === 'red'
              return (
                <span
                  key={b.id}
                  className={`demo-ball demo-ball--${b.color}${gone ? ' is-drawn' : ''}${drawn1 ? ' is-slot1' : ''}${drawn2 ? ' is-slot2' : ''}${countPulse ? ' is-count' : ''}`}
                  style={countPulse ? { animationDelay: `${i * 0.08}s` } : undefined}
                  title={b.color === 'red' ? '红' : '白'}
                />
              )
            })}
          </div>
          {phase === 'bag' && (
            <p className="demo-count-strip">
              <span className="demo-count-chip demo-count-chip--red">红 {red}</span>
              <span className="demo-count-chip">白 {white}</span>
              <span className="demo-count-chip demo-count-chip--total">共 {total}</span>
            </p>
          )}
        </div>
        <div className="demo-draws">
          <div className={`demo-draw-slot${phase !== 'bag' ? ' is-filled' : ''}`}>
            <span className="demo-draw-label">第1次</span>
            <span className={`demo-ball demo-ball--red${phase === 'bag' ? ' is-empty' : ''}`} />
            <span className={`demo-draw-frac${phase !== 'bag' ? ' is-pop' : ''}`}>
              {red}/{total}
            </span>
          </div>
          <span className="demo-draw-mul">×</span>
          <div className={`demo-draw-slot${phase === 'draw2' || phase === 'done' ? ' is-filled' : ''}`}>
            <span className="demo-draw-label">第2次</span>
            <span
              className={`demo-ball demo-ball--red${phase === 'draw2' || phase === 'done' ? '' : ' is-empty'}`}
            />
            <span className={`demo-draw-frac${phase === 'draw2' || phase === 'done' ? ' is-pop' : ''}`}>
              {Math.max(red - 1, 0)}/{Math.max(total - 1, 1)}
            </span>
          </div>
          {(phase === 'done' || stepIndex >= 3) && (
            <>
              <span className="demo-draw-mul">=</span>
              <span className="demo-draw-ans is-pop">{answer}</span>
            </>
          )}
        </div>
        <p className="demo-stage-why">{why}</p>
      </div>
    )
  }

  if (problemType === 'perm_comb') {
    const phase =
      stepIndex <= 0 ? 'pool' : stepIndex === 1 ? 'pick' : 'fold'
    const picked = people.slice(0, 2)
    const why =
      phase === 'pool'
        ? `从 ${n} 人里选 2 人当代表（无职位差别）`
        : phase === 'pick'
          ? '若分先后：甲→乙 与 乙→甲 会算成两种'
          : '组合不分先后 → 要除以 2!，只留一组'

    return (
      <div key={filmKey} className="demo-stage demo-comb" data-phase={phase}>
        <p className="demo-stage-title">演示：无序选代表（组合）</p>
        <div className="demo-people">
          {people.map((name, i) => (
            <span
              key={name}
              className={`demo-person${phase !== 'pool' && i < 2 ? ' is-picked' : ''}${phase === 'fold' && i < 2 ? ' is-folded' : ''}`}
              style={phase === 'pool' ? { animationDelay: `${i * 0.05}s` } : undefined}
            >
              {name}
            </span>
          ))}
        </div>
        {phase === 'pool' && (
          <p className="demo-count-strip">
            <span className="demo-count-chip demo-count-chip--total">共 {n} 人</span>
            <span className="demo-count-chip">要选 2 人</span>
          </p>
        )}
        <div className="demo-comb-board">
          <div className={`demo-pair${phase === 'pick' ? ' is-show' : ''}${phase === 'fold' ? ' is-hide' : ''}`}>
            <span className="demo-pair-label">若看成有序</span>
            <div className="demo-pair-row">
              <span className="demo-chip">{picked[0]}→{picked[1]}</span>
              <span className="demo-chip" style={{ animationDelay: '0.12s' }}>
                {picked[1]}→{picked[0]}
              </span>
            </div>
            <span className="demo-pair-note">算 2 种（排列会重复）</span>
          </div>
          <div className={`demo-set${phase === 'fold' ? ' is-show' : ''}`}>
            <span className="demo-pair-label">组合只算 1 种</span>
            <div className="demo-set-bubble">
              {'{'}
              {picked[0]}, {picked[1]}
              {'}'}
            </div>
            <span className="demo-pair-note">顺序不同 = 同一组 → 要除以 2!</span>
          </div>
        </div>
        <p className="demo-stage-why">{why}</p>
      </div>
    )
  }

  // multiply_add / 默认：正副席位
  const phase =
    stepIndex <= 0 ? 'intro' : stepIndex === 1 ? 'seat1' : stepIndex === 2 ? 'seat2' : 'done'
  const chief = people[0]
  const vice = people[1]
  const why =
    phase === 'intro'
      ? `正、副是两个不同职位 → 分步，先数清有 ${n} 人`
      : phase === 'seat1'
        ? `正组长：${n} 人选 1 → 乘式第一项`
        : phase === 'seat2'
          ? `副组长：剩下 ${n - 1} 人 → 乘式第二项`
          : `有序 → 用乘法：${n}×${n - 1}=${answer}`

  return (
    <div key={filmKey} className="demo-stage demo-perm" data-phase={phase}>
      <p className="demo-stage-title">演示：有序选正副（乘法）</p>
      <div className="demo-seats">
        <div className={`demo-seat${phase !== 'intro' ? ' is-filled' : ''}`}>
          <span className="demo-seat-role">正组长</span>
          <span className={`demo-person demo-person--seat${phase === 'intro' ? ' is-ghost' : ' is-arrive'}`}>
            {phase === 'intro' ? '?' : chief}
          </span>
          <span className={`demo-seat-hint${phase !== 'intro' ? ' is-pop' : ''}`}>{n} 人选</span>
        </div>
        <span className={`demo-seat-times${phase === 'seat2' || phase === 'done' ? ' is-on' : ''}`}>×</span>
        <div className={`demo-seat${phase === 'seat2' || phase === 'done' ? ' is-filled' : ''}`}>
          <span className="demo-seat-role">副组长</span>
          <span
            className={`demo-person demo-person--seat${phase === 'seat2' || phase === 'done' ? ' is-arrive' : ' is-ghost'}`}
          >
            {phase === 'seat2' || phase === 'done' ? vice : '?'}
          </span>
          <span className={`demo-seat-hint${phase === 'seat2' || phase === 'done' ? ' is-pop' : ''}`}>
            {n - 1} 人剩
          </span>
        </div>
      </div>
      <div className="demo-people">
        {people.map((name, i) => {
          const used =
            (phase !== 'intro' && i === 0) ||
            ((phase === 'seat2' || phase === 'done') && i === 1)
          return (
            <span
              key={name}
              className={`demo-person${used ? ' is-used' : ' is-idle'}${phase === 'intro' ? ' is-count' : ''}`}
              style={phase === 'intro' ? { animationDelay: `${i * 0.06}s` } : undefined}
            >
              {name}
            </span>
          )
        })}
      </div>
      {phase === 'intro' && (
        <p className="demo-count-strip">
          <span className="demo-count-chip demo-count-chip--total">共 {n} 人可选</span>
        </p>
      )}
      {(phase === 'done' || stepIndex >= 3) && (
        <p className="demo-perm-result">
          {n} × {n - 1} = <strong>{answer}</strong>
          <span>对调甲乙算两种 → 必须用乘</span>
        </p>
      )}
      <p className="demo-stage-why">{why}</p>
    </div>
  )
}

/** 截至当前步已「长出」的节点 */
function collectRevealed(steps, upTo) {
  const set = new Set()
  for (let i = 0; i <= upTo; i++) {
    for (const id of steps[i]?.highlightNodeIds || []) set.add(id)
  }
  return set
}

function LogicTreeNode({ node, byId, highlighted, revealed, depth }) {
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
        {node.count != null && (
          <span className="logic-tree-count">×{node.count}</span>
        )}
        {on && node.why && <p className="logic-tree-why">{node.why}</p>}
      </div>
      {kids.length > 0 && (
        <ul className="logic-tree-branch">
          {kids.map((child) => (
            <LogicTreeNode
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

/**
 * 排组/概率：LogicIR +「逻辑生长」动画（与竞品文字步骤差异化）
 */
/**
 * @param {{ boot?: { type: 'sample'|'text', key?: string, text?: string, nonce: number }, onBackToHub?: () => void }} props
 */
export default function LogicPanel({ boot, onBackToHub } = {}) {
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

  const { byId } = useMemo(
    () => buildChildrenMap(ir?.nodes || []),
    [ir],
  )
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

  /** 乘法生长条：从已揭示节点的 count 累积 */
  const growFactors = useMemo(() => {
    if (!ir) return []
    const factors = []
    for (const id of revealed) {
      const n = byId[id]
      if (n && typeof n.count === 'number' && n.count > 0) {
        factors.push({ id, count: n.count, label: n.label })
      }
    }
    return factors
  }, [ir, revealed, byId])

  const product = growFactors.reduce((p, f) => p * f.count, growFactors.length ? 1 : null)
  const demoMeta = useMemo(
    () => (ir ? inferDemoMeta(ir) : { n: 5, red: 3, white: 2, k: 2 }),
    [ir],
  )

  const applyIr = (next) => {
    setIr(next)
    setCurrentStep(0)
    setError('')
    setFilmKey((k) => k + 1)
  }

  /** 样例免费 */
  const selectType = (type) => {
    setInput(MVP_EXAMPLES[type].goal)
    applyIr(MVP_EXAMPLES[type])
  }

  const solveText = async (raw) => {
    const text = String(raw || '').trim()
    if (text.length < 4) {
      setError('请先粘贴或输入一道排列组合 / 概率题')
      return
    }
    if (!checkCanGenerate()) return

    const local = solveLogicProblem(text)
    if (local) {
      applyIr(local)
      await recordUsage('generate', text)
      return
    }
    setLoading(true)
    setError('本地未命中，正在用 AI 拆解…')
    try {
      const res = await aiAPI.explain(text, 'combo')
      const next = res?.data
      if (!next || !Array.isArray(next.steps) || next.steps.length === 0) {
        throw new Error(res?.error || 'AI 返回无效')
      }
      if (!validateLogicIR(next).ok) {
        throw new Error(validateLogicIR(next).errors.join('；') || 'AI 返回无效')
      }
      applyIr(next)
      await recordUsage('generate', text)
    } catch (e) {
      setError(
        e?.message ||
          '暂时解不出。试试：正副选拔、选代表（组合）、红白球不放回，或点下方样例。',
      )
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
    if (boot.type === 'sample' && boot.key && MVP_EXAMPLES[boot.key]) {
      selectType(boot.key)
      return
    }
    if (boot.type === 'text' && boot.text) {
      setInput(boot.text)
      void solveText(boot.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot.nonce 驱动一次
  }, [boot])

  const handleExportPPT = async () => {
    if (!ir || !checkCanExportPpt()) return
    setPptLoading(true)
    try {
      const { generateExplainPPT } = await import('../engines/pptExporter')
      await generateExplainPPT({
        title: '排列组合 · 概率',
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

  const goStep = (i) => {
    setCurrentStep(i)
    setFilmKey((k) => k + 1)
  }

  const showQuotaWarn = !isPro && Number.isFinite(remaining) && remaining <= 3 && remaining > 0
  const showQuotaEmpty = !isPro && remaining === 0

  return (
    <div className="logic-panel">
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
        <p className="logic-panel-kicker">排列组合 · 概率 · 逻辑生长动画</p>
        <h2 className="logic-panel-title">看清「为什么这样选」</h2>

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
            placeholder={PLACEHOLDER}
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
            {PROBLEM_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`logic-example-card${ir?.problemType === type ? ' is-active' : ''}`}
                onClick={() => selectType(type)}
              >
                <span className="logic-example-card-label">{TYPE_LABELS[type]}</span>
                <span className="logic-example-card-hint">{TYPE_HINTS[type]}</span>
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
          <h3 className="logic-section-title">一步步为什么</h3>
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
                    {s.why && <p className="logic-step-why">为什么：{s.why}</p>}
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

        <section className="logic-viz" aria-label="逻辑生长舞台">
          <h3 className="logic-section-title">具体演示（跟步骤变）</h3>

          <DemoStage
            problemType={ir.problemType}
            stepIndex={currentStep}
            filmKey={filmKey}
            meta={demoMeta}
            answer={ir.answer}
          />

          <div key={`cap-${filmKey}`} className="logic-film-caption">
            <span className="logic-film-beat">
              第 {currentStep + 1}/{ir.steps.length} 镜
            </span>
            <p className="logic-film-why">{step?.why || step?.content}</p>
            {step?.formula && (
              <code className="logic-film-formula">{step.formula}</code>
            )}
          </div>

          {growFactors.length > 0 && (
            <div className="logic-grow-strip" aria-label="数量生长">
              {growFactors.map((f, i) => (
                <span key={f.id} className="logic-grow-factor">
                  {i > 0 && <span className="logic-grow-op">×</span>}
                  <span className="logic-grow-num">{f.count}</span>
                </span>
              ))}
              {product != null && growFactors.length > 1 && (
                <>
                  <span className="logic-grow-op">=</span>
                  <span className="logic-grow-product">{product}</span>
                </>
              )}
            </div>
          )}

          <h3 className="logic-section-title">逻辑树</h3>
          <ul className="logic-tree-root">
            <LogicTreeNode
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
