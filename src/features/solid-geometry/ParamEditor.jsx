import { useState } from 'react'
import { getEdgeDirectionGroups, getDefaultEdgeLengths } from '../../engines/constraintSolver'
import { formatNumber } from '../../engines/mathUtils'
import './ParamEditor.css'

const MODES = [
  { key: 'cube', label: '正方体约束', desc: '所有棱等长' },
  { key: 'cuboid', label: '长方体约束', desc: '长宽高独立' },
  { key: 'free', label: '自由建模', desc: '每条棱独立' },
]

export default function ParamEditor({
  geometry, onConstraintModeChange, onEdgeLengthChange, onQuickInput,
}) {
  const { type, constraintMode = 'cube', cubeSize = 2, cuboidA = 2, cuboidB = 1.2, cuboidC = 2, freeEdgeLengths = {} } = geometry
  const [quickText, setQuickText] = useState('')
  const [quickMsg, setQuickMsg] = useState('')

  const groups = getEdgeDirectionGroups(type)
  const edgeLengths = getDefaultEdgeLengths(type, constraintMode, { cubeSize, cuboidA, cuboidB, cuboidC, freeEdgeLengths })

  const handleQuickApply = () => {
    if (!quickText.trim()) return
    const ok = onQuickInput?.(quickText)
    if (ok) {
      setQuickMsg('✓ 已更新')
      setQuickText('')
      setTimeout(() => setQuickMsg(''), 1500)
    } else {
      setQuickMsg('格式错误，例: AB=5')
    }
  }

  return (
    <div className="param-editor">
      {/* ── 约束模式选择 ── */}
      <div className="mode-selector">
        {MODES.map(m => (
          <button
            key={m.key}
            className={`mode-btn ${constraintMode === m.key ? 'active' : ''}`}
            onClick={() => onConstraintModeChange?.(m.key)}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── 正方体模式 ── */}
      {constraintMode === 'cube' && (
        <div className="param-group">
          <label>棱长: {formatNumber(cubeSize)}</label>
          <input
            type="range"
            min="0.5" max="8" step="0.1"
            value={cubeSize}
            onChange={e => onEdgeLengthChange?.('*', parseFloat(e.target.value))}
            className="slider"
          />
          <div className="param-hint">所有 12 条棱同步缩放</div>
        </div>
      )}

      {/* ── 长方体模式 ── */}
      {constraintMode === 'cuboid' && (
        <div className="param-group">
          <label>长 (X): {formatNumber(cuboidA)}</label>
          <input
            type="range"
            min="0.5" max="8" step="0.1"
            value={cuboidA}
            onChange={e => onEdgeLengthChange?.('AB', parseFloat(e.target.value))}
            className="slider"
          />

          <label>宽 (Z): {formatNumber(cuboidB)}</label>
          <input
            type="range"
            min="0.3" max="6" step="0.1"
            value={cuboidB}
            onChange={e => onEdgeLengthChange?.('BC', parseFloat(e.target.value))}
            className="slider"
          />

          <label>高 (Y): {formatNumber(cuboidC)}</label>
          <input
            type="range"
            min="0.5" max="8" step="0.1"
            value={cuboidC}
            onChange={e => onEdgeLengthChange?.('AE', parseFloat(e.target.value))}
            className="slider"
          />
        </div>
      )}

      {/* ── 自由建模模式 ── */}
      {constraintMode === 'free' && (
        <div className="free-mode-section">
          <div className="param-hint">
            点击 3D 视图中的棱或下方边列表编辑单条棱长
          </div>

          {/* 按组折叠的边列表 */}
          {Object.entries(groups).map(([gName, edgeIds]) => (
            <details key={gName} className="edge-group-details" open>
              <summary className="edge-group-summary">
                {gName} <span className="group-count">{edgeIds.length}条</span>
              </summary>
              <div className="edge-group-list">
                {edgeIds.map(id => (
                  <div key={id} className="free-edge-row">
                    <span className="free-edge-id">{id}</span>
                    <input
                      type="number"
                      className="free-edge-input"
                      min="0.1" max="20" step="0.1"
                      value={edgeLengths[id] ?? 2}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) onEdgeLengthChange?.(id, v)
                      }}
                    />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* ── 快速输入 ── */}
      <div className="quick-input-row">
        <input
          className="quick-input"
          type="text"
          placeholder="快速输入，如 AB=8"
          value={quickText}
          onChange={e => { setQuickText(e.target.value); setQuickMsg('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleQuickApply() }}
          spellCheck={false}
        />
        <button className="quick-apply-btn" onClick={handleQuickApply}>应用</button>
        {quickMsg && <span className={`quick-msg ${quickMsg.includes('✓') ? 'ok' : 'err'}`}>{quickMsg}</span>}
      </div>
    </div>
  )
}
